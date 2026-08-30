"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type { EnvironmentId, OmpRootPromptBundles, ProviderInstanceId } from "@t3tools/contracts";
import * as Option from "effect/Option";
import { AsyncResult } from "effect/unstable/reactivity";
import { LoaderIcon, RotateCcwIcon, SaveIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { SettingsRow, SettingsSection } from "../settings/settingsLayout";
import { Button } from "../ui/button";
import { stackedThreadToast, toastManager } from "../ui/toast";

import {
  areRootPromptBundlesEqual,
  isRootPromptBundlesEmpty,
  type RootPromptBundlesDraft,
} from "./CapabilitiesRootPromptsPanel.logic";

export function RootPromptBundlesEditor({
  draft,
  dirty,
  pending,
  error,
  onChange,
  onCancel,
  onReset,
  onSave,
}: {
  draft: RootPromptBundlesDraft;
  dirty: boolean;
  pending: boolean;
  error: string | null;
  onChange: (draft: RootPromptBundlesDraft) => void;
  onCancel: () => void;
  onReset: () => void;
  onSave: () => void;
}) {
  const update = (key: keyof RootPromptBundlesDraft, value: string) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/10 p-4">
      <div className="grid gap-3">
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          Base / Single
          <textarea
            className="min-h-56 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm font-normal leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={draft.commonPrompt}
            onChange={(event) => update("commonPrompt", event.currentTarget.value)}
            aria-label="Base / Single root prompt bundle"
            disabled={pending}
            spellCheck={false}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          Orchestrator
          <textarea
            className="min-h-56 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm font-normal leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={draft.orchestratorPrompt}
            onChange={(event) => update("orchestratorPrompt", event.currentTarget.value)}
            aria-label="Orchestrator root prompt bundle"
            disabled={pending}
            spellCheck={false}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={pending || !dirty}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onReset}
          disabled={pending || !dirty}
        >
          <RotateCcwIcon className="size-3.5" />
          Reset
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={pending || !dirty}>
          {pending ? (
            <LoaderIcon className="size-3.5 animate-spin" />
          ) : (
            <SaveIcon className="size-3.5" />
          )}
          Save both bundles
        </Button>
      </div>
    </div>
  );
}

export function CapabilitiesRootPromptsPanel({
  environmentId,
  instanceId,
}: {
  environmentId: EnvironmentId;
  instanceId: ProviderInstanceId | null;
}) {
  const bundlesAtom = serverEnvironment.ompRootPromptBundlesGet({
    environmentId,
    input: instanceId === null ? {} : { instanceId },
  });
  const result = useAtomValue(bundlesAtom);
  const refreshBundles = useAtomRefresh(bundlesAtom);
  const remoteBundles = Option.getOrNull(AsyncResult.value(result));
  const [loadedBundles, setLoadedBundles] = useState<OmpRootPromptBundles | null>(null);
  const [draft, setDraft] = useState<OmpRootPromptBundles | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bundlesTargetKey = `${environmentId}:${instanceId ?? "omp"}`;
  const lastAppliedBundlesTargetKey = useRef(bundlesTargetKey);
  const lastAppliedRemoteBundles = useRef<OmpRootPromptBundles | null>(null);
  const updateBundles = useAtomCommand(serverEnvironment.ompRootPromptBundlesUpdate, {
    label: "omp-root-prompt-bundles-update",
    reportFailure: false,
  });

  const dirty =
    loadedBundles !== null && draft !== null && !areRootPromptBundlesEqual(loadedBundles, draft);

  useEffect(() => {
    const targetChanged = lastAppliedBundlesTargetKey.current !== bundlesTargetKey;
    if (targetChanged) {
      lastAppliedBundlesTargetKey.current = bundlesTargetKey;
      lastAppliedRemoteBundles.current = null;
      setLoadedBundles(null);
      setDraft(null);
      setError(null);
    }
    if (remoteBundles === null || lastAppliedRemoteBundles.current === remoteBundles) return;
    lastAppliedRemoteBundles.current = remoteBundles;
    if (!targetChanged && loadedBundles !== null && dirty) return;
    setLoadedBundles(remoteBundles);
    setDraft(remoteBundles);
    setError(null);
  }, [bundlesTargetKey, dirty, loadedBundles, remoteBundles]);

  const resetDraft = () => {
    if (loadedBundles === null) return;
    setDraft(loadedBundles);
    setError(null);
  };

  const save = async () => {
    if (draft === null || loadedBundles === null || !dirty || pending) return;
    setPending(true);
    setError(null);
    const outcome = await updateBundles({
      environmentId,
      input: {
        ...(instanceId === null ? {} : { instanceId }),
        commonPrompt: draft.commonPrompt,
        orchestratorPrompt: draft.orchestratorPrompt,
      },
    });
    setPending(false);
    if (outcome._tag === "Failure") {
      setError("Could not save root agent prompts.");
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: "Could not save root agent prompts",
          description: "Check that omp is installed on the server host and try again.",
        }),
      );
      return;
    }
    setLoadedBundles(outcome.value);
    setDraft(outcome.value);
    setError(null);
    toastManager.add({ type: "success", title: "Root agent prompts saved" });
    refreshBundles();
  };

  const loading = loadedBundles === null && result.waiting;
  const failed = loadedBundles === null && !result.waiting && result._tag === "Failure";
  const empty = loadedBundles !== null && isRootPromptBundlesEmpty(loadedBundles);

  return (
    <SettingsSection title="Root agent prompts">
      <SettingsRow
        title="Full system bundles"
        description="Base / Single is the complete commonPrompt bundle. Orchestrator is the complete orchestratorPrompt bundle and already includes the common text; these are alternatives, not a base plus an addition."
        status="Changes apply when the next OMP session starts. In an idle chat, switch the agent mode to recreate its session."
      />
      {instanceId === null ? (
        <SettingsRow
          title="No OMP provider instance configured"
          description="Add an OMP provider instance to load and edit root agent prompts."
        />
      ) : loading ? (
        <SettingsRow
          title="Loading root agent prompts…"
          status={<LoaderIcon className="size-3.5 animate-spin" />}
        />
      ) : failed ? (
        <SettingsRow
          title="Could not load root agent prompts"
          description="Check that omp is installed on the server host and try again."
        />
      ) : loadedBundles !== null && draft !== null ? (
        <SettingsRow
          title={empty ? "No root prompts configured" : "Edit root prompt bundles"}
          description={
            empty
              ? "OMP returned empty bundles. Enter both complete alternatives before saving."
              : undefined
          }
        >
          <RootPromptBundlesEditor
            draft={draft}
            dirty={dirty}
            pending={pending}
            error={error}
            onChange={(nextDraft) => {
              setDraft(nextDraft);
              setError(null);
            }}
            onCancel={resetDraft}
            onReset={resetDraft}
            onSave={() => void save()}
          />
        </SettingsRow>
      ) : null}
    </SettingsSection>
  );
}
