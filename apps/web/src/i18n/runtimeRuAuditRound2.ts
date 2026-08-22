import { RU_OMP_SCHEMA_1741 } from "./runtimeRuOmpSchema1741";
import { RU_OMP_SCHEMA_1741_EXTRA } from "./runtimeRuOmpSchema1741Extra";
import { RU_OMP_SCHEMA_1741_MISSING_A } from "./runtimeRuOmpSchema1741MissingA";
import { RU_OMP_SCHEMA_1741_MISSING_B } from "./runtimeRuOmpSchema1741MissingB";

export const RU_AUDIT_ROUND2: Readonly<Record<string, string>> = {
  ...RU_OMP_SCHEMA_1741,
  ...RU_OMP_SCHEMA_1741_EXTRA,
  ...RU_OMP_SCHEMA_1741_MISSING_A,
  ...RU_OMP_SCHEMA_1741_MISSING_B,

  // Source control / repository rules.
  "Repository rules": "Правила репозитория",
  "Conventional Commits": "Стандарт Conventional Commits",
  "Custom instructions": "Свои инструкции",

  // Pairing and connection helpers.
  "Paste a full pairing URL here to fill both fields automatically.":
    "Вставьте полную ссылку подключения, чтобы автоматически заполнить оба поля.",

  // Provider update lifecycle.
  Updating: "Обновление",
  Installing: "Установка",
  Install: "Установить",
  "Update now": "Обновить сейчас",
  "Updating provider": "Обновление провайдера",
  "Updating providers": "Обновление провайдеров",
  "Running provider update command.": "Выполняется команда обновления провайдера.",
  "New sessions will use the updated provider.":
    "Новые сессии будут использовать обновлённый провайдер.",
  "New sessions will use the updated providers.":
    "Новые сессии будут использовать обновлённые провайдеры.",
  "Provider updated": "Провайдер обновлён",
  "Provider updates finished": "Обновление провайдеров завершено",
  "Provider still needs an update": "Провайдер всё ещё требует обновления",
  "Providers still need updates": "Провайдеры всё ещё требуют обновления",
  "Install the update now or review provider settings.":
    "Установите обновление сейчас или проверьте настройки провайдера.",
  Settings: "Настройки",
  Update: "Обновить",

  // Archive / relative metadata. These are separate text nodes on several cards,
  // so translating only the combined sentence leaves a mixed-language line.
  Archived: "Архивирован",
  Created: "Создан",
  Checked: "Проверено",
  ago: "назад",
  yesterday: "вчера",
  today: "сегодня",
  "Checked unavailable": "Время проверки недоступно",

  // Usage.
  Day: "День",
  Hour: "Час",
  Hourly: "По часам",
  Daily: "По дням",
  Model: "Модель",
  Cost: "Стоимость",
  Share: "Доля",
  Tokens: "Токены",
  Total: "Итого",
  cost: "стоимость",
  tokens: "токены",
  model: "модель",
  day: "день",
  hour: "час",
  "7 days": "7 дней",
  "30 days": "30 дней",
  "90 days": "90 дней",
  "Past 24h": "Последние 24 ч",
  "Raw token cost": "Стоимость токенов без кэша",
  "Processed tokens": "Обработанные токены",
  "Cached input": "Кэшированный ввод",
  "Uncached input": "Некэшированный ввод",
  Output: "Вывод",
  "Cache savings": "Экономия кэша",
  Breakdown: "Разбивка",
  "No activity in this window.": "В этом интервале нет активности.",
  "Refresh usage": "Обновить статистику использования",
  "* if billed at full API rate": "* при тарификации по полной стоимости API",
  "vs full input rates": "по сравнению с полной стоимостью ввода",
  "of cost": "стоимости",
  "of tokens": "токенов",

  // Resource monitor / diagnostics.
  "Sampling every 1 second": "Опрос каждую секунду",
  "CPU average": "Средняя загрузка CPU",
  "I/O reads": "Чтение I/O",
  "I/O writes": "Запись I/O",
  "Identity: PID +": "Идентификатор: PID +",
  "start time": "время запуска",
  "Native counters identify which process is reading or writing. These application-level counters identify known T3 operations so process spikes can be correlated with specific persistence and logging paths.":
    "Нативные счётчики показывают, какой процесс читает или пишет данные. Счётчики уровня приложения отмечают известные операции T3, чтобы всплески нагрузки можно было сопоставить с конкретными путями хранения и журналирования.",
  "Last errors": "Последние ошибки",
  "Most frequent errors": "Самые частые ошибки",
  "Show full error": "Показать полную ошибку",
  "Last seen": "Последний раз",
  Reason: "Причина",
  Count: "Количество",
  Duration: "Длительность",
  Finished: "Завершено",

  // Full omp settings table and editor chrome.
  Entries: "Записи",
  Scope: "Область",
  Precedence: "Приоритет",
  Key: "Ключ",
  Type: "Тип",
  Description: "Описание",
  Value: "Значение",
  Unset: "Не задано",
  "Move to project": "Перенести в проект",
  "Add setting": "Добавить настройку",
  "Search settings": "Поиск настроек",
  Global: "Глобально",
  Project: "Проект",
  "Connect an environment to edit its omp settings.":
    "Подключите окружение, чтобы редактировать его настройки omp.",
  "Loading settings…": "Загрузка настроек…",
  "Could not load omp settings": "Не удалось загрузить настройки omp",
  "Check that omp is installed on the server host and try again.":
    "Проверьте, что omp установлен на сервере, и повторите попытку.",
  "Writes and resets apply to this project's .omp config.":
    "Изменения и сброс применяются к .omp-конфигурации этого проекта.",
  "Writes and resets apply to the global omp agent directory.":
    "Изменения и сброс применяются к глобальному каталогу агента omp.",
  "Effective: defaults <- global <- project <- overlays <- runtime":
    "Итог: defaults ← global ← project ← overlays ← runtime",
  "Effective: defaults <- global <- overlays <- runtime":
    "Итог: defaults ← global ← overlays ← runtime",

  // Provider settings page descriptions found in the same full-page audit.
  "Health check interval": "Интервал проверки состояния",
  "Refresh provider availability, versions, auth state, and model metadata in the background. Set this to 0 seconds to rely on manual refreshes.":
    "Фоново обновляет доступность провайдеров, версии, состояние авторизации и метаданные моделей. Установите 0 секунд, чтобы использовать только ручное обновление.",
  "This interval is configured here, then the shared Background activity policy decides whether provider probes may run when the timer fires. Custom intervals appear as Advanced in General settings.":
    "Интервал задаётся здесь, а общая политика фоновой активности определяет, можно ли запускать проверки провайдера при срабатывании таймера. Пользовательские интервалы отображаются как «Расширенные» в общих настройках.",
  seconds: "секунд",
};