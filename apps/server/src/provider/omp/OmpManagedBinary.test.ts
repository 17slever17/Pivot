// @effect-diagnostics nodeBuiltinImport:off - exercises isolated managed-binary filesystem state.
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { it as effectIt } from "@effect/vitest";
import { describe, expect, it } from "vite-plus/test";

import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import { FetchHttpClient } from "effect/unstable/http";
import { ChildProcessSpawner } from "effect/unstable/process";
import { HostProcessArchitecture, HostProcessPlatform } from "@t3tools/shared/hostProcess";

import {
  makeOmpManagedBinary,
  normalizeReleaseVersion,
  parseOmpVersionOutput,
  platformKey,
  resolveOmpReleaseAssetName,
  selectNewestOmpManagedBinary,
} from "./OmpManagedBinary.ts";

describe("OmpManagedBinary helpers", () => {
  it("maps host platforms to oh-my-pi release asset names", () => {
    expect(resolveOmpReleaseAssetName("darwin", "arm64", false)).toBe("omp-darwin-arm64");
    expect(resolveOmpReleaseAssetName("darwin", "x64", false)).toBe("omp-darwin-x64");
    expect(resolveOmpReleaseAssetName("linux", "x64", false)).toBe("omp-linux-x64");
    expect(resolveOmpReleaseAssetName("linux", "x64", true)).toBe("omp-linux-musl-x64");
    expect(resolveOmpReleaseAssetName("linux", "arm64", true)).toBe("omp-linux-musl-arm64");
    expect(resolveOmpReleaseAssetName("win32", "x64", false)).toBe("omp-windows-x64.exe");
    expect(resolveOmpReleaseAssetName("freebsd", "x64", false)).toBeNull();
  });

  it("builds platform keys that include musl when needed", () => {
    expect(platformKey("linux", "x64", false)).toBe("linux-x64");
    expect(platformKey("linux", "x64", true)).toBe("linux-musl-x64");
    expect(platformKey("darwin", "arm64", false)).toBe("darwin-arm64");
  });

  it("parses omp --version output and release tags", () => {
    expect(parseOmpVersionOutput("omp/17.3.0\n")).toBe("17.3.0");
    expect(parseOmpVersionOutput("something 1.2.3 else")).toBe("1.2.3");
    expect(normalizeReleaseVersion("v17.3.0")).toBe("17.3.0");
    expect(normalizeReleaseVersion("17.3.0")).toBe("17.3.0");
  });

  it("promotes a newer downloaded artifact when Windows cannot replace current", () => {
    const current = { executablePath: "tools/omp/current/omp.exe", version: "18.0.0" };
    const downloaded = {
      executablePath: "tools/omp/18.0.11/win32-x64/omp.exe",
      version: "18.0.11",
    };

    expect(selectNewestOmpManagedBinary(current, [downloaded])).toEqual(downloaded);
    expect(selectNewestOmpManagedBinary(downloaded, [current])).toEqual(downloaded);
  });

  it("keeps the current path for an equal-version artifact", () => {
    const current = { executablePath: "tools/omp/current/omp.exe", version: "18.0.11" };
    const downloaded = {
      executablePath: "tools/omp/18.0.11/win32-x64/omp.exe",
      version: "18.0.11",
    };

    expect(selectNewestOmpManagedBinary(current, [downloaded])).toEqual(current);
  });

  effectIt.effect("caches validated versioned probes across resolve calls", () => {
    const baseDir = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-omp-resolve-"));
    const version = "18.0.11";
    const executablePath = NodePath.join(baseDir, "tools", "omp", version, "win32-x64", "omp.exe");
    NodeFS.mkdirSync(NodePath.dirname(executablePath), { recursive: true });
    NodeFS.writeFileSync(executablePath, "validated-placeholder");

    let probeCount = 0;
    const encoder = new TextEncoder();
    const spawner = Layer.succeed(
      ChildProcessSpawner.ChildProcessSpawner,
      ChildProcessSpawner.make(() => {
        probeCount += 1;
        return Effect.succeed(
          ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(1),
            exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
            isRunning: Effect.succeed(false),
            kill: () => Effect.void,
            unref: Effect.succeed(Effect.void),
            stdin: Sink.drain,
            stdout: Stream.make(encoder.encode(`omp/${version}\n`)),
            stderr: Stream.empty,
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
          }),
        );
      }),
    );

    return Effect.gen(function* () {
      const managed = yield* makeOmpManagedBinary({ baseDir });
      const first = yield* managed.resolve;
      const second = yield* managed.resolve;
      expect(first).toEqual({
        status: "available",
        executablePath,
        source: "managed",
        version,
      });
      expect(second).toEqual(first);
      expect(probeCount).toBe(1);
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          NodeServices.layer,
          FetchHttpClient.layer,
          spawner,
          Layer.succeed(HostProcessPlatform, "win32"),
          Layer.succeed(HostProcessArchitecture, "x64"),
        ),
      ),
      Effect.scoped,
      Effect.ensuring(Effect.sync(() => NodeFS.rmSync(baseDir, { recursive: true, force: true }))),
    );
  });
});
