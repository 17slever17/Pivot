export const RU_OMP_SCHEMA_1741_EXTRA: Readonly<Record<string, string>> = {
  // Sampling / service tiers / retry.
  "Very focused": "Очень сфокусированно",
  "No nucleus filtering": "Без nucleus-фильтрации",
  "Greedy top token": "Жадный выбор лучшего токена",
  "Very permissive": "Очень мягкий порог",
  Strict: "Строго",
  "Penalty for introducing already-present tokens (-1 = provider default)":
    "Штраф за использование уже встречавшихся токенов (-1 = значение провайдера)",
  "Penalty for repeated tokens (-1 = provider default)":
    "Штраф за повторяющиеся токены (-1 = значение провайдера)",
  "No penalty": "Без штрафа",
  "Mild novelty": "Небольшое поощрение новизны",
  "Encourage novelty": "Поощрять новизну",
  "Strong novelty": "Сильно поощрять новизну",
  "Allow repetition": "Разрешать повторения",
  "Mild penalty": "Небольшой штраф",
  "Strong penalty": "Сильный штраф",
  "OpenAI Responses and Codex response verbosity (low, medium, or high)":
    "Подробность ответов OpenAI Responses и Codex (low, medium или high)",
  "Prefer concise responses": "Предпочитать краткие ответы",
  "Balance brevity and detail (default)": "Баланс краткости и подробности (по умолчанию)",
  "Prefer detailed responses": "Предпочитать подробные ответы",
  "Processing tier for OpenAI / OpenAI-Codex requests, and OpenAI-family models routed via OpenRouter (none = omit). Sent as `service_tier`.":
    "Уровень обслуживания для OpenAI / OpenAI-Codex и моделей семейства OpenAI через OpenRouter (none = не отправлять). Передаётся как `service_tier`.",
  'Processing tier for Claude requests. `priority` realizes fast mode (`speed: "fast"`) on supported direct Anthropic models; ignored on Bedrock/Vertex Claude and via OpenRouter.':
    'Уровень обслуживания для Claude. `priority` включает fast mode (`speed: "fast"`) на поддерживаемых прямых моделях Anthropic; игнорируется для Bedrock/Vertex Claude и OpenRouter.',
  "Processing tier for Gemini (Google AI Studio + Vertex) requests, and Google-family models routed via OpenRouter (none = omit). Sent as the top-level `serviceTier` field.":
    "Уровень обслуживания для Gemini (Google AI Studio + Vertex) и моделей семейства Google через OpenRouter (none = не отправлять). Передаётся как поле `serviceTier`.",
  "Service Tier for spawned task/eval subagents. Inherit = match the main agent's live per-family tiers (tracks /fast); pick a value to apply it to whichever family the subagent's model belongs to.":
    "Service Tier для запускаемых task/eval субагентов. Inherit повторяет текущие уровни основного агента по семействам (включая /fast); выбранное значение применяется к семейству модели субагента.",
  "Service Tier for the advisor model. None = standard processing; Inherit = match the main agent's live per-family tiers; pick a value to apply it to the advisor model's family.":
    "Service Tier для модели advisor. None = стандартная обработка; Inherit повторяет уровни основного агента; выбранное значение применяется к семейству модели advisor.",
  "Maximum retry attempts on API errors": "Максимальное число повторных попыток при ошибках API",
  "Maximum wait between retries, in ms. When the provider asks us to wait longer than this and no credential or model fallback succeeds, the request fails fast instead of sleeping (e.g. 3-hour Anthropic rate-limit windows).":
    "Максимальное ожидание между повторами, в мс. Если провайдер требует ждать дольше и не сработал fallback учётных данных или модели, запрос быстро завершается ошибкой вместо долгого ожидания.",
  "Allow retry recovery to switch to configured fallback models":
    "Разрешать при повторных попытках переключаться на настроенные fallback-модели",
  "Use reliable coding-plan quota reports to prefer same-provider accounts, then configured fallback models, before a hard usage limit. Ordinary configured API keys are excluded.":
    "Использовать надёжные отчёты квот coding plan: сначала выбирать другие аккаунты того же провайдера, затем настроенные fallback-модели до достижения жёсткого лимита. Обычные API-ключи исключаются.",
  "Treat a coding-plan model as near its limit below this remaining percentage. Unknown or unmapped usage keeps the primary model.":
    "Считать модель coding plan близкой к лимиту при остатке ниже этого процента. При неизвестном расходе сохраняется основная модель.",
  "What to do when every same-provider coding-plan account is inside the reserve margin.":
    "Что делать, когда все аккаунты coding plan того же провайдера вошли в резервный порог.",
  "Keep interactive sessions on the primary until confirmed; background agents auto-fallback":
    "В интерактивных сессиях оставаться на основной модели до подтверждения; фоновые агенты переключаются автоматически",
  "Always select the next eligible configured fallback":
    "Всегда выбирать следующий подходящий настроенный fallback",
  "Do not spend reserve quota or select a fallback":
    "Не расходовать резервную квоту и не выбирать fallback",
  "When to return to the primary model after a fallback":
    "Когда возвращаться к основной модели после fallback",
  "Return to the primary model after its suppression window ends":
    "Возвращаться к основной модели после окончания окна подавления",
  "Stay on the fallback model until manually changed":
    "Оставаться на fallback-модели до ручного переключения",
  "When a Claude Fable 5 / Mythos 5 request is blocked by Anthropic's safety classifier, retry it on Claude Opus 4.8 server-side (Anthropic `server-side-fallback-2026-06-01` beta). Opt-in — leaving this off preserves the pre-fallback behavior for every request.":
    "Если запрос Claude Fable 5 / Mythos 5 блокируется классификатором безопасности Anthropic, повторять его на Claude Opus 4.8 через server-side fallback Anthropic. Опция включается явно; выключенное состояние сохраняет прежнее поведение.",

  // Read/display / task / tool labels commonly exposed by the 17.4 schema.
  "Markdown Previews": "Предпросмотр Markdown",
  "Read Summaries": "Сводки чтения",
  "Prose Summaries": "Сводки текста",
  "Inline Read Previews": "Встроенный предпросмотр read",
  "Lazy LSP Startup": "Отложенный запуск LSP",
  "Shared Language Servers": "Общие language server",
  "Format on Write": "Форматировать после записи",
  "Diagnostics on Write": "Диагностика после записи",
  "Diagnostics on Edit": "Диагностика после редактирования",
  "Deduplicate Diagnostics": "Не повторять диагностику",
  "Bash Auto-Background": "Автоматический фон для Bash",
  "Bash Approval Patterns": "Правила подтверждения Bash",
  "Bash Interceptor": "Перехватчик Bash",
  "direnv Auto-Load": "Автозагрузка direnv",
  "Shell Minimizer": "Сжатие вывода shell",
  "Python Eval Backend": "Бэкенд Python Eval",
  "JavaScript Eval Backend": "Бэкенд JavaScript Eval",
  "Ruby Eval Backend": "Бэкенд Ruby Eval",
  "Julia Eval Backend": "Бэкенд Julia Eval",
  "Eval Auto-Background": "Автоматический фон Eval",
  "Python Kernel Mode": "Режим ядра Python",
  "Python Interpreter": "Интерпретатор Python",
  "Ruby Interpreter": "Интерпретатор Ruby",
  "Julia Interpreter": "Интерпретатор Julia",
  "Tool Approval Policies": "Политики подтверждения инструментов",
  "Default approval behavior for tool calls. 'Always ask' auto-approves read-only tools only. 'Write' auto-approves read and workspace-write tools. 'Yolo' auto-approves all tiers; explicit per-tool overrides still win.":
    "Поведение подтверждения вызовов инструментов по умолчанию. 'Always ask' автоматически разрешает только read-only; 'Write' — чтение и запись workspace; 'Yolo' — все уровни. Явные правила для отдельных инструментов имеют приоритет.",
  "Enable plan mode for read-only exploration and planning before execution":
    "Включить режим планирования для read-only исследования и планирования перед выполнением",
  "Automatically enter plan mode at the start of every new session":
    "Автоматически включать режим планирования в начале каждой новой сессии",
  "Isolation backend for subagents. 'none' runs in the current working tree; 'auto' selects the best available copy-on-write backend; explicit modes force that backend.":
    "Бэкенд изоляции субагентов. 'none' запускает их в текущем рабочем дереве; 'auto' выбирает лучший доступный copy-on-write бэкенд; явный режим принудительно выбирает соответствующий бэкенд.",

  // Provider service extras.
  "Try production endpoint, fail over to sandbox on 5xx/429":
    "Сначала использовать production endpoint, при 5xx/429 переходить на sandbox",
  "Force production endpoint only": "Использовать только production endpoint",
  "Force sandbox endpoint only": "Использовать только sandbox endpoint",
  "Default serving path (no service_tier)": "Стандартный маршрут обслуживания (без service_tier)",
  "Priority serving path: higher reliability, premium per-token pricing":
    "Приоритетный маршрут: выше надёжность, выше цена за токен",
  "Prefer local on-device TTS; route .mp3 output to xAI when credentials exist":
    "Предпочитать локальный TTS на устройстве; для .mp3 использовать xAI при наличии учётных данных",
  "On-device neural TTS (Kokoro-82M); output is WAV/PCM16":
    "Локальный нейросетевой TTS (Kokoro-82M); вывод WAV/PCM16",
  "Requires xAI Grok OAuth or XAI_API_KEY; MP3 or WAV":
    "Требуется xAI Grok OAuth или XAI_API_KEY; MP3 или WAV",
  "Highest effort the `auto` classifier may resolve. `xhigh` keeps the classifier one tier below the top, so only an explicit `ultrathink` reaches `max`; `max` lets a turn the classifier judges exceptional bill the top tier on models that expose it.":
    "Максимальный effort, который может выбрать классификатор `auto`. `xhigh` удерживает его на один уровень ниже максимума, поэтому только явный `ultrathink` достигает `max`; `max` разрешает классификатору выбрать верхний уровень для исключительных ходов на поддерживающих моделях.",
};
