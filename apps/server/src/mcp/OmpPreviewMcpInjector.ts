/**
 * Process-private Cursor MCP overlay so an omp child can reach Pivot `/mcp`.
 *
 * Writes `{overlayHome}/.cursor/mcp.json` and returns spawn env (`HOME` +
 * `PI_CODING_AGENT_DIR`). Never writes user or project `mcp.json`.
 *
 * @module mcp/OmpPreviewMcpInjector
 */
import type { ThreadId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as PlatformError from "effect/PlatformError";
import * as Schedule from "effect/Schedule";

import type { McpProviderSessionConfig } from "./McpProviderSession.ts";

const OVERLAY_CURSOR_DIR = ".cursor";
const OVERLAY_MCP_FILENAME = "mcp.json";
const PREVIEW_MCP_SERVER_NAME = "pivot-preview";
const OVERLAY_MCP_FILE_MODE = 0o600;
const BUSY_CLEANUP_INITIAL_DELAY = "50 millis";
const BUSY_CLEANUP_RETRY_LIMIT = 5;

export class OmpPreviewMcpInjector {
  readonly #fileSystem: FileSystem.FileSystem;
  readonly #path: Path.Path;
  readonly #overlayRoot: string;
  /**
   * A stop can race the child process closing its MCP extension. On Windows
   * that leaves the SQLite file busy for a short time. The generation lets a
   * subsequent start cancel a deferred cleanup before it can remove the new
   * session's overlay.
   */
  readonly #cleanupGenerations = new Map<ThreadId, number>();

  public constructor(fileSystem: FileSystem.FileSystem, path: Path.Path, overlayRoot: string) {
    this.#fileSystem = fileSystem;
    this.#path = path;
    this.#overlayRoot = overlayRoot;
  }

  public install(
    threadId: ThreadId,
    config: McpProviderSessionConfig,
    agentDir: string,
  ): Effect.Effect<{ readonly extraEnv: Record<string, string> }> {
    return Effect.gen({ self: this }, function* () {
      this.invalidateCleanup(threadId);
      const overlayHome = this.overlayHome(threadId);
      const cursorDir = this.#path.join(overlayHome, OVERLAY_CURSOR_DIR);
      yield* this.#fileSystem.makeDirectory(cursorDir, { recursive: true });
      yield* this.#fileSystem.writeFileString(
        this.#path.join(cursorDir, OVERLAY_MCP_FILENAME),
        this.overlayDocument(config),
        { mode: OVERLAY_MCP_FILE_MODE },
      );
      return {
        extraEnv: {
          HOME: overlayHome,
          PI_CODING_AGENT_DIR: agentDir,
        },
      };
    }).pipe(Effect.orDie);
  }

  public uninstall(threadId: ThreadId): Effect.Effect<void> {
    const generation = this.beginCleanup(threadId);
    const remove = () =>
      this.#fileSystem.remove(this.overlayHome(threadId), {
        recursive: true,
        force: true,
      });
    const deferredRemove = Effect.delay(
      Effect.retry(
        Effect.suspend(() =>
          this.isCleanupCurrent(threadId, generation) ? remove() : Effect.void,
        ),
        {
          schedule: Schedule.exponential("50 millis").pipe(
            Schedule.upTo({ times: BUSY_CLEANUP_RETRY_LIMIT }),
          ),
          while: (error) =>
            error instanceof PlatformError.PlatformError && error.reason._tag === "Busy",
        },
      ),
      BUSY_CLEANUP_INITIAL_DELAY,
    ).pipe(
      Effect.tap(() => Effect.sync(() => this.completeCleanup(threadId, generation))),
      Effect.catchCause((cause) =>
        Effect.logError("preview MCP overlay cleanup failed after a busy retry", {
          threadId,
          cause,
        }),
      ),
    );

    return remove().pipe(
      Effect.tap(() => Effect.sync(() => this.completeCleanup(threadId, generation))),
      Effect.catchTag("PlatformError", (error) => {
        if (error.reason._tag !== "Busy") {
          return Effect.fail(error);
        }
        return Effect.logWarning("preview MCP overlay cleanup deferred while it is busy", {
          threadId,
          path: this.overlayHome(threadId),
        }).pipe(Effect.andThen(deferredRemove.pipe(Effect.forkDetach)), Effect.asVoid);
      }),
      // Preserve the existing fail-closed behavior for permanent filesystem
      // failures. Only the normalized Windows Busy case is deferred above.
      Effect.orDie,
    );
  }

  private beginCleanup(threadId: ThreadId): number {
    const generation = (this.#cleanupGenerations.get(threadId) ?? 0) + 1;
    this.#cleanupGenerations.set(threadId, generation);
    return generation;
  }

  private invalidateCleanup(threadId: ThreadId): void {
    this.beginCleanup(threadId);
  }

  private isCleanupCurrent(threadId: ThreadId, generation: number): boolean {
    return this.#cleanupGenerations.get(threadId) === generation;
  }

  private completeCleanup(threadId: ThreadId, generation: number): void {
    if (this.isCleanupCurrent(threadId, generation)) {
      this.#cleanupGenerations.delete(threadId);
    }
  }

  private overlayHome(threadId: ThreadId): string {
    return this.#path.join(this.#overlayRoot, threadId);
  }

  private overlayDocument(config: McpProviderSessionConfig): string {
    return JSON.stringify({
      mcpServers: {
        [PREVIEW_MCP_SERVER_NAME]: {
          type: "http",
          url: config.endpoint,
          headers: { Authorization: config.authorizationHeader },
        },
      },
    });
  }
}
