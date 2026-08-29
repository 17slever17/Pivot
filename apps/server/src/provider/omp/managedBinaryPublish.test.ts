// @effect-diagnostics nodeBuiltinImport:off globalTimers:off globalDate:off globalRandom:off globalDateInEffect:off - OS-level test exercises executing-binary overwrite semantics.
import { describe, expect, it } from "@effect/vitest";
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as Effect from "effect/Effect";

import { selectNewestOmpManagedBinary } from "./OmpManagedBinary.ts";
import { selectNewestRtkManagedBinary } from "./RtkManagedBinary.ts";

/** Real-timer wait — `Effect.sleep` is frozen under the test runtime's TestClock. */
const wait = (ms: number) =>
  Effect.promise<void>(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

/**
 * The managed-binary publish (`OmpManagedBinary`, `RtkManagedBinary`) must not
 * overwrite the `current` binary in place: it is the one live sessions run
 * from, and an in-place copy over an executing ELF fails with ETXTBSY. The
 * fix copies to a sibling temp and renames it over `current`. This test pins
 * the OS invariant that rename replaces an executing file while a plain copy
 * does not — the reason the publish uses rename.
 */
describe("managed binary publish over an executing binary", () => {
  it.effect("rename replaces an executing ELF where an in-place copy fails", () => {
    const baseDir = NodePath.join(NodeOS.tmpdir(), `t3-etxtbsy-${Date.now()}-${Math.random()}`);
    const currentPath = NodePath.join(baseDir, "current", "omp");
    const newBinaryPath = NodePath.join(baseDir, "new", "omp");
    NodeFS.mkdirSync(NodePath.join(baseDir, "current"), { recursive: true });
    NodeFS.mkdirSync(NodePath.join(baseDir, "new"), { recursive: true });

    let child: ReturnType<typeof NodeChildProcess.spawn> | undefined;
    return Effect.gen(function* () {
      if (!NodeFS.existsSync("/bin/sleep")) {
        // The ETXTBSY scenario is Linux-specific; nothing to assert elsewhere.
        return;
      }

      // Seed a long-running executable at `current` so its text segment is
      // ETXTBSY-locked, exactly like a live session, and a distinct new binary.
      NodeFS.copyFileSync("/bin/sleep", currentPath);
      NodeFS.chmodSync(currentPath, 0o755);
      NodeFS.copyFileSync("/bin/true", newBinaryPath);
      NodeFS.chmodSync(newBinaryPath, 0o755);
      child = NodeChildProcess.spawn(currentPath, ["30"], { detached: true });
      child.unref();
      yield* wait(100);

      // In-place copy fails with ETXTBSY (the bug the publish avoids)…
      let copyFailedWithBusy = false;
      try {
        NodeFS.copyFileSync(newBinaryPath, currentPath);
      } catch (error) {
        copyFailedWithBusy =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "ETXTBSY";
      }
      expect(copyFailedWithBusy).toBe(true);

      // …while copy-to-temp + rename replaces it atomically.
      const publishTemp = `${currentPath}.${Date.now()}.tmp`;
      NodeFS.copyFileSync(newBinaryPath, publishTemp);
      NodeFS.renameSync(publishTemp, currentPath);
      expect(NodeFS.readFileSync(currentPath).equals(NodeFS.readFileSync(newBinaryPath))).toBe(
        true,
      );
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          if (child) {
            child.kill("SIGKILL");
          }
          NodeFS.rmSync(baseDir, { recursive: true, force: true });
        }),
      ),
    );
  });

  it.effect("keeps the versioned artifact active when Windows locks current", () => {
    if (!process.execPath.toLowerCase().endsWith(".exe")) {
      return Effect.void;
    }

    const baseDir = NodePath.join(NodeOS.tmpdir(), `t3-win-rename-${Date.now()}-${Math.random()}`);
    const currentPath = NodePath.join(baseDir, "current", "omp.exe");
    const publishTemp = NodePath.join(baseDir, "current", "omp.exe.tmp");
    NodeFS.mkdirSync(NodePath.dirname(currentPath), { recursive: true });
    NodeFS.copyFileSync(process.execPath, currentPath);
    NodeFS.writeFileSync(publishTemp, "new-binary");

    let child: ReturnType<typeof NodeChildProcess.spawn> | undefined;
    return Effect.gen(function* () {
      child = NodeChildProcess.spawn(
        currentPath,
        ["-e", "process.stdout.write('ready\\n'); setInterval(() => {}, 1000);"],
        { stdio: ["ignore", "pipe", "ignore"] },
      );
      yield* Effect.promise<void>(
        () =>
          new Promise<void>((resolve, reject) => {
            const stdout = child?.stdout;
            if (!stdout) {
              reject(new Error("Windows lock probe did not expose stdout."));
              return;
            }
            const onData = (chunk: Buffer) => {
              if (chunk.toString().includes("ready")) {
                stdout.off("data", onData);
                resolve();
              }
            };
            stdout.on("data", onData);
            child?.once("error", reject);
          }),
      );

      let renameCode: string | undefined;
      try {
        NodeFS.renameSync(publishTemp, currentPath);
      } catch (error) {
        renameCode =
          typeof error === "object" && error !== null && "code" in error
            ? (error as { code?: string }).code
            : undefined;
      }
      expect(["EACCES", "EBUSY", "EEXIST", "EPERM"]).toContain(renameCode);
      expect(NodeFS.existsSync(publishTemp)).toBe(true);
      expect(NodeFS.readFileSync(currentPath).equals(NodeFS.readFileSync(process.execPath))).toBe(
        true,
      );
      expect(
        selectNewestOmpManagedBinary({ executablePath: currentPath, version: "18.0.0" }, [
          { executablePath: "tools/omp/18.0.11/win32-x64/omp.exe", version: "18.0.11" },
        ]),
      ).toEqual({
        executablePath: "tools/omp/18.0.11/win32-x64/omp.exe",
        version: "18.0.11",
      });
      expect(
        selectNewestRtkManagedBinary({ executablePath: currentPath, version: "0.45.0" }, [
          { executablePath: "tools/rtk/0.46.0/win32-x64/rtk.exe", version: "0.46.0" },
        ]),
      ).toEqual({
        executablePath: "tools/rtk/0.46.0/win32-x64/rtk.exe",
        version: "0.46.0",
      });
    }).pipe(
      Effect.ensuring(
        Effect.promise<void>(
          () =>
            new Promise<void>((resolve) => {
              const removeTempTree = () => {
                NodeFS.rmSync(baseDir, { recursive: true, force: true });
                resolve();
              };
              if (!child || child.exitCode !== null) {
                removeTempTree();
                return;
              }
              child.once("exit", removeTempTree);
              child.kill();
            }),
        ),
      ),
    );
  });
});
