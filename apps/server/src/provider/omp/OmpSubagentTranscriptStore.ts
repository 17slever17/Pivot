import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as PlatformError from "effect/PlatformError";
import * as Semaphore from "effect/Semaphore";

import { writeFileStringAtomically } from "../../atomicWrite.ts";

const JSONL_SUFFIX = ".jsonl";
const STORE_VERSION = 1;

interface StoredTranscriptMapping {
  readonly rootSessionFile: string;
  readonly sessionFile: string;
}

interface StoredTranscriptFile {
  readonly version: typeof STORE_VERSION;
  readonly mappings: Record<string, StoredTranscriptMapping>;
}

export interface OmpSubagentTranscriptPage {
  readonly sessionFile: string;
  readonly fromByte: number;
  readonly nextByte: number;
  readonly reset: boolean;
  readonly entries: ReadonlyArray<unknown>;
  readonly messages: ReadonlyArray<unknown>;
}

export interface OmpSubagentTranscriptMappingInput {
  readonly threadId: string;
  readonly subagentId: string;
  /** This value is copied from the server-side OMP session handle. */
  readonly rootSessionFile: string;
  /** This value is copied from a server-side OMP lifecycle/progress frame. */
  readonly sessionFile: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbsoluteJsonl(path: Path.Path, value: string): boolean {
  return path.isAbsolute(value) && value.toLowerCase().endsWith(JSONL_SUFFIX);
}

function samePath(path: Path.Path, left: string, right: string): boolean {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  // Both values come from the same OMP process or from its Pivot-owned store.
  // Exact comparison deliberately fails closed on case-only ambiguity.
  return normalizedLeft === normalizedRight;
}

function mappingKey(threadId: string, subagentId: string): string {
  return JSON.stringify([threadId, subagentId]);
}

/**
 * Validate the exact child path that OMP's task executor derives from a root
 * session file. This is intentionally stricter than a generic "inside root"
 * check: callers cannot select an arbitrary file or directory descendant.
 */
export function validateOmpSubagentSessionFile(
  path: Path.Path,
  rootSessionFile: string,
  subagentId: string,
  childSessionFile: string,
): string | undefined {
  if (!isAbsoluteJsonl(path, rootSessionFile) || !isAbsoluteJsonl(path, childSessionFile)) {
    return undefined;
  }
  if (subagentId.trim().length === 0 || /[\\/]/u.test(subagentId)) {
    return undefined;
  }
  const root = path.resolve(rootSessionFile);
  const child = path.resolve(childSessionFile);
  const rootFamily = root.slice(0, -JSONL_SUFFIX.length);
  const expectedChild = path.join(rootFamily, `${subagentId}${JSONL_SUFFIX}`);
  return samePath(path, child, expectedChild) ? child : undefined;
}

function isTitleSlot(value: Record<string, unknown>): boolean {
  return (
    // OMP v18 writes `title`; older fixtures/versions used `session_title`.
    (value.type === "title" || value.type === "session_title") &&
    value.v === 1 &&
    typeof value.title === "string" &&
    typeof value.updatedAt === "string" &&
    typeof value.pad === "string" &&
    (value.source === undefined || value.source === "auto" || value.source === "user")
  );
}

function readJsonObject(line: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(line);
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** Require the first usable JSONL record to be OMP's session header. */
function hasValidSessionHeader(bytes: Uint8Array): boolean {
  const lines = new TextDecoder().decode(bytes).split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const record = readJsonObject(trimmed);
    if (record === undefined) return false;
    if (isTitleSlot(record)) continue;
    return record.type === "session" && typeof record.id === "string";
  }
  return false;
}

function isTrustedRegularFile(
  fileSystem: FileSystem.FileSystem,
  path: Path.Path,
  filePath: string,
): Effect.Effect<boolean> {
  return Effect.all({
    info: fileSystem.stat(filePath).pipe(Effect.option),
    canonical: fileSystem.realPath(filePath).pipe(Effect.option),
  }).pipe(
    Effect.map(
      ({ info, canonical }) =>
        Option.isSome(info) &&
        info.value.type === "File" &&
        Option.isSome(canonical) &&
        samePath(path, canonical.value, filePath),
    ),
    Effect.orElseSucceed(() => false),
  );
}

function parseStoredMappings(value: unknown): Map<string, StoredTranscriptMapping> | undefined {
  if (!isRecord(value) || value.version !== STORE_VERSION || !isRecord(value.mappings)) {
    return undefined;
  }
  const mappings = new Map<string, StoredTranscriptMapping>();
  for (const [key, candidate] of Object.entries(value.mappings)) {
    if (
      !isRecord(candidate) ||
      typeof candidate.rootSessionFile !== "string" ||
      typeof candidate.sessionFile !== "string"
    ) {
      return undefined;
    }
    mappings.set(key, {
      rootSessionFile: candidate.rootSessionFile,
      sessionFile: candidate.sessionFile,
    });
  }
  return mappings;
}

export class OmpSubagentTranscriptStore {
  readonly #fileSystem: FileSystem.FileSystem;
  readonly #path: Path.Path;
  readonly #filePath: string;
  readonly #storeMutex = Effect.runSync(Semaphore.make(1));

  public constructor(fileSystem: FileSystem.FileSystem, path: Path.Path, filePath: string) {
    this.#fileSystem = fileSystem;
    this.#path = path;
    this.#filePath = filePath;
  }

  #readMappings(): Effect.Effect<
    Map<string, StoredTranscriptMapping> | undefined,
    PlatformError.PlatformError
  > {
    return this.#fileSystem.exists(this.#filePath).pipe(
      Effect.flatMap((exists) =>
        exists
          ? this.#fileSystem.readFileString(this.#filePath).pipe(
              Effect.map((text) => {
                try {
                  return parseStoredMappings(JSON.parse(text));
                } catch {
                  return undefined;
                }
              }),
            )
          : Effect.succeed(new Map<string, StoredTranscriptMapping>()),
      ),
    );
  }

  #writeMappings(
    mappings: Map<string, StoredTranscriptMapping>,
  ): Effect.Effect<void, PlatformError.PlatformError> {
    const value: StoredTranscriptFile = {
      version: STORE_VERSION,
      mappings: Object.fromEntries(mappings),
    };
    return writeFileStringAtomically({
      filePath: this.#filePath,
      contents: `${JSON.stringify(value)}\n`,
    }).pipe(
      Effect.provideService(FileSystem.FileSystem, this.#fileSystem),
      Effect.provideService(Path.Path, this.#path),
    );
  }

  /**
   * Remember only mappings received from OMP server-side lifecycle data. A
   * malformed or unrelated path is ignored and never enters persistent state.
   */
  public remember(input: OmpSubagentTranscriptMappingInput): Effect.Effect<boolean> {
    const child = validateOmpSubagentSessionFile(
      this.#path,
      input.rootSessionFile,
      input.subagentId,
      input.sessionFile,
    );
    if (child === undefined) return Effect.succeed(false);
    const mapping: StoredTranscriptMapping = {
      rootSessionFile: this.#path.resolve(input.rootSessionFile),
      sessionFile: child,
    };
    return this.#storeMutex
      .withPermits(1)(
        this.#readMappings().pipe(
          Effect.flatMap((mappings) => {
            if (mappings === undefined) return Effect.succeed(false);
            mappings.set(mappingKey(input.threadId, input.subagentId), mapping);
            return this.#writeMappings(mappings).pipe(Effect.as(true));
          }),
        ),
      )
      .pipe(Effect.orElseSucceed(() => false));
  }

  /**
   * Read complete JSONL records with the same byte cursor/reset semantics as
   * OMP's `get_subagent_messages`. Undefined means the trusted mapping or
   * session validation failed; callers should preserve the native RPC error.
   */
  public readPage(input: {
    readonly threadId: string;
    readonly subagentId: string;
    readonly rootSessionFile: string;
    readonly fromByte?: number;
  }): Effect.Effect<OmpSubagentTranscriptPage | undefined> {
    return this.#storeMutex
      .withPermits(1)(
        this.#readMappings().pipe(
          Effect.flatMap((mappings) => {
            const mapping = mappings?.get(mappingKey(input.threadId, input.subagentId));
            if (
              mapping === undefined ||
              !samePath(this.#path, mapping.rootSessionFile, input.rootSessionFile)
            ) {
              return Effect.succeed(undefined);
            }
            const child = validateOmpSubagentSessionFile(
              this.#path,
              input.rootSessionFile,
              input.subagentId,
              mapping.sessionFile,
            );
            if (child === undefined) return Effect.succeed(undefined);
            return Effect.all({
              rootTrusted: isTrustedRegularFile(
                this.#fileSystem,
                this.#path,
                input.rootSessionFile,
              ),
              childTrusted: isTrustedRegularFile(this.#fileSystem, this.#path, child),
              bytes: this.#fileSystem.readFile(child).pipe(Effect.option),
            }).pipe(
              Effect.map(({ rootTrusted, childTrusted, bytes }) => {
                if (!rootTrusted || !childTrusted || Option.isNone(bytes)) {
                  return undefined;
                }
                const fileBytes = bytes.value;
                if (!hasValidSessionHeader(fileBytes)) return undefined;
                const requested =
                  input.fromByte !== undefined && Number.isFinite(input.fromByte)
                    ? Math.max(0, Math.trunc(input.fromByte))
                    : 0;
                const reset = requested > fileBytes.length;
                const start = reset ? 0 : requested;
                const text = new TextDecoder().decode(fileBytes.subarray(start));
                const lastNewline = text.lastIndexOf("\n");
                const completeText = lastNewline >= 0 ? text.slice(0, lastNewline + 1) : "";
                const entries: unknown[] = [];
                for (const [index, line] of completeText.split("\n").entries()) {
                  const trimmed = line.trim();
                  if (trimmed.length === 0) continue;
                  const record = readJsonObject(trimmed);
                  if (record === undefined) continue;
                  if (start === 0 && index === 0 && isTitleSlot(record)) continue;
                  entries.push(record);
                }
                const nextByte = start + new TextEncoder().encode(completeText).byteLength;
                return {
                  sessionFile: child,
                  fromByte: start,
                  nextByte,
                  reset,
                  entries,
                  messages: entries
                    .filter(
                      (entry): entry is Record<string, unknown> =>
                        isRecord(entry) && entry.type === "message",
                    )
                    .map((entry) => entry.message),
                } satisfies OmpSubagentTranscriptPage;
              }),
              Effect.orElseSucceed(() => undefined),
            );
          }),
        ),
      )
      .pipe(Effect.orElseSucceed(() => undefined));
  }
}
