import { it } from "@effect/vitest";
import { OmpAgentProfileError } from "@t3tools/contracts";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as Cause from "effect/Cause";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import { expect } from "vite-plus/test";
import { parseDocument } from "yaml";

import { OmpAgentProfileStore } from "./OmpAgentProfileStore.ts";

const isProfileError = Schema.is(OmpAgentProfileError);

it.layer(NodeServices.layer)("OmpAgentProfileStore", (it) => {
  it.effect("persists a profile and materializes an OMP agent definition", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const stateDir = yield* fs.makeTempDirectoryScoped({ prefix: "pivot-agent-mode-" });
      const store = new OmpAgentProfileStore(fs, path, stateDir);

      const profile = yield* store.upsert({
        name: "worker",
        description: "A focused worker",
        usageHint: "Use for implementation tasks",
        model: "openai-codex/gpt-5.6-luna",
        effort: "xhigh",
        systemPrompt: "Follow the project instructions.",
        readOnly: false,
        canSpawn: true,
      });

      expect(profile.name).toBe("worker");
      expect((yield* store.list()).map((entry) => entry.name)).toEqual(["worker"]);
      const definition = yield* fs.readFileString(
        path.join(stateDir, "omp-agent-modes", "agents", "worker.md"),
      );
      expect(definition).toContain("model: 'openai-codex/gpt-5.6-luna'");
      expect(definition).toContain("thinking-level: 'xhigh'");
      expect(definition).toContain('spawns: "*"');
      expect(definition).not.toContain("spawns: *");
      const parsedFrontmatter = parseDocument(definition.split("---")[1] ?? "");
      expect(parsedFrontmatter.errors).toEqual([]);
      expect(parsedFrontmatter.get("spawns")).toBe("*");
      expect(definition).toContain("Usage hint: Use for implementation tasks");

      yield* store.delete("worker");
      expect(yield* fs.exists(path.join(stateDir, "omp-agent-modes", "agents", "worker.md"))).toBe(
        false,
      );
    }),
  );

  it.effect("isolates managed profiles by provider instance", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const stateDir = yield* fs.makeTempDirectoryScoped({ prefix: "pivot-agent-mode-instances-" });
      const first = new OmpAgentProfileStore(fs, path, stateDir, { instanceId: "omp-A" });
      const second = new OmpAgentProfileStore(fs, path, stateDir, { instanceId: "omp-a" });

      yield* first.upsert({
        name: "worker",
        description: "First instance worker",
        model: "openai-codex/gpt-5.6-luna",
        effort: "high",
        systemPrompt: "First instance instructions.",
        readOnly: false,
        canSpawn: true,
      });
      yield* second.upsert({
        name: "worker",
        description: "Second instance worker",
        model: "openai-codex/gpt-5.6-luna",
        effort: "low",
        systemPrompt: "Second instance instructions.",
        readOnly: false,
        canSpawn: true,
      });

      expect((yield* first.list()).map((profile) => profile.description)).toEqual([
        "First instance worker",
      ]);
      expect((yield* second.list()).map((profile) => profile.description)).toEqual([
        "Second instance worker",
      ]);
      const managedRoot = path.join(stateDir, "omp-agent-modes");
      const instanceDirectories = yield* fs.readDirectory(managedRoot);
      expect(instanceDirectories).toHaveLength(2);
      const definitions = yield* Effect.all(
        instanceDirectories.map((directory) =>
          fs.readFileString(path.join(managedRoot, directory, "agents", "worker.md")),
        ),
      );
      expect(definitions.some((definition) => definition.includes("First instance worker"))).toBe(
        true,
      );
      expect(definitions.some((definition) => definition.includes("Second instance worker"))).toBe(
        true,
      );
    }),
  );

  it.effect("reads and atomically replaces root prompt bundles for future sessions", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const stateDir = yield* fs.makeTempDirectoryScoped({ prefix: "pivot-root-prompts-" });
      const store = new OmpAgentProfileStore(fs, path, stateDir);

      const initial = yield* store.rootPromptBundles();
      expect(initial.commonPrompt).toBe("");
      expect(initial.orchestratorPrompt).toContain("root orchestration agent");

      const updated = {
        commonPrompt: "Общие инструкции для каждой сессии.",
        orchestratorPrompt: "Полный пакет оркестратора.",
      };
      expect(yield* store.updateRootPromptBundles(updated)).toEqual(updated);
      expect(yield* store.rootPromptBundles()).toEqual(updated);

      const singlePath = yield* store.rootPromptPath("thread-root-prompts", "single");
      const orchestratorPath = yield* store.rootPromptPath("thread-root-prompts", "orchestrator");
      expect(yield* fs.readFileString(singlePath)).toBe(`${updated.commonPrompt}\n`);
      const effectiveOrchestratorPrompt = yield* fs.readFileString(orchestratorPath);
      expect(effectiveOrchestratorPrompt).toContain(`${updated.orchestratorPrompt}\n`);
      expect(effectiveOrchestratorPrompt).toContain("## OMP Hub child reuse");
      expect(effectiveOrchestratorPrompt).toContain("agent: 'worker'");
      expect(effectiveOrchestratorPrompt).toContain("agent: 'verifier'");
      expect(effectiveOrchestratorPrompt).toContain("Never omit the agent field");
      expect(effectiveOrchestratorPrompt).toContain("never substitute a bundled/default profile");
      expect(effectiveOrchestratorPrompt).toContain("hub op=send");
      expect(yield* fs.readFileString(singlePath)).not.toContain("OMP Hub child reuse");

      const tooLong = yield* Effect.exit(
        store.updateRootPromptBundles({
          commonPrompt: "x".repeat(100_001),
          orchestratorPrompt: updated.orchestratorPrompt,
        }),
      );
      expect(Exit.isFailure(tooLong)).toBe(true);
      if (Exit.isFailure(tooLong)) {
        expect(isProfileError(Cause.squash(tooLong.cause))).toBe(true);
      }
    }),
  );

  it.effect("refuses to read an unmanaged profile directory", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const stateDir = yield* fs.makeTempDirectoryScoped({ prefix: "pivot-agent-mode-unmanaged-" });
      const root = path.join(stateDir, "omp-agent-modes");
      yield* fs.makeDirectory(root, { recursive: true });
      const store = new OmpAgentProfileStore(fs, path, stateDir);

      const result = yield* Effect.exit(store.list());
      expect(Exit.isFailure(result)).toBe(true);
      if (Exit.isFailure(result)) expect(isProfileError(Cause.squash(result.cause))).toBe(true);
    }),
  );

  it.effect("imports only the allow-listed Codex worker and verifier definitions", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const stateDir = yield* fs.makeTempDirectoryScoped({ prefix: "pivot-agent-mode-import-" });
      const codexHome = yield* fs.makeTempDirectoryScoped({ prefix: "pivot-codex-home-" });
      yield* fs.makeDirectory(path.join(codexHome, "agents"), { recursive: true });
      yield* fs.writeFileString(
        path.join(codexHome, "AGENTS.md"),
        "# Common\n\n## Multi-agent development\n\n# Orchestrator-only\n\n## End\n\n# Tail\n",
      );
      yield* fs.writeFileString(
        path.join(codexHome, "config.toml"),
        "[windows]\nfoo = true\n[agents]\nmax_threads = 2\n",
      );
      const basicAgentToml = (effort: string) =>
        `model = "gpt-5.6-luna"\nmodel_reasoning_effort = "${effort}"\ndeveloper_instructions = "Do the task."\n`;
      const literalMultilineAgentToml = (effort: string) =>
        `model = 'gpt-5.6-luna'\nmodel_reasoning_effort = '${effort}'\ndeveloper_instructions = '''\nDo the task.\n'''\n`;
      yield* fs.writeFileString(
        path.join(codexHome, "agents", "worker.toml"),
        basicAgentToml("xhigh"),
      );
      yield* fs.writeFileString(
        path.join(codexHome, "agents", "verifier.toml"),
        literalMultilineAgentToml("max"),
      );

      const store = new OmpAgentProfileStore(fs, path, stateDir, { codexHome });
      const imported = yield* store.importCodex();
      expect(imported.profiles.map((profile) => profile.name)).toEqual(["worker", "verifier"]);
      expect(imported.profiles[0]?.model).toBe("openai-codex/gpt-5.6-luna");
      expect(imported.profiles[1]?.readOnly).toBe(true);
      expect(imported.profiles[0]?.systemPrompt).toContain("# Common");
      expect(imported.profiles[0]?.systemPrompt).not.toContain("# Orchestrator-only");
      const verifierDefinition = yield* fs.readFileString(
        path.join(stateDir, "omp-agent-modes", "agents", "verifier.md"),
      );
      expect(verifierDefinition).toContain("thinking-level: 'max'");
    }),
  );
});
