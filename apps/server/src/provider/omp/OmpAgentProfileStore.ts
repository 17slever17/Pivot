import * as NodeOS from "node:os";

import type {
  OmpAgentProfile,
  OmpAgentProfileName,
  OmpAgentProfileUpsertInput,
  OmpRootPromptBundles,
  ServerOmpAgentProfilesImportCodexResult,
  ThreadAgentMode,
} from "@t3tools/contracts";
import {
  OmpAgentProfile as OmpAgentProfileSchema,
  OmpAgentProfileError,
  OMP_ROOT_PROMPT_MAX_CHARS,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { writeFileStringAtomically } from "../../atomicWrite.ts";

const STORE_DIRECTORY = "omp-agent-modes";
const PROFILE_FILE = "profiles.json";
const MANAGED_MARKER = ".pivot-managed";
const MAX_SYSTEM_PROMPT_CHARS = 100_000;
const MAX_ROOT_PROMPT_BYTES = OMP_ROOT_PROMPT_MAX_CHARS * 4;
const DEFAULT_ORCHESTRATOR_PROMPT = `You are the root orchestration agent for Pivot. Break substantial work into focused named subagent tasks when useful, report progress, and integrate their results. Use only the Pivot-managed OMP agent profiles that are available in this session.`;
/**
 * This is appended at the adapter boundary, rather than stored in the
 * editable root bundle. It keeps the lifecycle contract intact when a user
 * imports or replaces the visible AGENTS.md-style prompt.
 */
const OMP_HUB_REUSE_INSTRUCTIONS = `## OMP Hub child reuse
- When orchestration is enabled, spawn worker and verifier children as keep-alive/reusable sessions when follow-up work is likely.
- After a child completes, prefer \`hub op=send\` to its known exact child ID to continue that context instead of spawning a replacement.
- Do not abort or kill a reusable child without a concrete reason; preserve it for later assignments.
- Tell the user that the same child's context remains in its OMP JSONL session and can be continued.
- Honor single mode: do not create worker or verifier children unless the user explicitly switches back to orchestration.
`;
const isOmpAgentProfileError = Schema.is(OmpAgentProfileError);

const ProfileFileSchema = Schema.Struct({
  profiles: Schema.Array(OmpAgentProfileSchema),
  commonPrompt: Schema.optional(Schema.String),
  orchestratorPrompt: Schema.optional(Schema.String),
});
type ProfileFile = typeof ProfileFileSchema.Type;
const decodeProfileFile = Schema.decodeUnknownEffect(Schema.fromJsonString(ProfileFileSchema));
const encodeProfileFile = Schema.encodeSync(Schema.fromJsonString(ProfileFileSchema));

export interface OmpAgentProfileStoreOptions {
  /** Override only in tests; production always reads the current user home. */
  readonly codexHome?: string;
  /** Provider instance that owns this managed profile store. */
  readonly instanceId?: string;
}

function instanceStoreDirectory(instanceId: string): string {
  // Provider instance ids are currently slugs, but encode the complete UTF-8
  // value so this boundary remains safe if that contract becomes less strict.
  // Hex is deliberately case-sensitive and cannot collide on Windows paths.
  const bytes = new TextEncoder().encode(instanceId);
  const encoded = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `instance-${encoded}`;
}

function mapError(reason: string, cause: unknown): OmpAgentProfileError {
  return new OmpAgentProfileError({ reason, cause });
}

function rootPromptValidationError(value: string, label: string): OmpAgentProfileError | undefined {
  if (value.length > OMP_ROOT_PROMPT_MAX_CHARS) {
    return new OmpAgentProfileError({ reason: `${label} is too long` });
  }
  if (new TextEncoder().encode(value).byteLength > MAX_ROOT_PROMPT_BYTES) {
    return new OmpAgentProfileError({ reason: `${label} exceeds the UTF-8 size limit` });
  }
  return undefined;
}

function profilePath(path: Path.Path, root: string): string {
  return path.join(root, PROFILE_FILE);
}

function normalizeModel(model: string): string {
  const value = model.trim();
  return value === "gpt-5.6-luna" ? "openai-codex/gpt-5.6-luna" : value;
}

function frontmatterScalar(value: string): string {
  return `'${value.replace(/'/g, "''").replace(/[\r\n]/g, " ")}'`;
}

function decodeTomlBasicString(value: string): string {
  return value.replace(/\\([bfnrt"\\])/g, (_, escape: string) => {
    const escapes: Record<string, string> = {
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
      '"': '"',
      "\\": "\\",
    };
    return escapes[escape] ?? escape;
  });
}

function readTomlValue(
  text: string,
  delimiter: '"' | "'" | '"""' | "'''",
): { readonly value: string; readonly end: number } | undefined {
  const isBasic = delimiter.includes('"');
  let escaped = false;
  for (let index = delimiter.length; index < text.length; index += 1) {
    const character = text[index];
    if (isBasic && character === "\\" && !escaped) {
      escaped = true;
      continue;
    }
    if (text.startsWith(delimiter, index) && !escaped) {
      const raw = text.slice(delimiter.length, index);
      return {
        value: (isBasic ? decodeTomlBasicString(raw) : raw).trim(),
        end: index + delimiter.length,
      };
    }
    escaped = false;
  }
  return undefined;
}

function parseTomlAssignment(text: string, key: string): string | undefined {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? "";
    const equals = line.indexOf("=");
    if (equals < 0 || line.slice(0, equals).trim() !== key) continue;
    let valueText = line.slice(equals + 1).trimStart();
    const delimiter = valueText.startsWith('"""')
      ? '"""'
      : valueText.startsWith("'''")
        ? "'''"
        : valueText.startsWith('"')
          ? '"'
          : valueText.startsWith("'")
            ? "'"
            : undefined;
    if (!delimiter) continue;
    let parsed = readTomlValue(valueText, delimiter);
    if (delimiter === '"""' || delimiter === "'''") {
      while (parsed === undefined) {
        lineIndex += 1;
        if (lineIndex >= lines.length) break;
        valueText += `\n${lines[lineIndex] ?? ""}`;
        parsed = readTomlValue(valueText, delimiter);
      }
    }
    if (parsed !== undefined) return parsed.value || undefined;
  }
  return undefined;
}

function parseTomlStringFallback(text: string, key: string): string | undefined {
  const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*([\\"'])(.*?)\\1\\s*$`, "m"));
  return match?.[2]?.trim() || undefined;
}

function parseTomlString(text: string, key: string): string | undefined {
  return parseTomlAssignment(text, key) ?? parseTomlStringFallback(text, key);
}

function parseDeveloperInstructions(text: string): string | undefined {
  return parseTomlString(text, "developer_instructions");
}

function splitCodexInstructions(text: string): {
  readonly common: string;
  readonly orchestrator: string;
} {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const marker = lines.findIndex((line) => line.trim() === "## Multi-agent development");
  if (marker < 0) {
    throw new Error("Codex AGENTS.md is missing the whole H2 '## Multi-agent development' section");
  }
  const nextH2 = lines.slice(marker + 1).findIndex((line) => /^##\s+\S/.test(line));
  const sectionEnd = nextH2 < 0 ? lines.length : marker + 1 + nextH2;
  const common = [...lines.slice(0, marker), ...lines.slice(sectionEnd)].join("\n").trim();
  return { common, orchestrator: lines.join("\n").trim() };
}

function parseCodexProfile(
  name: OmpAgentProfileName,
  description: string,
  common: string,
  toml: string,
  now: string,
  readOnly: boolean,
): OmpAgentProfile {
  const model = parseTomlString(toml, "model");
  const effort = parseTomlString(toml, "model_reasoning_effort");
  const developerInstructions = parseDeveloperInstructions(toml);
  if (!model || !effort || !developerInstructions) {
    throw new Error(
      `${name}.toml must define model, model_reasoning_effort and developer_instructions`,
    );
  }
  if (!("minimal low medium high xhigh max" as string).split(" ").includes(effort)) {
    throw new Error(`${name}.toml has unsupported model_reasoning_effort '${effort}'`);
  }
  const systemPrompt = `${common}\n\n${developerInstructions}`.trim();
  return {
    name,
    description,
    model: normalizeModel(model),
    effort: effort as OmpAgentProfile["effort"],
    systemPrompt,
    readOnly,
    canSpawn: false,
    createdAt: now,
    updatedAt: now,
  };
}

export class OmpAgentProfileStore {
  readonly #fileSystem: FileSystem.FileSystem;
  readonly #path: Path.Path;
  readonly #root: string;
  readonly #codexHome: string;

  public constructor(
    fileSystem: FileSystem.FileSystem,
    path: Path.Path,
    stateDir: string,
    options: OmpAgentProfileStoreOptions = {},
  ) {
    this.#fileSystem = fileSystem;
    this.#path = path;
    const sharedRoot = path.join(stateDir, STORE_DIRECTORY);
    // Keep the original default location readable for existing installations;
    // additional provider instances always get their own encoded directory.
    // OmpDriver passes the instance id, so this compatibility case is limited
    // to the default `omp` instance and legacy direct store callers.
    this.#root =
      options.instanceId === undefined || options.instanceId === "omp"
        ? sharedRoot
        : path.join(sharedRoot, instanceStoreDirectory(options.instanceId));
    this.#codexHome = options.codexHome ?? path.join(NodeOS.homedir(), ".codex");
  }

  private ensureManagedDirectory(): Effect.Effect<void, OmpAgentProfileError> {
    const fs = this.#fileSystem;
    const root = this.#root;
    const marker = this.#path.join(root, MANAGED_MARKER);
    return Effect.gen(function* () {
      const rootExists = yield* fs.exists(root);
      if (rootExists && !(yield* fs.exists(marker))) {
        return yield* new OmpAgentProfileError({
          reason: "refusing to use an unmanaged OMP agent profile directory",
        });
      }
      yield* fs.makeDirectory(root, { recursive: true });
      if (!(yield* fs.exists(marker))) {
        yield* fs.writeFileString(marker, "Pivot-managed OMP agent profiles\n");
      }
    }).pipe(
      Effect.mapError((cause) =>
        isOmpAgentProfileError(cause)
          ? cause
          : mapError("failed to initialize managed profile directory", cause),
      ),
    );
  }

  private readFile(): Effect.Effect<ProfileFile, OmpAgentProfileError> {
    const fs = this.#fileSystem;
    const file = profilePath(this.#path, this.#root);
    const root = this.#root;
    const marker = this.#path.join(root, MANAGED_MARKER);
    return Effect.gen(function* () {
      if ((yield* fs.exists(root)) && !(yield* fs.exists(marker))) {
        return yield* new OmpAgentProfileError({
          reason: "refusing to read an unmanaged OMP agent profile directory",
        });
      }
      if (!(yield* fs.exists(file))) return { profiles: [] };
      return yield* decodeProfileFile(yield* fs.readFileString(file)).pipe(
        Effect.mapError(
          (cause) =>
            new OmpAgentProfileError({ reason: "managed profile file is malformed", cause }),
        ),
      );
    }).pipe(
      Effect.mapError((cause) =>
        isOmpAgentProfileError(cause)
          ? cause
          : mapError("failed to read managed profile file", cause),
      ),
    );
  }

  private writeFile(value: ProfileFile): Effect.Effect<void, OmpAgentProfileError> {
    const fs = this.#fileSystem;
    const file = profilePath(this.#path, this.#root);
    return this.ensureManagedDirectory().pipe(
      Effect.andThen(
        writeFileStringAtomically({
          filePath: file,
          contents: encodeProfileFile(value) + "\n",
        }).pipe(
          Effect.provideService(FileSystem.FileSystem, fs),
          Effect.provideService(Path.Path, this.#path),
        ),
      ),
      Effect.mapError((cause) =>
        isOmpAgentProfileError(cause)
          ? cause
          : mapError("failed to write managed profile file", cause),
      ),
    );
  }

  public list(): Effect.Effect<ReadonlyArray<OmpAgentProfile>, OmpAgentProfileError> {
    return this.readFile().pipe(Effect.map((file) => file.profiles));
  }

  /**
   * Return the effective managed root bundles. Imported orchestrator prompts
   * remain full AGENTS.md bundles for compatibility; no common prompt is
   * implicitly concatenated here.
   */
  public rootPromptBundles(): Effect.Effect<OmpRootPromptBundles, OmpAgentProfileError> {
    return this.readFile().pipe(
      Effect.map((file) => ({
        commonPrompt: file.commonPrompt ?? "",
        orchestratorPrompt: file.orchestratorPrompt ?? DEFAULT_ORCHESTRATOR_PROMPT,
      })),
    );
  }

  /** Replace both root bundles in one managed profile-file write. */
  public updateRootPromptBundles(
    input: OmpRootPromptBundles,
  ): Effect.Effect<OmpRootPromptBundles, OmpAgentProfileError> {
    const commonError = rootPromptValidationError(input.commonPrompt, "common root prompt");
    const orchestratorError = rootPromptValidationError(
      input.orchestratorPrompt,
      "orchestrator root prompt",
    );
    if (commonError !== undefined) return Effect.fail(commonError);
    if (orchestratorError !== undefined) return Effect.fail(orchestratorError);

    return Effect.gen({ self: this }, function* () {
      const current = yield* this.readFile();
      yield* this.writeFile({
        ...current,
        commonPrompt: input.commonPrompt,
        orchestratorPrompt: input.orchestratorPrompt,
      });
      return input;
    }).pipe(
      Effect.mapError((cause) =>
        isOmpAgentProfileError(cause)
          ? cause
          : mapError("failed to update OMP root prompt bundles", cause),
      ),
    );
  }

  public upsert(
    input: OmpAgentProfileUpsertInput,
  ): Effect.Effect<OmpAgentProfile, OmpAgentProfileError> {
    if (input.systemPrompt.length > MAX_SYSTEM_PROMPT_CHARS) {
      return Effect.fail(new OmpAgentProfileError({ reason: "system prompt is too long" }));
    }
    return Effect.gen({ self: this }, function* () {
      const current = yield* this.readFile();
      const now = DateTime.formatIso(yield* DateTime.now);
      const existing = current.profiles.find((profile) => profile.name === input.name);
      const profile: OmpAgentProfile = {
        ...input,
        model: normalizeModel(input.model),
        ...(existing?.createdAt !== undefined
          ? { createdAt: existing.createdAt }
          : { createdAt: now }),
        updatedAt: now,
      };
      yield* this.writeFile({
        ...current,
        profiles: [...current.profiles.filter((p) => p.name !== input.name), profile],
      });
      yield* this.materialize(profile);
      return profile;
    }).pipe(
      Effect.mapError((cause) =>
        isOmpAgentProfileError(cause)
          ? cause
          : mapError("failed to upsert OMP agent profile", cause),
      ),
    );
  }

  public delete(
    name: OmpAgentProfileName,
  ): Effect.Effect<ReadonlyArray<OmpAgentProfile>, OmpAgentProfileError> {
    return Effect.gen({ self: this }, function* () {
      const current = yield* this.readFile();
      yield* this.writeFile({
        ...current,
        profiles: current.profiles.filter((profile) => profile.name !== name),
      });
      const generated = this.#path.join(this.#root, "agents", `${name}.md`);
      if (yield* this.#fileSystem.exists(generated)) {
        yield* this.#fileSystem.remove(generated);
      }
      return current.profiles.filter((profile) => profile.name !== name);
    }).pipe(
      Effect.mapError((cause) =>
        isOmpAgentProfileError(cause)
          ? cause
          : mapError("failed to delete OMP agent profile", cause),
      ),
    );
  }

  public importCodex(): Effect.Effect<
    ServerOmpAgentProfilesImportCodexResult,
    OmpAgentProfileError
  > {
    return Effect.gen({ self: this }, function* () {
      const fs = this.#fileSystem;
      const codex = this.#codexHome;
      const agentsPath = this.#path.join(codex, "AGENTS.md");
      const configPath = this.#path.join(codex, "config.toml");
      const workerPath = this.#path.join(codex, "agents", "worker.toml");
      const verifierPath = this.#path.join(codex, "agents", "verifier.toml");
      const [agents, config, worker, verifier] = yield* Effect.all([
        fs.readFileString(agentsPath),
        fs.readFileString(configPath),
        fs.readFileString(workerPath),
        fs.readFileString(verifierPath),
      ]);
      // The config text is deliberately only inspected for the allow-listed
      // [agents] section. It is never persisted or returned to the client.
      if (!/^\s*\[agents(?:\.|\s*\])/m.test(config)) {
        return yield* new OmpAgentProfileError({
          reason: "Codex config.toml has no [agents] section",
        });
      }
      let bundles: { readonly common: string; readonly orchestrator: string };
      try {
        bundles = splitCodexInstructions(agents);
      } catch (cause) {
        return yield* mapError(String(cause), cause);
      }
      const now = DateTime.formatIso(yield* DateTime.now);
      let profiles: OmpAgentProfile[];
      try {
        profiles = [
          parseCodexProfile(
            "worker" as OmpAgentProfileName,
            "Codex development worker",
            bundles.common,
            worker,
            now,
            false,
          ),
          parseCodexProfile(
            "verifier" as OmpAgentProfileName,
            "Codex read-only pre-merge verifier",
            bundles.common,
            verifier,
            now,
            true,
          ),
        ];
      } catch (cause) {
        return yield* mapError(String(cause), cause);
      }
      const existing = yield* this.readFile();
      const merged = [
        ...existing.profiles.filter((p) => p.name !== "worker" && p.name !== "verifier"),
        ...profiles,
      ];
      yield* this.writeFile({
        profiles: merged,
        commonPrompt: bundles.common,
        orchestratorPrompt: bundles.orchestrator,
      });
      yield* Effect.forEach(profiles, (profile) => this.materialize(profile), {
        discard: true,
      }).pipe(
        Effect.mapError((cause) =>
          isOmpAgentProfileError(cause)
            ? cause
            : mapError("failed to materialize imported OMP agent profile", cause),
        ),
      );
      return { profiles: merged, importedAt: now };
    }).pipe(
      Effect.mapError((cause) =>
        isOmpAgentProfileError(cause)
          ? cause
          : mapError("failed to import Codex agent configuration", cause),
      ),
    );
  }

  public rootPromptPath(
    threadId: string,
    mode: ThreadAgentMode,
  ): Effect.Effect<string, OmpAgentProfileError> {
    return Effect.gen({ self: this }, function* () {
      const bundles = yield* this.rootPromptBundles();
      const configuredPrompt =
        mode === "orchestrator" ? bundles.orchestratorPrompt : bundles.commonPrompt;
      const prompt =
        mode === "orchestrator"
          ? [configuredPrompt, OMP_HUB_REUSE_INSTRUCTIONS]
              .filter((part) => part.length > 0)
              .join("\n\n")
          : configuredPrompt;
      if (!prompt) return "";
      const sessionDir = this.#path.join(this.#root, "sessions");
      yield* this.#fileSystem.makeDirectory(sessionDir, { recursive: true });
      const safeThreadId = threadId.replace(/[^A-Za-z0-9_-]/g, "_");
      const target = this.#path.join(sessionDir, `${safeThreadId}-${mode}.md`);
      yield* this.#fileSystem.writeFileString(target, `${prompt}\n`);
      return target;
    }).pipe(
      Effect.mapError((cause) =>
        isOmpAgentProfileError(cause)
          ? cause
          : mapError("failed to prepare root instruction bundle", cause),
      ),
    );
  }

  /**
   * Return the explicit extension root containing materialized agent
   * definitions. Ordinary sessions keep the user's configured OMP directory
   * and its settings untouched.
   */
  public managedAgentDirectory(): Effect.Effect<string | undefined, OmpAgentProfileError> {
    return this.list().pipe(
      Effect.map((profiles) => (profiles.length > 0 ? this.#root : undefined)),
    );
  }

  private materialize(profile: OmpAgentProfile): Effect.Effect<void, OmpAgentProfileError> {
    return Effect.gen({ self: this }, function* () {
      yield* this.ensureManagedDirectory();
      const agentsDir = this.#path.join(this.#root, "agents");
      yield* this.#fileSystem.makeDirectory(agentsDir, { recursive: true });
      const tools = profile.readOnly
        ? "read,grep,glob,lsp,ast_grep"
        : "read,grep,glob,bash,lsp,ast_grep";
      const frontmatter = [
        "---",
        `name: ${frontmatterScalar(profile.name)}`,
        `description: ${frontmatterScalar(profile.description)}`,
        `tools: ${tools}`,
        `model: ${frontmatterScalar(profile.model)}`,
        `thinking-level: ${frontmatterScalar(profile.effort)}`,
        ...(profile.canSpawn ? ['spawns: "*"'] : []),
        "---",
      ].join("\n");
      const file = this.#path.join(agentsDir, `${profile.name}.md`);
      const usageHint =
        profile.usageHint === undefined ? "" : `Usage hint: ${profile.usageHint}\n\n`;
      yield* this.#fileSystem.writeFileString(
        file,
        `${frontmatter}\n${usageHint}${profile.systemPrompt.trim()}\n`,
      );
    }).pipe(
      Effect.mapError((cause) =>
        isOmpAgentProfileError(cause)
          ? cause
          : mapError("failed to materialize OMP agent definition", cause),
      ),
    );
  }
}
