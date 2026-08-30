import { assert, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as SqlClient from "effect/unstable/sql/SqlClient";

import { runMigrations } from "../Migrations.ts";
import * as NodeSqliteClient from "../NodeSqliteClient.ts";

const layer = it.layer(Layer.mergeAll(NodeSqliteClient.layerMemory()));

layer("043_ProjectionThreadsAgentMode", (it) => {
  it.effect("adds the durable single-mode default column", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;

      yield* runMigrations({ toMigrationInclusive: 42 });
      yield* runMigrations({ toMigrationInclusive: 43 });

      const columns = yield* sql<{
        readonly name: string;
        readonly dflt_value: string | null;
      }>`PRAGMA table_info(projection_threads)`;
      const agentMode = columns.find((column) => column.name === "agent_mode");
      assert.ok(agentMode);
      assert.strictEqual(agentMode.dflt_value, "'single'");
    }),
  );
});
