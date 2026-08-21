import { useEffect } from "react";

import { useClientSettings } from "../../hooks/useSettings";

const STATIC_TRANSLATIONS: Readonly<Record<string, string>> = {
  Settings: "Настройки",
  General: "Основные",
  Appearance: "Оформление",
  Notifications: "Уведомления",
  Keybindings: "Горячие клавиши",
  Providers: "Провайдеры",
  "Source Control": "Контроль версий",
  Connections: "Подключения",
  Archive: "Архив",
  Diagnostics: "Диагностика",
  "Restore defaults": "Сбросить настройки",

  Language: "Язык",
  "Project grouping": "Группировка проектов",
  "Auto-settle inactive threads": "Автоматически завершать неактивные чаты",
  "Days of inactivity before auto-settle": "Дней неактивности до автозавершения",
  "Time format": "Формат времени",
  "System default": "Системный",
  "Hide whitespace changes": "Скрывать изменения пробелов",
  "Provider update checks": "Проверять обновления провайдеров",
  "Background activity": "Фоновая активность",
  Balanced: "Сбалансированный",
  Performance: "Производительность",
  "Battery saver": "Экономия батареи",
  Advanced: "Расширенные",
  "New threads": "Новые чаты",
  Local: "Локально",
  "New worktree": "Новый worktree",
  "Add project starts in": "Начальная папка добавления проекта",
  "Archive confirmation": "Подтверждение архивации",
  "Delete confirmation": "Подтверждение удаления",
  "Text generation model": "Модель генерации текста",
  Timeline: "Таймлайн",
  About: "О программе",
  "View diagnostics": "Открыть диагностику",
  "Legacy features": "Устаревшие функции",
  Done: "Готово",
  "Reset all": "Сбросить всё",

  "Choose how Piπot looks. Use a built-in theme or make your own.":
    "Выберите внешний вид Piπot: встроенную тему или собственную.",
  "Color scheme": "Цветовая схема",
  System: "Системная",
  Light: "Светлая",
  Dark: "Тёмная",
  Themes: "Темы",
  "Create theme": "Создать тему",
  "Import theme": "Импортировать тему",
  "Glass opacity": "Прозрачность стекла",
  "Environment identification": "Обозначение окружения",
  Artwork: "Изображение",
  Pill: "Метка",
  None: "Нет",
  Typography: "Типографика",
  "Interface font": "Шрифт интерфейса",
  "Prompt font": "Шрифт поля ввода",
  "Monospace font": "Моноширинный шрифт",
  "Code font": "Шрифт кода",
  "Terminal font": "Шрифт терминала",
  "Word wrap": "Перенос строк",
  "Interface font size": "Размер шрифта интерфейса",
  "Prompt font size": "Размер шрифта поля ввода",
  "Code font size": "Размер шрифта кода",
  "Terminal font size": "Размер шрифта терминала",

  "This environment": "Это окружение",
  "Network access": "Сетевой доступ",
  "Limited to this machine.": "Доступно только на этом компьютере.",
  "Tailscale HTTPS": "Tailscale HTTPS",
  "WSL backend": "Backend WSL",
  Off: "Выкл.",
  On: "Вкл.",
  "Remote environments": "Удалённые окружения",
  "Add environment": "Добавить окружение",
  "No saved remote environments": "Нет сохранённых удалённых окружений",
  "Click “Add environment” to pair another environment.":
    "Нажмите «Добавить окружение», чтобы подключить другое окружение.",
  "Connect": "Подключить",
  "Connecting…": "Подключение…",
  "Disconnect": "Отключить",
  "Disconnecting…": "Отключение…",
  "Remove": "Удалить",
  "Removing…": "Удаление…",
  "Set as default": "Сделать основным",
  Default: "По умолчанию",
  Setup: "Настроить",
  Disable: "Отключить",
  "Server update available": "Доступно обновление сервера",
  Retry: "Повторить",
  Update: "Обновить",
  "Managed above": "Управляется выше",
  "Publish agent activity": "Публиковать активность агента",

  Command: "Команда",
  Keybinding: "Сочетание",
  When: "Когда",
  Status: "Статус",
  Edit: "Изменить",
  Save: "Сохранить",
  Saving: "Сохранение",
  "Press shortcut": "Нажмите сочетание",
  Unassigned: "Не назначено",
  Always: "Всегда",
  "Reset to default": "Сбросить",
  Cancel: "Отмена",
  Condition: "Условие",
  Group: "Группа",
  "Add keybinding": "Добавить сочетание",
  "Open keybindings.json": "Открыть keybindings.json",
  "No keybindings match your search.": "Поиск не нашёл сочетаний клавиш.",

  "Resource monitor": "Монитор ресурсов",
  "T3 system footprint": "Ресурсы системы T3",
  "Current CPU": "Текущая загрузка CPU",
  "Resident memory": "Резидентная память",
  "Process count": "Количество процессов",
  "Read throughput": "Скорость чтения",
  "Write throughput": "Скорость записи",
  "CPU speed limit": "Ограничение скорости CPU",
  "Backend + agents": "Backend + агенты",
  Desktop: "Desktop",
  "Monitor overhead": "Нагрузка монитора",
  "Host & collection": "Хост и сбор данных",
  "Host state": "Состояние хоста",
  "Power source": "Источник питания",
  "External power": "Внешнее питание",
  Battery: "Батарея",
  "Low power mode": "Энергосбережение",
  Enabled: "Включено",
  Disabled: "Выключено",
  Idle: "Простой",
  Active: "Активно",
  Session: "Сеанс",
  Suspended: "Приостановлен",
  Locked: "Заблокирован",
  Unlocked: "Разблокирован",
  Thermal: "Температурное состояние",
  Unknown: "Неизвестно",
  "Collection health": "Состояние сбора",
  "Native process monitor": "Нативный монитор процессов",
  "Electron main process": "Основной процесс Electron",
  "Collection time": "Время сбора",
  "Process scan": "Сканирование процессов",
  Inaccessible: "Недоступно",
  Sidecar: "Sidecar",
  Restarts: "Перезапуски",
  "Resource timeline": "История ресурсов",
  "Live process tree": "Дерево процессов",
  "Instrumented application I/O": "Инструментированный I/O приложения",
  Process: "Процесс",
  Category: "Категория",
  Memory: "Память",
  Read: "Чтение",
  Write: "Запись",
  Samples: "Сэмплы",
  Component: "Компонент",
  Operation: "Операция",
  "Logical Read": "Логическое чтение",
  "Logical Write": "Логическая запись",
  Count: "Количество",
  Time: "Время",
  "Live Processes": "Активные процессы",
  "Child Processes": "Дочерние процессы",
  "Server PID": "PID сервера",
  "Resource History": "История ресурсов",
  "CPU Time": "Время CPU",
  Interval: "Интервал",
  Processes: "Процессы",
  "Trace Diagnostics": "Диагностика трассировки",
  Spans: "Спаны",
  Failures: "Ошибки",
  "Slow Spans": "Медленные спаны",
  "Parse Errors": "Ошибки разбора",
  "Latest Failures": "Последние ошибки",
  "Most Common Failures": "Самые частые ошибки",
  "Slowest Spans": "Самые медленные спаны",
  Cause: "Причина",
  Duration: "Длительность",
  Ended: "Завершено",
  "Last Seen": "Последний раз",
  "Open logs folder": "Открыть папку логов",
  "Retry monitor": "Перезапустить монитор",
  "Waiting for collector health.": "Ожидание состояния сборщика.",
  "Waiting for the native process monitor.": "Ожидание нативного монитора процессов.",
  "No retained process samples in this window.": "В этом интервале нет сохранённых сэмплов процессов.",
  "No instrumented application I/O has been recorded yet.":
    "Инструментированный I/O приложения пока не зафиксирован.",
  "No reported errors": "Ошибок не зарегистрировано",
  "Desktop only": "Только desktop",
  Unavailable: "Недоступно",
  Healthy: "Исправно",
  Degraded: "Деградация",
  Starting: "Запуск",

  "Search settings": "Поиск по настройкам",
  "Clear settings search": "Очистить поиск по настройкам",
  "No settings found": "Настройки не найдены",
};

const DYNAMIC_TRANSLATIONS: ReadonlyArray<readonly [RegExp, (...groups: string[]) => string]> = [
  [/^(\d+) bindings$/, (count) => `${count} привязок`],
  [/^(\d+) processes$/, (count) => `${count} процессов`],
  [/^(\d+) process$/, (count) => `${count} процесс`],
  [/^(\d+) starts · (\d+) exits$/, (starts, exits) => `${starts} запусков · ${exits} завершений`],
  [/^Sampling every (.+)$/, (interval) => `Опрос каждые ${interval}`],
  [/^Updated (.+)$/, (when) => `Обновлено ${when.replace(/ ago$/, " назад")}`],
  [/^Show (\d+) more$/, (count) => `Показать ещё ${count}`],
  [/^No threads in (.+) yet$/, (project) => `В проекте ${project} пока нет чатов`],
  [/^Project settings for (.+)$/, (project) => `Настройки проекта: ${project}`],
  [/^Reachable at (.+)$/, (address) => `Доступно по адресу ${address}`],
  [/^Expand (.+)$/, (name) => `Развернуть ${name}`],
  [/^Collapse (.+)$/, (name) => `Свернуть ${name}`],
  [/^Edit shortcut for (.+)$/, (name) => `Изменить сочетание для ${name}`],
  [/^Keybinding for (.+)$/, (name) => `Сочетание для ${name}`],
  [/^Actions for (.+)$/, (name) => `Действия для ${name}`],
  [/^Edit when clause for (.+)$/, (name) => `Изменить условие для ${name}`],
];

const TRANSLATED_ATTRIBUTES = ["aria-label", "placeholder", "title"] as const;
const originalText = new WeakMap<Text, string>();
const lastTranslatedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const lastTranslatedAttributes = new WeakMap<Element, Map<string, string>>();

function translateValue(value: string): string | null {
  const direct = STATIC_TRANSLATIONS[value];
  if (direct !== undefined) return direct;
  for (const [pattern, render] of DYNAMIC_TRANSLATIONS) {
    const match = value.match(pattern);
    if (match) return render(...match.slice(1));
  }
  return null;
}

function translateTextNode(node: Text): void {
  const raw = node.nodeValue ?? "";
  const trimmed = raw.trim();
  if (!trimmed) return;
  const translated = translateValue(trimmed);
  if (translated === null || translated === trimmed) return;

  if (lastTranslatedText.get(node) !== raw) {
    originalText.set(node, raw);
  }
  const start = raw.indexOf(trimmed);
  const next = `${raw.slice(0, start)}${translated}${raw.slice(start + trimmed.length)}`;
  lastTranslatedText.set(node, next);
  node.nodeValue = next;
}

function translateAttributes(element: Element): void {
  let originals = originalAttributes.get(element);
  let lastTranslations = lastTranslatedAttributes.get(element);
  for (const attribute of TRANSLATED_ATTRIBUTES) {
    const raw = element.getAttribute(attribute);
    if (!raw) continue;
    const translated = translateValue(raw.trim());
    if (translated === null || translated === raw) continue;

    originals ??= new Map<string, string>();
    lastTranslations ??= new Map<string, string>();
    if (lastTranslations.get(attribute) !== raw) {
      originals.set(attribute, raw);
    }
    element.setAttribute(attribute, translated);
    lastTranslations.set(attribute, translated);
  }
  if (originals) originalAttributes.set(element, originals);
  if (lastTranslations) lastTranslatedAttributes.set(element, lastTranslations);
}

function translateSubtree(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }
  if (!(root instanceof Element)) return;
  translateAttributes(root);
  for (const child of root.childNodes) translateSubtree(child);
}

function restoreSubtree(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    const text = root as Text;
    const original = originalText.get(text);
    if (original !== undefined) {
      text.nodeValue = original;
      originalText.delete(text);
      lastTranslatedText.delete(text);
    }
    return;
  }
  if (!(root instanceof Element)) return;
  const originals = originalAttributes.get(root);
  if (originals) {
    for (const [name, value] of originals) root.setAttribute(name, value);
    originalAttributes.delete(root);
    lastTranslatedAttributes.delete(root);
  }
  for (const child of root.childNodes) restoreSubtree(child);
}

export function SettingsRuntimeLocalization() {
  const language = useClientSettings((settings) => settings.displayLanguage);

  useEffect(() => {
    const root = document.body;
    if (language !== "ru") {
      restoreSubtree(root);
      return;
    }

    translateSubtree(root);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateSubtree(mutation.target);
          continue;
        }
        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          translateAttributes(mutation.target);
          continue;
        }
        for (const node of mutation.addedNodes) translateSubtree(node);
      }
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATED_ATTRIBUTES],
    });
    return () => observer.disconnect();
  }, [language]);

  return null;
}
