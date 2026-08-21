from pathlib import Path

ROOT = Path(".")

def patch(path_str, replacements):
    path = ROOT / path_str
    text = path.read_text(encoding="utf-8")
    original = text
    for label, old, new in replacements:
        if new in text:
            continue
        count = text.count(old)
        if count != 1:
            raise RuntimeError(f"{path_str}: {label}: expected 1 match, found {count}")
        text = text.replace(old, new, 1)
    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"patched {path_str}")

literal_map = r'''const ruLiterals: Readonly<Record<string, string>> = {
  "Settings": "Настройки",
  "General": "Основные",
  "Appearance": "Оформление",
  "Notifications": "Уведомления",
  "Keybindings": "Горячие клавиши",
  "Providers": "Провайдеры",
  "Source Control": "Контроль версий",
  "Connections": "Подключения",
  "Archive": "Архив",
  "Diagnostics": "Диагностика",
  "Restore defaults": "Восстановить настройки",
  "Auto-settle inactive threads": "Автоматически завершать неактивные чаты",
  "Sidebar threads with no activity for this long settle automatically. Threads on merged or closed PRs always settle.":
    "Неактивные чаты в боковой панели автоматически завершаются через заданный срок. Чаты с объединёнными или закрытыми PR завершаются всегда.",
  "Days of inactivity before auto-settle": "Дней неактивности до автозавершения",
  "Any new activity un-settles a thread automatically.":
    "Любая новая активность автоматически возвращает чат из завершённых.",
  "Hide whitespace changes": "Скрывать изменения пробелов",
  "Set whether the diff panel ignores whitespace-only edits by default.":
    "Игнорировать по умолчанию изменения, затрагивающие только пробелы, в панели Diff.",
  "Provider update checks": "Проверка обновлений провайдеров",
  "Check installed provider CLIs for newer available versions.":
    "Проверять установленные CLI провайдеров на наличие новых версий.",
  "Background activity": "Фоновая активность",
  "Pauses background probes when clients are idle, the host is locked, or low power mode is active.":
    "Приостанавливает фоновые проверки, когда клиенты неактивны, хост заблокирован или включён режим энергосбережения.",
  "Allows scoped background probes while any subscribed client remains connected.":
    "Разрешает фоновые проверки, пока подключён хотя бы один подписанный клиент.",
  "Also pauses background probes when the host or client is on battery.":
    "Также приостанавливает фоновые проверки при работе хоста или клиента от батареи.",
  "Uses custom background intervals with the selected shared power policy.":
    "Использует пользовательские интервалы фоновой работы с выбранной общей политикой питания.",
  "Balanced": "Сбалансированный",
  "Performance": "Производительность",
  "Battery saver": "Экономия батареи",
  "Advanced": "Расширенные",
  "New threads": "Новые чаты",
  "Pick the default workspace mode for newly created draft threads.":
    "Режим workspace по умолчанию для новых черновиков чатов.",
  "Local": "Локально",
  "Add project starts in": "Начальная папка добавления проекта",
  "Leave empty to use “~/” when the Add Project browser opens.":
    "Оставьте пустым, чтобы окно добавления проекта открывалось в «~/».",
  "Archive confirmation": "Подтверждение архивации",
  "Require a second click on the inline archive action before a thread is archived.":
    "Требовать повторное нажатие перед архивацией чата.",
  "Delete confirmation": "Подтверждение удаления",
  "Ask before deleting a thread and its chat history.":
    "Спрашивать подтверждение перед удалением чата и его истории.",
  "Text generation model": "Модель генерации текста",
  "Default model for generated text like thread titles and source control content. Source control settings can override it with a dedicated source control writer model.":
    "Модель по умолчанию для генерируемого текста: названий чатов и содержимого Source Control. В настройках Source Control можно выбрать отдельную модель.",
  "System default": "Системный",
  "12-hour": "12-часовой",
  "24-hour": "24-часовой",
  "Choose how Pivot looks. Use a built-in theme or make your own.":
    "Настройте внешний вид Pivot: выберите встроенную тему или создайте свою.",
  "Color scheme": "Цветовая схема",
  "System": "Системная",
  "Light": "Светлая",
  "Dark": "Тёмная",
  "Themes": "Темы",
  "Create theme": "Создать тему",
  "Import theme": "Импортировать тему",
  "Glass opacity": "Прозрачность интерфейса",
  "Control how transparent glass surfaces are. Higher values make menus, dialogs, and the composer more solid.":
    "Настройте прозрачность поверхностей. Чем выше значение, тем менее прозрачны меню, диалоги и поле ввода.",
  "Environment identification": "Обозначение окружения",
  "Choose how Dev and Nightly environments are identified.":
    "Выберите, как обозначать окружения Dev и Nightly.",
  "Artwork": "Оформление",
  "Version pill": "Метка версии",
  "None": "Нет",
  "Typography": "Типографика",
  "Interface font": "Шрифт интерфейса",
  "Everything outside code blocks and the terminal.":
    "Весь текст вне блоков кода и терминала.",
  "Code font": "Шрифт кода",
  "Prompt font": "Шрифт сообщений",
  "Terminal font": "Шрифт терминала",
  "This environment": "Это окружение",
  "Network access": "Доступ по сети",
  "Limited to this machine.": "Доступ только с этого компьютера.",
  "Tailscale HTTPS": "Tailscale HTTPS",
  "Start Tailscale to set up HTTPS access through MagicDNS.":
    "Запустите Tailscale, чтобы настроить HTTPS-доступ через MagicDNS.",
  "WSL backend": "WSL backend",
  "Run a second backend inside a WSL distro alongside the Windows one. Pick a distro to start it; pick Off to stop it. Projects opened against the WSL backend live on the Linux side; Windows projects stay where they are.":
    "Запускает второй backend внутри дистрибутива WSL параллельно с Windows. Выберите дистрибутив для запуска или «Выкл.» для остановки. Проекты WSL backend остаются на стороне Linux, проекты Windows — на Windows.",
  "Off": "Выкл.",
  "Remote environments": "Удалённые окружения",
  "Add environment": "Добавить окружение",
  "No saved remote environments": "Нет сохранённых удалённых окружений",
  "Click “Add environment” to pair another environment.":
    "Нажмите «Добавить окружение», чтобы подключить другое окружение.",
  "COMMAND": "КОМАНДА",
  "KEYBINDING": "СОЧЕТАНИЕ",
  "WHEN": "УСЛОВИЕ",
  "STATUS": "СТАТУС",
  "Always": "Всегда",
  "Resource monitor": "Монитор ресурсов",
  "NATIVE UNAVAILABLE": "НАТИВНЫЙ МОНИТОР НЕДОСТУПЕН",
  "Updated just now": "Обновлено только что",
  "T3 SYSTEM FOOTPRINT": "РЕСУРСЫ PIVOT",
  "Live native counters for the server, providers, terminals, desktop processes, and the monitor itself.":
    "Текущие нативные показатели сервера, провайдеров, терминалов, desktop-процессов и самого монитора.",
  "Sampling every 1 second": "Обновление каждую секунду",
  "CURRENT CPU": "ТЕКУЩИЙ CPU",
  "RESIDENT MEMORY": "ПАМЯТЬ",
  "PROCESS COUNT": "ПРОЦЕССЫ",
  "READ THROUGHPUT": "СКОРОСТЬ ЧТЕНИЯ",
  "WRITE THROUGHPUT": "СКОРОСТЬ ЗАПИСИ",
  "CPU SPEED LIMIT": "ОГРАНИЧЕНИЕ CPU",
  "Unknown": "Неизвестно",
  "unknown thermal state": "состояние температуры неизвестно",
  "BACKEND + AGENTS": "BACKEND + АГЕНТЫ",
  "DESKTOP": "DESKTOP",
  "MONITOR OVERHEAD": "НАГРУЗКА МОНИТОРА",
  "Host & collection": "Хост и сбор данных",
  "Retry monitor": "Повторить",
  "HOST STATE": "СОСТОЯНИЕ ХОСТА",
  "Power source": "Источник питания",
  "External power": "Сеть",
  "Low power mode": "Энергосбережение",
  "Idle": "Простой",
  "Active": "Активен",
  "Session": "Сеанс",
  "Unlocked": "Разблокирован",
  "Thermal": "Температура",
  "COLLECTION HEALTH": "СОСТОЯНИЕ СБОРА",
  "Native process monitor": "Нативный монитор процессов",
  "Resource monitor binary was not found for win32/x64.":
    "Нативный бинарник монитора ресурсов для win32/x64 не найден.",
  "UNAVAILABLE": "НЕДОСТУПЕН",
  "Electron main process": "Основной процесс Electron",
  "No reported errors": "Ошибок нет",
  "HEALTHY": "ИСПРАВЕН",
  "Collection time": "Время сбора",
  "Process scan": "Сканирование процессов",
  "Inaccessible": "Недоступно",
  "Sidecar": "Sidecar",
  "Restarts": "Перезапуски",
  "Background policy details": "Подробнее о фоновой политике",
  "Reset to default": "Сбросить",
};

const enLiterals = new Map(Object.entries(ruLiterals).map(([english, russian]) => [russian, english]));

export function translateLiteral(language: DisplayLanguage, value: string): string {
  const bindingMatch = value.match(/^(\\d+) bindings$/u);
  if (bindingMatch) {
    return language === "ru" ? `${bindingMatch[1]} сочетаний` : value;
  }

  const processMatch = value.match(/^(\\d+) processes$/u);
  if (processMatch) {
    return language === "ru" ? `${processMatch[1]} процессов` : value;
  }

  const startsMatch = value.match(/^(\\d+) starts · (\\d+) exits$/u);
  if (startsMatch) {
    return language === "ru"
      ? `${startsMatch[1]} запусков · ${startsMatch[2]} завершений`
      : value;
  }

  if (language === "ru") return ruLiterals[value] ?? value;
  return enLiterals.get(value) ?? value;
}

'''

patch("apps/web/src/i18n.ts", [
    ("translate providers nav", '  "settings.providers": "Providers",\n  "settings.sourceControl": "Source Control",\n',
     '  "settings.providers": "Провайдеры",\n  "settings.sourceControl": "Контроль версий",\n'),
    ("literal dictionary", 'function interpolate(message: string, params?: TranslationParams): string {\n',
     literal_map + 'function interpolate(message: string, params?: TranslationParams): string {\n'),
    ("useTranslation tr", '    t: (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),\n',
     '    t: (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),\n'
     '    tr: (value: string) => translateLiteral(language, value),\n'),
])

patch("apps/web/src/components/settings/settingsLayout.tsx", [
    ("import useRef", '  useMemo,\n  useState,\n', '  useMemo,\n  useRef,\n  useState,\n'),
    ("import i18n", 'import { cn } from "../../lib/utils";\n',
     'import { cn } from "../../lib/utils";\nimport { translateLiteral, useTranslation } from "../../i18n";\n'),
    ("policy tooltip hook", 'export function PolicyTooltip({ children }: { readonly children: string }) {\n  return (\n',
     'export function PolicyTooltip({ children }: { readonly children: string }) {\n  const { tr } = useTranslation();\n  return (\n'),
    ("policy tooltip aria", '            aria-label="Background policy details"\n',
     '            aria-label={tr("Background policy details")}\n'),
    ("policy tooltip text", '        {children}\n', '        {tr(children)}\n'),
    ("settings section hook", '  const targetRef = useSettingsSearchTarget<HTMLElement>(sectionProps.id);\n\n  return (\n',
     '  const targetRef = useSettingsSearchTarget<HTMLElement>(sectionProps.id);\n  const { tr } = useTranslation();\n\n  return (\n'),
    ("settings section title", '          {title}\n', '          {tr(title)}\n'),
    ("settings row hook", '  const targetRef = useSettingsSearchTarget<HTMLDivElement>(rowProps.id);\n\n  return (\n',
     '  const targetRef = useSettingsSearchTarget<HTMLDivElement>(rowProps.id);\n  const { tr } = useTranslation();\n  const localizedTitle = typeof title === "string" ? tr(title) : title;\n  const localizedDescription = typeof description === "string" ? tr(description) : description;\n\n  return (\n'),
    ("settings row title", '            <h3 className="text-sm font-medium tracking-[-0.005em] text-foreground">{title}</h3>\n',
     '            <h3 className="text-sm font-medium tracking-[-0.005em] text-foreground">\n              {localizedTitle}\n            </h3>\n'),
    ("settings row desc condition", '          {description ? (\n', '          {localizedDescription ? (\n'),
    ("settings row desc", '              {description}\n', '              {localizedDescription}\n'),
    ("reset hook", '  onClick: () => void;\n}) {\n  return (\n',
     '  onClick: () => void;\n}) {\n  const { tr } = useTranslation();\n  return (\n'),
    ("reset tooltip", '      <TooltipPopup side="top">Reset to default</TooltipPopup>\n',
     '      <TooltipPopup side="top">{tr("Reset to default")}</TooltipPopup>\n'),
    ("page language hook", '  const navigate = useNavigate();\n  const hash = useLocation({ select: (location) => location.hash });\n',
     '  const navigate = useNavigate();\n  const { language } = useTranslation();\n  const pageRef = useRef<HTMLDivElement>(null);\n  const hash = useLocation({ select: (location) => location.hash });\n'),
    ("page localization effect",
     '  const clearTargetHash = useCallback(() => {\n    void navigate({ hash: "", replace: true, resetScroll: false, hashScrollIntoView: false });\n  }, [navigate]);\n\n  return (\n',
     '  const clearTargetHash = useCallback(() => {\n    void navigate({ hash: "", replace: true, resetScroll: false, hashScrollIntoView: false });\n  }, [navigate]);\n\n  useEffect(() => {\n    const root = pageRef.current;\n    if (!root) return;\n\n    const translateTextNode = (node: Text) => {\n      const value = node.nodeValue ?? "";\n      const match = value.match(/^(\\s*)([\\s\\S]*?)(\\s*)$/u);\n      if (!match) return;\n      const translated = translateLiteral(language, match[2] ?? "");\n      const next = `${match[1] ?? ""}${translated}${match[3] ?? ""}`;\n      if (next !== value) node.nodeValue = next;\n    };\n\n    const translateElement = (element: Element) => {\n      for (const attribute of ["aria-label", "title", "placeholder"] as const) {\n        const value = element.getAttribute(attribute);\n        if (!value) continue;\n        const translated = translateLiteral(language, value);\n        if (translated !== value) element.setAttribute(attribute, translated);\n      }\n    };\n\n    const translateTree = (node: Node) => {\n      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node as Text);\n      if (node instanceof Element) translateElement(node);\n      const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);\n      let current = walker.nextNode();\n      while (current) {\n        if (current.nodeType === Node.TEXT_NODE) translateTextNode(current as Text);\n        else if (current instanceof Element) translateElement(current);\n        current = walker.nextNode();\n      }\n    };\n\n    translateTree(root);\n    const observer = new MutationObserver((records) => {\n      for (const record of records) {\n        if (record.type === "characterData") translateTree(record.target);\n        else if (record.type === "attributes" && record.target instanceof Element)\n          translateElement(record.target);\n        else for (const node of record.addedNodes) translateTree(node);\n      }\n    });\n    observer.observe(root, {\n      subtree: true,\n      childList: true,\n      characterData: true,\n      attributes: true,\n      attributeFilter: ["aria-label", "title", "placeholder"],\n    });\n    return () => observer.disconnect();\n  }, [language]);\n\n  return (\n'),
    ("page ref", '      <div className="settings-page-scroll-fade scrollbar-gutter-both flex-1 overflow-y-auto px-4 pt-10 pb-7 sm:px-8 sm:pt-12 sm:pb-10">\n',
     '      <div\n        ref={pageRef}\n        className="settings-page-scroll-fade scrollbar-gutter-both flex-1 overflow-y-auto px-4 pt-10 pb-7 sm:px-8 sm:pt-12 sm:pb-10"\n      >\n'),
])

patch("apps/desktop/src/shell/DesktopShellEnvironment.ts", [
    ("logFailure input", '  readonly timeout: Duration.Duration;\n  readonly shell?: boolean;\n',
     '  readonly timeout: Duration.Duration;\n  readonly shell?: boolean;\n  readonly logFailure?: boolean;\n'),
    ("conditional failure log",
     '        DesktopShellEnvironmentCommandError: (error) =>\n          logShellEnvironmentCommandError(error).pipe(Effect.as("")),\n',
     '        DesktopShellEnvironmentCommandError: (error) =>\n          input.logFailure === false\n            ? Effect.succeed("")\n            : logShellEnvironmentCommandError(error).pipe(Effect.as("")),\n'),
    ("windows candidate log setting",
     '        timeout: LOGIN_SHELL_TIMEOUT,\n      });\n      const environment = extractEnvironment(output, names);\n',
     '        timeout: LOGIN_SHELL_TIMEOUT,\n        logFailure: command === WINDOWS_SHELL_CANDIDATES[WINDOWS_SHELL_CANDIDATES.length - 1],\n      });\n      const environment = extractEnvironment(output, names);\n'),
])

patch("apps/web/src/i18n.test.ts", [
    ("import literal", 'import { translate } from "./i18n";\n',
     'import { translate, translateLiteral } from "./i18n";\n'),
    ("literal tests", 'describe("i18n", () => {\n',
     'describe("i18n", () => {\n  it("translates legacy Settings literals without touching technical tokens", () => {\n    expect(translateLiteral("ru", "Auto-settle inactive threads")).toBe(\n      "Автоматически завершать неактивные чаты",\n    );\n    expect(translateLiteral("ru", "Resource monitor")).toBe("Монитор ресурсов");\n    expect(translateLiteral("ru", "Diff: Toggle")).toBe("Diff: Toggle");\n    expect(translateLiteral("ru", "openai-codex/gpt-5.6-sol")).toBe(\n      "openai-codex/gpt-5.6-sol",\n    );\n  });\n\n'),
])

print("round2 patch complete")
