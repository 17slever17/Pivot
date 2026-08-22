import { useEffect } from "react";

import { useClientSettings } from "../../hooks/useSettings";
import { RU_AUDIT_EXTRA_A } from "../../i18n/runtimeRuAuditExtraA";
import { RU_AUDIT_EXTRA_B } from "../../i18n/runtimeRuAuditExtraB";
import { RU_AUDIT_EXTRA_C } from "../../i18n/runtimeRuAuditExtraC";
import { RU_AUDIT_EXTRA_D } from "../../i18n/runtimeRuAuditExtraD";
import { RU_AUDIT_EXTRA_E } from "../../i18n/runtimeRuAuditExtraE";
import { RU_AUDIT_EXTRA_F } from "../../i18n/runtimeRuAuditExtraF";
import { RU_AUDIT_EXTRA_G } from "../../i18n/runtimeRuAuditExtraG";
import { RU_AUDIT_EXTRA_H } from "../../i18n/runtimeRuAuditExtraH";
import { RU_AUDIT_ROUND2 } from "../../i18n/runtimeRuAuditRound2";
import { RU_CAPABILITIES } from "../../i18n/runtimeRuCapabilities";
import { RU_CHAT_EXTRA } from "../../i18n/runtimeRuChatExtra";
import { RU_COMMON } from "../../i18n/runtimeRuCommon";
import { RU_CONNECTIONS_EXTRA } from "../../i18n/runtimeRuConnectionsExtra";
import { RU_FINAL_POLISH } from "../../i18n/runtimeRuFinalPolish";
import { RU_PULL_REQUESTS } from "../../i18n/runtimeRuPullRequests";
import { RU_REMAINING } from "../../i18n/runtimeRuRemaining";
import { RU_SETTINGS } from "../../i18n/runtimeRuSettings";
import { RU_SURFACES } from "../../i18n/runtimeRuSurfaces";
import { RU_VISUAL_AUDIT } from "../../i18n/runtimeRuVisualAudit";

const STATIC_TRANSLATIONS: Readonly<Record<string, string>> = {
  ...RU_COMMON,
  ...RU_SETTINGS,
  ...RU_CAPABILITIES,
  ...RU_SURFACES,
  ...RU_CHAT_EXTRA,
  ...RU_CONNECTIONS_EXTRA,
  ...RU_PULL_REQUESTS,
  ...RU_REMAINING,
  ...RU_AUDIT_EXTRA_A,
  ...RU_AUDIT_EXTRA_B,
  ...RU_AUDIT_EXTRA_C,
  ...RU_AUDIT_EXTRA_D,
  ...RU_AUDIT_EXTRA_E,
  ...RU_AUDIT_EXTRA_F,
  ...RU_AUDIT_EXTRA_G,
  ...RU_AUDIT_EXTRA_H,
  ...RU_FINAL_POLISH,
  ...RU_VISUAL_AUDIT,
  ...RU_AUDIT_ROUND2,
};

const RU_MONTHS: Readonly<Record<string, string>> = {
  Jan: "янв",
  Feb: "фев",
  Mar: "мар",
  Apr: "апр",
  May: "май",
  Jun: "июн",
  Jul: "июл",
  Aug: "авг",
  Sep: "сен",
  Oct: "окт",
  Nov: "ноя",
  Dec: "дек",
};

function normalizeMonthKey(month: string): string {
  return `${month[0] ?? ""}${month.slice(1).toLowerCase()}`;
}

function translatedMonth(month: string): string {
  const normalized = normalizeMonthKey(month);
  return RU_MONTHS[normalized] ?? month.toLowerCase();
}

function formatRussianClock(
  hourText: string,
  minuteText: string | undefined,
  period: string,
): string {
  let hour = Number.parseInt(hourText, 10);
  if (period === "AM") {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  const minute = minuteText ?? "00";
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function formatRussianUsageDate(
  month: string,
  day: string,
  hour: string,
  minute: string | undefined,
  period: string,
): string {
  return `${day} ${translatedMonth(month)}., ${formatRussianClock(hour, minute, period)}`;
}

function russianPlural(rawCount: string, one: string, few: string, many: string): string {
  const count = Number.parseInt(rawCount, 10);
  const mod10 = count % 10;
  const mod100 = count % 100;
  const form =
    mod10 === 1 && mod100 !== 11
      ? one
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? few
        : many;
  return `${rawCount} ${form}`;
}

function translateSamplingInterval(interval: string): string {
  const normalized = interval.trim();
  const match = /^(\d+)\s+(second|seconds|minute|minutes|hour|hours)$/.exec(normalized);
  if (!match) return normalized;
  const [, count = "", unit = ""] = match;
  switch (unit) {
    case "second":
    case "seconds":
      return russianPlural(count, "секунду", "секунды", "секунд");
    case "minute":
    case "minutes":
      return russianPlural(count, "минуту", "минуты", "минут");
    case "hour":
    case "hours":
      return russianPlural(count, "час", "часа", "часов");
    default:
      return normalized;
  }
}

const DYNAMIC_TRANSLATIONS: ReadonlyArray<readonly [RegExp, (...groups: string[]) => string]> = [
  [/^(\d+) bindings$/, (count) => `${count} привязок`],
  [/^(\d+) processes$/, (count) => `${count} процессов`],
  [/^(\d+) process$/, (count) => `${count} процесс`],
  [/^(\d+) starts · (\d+) exits$/, (starts, exits) => `${starts} запусков · ${exits} завершений`],
  [/^Sampling every (.+)$/, (interval) => `Опрос каждые ${translateSamplingInterval(interval)}`],
  [/^Updated (.+)$/, (when) => `Обновлено ${translateRelativeTime(when)}`],
  [/^Checked (.+)$/, (when) => `Проверено ${translateRelativeTime(when)}`],
  [/^Updating (.+)$/, (name) => `Обновление ${name}`],
  [/^Installing (.+)$/, (name) => `Установка ${name}`],
  [/^(.+) update in progress\.$/, (name) => `Обновление ${name} выполняется.`],
  [/^(.+) updates are in progress\.$/, (names) => `Обновления ${names} выполняются.`],
  [/^(\d+) providers updated$/, (count) => `Обновлено провайдеров: ${count}`],
  [
    /^(\d+) providers still need updates$/,
    (count) => `Провайдеров всё ещё требуют обновления: ${count}`,
  ],
  [/^(\d+) provider updates failed$/, (count) => `Не удалось обновить провайдеров: ${count}`],
  [/^just now$/, () => "только что"],
  [/^now$/, () => "сейчас"],
  [/^(\d+)s ago$/, (count) => `${count}с назад`],
  [/^(\d+)m ago$/, (count) => `${count}м назад`],
  [/^(\d+)h ago$/, (count) => `${count}ч назад`],
  [/^(\d+)d ago$/, (count) => `${count}д назад`],
  [/^(\d+)w ago$/, (count) => `${count}н назад`],
  [
    /^(\d{1,2})(?::(\d{2}))? (AM|PM) yesterday$/,
    (hour, minute, period) => `${formatRussianClock(hour, minute, period)} вчера`,
  ],
  [
    /^(\d{1,2})(?::(\d{2}))? (AM|PM) today$/,
    (hour, minute, period) => `${formatRussianClock(hour, minute, period)} сегодня`,
  ],
  [
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{1,2})(?::(\d{2}))? (AM|PM) to (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{1,2})(?::(\d{2}))? (AM|PM)$/,
    (
      fromMonth,
      fromDay,
      fromHour,
      fromMinute,
      fromPeriod,
      toMonth,
      toDay,
      toHour,
      toMinute,
      toPeriod,
    ) =>
      `${formatRussianUsageDate(fromMonth, fromDay, fromHour, fromMinute, fromPeriod)} — ${formatRussianUsageDate(toMonth, toDay, toHour, toMinute, toPeriod)}`,
  ],
  [
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{1,2})(?::(\d{2}))? (AM|PM)$/,
    (month, day, hour, minute, period) => formatRussianUsageDate(month, day, hour, minute, period),
  ],
  [
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}) to (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})$/,
    (fromMonth, fromDay, toMonth, toDay) =>
      `${fromDay} ${translatedMonth(fromMonth)}. — ${toDay} ${translatedMonth(toMonth)}.`,
  ],
  [
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2})$/,
    (month, day) => `${day} ${translatedMonth(month)}.`,
  ],
  [
    /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC) (\d{1,2})$/,
    (month, day) => `${day} ${translatedMonth(month)}.`,
  ],
  [
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/,
    (month) => `${translatedMonth(month)}.`,
  ],
  [/^Show (\d+) more$/, (count) => `Показать ещё ${count}`],
  [/^No threads in (.+) yet$/, (project) => `В проекте ${project} пока нет чатов`],
  [/^Project settings for (.+)$/, (project) => `Настройки проекта: ${project}`],
  [/^Reachable at (.+)$/, (address) => `Доступно по адресу ${address}`],
  [
    /^Exposed on all interfaces\. Pairing links use (.+)\.$/,
    (host) => `Доступно на всех сетевых интерфейсах. Ссылки подключения используют ${host}.`,
  ],
  [/^Conflicts with (.+)$/, (branch) => `Конфликтует с ${branch}`],
  [
    /^Reset (.+) to default$/,
    (name) => `Восстановить значение по умолчанию: ${STATIC_TRANSLATIONS[name] ?? name}`,
  ],
  [/^Reset (.+) to its default\?$/, (name) => `Сбросить ${name} к значению по умолчанию?`],
  [/^Search (.+) files$/, (project) => `Поиск файлов: ${project}`],
  [/^Lives in (.+)$/, (path) => `Хранится в ${path}`],
  [/^(.+) files$/, (project) => `Файлы: ${project}`],
  [/^(\d+) of (\d+) failing$/, (count, total) => `Не пройдено проверок: ${count} из ${total}`],
  [/^(\d+) of (\d+) running$/, (count, total) => `Выполняется проверок: ${count} из ${total}`],
  [/^(\d+) of (\d+) passing$/, (count, total) => `Пройдено проверок: ${count} из ${total}`],
  [/^(.+) per active day$/, (value) => `${value} за активный день`],
  [/^(.+) per active hour$/, (value) => `${value} за активный час`],
  [/^(.+)% of observed input$/, (value) => `${value}% наблюдаемого ввода`],
  [/^(\d+) cache writes?$/, (count) => `${count} записей в кэш`],
  [/^includes (.+) reasoning$/, (value) => `включая ${value} токенов рассуждений`],
  [/^(.+) observed CPU time$/, (value) => `${value} процессорного времени за период наблюдения`],
  [/^(.+) combined process peaks$/, (value) => `${value} — суммарный пик памяти процессов`],
  [/^Delete thread "(.+)"\?$/, (title) => `Удалить чат «${title}»?`],
  [/^Delete skill “(.+)”\?$/, (name) => `Удалить скилл «${name}»?`],
  [/^Delete rule “(.+)”\?$/, (name) => `Удалить правило «${name}»?`],
  [/^Move skill (.+) to omp$/, (name) => `Переместить скилл ${name} в omp`],
  [/^Move rule (.+) to omp$/, (name) => `Переместить правило ${name} в omp`],
  [/^Edit skill (.+)$/, (name) => `Изменить скилл ${name}`],
  [/^Edit rule (.+)$/, (name) => `Изменить правило ${name}`],
  [/^Delete skill (.+)$/, (name) => `Удалить скилл ${name}`],
  [/^Delete rule (.+)$/, (name) => `Удалить правило ${name}`],
  [/^Saved skill (.+)$/, (name) => `Скилл ${name} сохранён`],
  [/^Saved rule (.+)$/, (name) => `Правило ${name} сохранено`],
  [/^Deleted skill (.+)$/, (name) => `Скилл ${name} удалён`],
  [/^Deleted rule (.+)$/, (name) => `Правило ${name} удалено`],
  [/^Expand (.+)$/, (name) => `Развернуть ${name}`],
  [/^Collapse (.+)$/, (name) => `Свернуть ${name}`],
  [/^Edit shortcut for (.+)$/, (name) => `Изменить сочетание для ${name}`],
  [/^Keybinding for (.+)$/, (name) => `Сочетание для ${name}`],
  [/^Actions for (.+)$/, (name) => `Действия для ${name}`],
  [/^Edit when clause for (.+)$/, (name) => `Изменить условие для ${name}`],
  [/^What should we build in (.+)\?$/, (project) => `Что будем делать в ${project}?`],
  [
    /^(\d+) omp config settings are available to edit\.$/,
    (count) => `Доступно ${count} настроек omp для редактирования.`,
  ],
  [
    /^Archived (.+) · Created (.+)$/,
    (archived, created) =>
      `Архивирован ${translateRelativeTime(archived)} · Создан ${translateRelativeTime(created)}`,
  ],
  [/^Support for (.+) is coming soon\.$/, (name) => `Поддержка ${name} появится позже.`],
  [/^Not available on this server: (.+)$/, (hint) => `Недоступно на этом сервере: ${hint}`],
  [/^Could not verify (.+)\.$/, (name) => `Не удалось проверить ${name}.`],
  [/^Toggle (.+) details$/, (name) => `Показать или скрыть подробности ${name}`],
  [/^(.+) availability$/, (name) => `Доступность ${name}`],
  [/^Waiting for (.+)'s configuration\.$/, (name) => `Ожидание конфигурации ${name}.`],
  [/^Available - (.+)$/, (detail) => `Доступно — ${detail}`],
  [/^Available — (.+)$/, (detail) => `Доступно — ${detail}`],
  [
    /^Conflicts with (.+)\. The most recent matching binding wins when both conditions can apply\.$/,
    (binding) =>
      `Конфликтует с ${binding}. Если подходят оба условия, используется более поздняя привязка.`,
  ],
  [/^Preview (.+)$/, (name) => `Предпросмотр ${name}`],
  [/^Remove attachment (.+)$/, (name) => `Удалить вложение ${name}`],
  [/^Open (.+) in editor$/, (name) => `Открыть ${name} в редакторе`],
  [/^Copy (.+) path$/, (name) => `Копировать путь ${name}`],
  [/^New thread in (.+)$/, (project) => `Новый чат в ${project}`],
  [/^(\d+) selected$/, (count) => `Выбрано: ${count}`],
  [/^(\d+) files? changed$/, (count) => `Изменено файлов: ${count}`],
  [/^(\d+) comments?$/, (count) => `Комментариев: ${count}`],
  [/^(\d+) commits?$/, (count) => `Коммитов: ${count}`],
  [/^Worked for (.+)$/, (duration) => `Работал ${duration}`],
  [/^Working for (.+)$/, (duration) => `Работает ${duration}`],
  [
    /^(.+) is not authenticated on this server\. Sign in or configure credentials using (.+) tool on the server host to enable change request features\.$/,
    (name, tool) =>
      `${name} не авторизован на этом сервере. Войдите или настройте учётные данные через ${tool} на хосте сервера, чтобы включить функции запросов на изменения.`,
  ],
  [/^(.+): show (\d+) scopes?$/, (label, count) => `${label}: показать области доступа (${count})`],
  [/^(\d+) scopes?$/, (count) => `${count} областей доступа`],
  [
    /^(.+) · (.+)$/,
    (left, right) => {
      const translatedLeft = STATIC_TRANSLATIONS[left] ?? left;
      const translatedRight = STATIC_TRANSLATIONS[right] ?? right;
      return translatedLeft === left && translatedRight === right
        ? `${left} · ${right}`
        : `${translatedLeft} · ${translatedRight}`;
    },
  ],
];

const TRANSLATED_ATTRIBUTES = [
  "aria-label",
  "aria-description",
  "aria-valuetext",
  "alt",
  "placeholder",
  "title",
] as const;

const NEVER_TRANSLATE_SELECTOR = [
  "pre",
  "code",
  "kbd",
  "samp",
  "textarea",
  "[contenteditable='true']",
  "[data-i18n-skip]",
  ".xterm",
  ".monaco-editor",
  ".cm-editor",
].join(",");

const MARKDOWN_INTERACTIVE_SELECTOR = [
  "button",
  "summary",
  "[role='button']",
  "[role='menuitem']",
  "[role='option']",
  "[role='tab']",
].join(",");

const originalText = new WeakMap<Text, string>();
const lastTranslatedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const lastTranslatedAttributes = new WeakMap<Element, Map<string, string>>();

function normalizeValue(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function translateRelativeTime(value: string): string {
  const normalized = normalizeValue(value);
  if (normalized === "just now") return "только что";
  if (normalized === "now") return "сейчас";
  const compactAgo = /^(\d+)(s|m|h|d|w) ago$/.exec(normalized);
  if (compactAgo) {
    const units: Readonly<Record<string, string>> = {
      s: "с",
      m: "м",
      h: "ч",
      d: "д",
      w: "н",
    };
    return `${compactAgo[1]}${units[compactAgo[2]!] ?? compactAgo[2]} назад`;
  }
  if (normalized.endsWith(" ago")) return `${normalized.slice(0, -4)} назад`;
  return normalized;
}

function translateValue(value: string): string | null {
  const normalized = normalizeValue(value);
  const direct = STATIC_TRANSLATIONS[normalized];
  if (direct !== undefined) return direct;
  for (const [pattern, render] of DYNAMIC_TRANSLATIONS) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const translated = render(...match.slice(1));
    if (translated !== normalized) return translated;
  }
  return null;
}

function isInsideNeverTranslate(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return element?.closest(NEVER_TRANSLATE_SELECTOR) !== null;
}

function isProtectedMarkdownText(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent) return false;
  const markdown = parent.closest(".chat-markdown");
  if (!markdown) return false;
  return parent.closest(MARKDOWN_INTERACTIVE_SELECTOR) === null;
}

function translateTextNode(node: Text): void {
  if (isInsideNeverTranslate(node) || isProtectedMarkdownText(node)) return;
  const raw = node.nodeValue ?? "";
  const trimmed = raw.trim();
  if (!trimmed) return;
  const translated = translateValue(trimmed);
  if (translated === null || translated === normalizeValue(trimmed)) return;

  if (lastTranslatedText.get(node) !== raw) {
    originalText.set(node, raw);
  }
  const start = raw.indexOf(trimmed);
  const next = `${raw.slice(0, start)}${translated}${raw.slice(start + trimmed.length)}`;
  lastTranslatedText.set(node, next);
  node.nodeValue = next;
}

function translateAttributes(element: Element): void {
  if (element.closest("[data-i18n-skip]")) return;
  let originals = originalAttributes.get(element);
  let lastTranslations = lastTranslatedAttributes.get(element);
  for (const attribute of TRANSLATED_ATTRIBUTES) {
    const raw = element.getAttribute(attribute);
    if (!raw) continue;
    const translated = translateValue(raw);
    if (translated === null || translated === normalizeValue(raw)) continue;

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
  if (root.matches(NEVER_TRANSLATE_SELECTOR)) return;
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
    document.documentElement.lang = language;
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
