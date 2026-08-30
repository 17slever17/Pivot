"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import type {
  EnvironmentId,
  OmpAgentProfile,
  OmpAgentProfileEffort,
  ProviderInstanceId,
} from "@t3tools/contracts";
import * as Option from "effect/Option";
import { AsyncResult } from "effect/unstable/reactivity";
import { LoaderIcon, PlusIcon, RefreshCwIcon, SaveIcon, Trash2Icon, XIcon } from "lucide-react";
import { useMemo, useState } from "react";

import type { ModelEsque } from "../chat/providerIconUtils";
import type { ProviderInstanceEntry } from "../../providerInstances";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { SettingsRow, SettingsSection } from "../settings/settingsLayout";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { stackedThreadToast, toastManager } from "../ui/toast";

import {
  createAgentProfileDraft,
  OMP_AGENT_PROFILE_EFFORTS,
  summarizeImportedProfiles,
  importedProfileSummaryText,
  type AgentProfileDraft,
  validateAgentProfileDraft,
} from "./CapabilitiesAgentProfilesPanel.logic";

function ProfileEditor({
  draft,
  modelOptions,
  onChange,
  onCancel,
  onSave,
  pending,
  error,
  isEditing,
}: {
  draft: AgentProfileDraft;
  modelOptions: ReadonlyArray<ModelEsque>;
  onChange: (next: AgentProfileDraft) => void;
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
  error: string | null;
  isEditing: boolean;
}) {
  const update = <K extends keyof AgentProfileDraft>(key: K, value: AgentProfileDraft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="grid gap-3 rounded-xl border border-border/70 bg-muted/10 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          Profile name
          <Input
            size="sm"
            value={draft.name}
            onChange={(event) => update("name", event.currentTarget.value)}
            placeholder="worker"
            aria-label="Profile name"
            disabled={pending || isEditing}
          />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
          Model
          <Input
            size="sm"
            list="omp-agent-profile-models"
            value={draft.model}
            onChange={(event) => update("model", event.currentTarget.value)}
            placeholder="provider/model"
            aria-label="Profile model"
            disabled={pending}
          />
          <datalist id="omp-agent-profile-models">
            {modelOptions.map((model) => (
              <option key={model.slug} value={model.slug}>
                {model.name}
              </option>
            ))}
          </datalist>
        </label>
      </div>
      <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
        Description
        <Input
          size="sm"
          value={draft.description}
          onChange={(event) => update("description", event.currentTarget.value)}
          placeholder="Handles implementation tasks"
          aria-label="Profile description"
          disabled={pending}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
        When to use
        <Input
          size="sm"
          value={draft.usageHint}
          onChange={(event) => update("usageHint", event.currentTarget.value)}
          placeholder="Use for focused code changes"
          aria-label="Profile usage hint"
          disabled={pending}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-muted-foreground sm:max-w-52">
        Effort
        <Select
          value={draft.effort}
          onValueChange={(value) => {
            if (OMP_AGENT_PROFILE_EFFORTS.includes(value as OmpAgentProfileEffort)) {
              update("effort", value as OmpAgentProfileEffort);
            }
          }}
        >
          <SelectTrigger size="sm" aria-label="Profile effort" disabled={pending}>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {OMP_AGENT_PROFILE_EFFORTS.map((effort) => (
              <SelectItem key={effort} value={effort}>
                {effort}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
        Prompt
        <textarea
          className="min-h-28 w-full resize-y rounded-md border border-input bg-background px-2.5 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={draft.systemPrompt}
          onChange={(event) => update("systemPrompt", event.currentTarget.value)}
          placeholder="Instructions for this named subagent"
          aria-label="Profile prompt"
          disabled={pending}
        />
      </label>
      <details className="rounded-lg border border-border/60 px-3 py-2 text-xs">
        <summary className="cursor-pointer font-medium text-muted-foreground">
          Advanced permissions
        </summary>
        <div className="mt-2 grid gap-2 text-muted-foreground">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.readOnly}
              onChange={(event) => update("readOnly", event.currentTarget.checked)}
              disabled={pending}
            />
            Read-only profile
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.canSpawn}
              onChange={(event) => update("canSpawn", event.currentTarget.checked)}
              disabled={pending}
            />
            Can spawn child profiles
          </label>
        </div>
      </details>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={pending}>
          <XIcon className="size-3.5" />
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSave} disabled={pending}>
          {pending ? (
            <LoaderIcon className="size-3.5 animate-spin" />
          ) : (
            <SaveIcon className="size-3.5" />
          )}
          {isEditing ? "Save profile" : "Create profile"}
        </Button>
      </div>
    </div>
  );
}

export function CapabilitiesAgentProfilesPanel({
  environmentId,
  instanceId,
  instanceEntries,
  modelOptionsByInstance,
}: {
  environmentId: EnvironmentId;
  instanceId: ProviderInstanceId | null;
  instanceEntries: ReadonlyArray<ProviderInstanceEntry>;
  modelOptionsByInstance: ReadonlyMap<ProviderInstanceId, ReadonlyArray<ModelEsque>>;
}) {
  const profileListAtom = serverEnvironment.ompAgentProfilesList({
    environmentId,
    input: instanceId === null ? {} : { instanceId },
  });
  const profileResult = useAtomValue(profileListAtom);
  const refreshProfiles = useAtomRefresh(profileListAtom);
  const listResult = Option.getOrNull(AsyncResult.value(profileResult));
  const profiles = listResult?.profiles ?? [];
  const upsertProfile = useAtomCommand(serverEnvironment.ompAgentProfileUpsert, {
    label: "omp-agent-profile-upsert",
    reportFailure: false,
  });
  const deleteProfile = useAtomCommand(serverEnvironment.ompAgentProfileDelete, {
    label: "omp-agent-profile-delete",
    reportFailure: false,
  });
  const importCodexSetup = useAtomCommand(serverEnvironment.ompAgentProfilesImportCodex, {
    label: "omp-agent-profiles-import-codex",
    reportFailure: false,
  });
  const rootPromptBundlesAtom = serverEnvironment.ompRootPromptBundlesGet({
    environmentId,
    input: instanceId === null ? {} : { instanceId },
  });
  const refreshRootPromptBundles = useAtomRefresh(rootPromptBundlesAtom);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentProfileDraft | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedProfiles, setImportedProfiles] = useState<ReadonlyArray<OmpAgentProfile> | null>(
    null,
  );
  const [importedAt, setImportedAt] = useState<string | null>(null);
  const fallbackModels = useMemo(
    () => Array.from(modelOptionsByInstance.values()).flatMap((models) => models),
    [modelOptionsByInstance],
  );
  const fallbackModel = fallbackModels[0]?.slug ?? "";
  const modelOptions =
    instanceId === null
      ? fallbackModels
      : (modelOptionsByInstance.get(instanceId) ?? fallbackModels);
  const startNewProfile = () => {
    setError(null);
    setEditingName(null);
    setDraft(createAgentProfileDraft(null, fallbackModel));
  };
  const startEditProfile = (profile: OmpAgentProfile) => {
    setError(null);
    setEditingName(profile.name);
    setDraft(createAgentProfileDraft(profile, fallbackModel));
  };
  const cancelEdit = () => {
    setDraft(null);
    setEditingName(null);
    setError(null);
  };
  const save = async () => {
    if (!draft) return;
    const validationError = validateAgentProfileDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setPendingAction("save");
    setError(null);
    const outcome = await upsertProfile({
      environmentId,
      input: {
        ...(instanceId === null ? {} : { instanceId }),
        name: draft.name.trim(),
        description: draft.description.trim(),
        ...(draft.usageHint.trim().length > 0 ? { usageHint: draft.usageHint.trim() } : {}),
        model: draft.model.trim(),
        effort: draft.effort,
        systemPrompt: draft.systemPrompt,
        readOnly: draft.readOnly,
        canSpawn: draft.canSpawn,
      },
    });
    setPendingAction(null);
    if (outcome._tag === "Failure") {
      setError("Could not save this profile.");
      return;
    }
    toastManager.add({ type: "success", title: "Profile saved" });
    cancelEdit();
    refreshProfiles();
  };
  const remove = async (name: string) => {
    setPendingAction("delete");
    setError(null);
    const outcome = await deleteProfile({
      environmentId,
      input: { ...(instanceId === null ? {} : { instanceId }), name },
    });
    setPendingAction(null);
    if (outcome._tag === "Failure") {
      setError("Could not delete this profile.");
      return;
    }
    if (editingName === name) cancelEdit();
    toastManager.add({ type: "success", title: "Profile deleted" });
    refreshProfiles();
  };
  const importSetup = async () => {
    setPendingAction("import");
    setError(null);
    const outcome = await importCodexSetup({
      environmentId,
      input: instanceId === null ? {} : { instanceId },
    });
    setPendingAction(null);
    if (outcome._tag === "Failure") {
      setError("Could not import Codex setup.");
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: "Could not import Codex setup",
          description: "Check the Codex agent files and try again.",
        }),
      );
      return;
    }
    setImportedProfiles(outcome.value.profiles);
    setImportedAt(outcome.value.importedAt);
    toastManager.add({ type: "success", title: "Codex setup imported" });
    refreshProfiles();
    refreshRootPromptBundles();
  };

  const importSummary = importedProfiles ? summarizeImportedProfiles(importedProfiles) : null;
  const categoryLabels = [
    ["common", "Common"],
    ["orchestrator", "Orchestrator"],
    ["worker", "Worker"],
    ["verifier", "Verifier"],
    ["other", "Other"],
  ] as const;

  return (
    <SettingsSection
      title="Subagent profiles"
      headerAction={
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={importSetup}
            disabled={pendingAction !== null}
          >
            {pendingAction === "import" ? (
              <LoaderIcon className="size-3.5 animate-spin" />
            ) : (
              <RefreshCwIcon className="size-3.5" />
            )}
            Import Codex setup
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={startNewProfile}
            disabled={pendingAction !== null}
          >
            <PlusIcon className="size-3.5" />
            New profile
          </Button>
        </div>
      }
    >
      <SettingsRow
        title="Named subagents"
        description="Profiles are reusable OMP child-agent recipes. The orchestrator chooses a profile by name; they are separate from OMP modelRoles and Codex collaboration labels."
      />
      {profileResult.waiting && profiles.length === 0 ? (
        <SettingsRow
          title="Loading profiles…"
          status={<LoaderIcon className="size-3.5 animate-spin" />}
        />
      ) : null}
      {!profileResult.waiting && profileResult._tag === "Failure" ? (
        <SettingsRow
          title="Could not load profiles"
          description="Check that the OMP profile store is available on the server host."
        />
      ) : null}
      {profiles.map((profile) => (
        <SettingsRow
          key={profile.name}
          title={
            <span className="flex items-center gap-2">
              <span className="font-mono">{profile.name}</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {profile.model} · {profile.effort}
              </span>
            </span>
          }
          description={profile.description}
          status={
            profile.usageHint ? (
              <>
                <span>When to use:</span> {profile.usageHint}
              </>
            ) : undefined
          }
          control={
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => startEditProfile(profile)}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Delete profile ${profile.name}`}
                onClick={() => void remove(profile.name)}
                disabled={pendingAction !== null}
              >
                <Trash2Icon className="size-3.5" />
              </Button>
            </div>
          }
        >
          {editingName === profile.name && draft ? (
            <ProfileEditor
              draft={draft}
              modelOptions={modelOptions}
              onChange={setDraft}
              onCancel={cancelEdit}
              onSave={() => void save()}
              pending={pendingAction === "save"}
              error={error}
              isEditing
            />
          ) : null}
        </SettingsRow>
      ))}
      {profiles.length === 0 && !profileResult.waiting && profileResult._tag !== "Failure" ? (
        <SettingsRow
          title="No profiles configured"
          description="Create a profile or import the allow-listed Codex examples."
        />
      ) : null}
      {draft && editingName === null ? (
        <SettingsRow title="New profile">
          <ProfileEditor
            draft={draft}
            modelOptions={modelOptions}
            onChange={setDraft}
            onCancel={cancelEdit}
            onSave={() => void save()}
            pending={pendingAction === "save"}
            error={error}
            isEditing={false}
          />
        </SettingsRow>
      ) : null}
      {importSummary ? (
        <SettingsRow
          title="Codex setup imported"
          description={
            <>
              {importedAt ? (
                <>
                  <span>Imported at</span> {importedAt}.{" "}
                </>
              ) : null}
              <span>Personal prompts remain hidden.</span>
            </>
          }
        >
          <div className="grid gap-2 rounded-xl border border-border/60 bg-muted/10 p-3 text-xs">
            {categoryLabels.map(([category, label]) => (
              <div key={category} className="flex flex-wrap gap-2">
                <span className="w-28 font-medium text-muted-foreground">{label}</span>
                <span className="font-mono text-foreground">
                  {importedProfileSummaryText(category, importSummary[category])}
                </span>
              </div>
            ))}
          </div>
        </SettingsRow>
      ) : null}
      {error && draft === null ? <p className="px-4 text-sm text-destructive">{error}</p> : null}
      {instanceEntries.length === 0 ? (
        <p className="px-4 text-xs text-muted-foreground">
          No OMP provider instance is configured.
        </p>
      ) : null}
    </SettingsSection>
  );
}
