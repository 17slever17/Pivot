// @effect-diagnostics nodeBuiltinImport:off
import * as NodeAssert from "node:assert/strict";
import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";

import { it } from "@effect/vitest";
import { OmpSettings, ProviderDriverKind, ProviderInstanceId, ThreadId } from "@t3tools/contracts";
import { HostProcessArchitecture, HostProcessPlatform } from "@t3tools/shared/hostProcess";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import { FetchHttpClient } from "effect/unstable/http";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { describe } from "vite-plus/test";

import * as Option from "effect/Option";
import * as ProcessRunner from "../../processRunner.ts";
import * as ServerConfig from "../../config.ts";
import * as ServerSettings from "../../serverSettings.ts";
import { ProjectionSnapshotQuery } from "../../orchestration/Services/ProjectionSnapshotQuery.ts";
import { isLinuxMuslHost, platformKey } from "../omp/OmpManagedBinary.ts";
import { OmpDriver } from "./OmpDriver.ts";

const decodeOmpSettings = Schema.decodeSync(OmpSettings);

function makeTempOmpBinary(): string {
  const dir = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-omp-driver-"));
  const binaryPath = NodePath.join(dir, "omp");
  NodeFS.writeFileSync(binaryPath, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  return binaryPath;
}

const OmpDriverTestLayer = ServerConfig.layerTest(process.cwd(), {
  prefix: "t3code-omp-driver-test-",
}).pipe(
  Layer.provideMerge(ServerSettings.layerTest()),
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(FetchHttpClient.layer),
  Layer.provideMerge(
    Layer.mock(ProjectionSnapshotQuery)({
      getProjectShellById: () => Effect.succeed(Option.none()),
    }),
  ),
);

const realOmpBinary = (() => {
  try {
    return NodeChildProcess.execFileSync("which", ["omp"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
})();

const UnknownJson = Schema.fromJsonString(Schema.Unknown);
const decodeUnknownJson = Schema.decodeSync(UnknownJson);
const encodeUnknownJson = Schema.encodeSync(UnknownJson);

function asSpawnedCommand(command: ChildProcess.Command) {
  if (command._tag !== "StandardCommand") {
    throw new Error("expected StandardCommand");
  }
  return {
    command: command.command,
    args: command.args,
    options: command.options,
  };
}

function makeFakeOmpSpawner(
  sessionFile: string,
  agentDir = "/tmp/t3-omp-agent",
  versionOutput: (command: string) => string = () => "omp/17.3.0\n",
) {
  const spawns: Array<{
    readonly command: string;
    readonly args: ReadonlyArray<string>;
    readonly options: {
      readonly cwd?: string;
      readonly extendEnv?: boolean;
      readonly env?: Record<string, string>;
    };
    killed: boolean;
  }> = [];
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const spawner = ChildProcessSpawner.make((command) =>
    Effect.gen(function* () {
      const stdout = yield* Queue.unbounded<Uint8Array>();
      const offer = (frame: unknown) =>
        Queue.offer(stdout, encoder.encode(`${encodeUnknownJson(frame)}\n`));
      const spawned = asSpawnedCommand(command);
      const spawn = {
        command: spawned.command,
        args: spawned.args,
        options: {
          ...(typeof spawned.options.cwd === "string" ? { cwd: spawned.options.cwd } : {}),
          ...(typeof spawned.options.extendEnv === "boolean"
            ? { extendEnv: spawned.options.extendEnv }
            : {}),
          ...(spawned.options.env && typeof spawned.options.env === "object"
            ? { env: spawned.options.env as Record<string, string> }
            : {}),
        },
        killed: false,
        exit: yield* Deferred.make<ChildProcessSpawner.ExitCode, never>(),
      };
      spawns.push(spawn);

      // `omp --version` probes, `omp --help` capability probes, and
      // `omp config path` are plain CLI, not RPC.
      if (spawned.args.includes("--version")) {
        return ChildProcessSpawner.makeHandle({
          pid: ChildProcessSpawner.ProcessId(spawns.length),
          exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
          isRunning: Effect.succeed(false),
          kill: () => Effect.void,
          unref: Effect.succeed(Effect.void),
          stdin: Sink.drain,
          stdout: Stream.make(encoder.encode(versionOutput(spawned.command))),
          stderr: Stream.empty,
          all: Stream.empty,
          getInputFd: () => Sink.drain,
          getOutputFd: () => Stream.empty,
        });
      }

      if (spawned.args.includes("--help")) {
        return ChildProcessSpawner.makeHandle({
          pid: ChildProcessSpawner.ProcessId(spawns.length),
          exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
          isRunning: Effect.succeed(false),
          kill: () => Effect.void,
          unref: Effect.succeed(Effect.void),
          stdin: Sink.drain,
          stdout: Stream.make(encoder.encode("Usage: omp [options] --mode text|json|rpc|rpc-ui\n")),
          stderr: Stream.empty,
          all: Stream.empty,
          getInputFd: () => Sink.drain,
          getOutputFd: () => Stream.empty,
        });
      }

      if (spawned.args[0] === "config" && spawned.args[1] === "path") {
        return ChildProcessSpawner.makeHandle({
          pid: ChildProcessSpawner.ProcessId(spawns.length),
          exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(0)),
          isRunning: Effect.succeed(false),
          kill: () => Effect.void,
          unref: Effect.succeed(Effect.void),
          stdin: Sink.drain,
          stdout: Stream.make(encoder.encode(`${agentDir}\n`)),
          stderr: Stream.empty,
          all: Stream.empty,
          getInputFd: () => Sink.drain,
          getOutputFd: () => Stream.empty,
        });
      }

      yield* offer({
        type: "ready",
        protocolVersion: 1,
        supportedProtocolVersions: [1, 2],
      });
      let stdinBuf = "";
      return ChildProcessSpawner.makeHandle({
        pid: ChildProcessSpawner.ProcessId(spawns.length),
        exitCode: Deferred.await(spawn.exit),
        isRunning: Effect.sync(() => !spawn.killed),
        kill: () =>
          Effect.sync(() => {
            spawn.killed = true;
          }).pipe(
            Effect.andThen(
              Deferred.succeed(spawn.exit, ChildProcessSpawner.ExitCode(143)).pipe(Effect.ignore),
            ),
          ),
        unref: Effect.succeed(Effect.void),
        stdin: Sink.forEach((chunk: Uint8Array) => {
          stdinBuf += decoder.decode(chunk, { stream: true });
          return Effect.gen(function* () {
            let newlineIndex = stdinBuf.indexOf("\n");
            while (newlineIndex >= 0) {
              const line = stdinBuf.slice(0, newlineIndex).trim();
              stdinBuf = stdinBuf.slice(newlineIndex + 1);
              if (line.length > 0) {
                const rpcCommand = decodeUnknownJson(line) as Record<string, unknown>;
                if (rpcCommand.type === "negotiate_protocol") {
                  yield* offer({
                    id: rpcCommand.id,
                    type: "response",
                    command: "negotiate_protocol",
                    success: true,
                    data: { protocolVersion: 2 },
                  });
                } else if (rpcCommand.type === "get_state") {
                  yield* offer({
                    id: rpcCommand.id,
                    type: "response",
                    command: "get_state",
                    success: true,
                    data: { sessionFile },
                  });
                } else if (rpcCommand.type === "get_available_models") {
                  yield* offer({
                    id: rpcCommand.id,
                    type: "response",
                    command: "get_available_models",
                    success: true,
                    data: {
                      models: [{ provider: "openai", id: "gpt-5", name: "GPT-5" }],
                    },
                  });
                } else if (rpcCommand.type === "get_available_commands") {
                  yield* offer({
                    id: rpcCommand.id,
                    type: "response",
                    command: "get_available_commands",
                    success: true,
                    data: {
                      commands: [
                        { name: "model", description: "Switch model" },
                        { name: "review", description: "Review changes" },
                      ],
                    },
                  });
                } else if (Array.isArray(spawned.args) && spawned.args.includes("--version")) {
                  // Version probes are CLI argv, not RPC — handled below via stdout offer.
                } else {
                  yield* offer({
                    id: rpcCommand.id,
                    type: "response",
                    command: String(rpcCommand.type),
                    success: true,
                  });
                }
              }
              newlineIndex = stdinBuf.indexOf("\n");
            }
          });
        }),
        stdout: Stream.fromQueue(stdout),
        stderr: Stream.empty,
        all: Stream.empty,
        getInputFd: () => Sink.drain,
        getOutputFd: () => Stream.empty,
      });
    }),
  );
  return { spawner, spawns };
}

describe("OmpDriver", () => {
  it.effect("refreshes the active managed rtk PATH after a locked current fallback", () =>
    Effect.gen(function* () {
      const baseDir = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-omp-driver-base-"));
      const platform = yield* HostProcessPlatform.pipe(Effect.provide(NodeServices.layer));
      const architecture = yield* HostProcessArchitecture.pipe(Effect.provide(NodeServices.layer));
      const binaryPath = makeTempOmpBinary();
      const agentDir = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-omp-driver-agent-"));
      const rtkVersion = "18.0.0";
      const rtkExeName = platform === "win32" ? "rtk.exe" : "rtk";
      const rtkPlatformKey = platformKey(platform, architecture, isLinuxMuslHost(platform));
      const rtkRoot = NodePath.join(baseDir, "tools", "rtk");
      const rtkCurrentDir = NodePath.join(rtkRoot, "current");
      const rtkCurrentPath = NodePath.join(rtkCurrentDir, rtkExeName);
      const rtkVersionedDir = NodePath.join(rtkRoot, rtkVersion, rtkPlatformKey);
      const rtkVersionedPath = NodePath.join(rtkVersionedDir, rtkExeName);
      NodeFS.mkdirSync(rtkCurrentDir, { recursive: true });
      NodeFS.writeFileSync(rtkCurrentPath, "managed rtk current", { mode: 0o755 });
      const fake = makeFakeOmpSpawner("/tmp/omp-session.jsonl", agentDir, (command) => {
        if (command === rtkCurrentPath) return "rtk 17.0.0\n";
        if (command === rtkVersionedPath) return `rtk ${rtkVersion}\n`;
        return "omp/17.3.0\n";
      });
      const instance = yield* OmpDriver.create({
        instanceId: ProviderInstanceId.make("omp"),
        displayName: "omp",
        accentColor: undefined,
        environment: [],
        enabled: true,
        config: decodeOmpSettings({ enabled: true, binaryPath }),
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            ServerConfig.layerTest(process.cwd(), baseDir).pipe(
              Layer.provideMerge(ServerSettings.layerTest()),
              Layer.provideMerge(NodeServices.layer),
              Layer.provideMerge(FetchHttpClient.layer),
              Layer.provideMerge(
                Layer.mock(ProjectionSnapshotQuery)({
                  getProjectShellById: () => Effect.succeed(Option.none()),
                }),
              ),
            ),
            ProcessRunner.layer.pipe(
              Layer.provide(Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, fake.spawner)),
            ),
            Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, fake.spawner),
          ),
        ),
      );

      // Start with the current RTK path, then emulate an install that could
      // not replace the locked current executable and retained a versioned one.
      yield* instance.snapshot.refresh;
      NodeFS.mkdirSync(rtkVersionedDir, { recursive: true });
      NodeFS.writeFileSync(rtkVersionedPath, "managed rtk versioned", { mode: 0o755 });
      yield* instance.snapshot.refresh;

      yield* instance.adapter.startSession({
        threadId: ThreadId.make("thread-versioned-rtk"),
        provider: ProviderDriverKind.make("omp"),
        cwd: "/proj",
        runtimeMode: "full-access",
      });
      const sessionSpawn = [...fake.spawns].toReversed().find((spawn) => {
        const modeIndex = spawn.args.indexOf("--mode");
        return modeIndex >= 0 && spawn.args[modeIndex + 1] === "rpc-ui";
      });
      NodeAssert.ok(sessionSpawn);
      const delimiter = platform === "win32" ? ";" : ":";
      const pathEntries = (sessionSpawn?.options.env?.PATH ?? "").split(delimiter);
      NodeAssert.equal(pathEntries[0], rtkVersionedDir);
      NodeAssert.equal(pathEntries[1], rtkCurrentDir);
      NodeAssert.equal(pathEntries.filter((entry) => entry === rtkVersionedDir).length, 1);
      NodeAssert.equal(pathEntries.filter((entry) => entry === rtkCurrentDir).length, 1);
    }).pipe(Effect.scoped),
  );

  it.effect("create wires adapter sessions through the configured omp binary", () =>
    Effect.gen(function* () {
      const binaryPath = makeTempOmpBinary();
      const agentDir = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-omp-driver-agent-"));
      const fake = makeFakeOmpSpawner("/tmp/omp-session.jsonl", agentDir);
      const instance = yield* OmpDriver.create({
        instanceId: ProviderInstanceId.make("omp"),
        displayName: "omp",
        accentColor: undefined,
        environment: [],
        enabled: true,
        config: decodeOmpSettings({ enabled: true, binaryPath }),
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            OmpDriverTestLayer,
            ProcessRunner.layer.pipe(
              Layer.provide(Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, fake.spawner)),
            ),
            // Keep the fake spawner LAST so it overrides the real NodeServices
            // spawner that OmpDriverTestLayer merges in.
            Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, fake.spawner),
          ),
        ),
      );

      NodeAssert.equal(instance.driverKind, ProviderDriverKind.make("omp"));
      NodeAssert.equal(instance.adapter.provider, ProviderDriverKind.make("omp"));

      // Drain the background model probe so spawn counts are stable.
      yield* instance.snapshot.refresh;
      const spawnsBeforeSession = fake.spawns.length;
      const session = yield* instance.adapter.startSession({
        threadId: ThreadId.make("thread-1"),
        provider: ProviderDriverKind.make("omp"),
        cwd: "/proj",
        runtimeMode: "full-access",
      });

      NodeAssert.equal(fake.spawns.length, spawnsBeforeSession + 1);
      const sessionSpawn = fake.spawns[fake.spawns.length - 1];
      NodeAssert.equal(sessionSpawn?.command, binaryPath);
      const sessionModeIndex = sessionSpawn?.args.indexOf("--mode") ?? -1;
      NodeAssert.equal(
        sessionModeIndex >= 0 ? sessionSpawn?.args[sessionModeIndex + 1] : undefined,
        "rpc-ui",
      );
      NodeAssert.equal(session.resumeCursor, "/tmp/omp-session.jsonl");
    }).pipe(Effect.scoped),
  );

  it.effect("refresh populates models from get_available_models", () =>
    Effect.gen(function* () {
      const binaryPath = makeTempOmpBinary();
      const agentDir = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-omp-driver-agent-"));
      const fake = makeFakeOmpSpawner("/tmp/omp-models.jsonl", agentDir);
      const instance = yield* OmpDriver.create({
        instanceId: ProviderInstanceId.make("omp"),
        displayName: "omp",
        accentColor: undefined,
        environment: [],
        enabled: true,
        config: decodeOmpSettings({ enabled: true, binaryPath }),
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            OmpDriverTestLayer,
            ProcessRunner.layer.pipe(
              Layer.provide(Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, fake.spawner)),
            ),
            // Keep the fake spawner LAST so it overrides the real NodeServices
            // spawner that OmpDriverTestLayer merges in.
            Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, fake.spawner),
          ),
        ),
      );

      const snapshot = yield* instance.snapshot.refresh;
      NodeAssert.deepEqual(
        snapshot.models.map((model) => model.slug),
        ["openai/gpt-5"],
      );
      NodeAssert.equal(snapshot.models[0]?.name, "GPT-5");
      NodeAssert.deepEqual(
        snapshot.slashCommands.map((command) => command.name),
        ["model", "review"],
      );
      NodeAssert.equal(snapshot.showInteractionModeToggle, true);
      NodeAssert.equal(snapshot.installed, true);
      NodeAssert.equal(snapshot.version, "17.3.0");
    }).pipe(Effect.scoped),
  );

  it.effect("refresh publishes models through streamChanges", () =>
    Effect.gen(function* () {
      const binaryPath = makeTempOmpBinary();
      const agentDir = NodeFS.mkdtempSync(NodePath.join(NodeOS.tmpdir(), "t3-omp-driver-agent-"));
      const fake = makeFakeOmpSpawner("/tmp/omp-models.jsonl", agentDir);
      const instance = yield* OmpDriver.create({
        instanceId: ProviderInstanceId.make("omp"),
        displayName: "omp",
        accentColor: undefined,
        environment: [],
        enabled: true,
        config: decodeOmpSettings({ enabled: true, binaryPath }),
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            OmpDriverTestLayer,
            ProcessRunner.layer.pipe(
              Layer.provide(Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, fake.spawner)),
            ),
            // Keep the fake spawner LAST so it overrides the real NodeServices
            // spawner that OmpDriverTestLayer merges in.
            Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, fake.spawner),
          ),
        ),
      );

      // Drain the create-time background refresh before subscribing.
      yield* instance.snapshot.refresh;
      const updatesFiber = yield* instance.snapshot.streamChanges.pipe(
        Stream.filter((snapshot) => snapshot.models.length > 0),
        Stream.take(1),
        Stream.runHead,
        Effect.forkChild,
      );
      yield* instance.snapshot.refresh;
      const updated = yield* Fiber.join(updatesFiber);
      NodeAssert.ok(updated._tag === "Some");
      NodeAssert.deepEqual(
        updated.value.models.map((model) => model.slug),
        ["openai/gpt-5"],
      );
    }).pipe(Effect.scoped),
  );

  it.effect.skipIf(!realOmpBinary)(
    "live omp refresh returns the full get_available_models catalog",
    () =>
      Effect.gen(function* () {
        const instance = yield* OmpDriver.create({
          instanceId: ProviderInstanceId.make("omp"),
          displayName: "omp",
          accentColor: undefined,
          environment: [],
          enabled: true,
          config: decodeOmpSettings({ enabled: true, binaryPath: realOmpBinary! }),
        }).pipe(
          Effect.provide(
            Layer.mergeAll(
              OmpDriverTestLayer,
              ProcessRunner.layer.pipe(Layer.provide(NodeServices.layer)),
            ),
          ),
        );

        const updated = yield* instance.snapshot.streamChanges.pipe(
          Stream.take(1),
          Stream.runHead,
          Effect.timeout("90 seconds"),
        );
        NodeAssert.ok(updated._tag === "Some");
        NodeAssert.ok(
          updated.value.models.length > 1,
          `expected many omp models, got ${String(updated.value.models.length)} (${updated.value.message})`,
        );
      }).pipe(Effect.scoped),
  );
});
