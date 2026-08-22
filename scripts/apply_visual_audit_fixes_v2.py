from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    if old in text:
        count = text.count(old)
        if count != 1:
            raise SystemExit(f"Expected one match in {path}, found {count}: {old[:120]!r}")
        p.write_text(text.replace(old, new, 1), encoding="utf-8")
        return
    if new in text:
        return
    raise SystemExit(f"Missing anchor in {path}: {old[:120]!r}")


sidebar = "apps/web/src/components/Sidebar.tsx"
replace_once(sidebar, "  const { t } = useTranslation();", "  const { language, t } = useTranslation();")
replace_once(
    sidebar,
    "    reorderPinnedThread,\n    deleteThread,\n  } = useThreadActions();",
    "    reorderPinnedThread,\n    archiveThread,\n    deleteThread,\n  } = useThreadActions();",
)
replace_once(
    sidebar,
    "              branch: thread.branch ?? null,\n              isPinned,",
    "              branch: thread.branch ?? null,\n              language,\n              isPinned,",
)
replace_once(
    sidebar,
    '''          case "unpin":
            attemptUnpin(threadRef);
            return;
          case "rename":''',
    '''          case "unpin":
            attemptUnpin(threadRef);
            return;
          case "archive": {
            const result = await archiveThread(threadRef);
            if (result._tag === "Failure" && !isAtomCommandInterrupted(result)) {
              const error = squashAtomCommandFailure(result);
              toastManager.add(
                stackedThreadToast({
                  type: "error",
                  title: "Failed to archive thread",
                  description: error instanceof Error ? error.message : "An error occurred.",
                }),
              );
            }
            return;
          }
          case "rename":''',
)
replace_once(
    sidebar,
    '''              const confirmed = await settlePromise(() =>
                api.dialogs.confirm(
                  [
                    `Delete thread "${thread.title}"?`,
                    "This permanently clears conversation history for this thread.",
                  ].join("\\n"),
                  { variant: "destructive" },
                ),
              );''',
    '''              const deleteMessage =
                language === "ru"
                  ? [
                      `Удалить чат «${thread.title}»?`,
                      "История этого чата будет удалена без возможности восстановления.",
                    ]
                  : [
                      `Delete thread "${thread.title}"?`,
                      "This permanently clears conversation history for this thread.",
                    ];
              const confirmed = await settlePromise(() =>
                api.dialogs.confirm(deleteMessage.join("\\n"), { variant: "destructive" }),
              );''',
)
replace_once(
    sidebar,
    "    [\n      attemptPin,\n      attemptSettle,",
    "    [\n      archiveThread,\n      attemptPin,\n      attemptSettle,",
)
replace_once(
    sidebar,
    "      handleMultiSelectContextMenu,\n      markThreadUnread,",
    "      handleMultiSelectContextMenu,\n      language,\n      markThreadUnread,",
)
replace_once(
    sidebar,
    '''        const confirmed = await settlePromise(() =>
          api.dialogs.confirm(
            [
              `Delete ${count} thread${count === 1 ? "" : "s"}?`,
              "This permanently clears conversation history for these threads.",
            ].join("\\n"),
            { variant: "destructive" },
          ),
        );''',
    '''        const deleteMessage =
          language === "ru"
            ? [
                `Удалить чаты (${count})?`,
                "История выбранных чатов будет удалена без возможности восстановления.",
              ]
            : [
                `Delete ${count} thread${count === 1 ? "" : "s"}?`,
                "This permanently clears conversation history for these threads.",
              ];
        const confirmed = await settlePromise(() =>
          api.dialogs.confirm(deleteMessage.join("\\n"), { variant: "destructive" }),
        );''',
)
replace_once(
    sidebar,
    "      deleteThread,\n      markThreadUnread,\n      performSnooze,",
    "      deleteThread,\n      language,\n      markThreadUnread,\n      performSnooze,",
)


threads = "packages/client-runtime/src/state/threads.ts"
replace_once(
    threads,
    '''  const foregroundResubscriptions = Option.match(wakeups, {
    onNone: () => Stream.never,
    onSome: (service) =>
      service.changes.pipe(Stream.filter(ConnectionWakeups.shouldResubscribeAfterWakeup)),
  });''',
    '''  const foregroundResubscriptions = Option.match(wakeups, {
    onNone: () => Stream.never,
    onSome: (service) =>
      service.changes.pipe(Stream.filter(ConnectionWakeups.shouldResubscribeAfterWakeup)),
  });

  const isThreadNotFoundSubscriptionFailure = (cause: Cause.Cause<unknown>): boolean =>
    cause.reasons.some(
      (reason) =>
        reason._tag === "Fail" &&
        typeof reason.error === "object" &&
        reason.error !== null &&
        "_tag" in reason.error &&
        reason.error._tag === "OrchestrationGetSnapshotError" &&
        "message" in reason.error &&
        typeof reason.error.message === "string" &&
        reason.error.message === `Thread ${threadId} was not found`,
    );''',
)
replace_once(
    threads,
    '''      {
        onExpectedFailure: setStreamError,
        retryExpectedFailureAfter: "250 millis",
        resubscribe: foregroundResubscriptions,
      },''',
    '''      {
        onExpectedFailure: (cause) =>
          isThreadNotFoundSubscriptionFailure(cause) ? setDeleted() : setStreamError(cause),
        retryExpectedFailureAfter: "250 millis",
        shouldRetryExpectedFailure: (cause) => !isThreadNotFoundSubscriptionFailure(cause),
        resubscribe: foregroundResubscriptions,
      },''',
)


items = "apps/web/src/components/capabilities/CapabilityItemsPanel.tsx"
replace_once(
    items,
    'import { useActiveEnvironmentId } from "../../state/entities";\n',
    'import { useActiveEnvironmentId } from "../../state/entities";\nimport { useClientSettings } from "../../hooks/useSettings";\n',
)
marker = "/** Per-kind copy for the rules/skills editor. Keyed by kind so both panels share one source. */"
constants = '''const RUSSIAN_WELL_KNOWN_SKILL_DESCRIPTIONS: Readonly<Record<string, string>> = {
  "create-rule":
    "Создаёт постоянные правила Cursor для инструкций ИИ: стандарты кодирования, соглашения проекта, шаблоны для отдельных файлов и RULE.md.",
  "create-skill":
    "Помогает создавать Agent Skills для Cursor: структуру, инструкции, лучшие практики и файлы SKILL.md.",
  "create-subagent":
    "Создаёт пользовательских субагентов для специализированных задач ИИ, включая ревью кода, отладку и доменные сценарии.",
  "migrate-to-skills":
    "Преобразует правила Cursor и slash-команды в формат Agent Skills (.cursor/skills/).",
  "update-cursor-settings":
    "Изменяет пользовательские настройки Cursor/VS Code: settings.json, темы, шрифты и другие параметры редактора.",
};

function localizedItemDescription(
  kind: OmpCapabilityEditableKind,
  name: string,
  description: string | undefined,
  language: string,
): string | undefined {
  if (language !== "ru" || kind !== "skills") return description;
  return RUSSIAN_WELL_KNOWN_SKILL_DESCRIPTIONS[name] ?? description;
}

'''
replace_once(items, marker, constants + marker)
replace_once(
    items,
    '''  const environmentId = useActiveEnvironmentId();
  const groups = useSettingsProjectGroups();''',
    '''  const environmentId = useActiveEnvironmentId();
  const displayLanguage = useClientSettings((settings) => settings.displayLanguage);
  const groups = useSettingsProjectGroups();''',
)
replace_once(
    items,
    '''                        <span className="line-clamp-2">{row.description}</span>''',
    '''                        <span className="line-clamp-2">
                          {localizedItemDescription(kind, row.name, row.description, displayLanguage)}
                        </span>''',
)


client_test = "packages/client-runtime/src/rpc/client.test.ts"
replace_once(
    client_test,
    '''  it.effect("does not classify subscription defects as expected failures", () =>''',
    '''  it.effect("can stop retrying a handled expected failure", () =>
    Effect.gen(function* () {
      const domainError = new Error("thread is permanently gone");
      const subscriptionCount = yield* Ref.make(0);
      const expectedFailureCount = yield* Ref.make(0);
      const client = {
        [WS_METHODS.subscribeTerminalEvents]: () =>
          Stream.fromEffect(Ref.update(subscriptionCount, (count) => count + 1)).pipe(
            Stream.drain,
            Stream.concat(Stream.fail(domainError)),
          ),
      } as unknown as WsRpcProtocolClient;
      const { activeSession, supervisor } = yield* makeHarness();
      yield* SubscriptionRef.set(activeSession, Option.some(session(client)));
      const subscriptionFiber = yield* subscribe(
        WS_METHODS.subscribeTerminalEvents,
        {},
        {
          onExpectedFailure: () => Ref.update(expectedFailureCount, (count) => count + 1),
          retryExpectedFailureAfter: "100 millis",
          shouldRetryExpectedFailure: () => false,
        },
      ).pipe(
        Stream.runDrain,
        Effect.provideService(EnvironmentSupervisor.EnvironmentSupervisor, supervisor),
        Effect.forkChild,
      );
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if ((yield* Ref.get(expectedFailureCount)) >= 1) break;
        yield* Effect.yieldNow;
      }
      yield* TestClock.adjust("1 second");
      yield* Effect.yieldNow;
      yield* Fiber.interrupt(subscriptionFiber);
      expect(yield* Ref.get(subscriptionCount)).toBe(1);
      expect(yield* Ref.get(expectedFailureCount)).toBe(1);
    }),
  );

  it.effect("does not classify subscription defects as expected failures", () =>''',
)


visual = "apps/web/src/i18n/runtimeRuVisualAudit.ts"
replace_once(
    visual,
    '  cost: "стоимость",\n  COST: "СТОИМОСТЬ",',
    '  cost: "стоимость",\n  tokens: "токены",\n  model: "модель",\n  day: "день",\n  COST: "СТОИМОСТЬ",',
)
replace_once(
    visual,
    '  "Move to omp": "Переместить в omp",\n',
    '  "Move to omp": "Переместить в omp",\n  "The chat isn\'t ready to accept input right now.": "Чат сейчас не готов принимать ввод.",\n',
)


runtime = "apps/web/src/components/settings/SettingsRuntimeLocalization.tsx"
replace_once(
    runtime,
    '  [/^Search (.+) files$/, (project) => `Поиск файлов: ${project}`],\n',
    '  [/^Search (.+) files$/, (project) => `Поиск файлов: ${project}`],\n  [/^Lives in (.+)$/, (path) => `Хранится в ${path}`],\n',
)

print("visual audit v2 fixes applied")
