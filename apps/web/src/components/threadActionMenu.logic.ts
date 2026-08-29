import type { ContextMenuItem } from "@t3tools/contracts";
import type { DisplayLanguage } from "@t3tools/contracts/settings";
import type { SnoozePreset } from "@t3tools/client-runtime/state/thread-settled";

/**
 * Ids for the per-thread action menu. Snooze presets are dispatched as
 * `snooze:<presetId>` so the union stays closed while the preset list
 * remains data-driven.
 */
export type ThreadActionMenuId =
  | "new-thread-on-branch"
  | "pin"
  | "unpin"
  | "settle"
  | "unsettle"
  | "snooze"
  | `snooze:${string}`
  | "unsnooze"
  | "archive"
  | "rename"
  | "regenerate-title"
  | "mark-unread"
  | "copy-path"
  | "copy-branch"
  | "copy-thread-id"
  | "delete";

export interface ThreadActionMenuState {
  readonly branch: string | null;
  readonly isPinned: boolean;
  readonly isSettled: boolean;
  readonly isSnoozed: boolean;
  readonly canSnoozeNow: boolean;
  readonly isRegeneratingTitle: boolean;
  readonly language?: DisplayLanguage;
  readonly supports: {
    readonly settlement: boolean;
    readonly snooze: boolean;
    readonly pinning: boolean;
    readonly titleRegeneration: boolean;
  };
  readonly snoozePresets: ReadonlyArray<SnoozePreset>;
}

function menuLabel(
  language: DisplayLanguage | undefined,
  english: string,
  russian: string,
): string {
  return language === "ru" ? russian : english;
}

function snoozePresetLabel(language: DisplayLanguage | undefined, preset: SnoozePreset): string {
  if (language !== "ru") return preset.label;
  switch (preset.id) {
    case "hour":
      return "Через 1 час";
    case "three-hours":
      return "Через 3 часа";
    case "evening":
      return "Сегодня вечером";
    case "tomorrow":
      return "Завтра";
    case "next-week":
      return "На следующей неделе";
  }
}

/**
 * Single source for the per-thread action menu: the sidebar row's right-click
 * menu and the chat header menu both render exactly this list, so labels,
 * ordering, and capability gating cannot drift between the two surfaces.
 */
export function buildThreadActionMenuItems(
  state: ThreadActionMenuState,
): ReadonlyArray<ContextMenuItem<ThreadActionMenuId>> {
  return [
    ...(state.branch
      ? [
          {
            id: "new-thread-on-branch" as const,
            label:
              state.language === "ru"
                ? `Новый чат в ветке ${state.branch}`
                : `New thread on ${state.branch}`,
          },
        ]
      : []),
    ...(state.supports.pinning
      ? [
          state.isPinned
            ? {
                id: "unpin" as const,
                label: menuLabel(state.language, "Unpin thread", "Открепить чат"),
              }
            : {
                id: "pin" as const,
                label: menuLabel(state.language, "Pin thread", "Закрепить чат"),
              },
        ]
      : []),
    // Both lifecycle actions stay available on pinned threads: settling
    // clears the pin ("done" beats "keep on top"), and snoozing hides the
    // card until wake with the pin intact.
    ...(state.supports.settlement
      ? [
          state.isSettled
            ? {
                id: "unsettle" as const,
                label: menuLabel(state.language, "Un-settle thread", "Вернуть чат в активные"),
              }
            : {
                id: "settle" as const,
                label: menuLabel(state.language, "Settle thread", "Завершить чат"),
              },
        ]
      : []),
    ...(state.supports.snooze
      ? [
          state.isSnoozed
            ? {
                id: "unsnooze" as const,
                label: menuLabel(state.language, "Wake thread", "Вернуть отложенный чат"),
              }
            : {
                id: "snooze" as const,
                label: menuLabel(state.language, "Snooze", "Отложить"),
                disabled: !state.canSnoozeNow,
                children: state.snoozePresets.map((preset) => ({
                  id: `snooze:${preset.id}` as const,
                  label: `${snoozePresetLabel(state.language, preset)} (${preset.whenLabel})`,
                })),
              },
        ]
      : []),
    {
      id: "archive",
      label: menuLabel(state.language, "Archive thread", "Архивировать чат"),
    },
    { id: "rename", label: menuLabel(state.language, "Rename thread", "Переименовать чат") },
    ...(state.supports.titleRegeneration
      ? [
          {
            id: "regenerate-title" as const,
            label: state.isRegeneratingTitle
              ? menuLabel(state.language, "Regenerating…", "Создание названия…")
              : menuLabel(state.language, "Regenerate title", "Создать название заново"),
            disabled: state.isRegeneratingTitle,
          },
        ]
      : []),
    {
      id: "mark-unread",
      label: menuLabel(state.language, "Mark unread", "Отметить непрочитанным"),
    },
    {
      id: "copy-path",
      label: menuLabel(state.language, "Copy path", "Копировать путь"),
      icon: "copy",
    },
    ...(state.branch
      ? [
          {
            id: "copy-branch" as const,
            label: menuLabel(state.language, "Copy branch", "Копировать ветку"),
            icon: "copy" as const,
          },
        ]
      : []),
    {
      id: "copy-thread-id",
      label: menuLabel(state.language, "Copy thread ID", "Копировать ID чата"),
      icon: "copy",
    },
    {
      id: "delete",
      label: menuLabel(state.language, "Delete", "Удалить"),
      destructive: true,
      icon: "trash",
    },
  ];
}
