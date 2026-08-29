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

import { normalizeReleaseVersion } from "./OmpManagedBinary.ts";
import {
  makeRtkManagedBinary,
  parseChecksumLine,
  parseRtkVersionOutput,
  resolveRtkReleaseAssetName,
  RTK_OMP_HOOK_INIT_ARGS,
  selectNewestRtkManagedBinary,
} from "./RtkManagedBinary.ts";

describe("RtkManagedBinary helpers", () => {
  it("maps host platforms to rtk-ai release asset names", () => {
    expect(resolveRtkReleaseAssetName("darwin", "arm64", false)).toBe(
      "rtk-aarch64-apple-darwin.tar.gz",
    );
    expect(resolveRtkReleaseAssetName("darwin", "x64", false)).toBe(
      "rtk-x86_64-apple-darwin.tar.gz",
    );
    expect(resolveRtkReleaseAssetName("linux", "x64", false)).toBe(
      "rtk-x86_64-unknown-linux-musl.tar.gz",
    );
    expect(resolveRtkReleaseAssetName("linux", "x64", true)).toBe(
      "rtk-x86_64-unknown-linux-musl.tar.gz",
    );
    expect(resolveRtkReleaseAssetName("linux", "arm64", false)).toBe(
      "rtk-aarch64-unknown-linux-gnu.tar.gz",
    );
    expect(resolveRtkReleaseAssetName("linux", "arm64", true)).toBeNull();
    expect(resolveRtkReleaseAssetName("win32", "x64", false)).toBe(
      "rtk-x86_64-pc-windows-msvc.zip",
    );
    expect(resolveRtkReleaseAssetName("freebsd", "x64", false)).toBeNull();
  });

  it("parses version output and checksum lines", () => {
    expect(parseRtkVersionOutput("rtk 0.45.0\n")).toBe("0.45.0");
    expect(normalizeReleaseVersion("v0.45.0")).toBe("0.45.0");
    expect(
      parseChecksumLine(
        "abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1  rtk-x86_64-unknown-linux-musl.tar.gz\n",
        "rtk-x86_64-unknown-linux-musl.tar.gz",
      ),
    ).toBe("abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1");
    expect(parseChecksumLine("not-a-checksum", "rtk-x86_64-unknown-linux-musl.tar.gz")).toBeNull();
  });

  it("activates the omp hook with rtk's current agent name (pi, not omp)", () => {
    // rtk 0.45.0 dropped the `omp` --agent value (canonicalized to `pi`); a
    // stale value makes `rtk init -g --agent omp` exit 2 and fail install.
    expect([...RTK_OMP_HOOK_INIT_ARGS]).toEqual(["init", "-g", "--agent", "pi"]);
    expect(RTK_OMP_HOOK_INIT_ARGS).not.toContain("omp");
  });

  it("promotes a newer downloaded artifact when Windows cannot replace current", () => {
    const current = { executablePath: "tools/rtk/current/rtk.exe", version: "0.45.0" };
    const downloaded = {
      executablePath: "tools/rtk/0.46.0/win32-x64/rtk.exe",
      version: "0.46.0",
    };

    expect(selectNewestRtkManagedBinary(current, [downloaded])).toEqual(downloaded);
    expect(selectNewestRtkManagedBinary(downloaded, [current])).toEqual(downloaded);
  });

  it("keeps the current path for an equal-version artifact", () => {
    const current = { executablePath: "tools/rtk/current/rtk.exe", version: "0.46.0" };
    const downloaded = {
      executablePath: "tools/rtk/0.46.0/win32-x64/rtk.exe",
      version: "0.46.0",
    };

    expect(selectNewestRtkManagedBinary(current, [downloaded])).toEqual(current);
  });

  effectIt.effect("caches validated versioned probes across resolve calls", () => {
    const baseDir = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-rtk-resolve-"));
    const version = "0.46.0";
    const executablePath = NodePath.join(baseDir, "tools", "rtk", version, "win32-x64", "rtk.exe");
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
            stdout: Stream.make(encoder.encode(`rtk ${version}\n`)),
            stderr: Stream.empty,
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
          }),
        );
      }),
    );

    return Effect.gen(function* () {
      const managed = yield* makeRtkManagedBinary({ baseDir });
      const first = yield* managed.resolve;
      const second = yield* managed.resolve;
      expect(first).toEqual({ status: "available", executablePath, version });
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
