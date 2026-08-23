import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { describe } from "vite-plus/test";

import { OmpCatalogDecoder } from "./OmpCatalogDecoder.ts";

describe("OmpCatalogDecoder model presentation", () => {
  it.effect("keeps the omp provider id for otherwise identical model names", () =>
    Effect.gen(function* () {
      const decoder = new OmpCatalogDecoder();

      const models = yield* decoder.decodeModels({
        data: {
          models: [
            { provider: "openai-codex", id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
            { provider: "openai", id: "gpt-5.6-sol", name: "GPT-5.6 Sol" },
          ],
        },
      });

      expect(models).toMatchObject([
        {
          slug: "openai-codex/gpt-5.6-sol",
          name: "GPT-5.6 Sol",
          subProvider: "openai-codex",
        },
        {
          slug: "openai/gpt-5.6-sol",
          name: "GPT-5.6 Sol",
          subProvider: "openai",
        },
      ]);
    }),
  );

  it.effect("maps omp thinking metadata to the shared reasoning selector", () =>
    Effect.gen(function* () {
      const decoder = new OmpCatalogDecoder();

      const models = yield* decoder.decodeModels({
        data: {
          models: [
            {
              provider: "openai-codex",
              id: "gpt-5.6-sol",
              name: "GPT-5.6 Sol",
              thinking: {
                mode: "effort",
                efforts: ["low", "medium", "high", "xhigh", "max"],
                defaultLevel: "low",
              },
            },
          ],
        },
      });

      expect(models[0]?.capabilities).toEqual({
        optionDescriptors: [
          {
            id: "reasoningEffort",
            label: "Reasoning",
            type: "select",
            currentValue: "low",
            options: [
              { id: "low", label: "Low", isDefault: true },
              { id: "medium", label: "Medium" },
              { id: "high", label: "High" },
              { id: "xhigh", label: "Extra High" },
              { id: "max", label: "Max" },
            ],
          },
        ],
      });
    }),
  );

  it.effect("leaves models without controllable thinking metadata trait-free", () =>
    Effect.gen(function* () {
      const decoder = new OmpCatalogDecoder();

      const models = yield* decoder.decodeModels({
        data: {
          models: [{ provider: "openai", id: "gpt-4.1", name: "GPT-4.1", reasoning: false }],
        },
      });

      expect(models[0]?.capabilities).toBeNull();
    }),
  );
});
