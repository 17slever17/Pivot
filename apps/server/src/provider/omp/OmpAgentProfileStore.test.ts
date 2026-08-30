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
