// Russian copy for the settings metadata exposed by omp 17.4.x over RPC.
// Keys are the exact English UI metadata strings, not config keys, so unknown
// future/user-authored text is left untouched instead of being mistranslated.
export const RU_OMP_SCHEMA_1741: Readonly<Record<string, string>> = {
  // Common types / groups / choices.
  boolean: "логический",
  string: "строка",
  number: "число",
  enum: "перечисление",
  array: "массив",
  record: "объект",
  Appearance: "Оформление",
  Model: "Модель",
  Interaction: "Взаимодействие",
  Context: "Контекст",
  Memory: "Память",
  Files: "Файлы",
  Shell: "Оболочка",
  Tools: "Инструменты",
  Tasks: "Задачи",
  Providers: "Провайдеры",
  Services: "Сервисы",
  Display: "Отображение",
  Thinking: "Рассуждение",
  Sampling: "Сэмплирование",
  Prompt: "Промпт",
  Input: "Ввод",
  Notifications: "Уведомления",
  General: "Основные",
  Reading: "Чтение",
  Editing: "Редактирование",
  Execution: "Выполнение",
  Isolation: "Изоляция",
  Privacy: "Конфиденциальность",
  "Available Tools": "Доступные инструменты",
  "Output Limits": "Ограничения вывода",
  "Discovery & MCP": "Обнаружение и MCP",
  "Startup & Updates": "Запуск и обновления",
  "Retry & Fallback": "Повторы и fallback",
  "Read Summaries": "Сводки чтения",
  "Eval & Runtimes": "Eval и среды выполнения",
  "Commands & Skills": "Команды и скиллы",
  Default: "По умолчанию",
  Disabled: "Отключено",
  Enabled: "Включено",
  Auto: "Авто",
  Off: "Выкл.",
  On: "Вкл.",
  Global: "Глобально",
  "Per-project": "Для проекта",
  "Per project": "Для проекта",
  "No limit": "Без ограничения",

  // Top-level/provider/model entries visible near the top of the full surface.
  'Maximum concurrent LLM requests per provider id (for example "openai" or "anthropic"), shared across local OMP processes with this config root. Omitted providers are unlimited.':
    'Максимальное число одновременных запросов к LLM для каждого id провайдера (например, "openai" или "anthropic"), общее для локальных процессов OMP с этим корнем конфигурации. Для неуказанных провайдеров ограничений нет.',
  "Route Codex code_mode_only models (GPT-5.6) through the eval tool as a programmatic execution surface: the direct tool surface collapses to eval/ask/todo and every other session tool is invoked from eval cells. Mirrors codex-rs Code Mode. 'auto' follows the model catalog flag.":
    "Направлять модели Codex code_mode_only (GPT-5.6) через инструмент eval как программную среду выполнения: прямой набор инструментов сокращается до eval/ask/todo, а остальные инструменты сессии вызываются из ячеек eval. Соответствует Code Mode в codex-rs. В режиме 'auto' используется флаг из каталога модели.",
  "Extra tool names to keep directly callable alongside eval/ask/todo when Codex Code Mode is active.":
    "Дополнительные инструменты, которые остаются доступными напрямую вместе с eval/ask/todo при активном Codex Code Mode.",
  "Where model selector role assignments are saved": "Где сохраняются назначения моделей для ролей",
  "Save role models in the active profile config (current behavior)":
    "Сохранять модели ролей в конфигурации активного профиля (текущее поведение)",
  "Save project role models in .omp/config.yml; missing project roles use global defaults":
    "Сохранять модели ролей проекта в .omp/config.yml; отсутствующие роли используют глобальные значения по умолчанию",
  "Theme used when the terminal has a dark background": "Тема для терминала с тёмным фоном",
  "Theme used when the terminal has a light background": "Тема для терминала со светлым фоном",
  "Glyph set for icons and symbols (Unicode, Nerd Font, or ASCII)":
    "Набор глифов для значков и символов (Unicode, Nerd Font или ASCII)",
  "Standard symbols (default)": "Стандартные символы (по умолчанию)",
  "Requires Nerd Font": "Требуется Nerd Font",
  "Maximum compatibility": "Максимальная совместимость",
  "Use blue instead of green for diff additions":
    "Использовать синий вместо зелёного для добавлений в diff",
  "Visual layout of the input editor and status line":
    "Внешний вид редактора ввода и строки состояния",
  "Pre-built status line configurations": "Готовые конфигурации строки состояния",
  "Style of separators between segments": "Стиль разделителей между сегментами",
  "How the line between the left and right segments reflects context usage (box composer only)":
    "Как линия между левыми и правыми сегментами отображает использование контекста (только composer box)",
  "Use the session name color for the editor border and status line gap":
    "Использовать цвет имени сессии для рамки редактора и промежутка строки состояния",
  "Use the terminal's default background for the status line instead of the theme's `statusLineBg`. Powerline end caps are dropped because they need a contrasting fill to bridge into the surrounding terminal.":
    "Использовать стандартный фон терминала для строки состояния вместо `statusLineBg` темы. Концевые элементы Powerline отключаются, поскольку им нужен контрастный фон.",
  "Show the thinking level as a single icon on the model name instead of a separate ` · <level>` suffix.":
    "Показывать уровень рассуждения одним значком рядом с моделью вместо отдельного суффикса ` · <level>`.",
  "Tool output above this size is saved as an artifact; tail is kept inline":
    "Вывод инструмента больше этого размера сохраняется как артефакт; хвост остаётся в сообщении",
  "Amount of tail content kept inline when output spills to artifact":
    "Объём хвоста, оставляемого в сообщении при переносе вывода в артефакт",
  "Amount of head content kept inline alongside the tail when output spills to artifact (middle elision). 0 disables — keep tail only.":
    "Объём начала вывода, оставляемого вместе с хвостом при переносе в артефакт (с пропуском середины). 0 отключает начало — остаётся только хвост.",
  "Per-line byte cap for streaming tool outputs (bash, python, js eval) and `read`. Lines wider than this are ellipsis-truncated; remaining bytes up to the next newline are dropped. 0 disables.":
    "Максимум байт на строку для потокового вывода инструментов (bash, python, js eval) и `read`. Более длинные строки обрезаются с многоточием; остаток до следующего перевода строки отбрасывается. 0 отключает ограничение.",

  // Appearance / display.
  "Erase and replay terminal scrollback when a block's final form replaces its live preview. When off (default), stale preview copies remain in history and the final content is appended below.":
    "Очищать и заново выводить scrollback терминала, когда окончательная версия блока заменяет живой предпросмотр. Если выключено, старые предпросмотры остаются в истории, а итоговый вывод добавляется ниже.",
  "Animation style for working/loading messages": "Стиль анимации сообщений о работе и загрузке",
  "Soft cosine wave sweeping across the text": "Мягкая косинусная волна по тексту",
  "Knight Rider 1982 red light bouncing left-right": "Красный сканер в стиле Knight Rider 1982",
  "No animation; static muted text": "Без анимации; статичный приглушённый текст",
  "Reveal assistant text and streamed tool input smoothly while chunks arrive":
    "Плавно показывать текст ассистента и потоковый ввод инструментов по мере поступления чанков",
  "Hide model-initiated tool calls and results from the transcript":
    "Скрывать вызовы инструментов моделью и их результаты из истории",
  "Show per-turn token usage on assistant messages":
    "Показывать расход токенов каждого хода в сообщениях ассистента",
  "Show a divider above an assistant turn whose request lost (missed) the prompt cache":
    "Показывать разделитель перед ходом ассистента, запрос которого не попал в кэш промпта",
  "Collapse pre-compaction history behind the summary divider on the live transcript; disable to keep the full transcript inline with dividers at each compaction point":
    "Сворачивать историю до compaction за разделителем сводки; отключите, чтобы вся история оставалась развёрнутой с разделителями в точках compaction",
  "Show terminal cursor for IME support": "Показывать курсор терминала для поддержки IME",
  "Move the prompt's bottom border to a separate row so macOS IME preedit cannot displace it":
    "Переносить нижнюю границу промпта в отдельную строку, чтобы preedit macOS IME не смещал её",

  // Model / reasoning / prompt / sampling.
  "Reasoning depth for thinking-capable models":
    "Глубина рассуждения для моделей с поддержкой thinking",
  "Hide thinking blocks in assistant responses": "Скрывать блоки thinking в ответах ассистента",
  "Omit code blocks from thinking summaries and replace them with an ellipsis":
    "Убирать блоки кода из сводок thinking и заменять их многоточием",
  "Instruct upstream providers to completely omit thinking summaries from responses (where supported)":
    "Просить провайдеров полностью исключать сводки thinking из ответов, если это поддерживается",
  "Private scratchpad; not shown to user. Disables supported GPT, Claude, and Gemini reasoning":
    "Приватный scratchpad, не показываемый пользователю. Отключает поддерживаемое reasoning у GPT, Claude и Gemini",
  "At your own risk: providers have flagged this request shape as abuse, up to account-level enforcement":
    "Используйте на свой риск: провайдеры могут считать такой формат запроса нарушением вплоть до санкций на уровне аккаунта",
  "Enable automatic stream loop detection for model reasoning and prose":
    "Включить автоматическое обнаружение циклов в потоке рассуждений и текста модели",
  "Apply loop guard to assistant prose messages in addition to thinking logs":
    "Применять защиту от циклов к обычному тексту ассистента вместе с thinking-логами",
  "When a Gemini reasoning stream emits many consecutive planning headers without calling a tool, interrupt it and inject a reminder to issue a tool call (requires Loop Guard)":
    "Если reasoning-поток Gemini выдаёт много заголовков планирования подряд без вызова инструмента, прерывать его и добавлять напоминание вызвать инструмент (требуется Loop Guard)",
  "Detect consecutive identical tool calls across turns and inject a corrective steer":
    "Обнаруживать последовательные одинаковые вызовы инструментов между ходами и добавлять корректирующую инструкцию",
  "Consecutive identical tool calls required before the corrective steer is injected":
    "Число одинаковых вызовов инструмента подряд до добавления корректирующей инструкции",
  "Tool names that may repeat consecutively without triggering the cross-turn loop guard":
    "Инструменты, которым разрешено повторяться подряд без срабатывания межходовой защиты от циклов",
  "Render full tool descriptors in the system prompt and strip top-level/nested descriptions from provider tool schemas so descriptor text is sent once. Auto enables this for Gemini models and disables it otherwise":
    "Помещать полные описания инструментов в системный промпт и удалять их из схем провайдера, чтобы текст отправлялся один раз. Auto включает это для Gemini и отключает для остальных моделей",
  "Surface the active model identifier in the system prompt so the agent knows which model it is":
    "Добавлять идентификатор активной модели в системный промпт, чтобы агент знал, на какой модели работает",
  "Render the workspace directory tree in the system prompt. WARNING: This can bust prompt caching across sessions when files are modified.":
    "Добавлять дерево каталогов workspace в системный промпт. ВНИМАНИЕ: изменения файлов могут ломать кэширование промпта между сессиями.",
  "Extra workspace directories added to every session as additional roots (multi-root workspace). Managed live via /add-dir and /remove-dir. Paths resolve relative to cwd; absolute paths recommended. The agent is told these roots exist and can read/grep/glob them.":
    "Дополнительные каталоги workspace, подключаемые к каждой сессии как дополнительные корни. Управляются через /add-dir и /remove-dir. Относительные пути считаются от cwd; рекомендуются абсолютные. Агент получает сведения об этих корнях и может read/grep/glob их.",
  "Communication style rendered into the system prompt's personality block":
    "Стиль общения, добавляемый в блок personality системного промпта",
  "Terse, evidence-first engineer; dense, action-oriented replies":
    "Краткий инженерный стиль с приоритетом фактов; плотные ответы, ориентированные на действия",
  "Warm, encouraging collaborator focused on momentum and morale":
    "Доброжелательный стиль сотрудника, поддерживающий темп и мотивацию",
  "Direct, efficient engineer focused on clarity and rigor":
    "Прямой и эффективный инженерный стиль с упором на ясность и строгость",
  "Omit the personality block entirely": "Полностью исключить блок personality",
  "Sampling temperature (0 = deterministic, 1 = creative, -1 = provider default)":
    "Температура сэмплирования (0 = детерминированно, 1 = творчески, -1 = значение провайдера)",
  "Nucleus sampling cutoff (0-1, -1 = provider default)":
    "Порог nucleus sampling (0–1, -1 = значение провайдера)",
  "Sample from top-K tokens (-1 = provider default)":
    "Выбирать из top-K токенов (-1 = значение провайдера)",
  "Minimum probability threshold (0-1, -1 = provider default)":
    "Минимальный порог вероятности (0–1, -1 = значение провайдера)",
  "Use provider default": "Использовать значение провайдера",
  Deterministic: "Детерминированно",
  Focused: "Сфокусированно",
  Balanced: "Сбалансированно",
  Creative: "Творчески",
  "Maximum variety": "Максимальное разнообразие",
  Broad: "Широко",

  // Input / startup / notifications / collaboration.
  "When steering messages interrupt tool execution":
    "Когда steering-сообщения прерывают выполнение инструментов",
  "What happens between /loop iterations before re-submitting the prompt":
    "Что происходит между итерациями /loop перед повторной отправкой промпта",
  "Action when pressing Escape twice with empty editor":
    "Действие при двойном Escape в пустом редакторе",
  "Default filter mode when opening the session tree":
    "Фильтр по умолчанию при открытии дерева сессии",
  "Max visible items in autocomplete dropdown (3-20)":
    "Максимум видимых пунктов в автодополнении (3–20)",
  "Suggest emojis from `:name:` shortcodes and expand text emoticons like `:D` or `:-)`":
    "Предлагать эмодзи по коротким кодам `:name:` и разворачивать текстовые смайлы вроде `:D` или `:-)`",
  "When a paste reaches this many lines, offer a menu to wrap it in a code block, wrap it in XML tags, or save it to a file. 0 disables the menu (large pastes still collapse to a [Paste] marker).":
    "Если вставка достигает указанного числа строк, предлагать обернуть её в блок кода/XML или сохранить в файл. 0 отключает меню; большие вставки всё равно сворачиваются в маркер [Paste].",
  "Skip welcome screen and startup status messages":
    "Пропускать приветственный экран и сообщения состояния при запуске",
  "Show the full animated setup splash on normal interactive startup without rerunning setup. Quiet Startup still suppresses it.":
    "Показывать полный анимированный setup-экран при обычном интерактивном запуске без повторного setup. Quiet Startup по-прежнему скрывает его.",
  "Show newly added onboarding steps once per setup version":
    "Показывать новые шаги знакомства один раз для каждой версии setup",
  "Check for omp updates on startup": "Проверять обновления omp при запуске",
  "Check for plugin updates on startup": "Проверять обновления плагинов при запуске",
  "Choose whether update notes start as a summary, full details, or stay hidden":
    "Выбирать, показывать заметки обновления как сводку, полностью или скрывать",
  "Enable hidden notices for standalone ultrathink, orchestrate, and workflowz keywords":
    "Включить скрытые инструкции для отдельных ключевых слов ultrathink, orchestrate и workflowz",
  "Let standalone ultrathink request maximum automatic thinking and append its hidden notice":
    "Разрешить отдельному ultrathink запрашивать максимальный automatic thinking и добавлять скрытую инструкцию",
  "Let standalone orchestrate append its hidden multi-agent orchestration notice":
    "Разрешить отдельному orchestrate добавлять скрытую инструкцию мультиагентной оркестрации",
  "Let standalone workflowz append its hidden eval workflow notice":
    "Разрешить отдельному workflowz добавлять скрытую инструкцию eval-workflow",
  "Notify when the agent finishes a turn": "Уведомлять, когда агент завершает ход",
  "Notify when the agent stops with an error": "Уведомлять, когда агент останавливается с ошибкой",
  "Auto-select the recommended ask option after this many seconds (0 disables)":
    "Автоматически выбирать рекомендованный вариант ask через указанное число секунд (0 отключает)",
  "Notify when the ask tool is waiting for input": "Уведомлять, когда инструмент ask ожидает ввод",
  "Generate a brief LLM recap of where things stand after the terminal has been idle":
    "Создавать краткую LLM-сводку состояния после простоя терминала",
  "Seconds to wait while idle before showing the recap":
    "Сколько секунд простоя ждать перед показом сводки",
  "Relay used by /collab (wss://host[:port])": "Relay, используемый /collab (wss://host[:port])",
  "Browser UI used by /collab links; empty derives from collab.relayUrl; explicit http:// is localhost-only":
    "Веб-интерфейс для ссылок /collab; пустое значение выводится из collab.relayUrl; явный http:// разрешён только для localhost",
  "Name shown to other collab participants (default: OS username)":
    "Имя, показываемое другим участникам collab (по умолчанию имя пользователя ОС)",
  "Where /share uploads the encrypted session blob":
    "Куда /share загружает зашифрованный blob сессии",
  "Run the secret obfuscator over /share snapshots before upload (uses the secrets.* config)":
    "Обфусцировать секреты в снимках /share перед загрузкой (используются настройки secrets.*)",

  // Memory / branch summaries.
  "Prompt to summarize when leaving a branch": "Предлагать создать сводку при выходе из ветки",
  "Off, local summary pipeline, Mnemopi SQLite, or Hindsight remote memory":
    "Без памяти, локальная сводка, Mnemopi SQLite или удалённая память Hindsight",
  "No memory subsystem runs": "Подсистема памяти отключена",
  "Local rollout summarisation pipeline (memory_summary.md)":
    "Локальная система сводок rollout (memory_summary.md)",
  "Vectorize Hindsight remote memory service": "Удалённый сервис памяти Hindsight",
  "Local SQLite recall/retain backend with optional embeddings":
    "Локальный SQLite-бэкенд recall/retain с необязательными embeddings",
  "After the agent stops, nudge it to capture lessons to memory and create/enhance isolated managed skills":
    "После остановки агента предлагать сохранить извлечённые уроки в память и создать/улучшить изолированные управляемые скиллы",
  "When on, auto-run one private capture turn at stop (uses extra tokens). When off, only standing auto-learn guidance remains.":
    "Если включено, после остановки автоматически выполнять один приватный ход сохранения (тратит дополнительные токены). Если выключено, остаётся только постоянная инструкция auto-learn.",
  "Optional SQLite DB path. Defaults to the agent memories directory.":
    "Необязательный путь к SQLite БД. По умолчанию используется каталог памяти агента.",
  "Optional shared bank base name. Per-project modes derive project-local banks from it.":
    "Необязательное базовое имя общего банка. Режимы для проекта создают из него локальные банки.",
  "global = one shared bank; per-project = isolated bank per cwd; per-project-tagged = project-local writes plus global recall visibility":
    "global = один общий банк; per-project = отдельный банк для каждого cwd; per-project-tagged = локальные записи проекта с видимостью глобального recall",
  "Local embedding model family. en = stronger English model; multilingual = cross-language model. Changing this rebuilds existing memory embeddings on next start.":
    "Семейство локальной embedding-модели. en = более сильная английская модель; multilingual = многоязычная. Изменение пересоберёт существующие embeddings памяти при следующем запуске.",
  "Recall local memories into the first turn of each session":
    "Добавлять локальные воспоминания в первый ход каждой сессии",
  "Retain completed conversation turns into local Mnemopi memory":
    "Сохранять завершённые ходы разговора в локальную память Mnemopi",
  "Enable 4-voice recall (vector, graph, fact, temporal) fused with reciprocal rank fusion":
    "Включить четырёхканальный recall (vector, graph, fact, temporal) с reciprocal rank fusion",
  "Enable the tiered query result cache for repeated and similar recall queries":
    "Включить многоуровневый кэш результатов для повторных и похожих recall-запросов",
  "Ingest new memories into the episodic graph as they are stored, linking them to related entities and memories":
    "При сохранении добавлять новые воспоминания в эпизодический граф и связывать их с релевантными сущностями и воспоминаниями",
  "Force deterministic FTS-only recall instead of vector embeddings":
    "Использовать детерминированный FTS-only recall вместо векторных embeddings",

  // Files / LSP / shell / runtimes.
  "Render Markdown read results as formatted terminal Markdown previews instead of raw source":
    "Показывать результаты чтения Markdown как форматированный предпросмотр вместо исходного текста",
  "Return structural code summaries when read is called without an explicit selector":
    "Возвращать структурные сводки кода, если read вызывается без явного селектора",
  "Return structural summaries for Markdown and plain text reads":
    "Возвращать структурные сводки для Markdown и обычного текста",
  "Minimum multiline body or literal length before read summaries collapse it":
    "Минимальная длина многострочного тела или литерала, после которой сводка read сворачивает его",
  "Minimum multiline block comment length before read summaries collapse it":
    "Минимальная длина многострочного блочного комментария, после которой сводка read сворачивает его",
  "Files with fewer total lines are read verbatim instead of structurally summarized":
    "Файлы с меньшим числом строк читаются целиком вместо структурной сводки",
  "BFS-unfold elidable spans until the summary is at least this many visible lines. 0 keeps only the outermost elisions.":
    "Раскрывать сворачиваемые участки BFS, пока сводка не достигнет указанного числа видимых строк. 0 оставляет только внешние свёртки.",
  "Hard ceiling on summary size while BFS-unfolding. An unfold whose revealed lines would exceed this is skipped (that span stays folded) and unfolding continues with the remaining spans.":
    "Жёсткий предел размера сводки при BFS-раскрытии. Участок, раскрытие которого превысит предел, остаётся свёрнутым; обработка остальных продолжается.",
  "Render read tool results inline in the transcript instead of summary rows":
    "Показывать результаты инструмента read прямо в истории вместо строк-сводок",
  "Enable the lsp tool for code intelligence (definitions, references, diagnostics, rename)":
    "Включить инструмент lsp для анализа кода (определения, ссылки, диагностика, переименование)",
  "Start language servers on first use (lsp tool or editing a matching file type) instead of at session startup":
    "Запускать language server при первом использовании вместо запуска вместе с сессией",
  "Share one language server per project across omp instances via the daemon broker (falls back to private servers when unavailable)":
    "Совместно использовать один language server на проект между экземплярами omp через daemon broker; при недоступности использовать отдельные серверы",
  "Automatically format code files using LSP after writing":
    "Автоматически форматировать файлы кода через LSP после записи",
  "Return LSP diagnostics after writing code files":
    "Возвращать диагностику LSP после записи файлов кода",
  "Return LSP diagnostics after editing code files":
    "Возвращать диагностику LSP после редактирования файлов кода",
  "Suppress post-edit LSP diagnostics already shown for a file; only surface new or changed ones":
    "Не повторять уже показанную диагностику LSP после редактирования; показывать только новую или изменившуюся",
  "Enable the bash tool for shell command execution":
    "Включить инструмент bash для выполнения команд оболочки",
  "Automatically background long-running bash commands and deliver the result later":
    "Автоматически отправлять долгие команды bash в фон и возвращать результат позже",
  "Ordered bash command approval rules. Each item has match and approval fields; only '*' wildcards are supported.":
    "Упорядоченные правила подтверждения команд bash. Каждый пункт содержит match и approval; поддерживаются только wildcard `*`.",
  "Block shell commands that have dedicated tools":
    "Блокировать shell-команды, для которых есть отдельные инструменты",
  "Auto-load a repo's direnv/devenv `.envrc` into the bash session so devenv tools and env vars are present without manual `direnv exec`. Honors direnv's allow list: an `.envrc` you haven't `direnv allow`ed is never executed":
    "Автоматически загружать `.envrc` direnv/devenv репозитория в bash-сессию, чтобы инструменты и переменные окружения были доступны без `direnv exec`. Учитывается allow-list direnv: `.envrc`, для которого не выполнен `direnv allow`, не запускается.",
  "Max wait for the first `direnv export` (a cold devenv shell can be slow); on timeout the session runs without the direnv env":
    "Максимальное ожидание первого `direnv export`; при таймауте сессия запускается без окружения direnv",
  "Compress verbose shell output (git, npm, cargo, etc.) before returning it to the agent":
    "Сжимать многословный вывод shell (git, npm, cargo и т. п.) перед передачей агенту",
  "Source outline mode for cat/read of source files: default or aggressive":
    "Режим outline исходников для cat/read: обычный или агрессивный",
  "Allow the eval tool to dispatch Python cells to the IPython kernel":
    "Разрешить eval выполнять Python-ячейки в ядре IPython",
  "Allow the eval tool to dispatch JavaScript cells to the in-process runtime":
    "Разрешить eval выполнять JavaScript-ячейки во встроенной среде",
  "Allow the eval tool to dispatch Ruby cells to the persistent Ruby kernel":
    "Разрешить eval выполнять Ruby-ячейки в постоянном ядре Ruby",
  "Allow the eval tool to dispatch Julia cells to the persistent Julia kernel":
    "Разрешить eval выполнять Julia-ячейки в постоянном ядре Julia",
  "Automatically background long-running eval cells and deliver the result later":
    "Автоматически отправлять долгие eval-ячейки в фон и возвращать результат позже",
  "Keep the IPython kernel alive across eval calls or start fresh each time":
    "Сохранять ядро IPython между вызовами eval или запускать новое каждый раз",
  "Optional path to an exact Python executable. When set, automatic Python runtime discovery is skipped.":
    "Необязательный путь к конкретному Python. Если указан, автоматический поиск Python отключается.",
  "Optional path to an exact Ruby executable. When set, automatic Ruby runtime discovery is skipped.":
    "Необязательный путь к конкретному Ruby. Если указан, автоматический поиск Ruby отключается.",
  "Optional path to an exact Julia executable. When set, automatic Julia runtime discovery is skipped.":
    "Необязательный путь к конкретному Julia. Если указан, автоматический поиск Julia отключается.",

  // Tool execution / browser / MCP / tasks.
  "Enable the web_search tool for live web results":
    "Включить инструмент web_search для актуальных результатов из интернета",
  "Enable OMP-native security scan planning, execution, and the read-only security:// resource namespace":
    "Включить встроенное в OMP планирование и выполнение security scan, а также read-only пространство security://",
  "Enable the ask tool for interactive user questions":
    "Включить инструмент ask для интерактивных вопросов пользователю",
  "Enable the browser tool for scripted Chromium automation (puppeteer)":
    "Включить инструмент browser для автоматизации Chromium через puppeteer",
  "Default HTTP CDP discovery endpoint (for example http://127.0.0.1:9222) to attach to instead of launching a browser. Explicit app.cdp_url or app.path on the tool call take precedence.":
    "HTTP CDP endpoint по умолчанию (например http://127.0.0.1:9222) для подключения вместо запуска браузера. Явные app.cdp_url или app.path в вызове инструмента имеют приоритет.",
  "Drive your own Chrome tabs through the omp browser relay. Install the extension once (`omp browser-relay install`); the relay server auto-starts when the browser tool needs it. Takes precedence over Browser CDP URL; set PI_BROWSER_RELAY=0 or PI_BROWSER_RELAY=1 to override.":
    "Управлять своими вкладками Chrome через browser relay omp. Расширение устанавливается один раз (`omp browser-relay install`); relay-сервер запускается автоматически по запросу browser. Имеет приоритет над Browser CDP URL; PI_BROWSER_RELAY=0/1 переопределяет настройку.",
  "omp browser relay endpoint (default http://127.0.0.1:9224).":
    "Endpoint browser relay omp (по умолчанию http://127.0.0.1:9224).",
  "Launch browser in headless mode (disable to show browser UI)":
    "Запускать браузер в headless-режиме (отключите, чтобы видеть UI браузера)",
  "Use cmux WKWebView surfaces for browser automation when a cmux socket is available. Set PI_BROWSER_CMUX=0 or PI_BROWSER_CMUX=1 to override.":
    "Использовать поверхности cmux WKWebView для автоматизации браузера при доступном сокете cmux. PI_BROWSER_CMUX=0/1 переопределяет настройку.",
  "Directory to save screenshots. If unset, screenshots go to a temp file. Supports ~. Examples: ~/Downloads, ~/Desktop, /sdcard/Download (Android)":
    "Каталог для сохранения скриншотов. Если не задан, используется временный файл. Поддерживается ~. Примеры: ~/Downloads, ~/Desktop, /sdcard/Download (Android)",
  "Ask the agent to describe the intent of each tool call before executing it":
    "Просить агента описывать цель каждого вызова инструмента перед выполнением",
  "With in-band tool calls, stop the model immediately when it starts hallucinating a tool result mid-turn. Disable to let the model finish generating and discard the fabricated continuation instead.":
    "При in-band вызовах инструментов немедленно останавливать модель, если она начинает выдумывать результат инструмента. Если отключено, модель завершает генерацию, а выдуманное продолжение отбрасывается.",
  "Maximum timeout in seconds the agent can set for any tool (0 = no limit)":
    "Максимальный таймаут в секундах, который агент может задать для инструмента (0 = без ограничения)",
  "Enable async bash commands and background task execution":
    "Включить асинхронные bash-команды и фоновые задачи",
  "How long a `hub` wait watches background jobs before returning the current state. A fixed value waits that exact duration every time. `smart` adapts: it starts at 5s and lengthens with each back-to-back wait (up to 5m), then resets to 5s after about a minute without waiting.":
    "Сколько `hub wait` следит за фоновыми задачами перед возвратом текущего состояния. Фиксированное значение используется каждый раз. `smart` начинает с 5 с, увеличивает ожидание при повторных wait до 5 мин и сбрасывается до 5 с примерно через минуту без ожидания.",
  "Default timeout for hub message waits (and send await:true) in milliseconds; 0 disables the timeout":
    "Таймаут по умолчанию для ожидания сообщений hub (и send await:true), в миллисекундах; 0 отключает таймаут",
  "Mount rarely-used (discoverable) tools under xd:// device URLs driven via read/write instead of shipping their schemas on every request. Sessions without a granted write tool skip mounting and expose every tool top-level. Disable to expose every enabled tool top-level.":
    "Подключать редко используемые обнаруживаемые инструменты через URL устройств xd:// и управлять ими через read/write вместо отправки их схем в каждом запросе. Сессии без доступного write не монтируют их и показывают все инструменты верхнего уровня. Отключите, чтобы всегда показывать все включённые инструменты верхнего уровня.",
  "Choose which mounted-device docs and schemas are inlined in the system prompt. Built-ins keeps core tools inline while MCP and extension tools stay on-demand.":
    "Выбирать, документация и схемы каких подключённых устройств встраиваются в системный промпт. Built-ins оставляет основные инструменты inline, а MCP и расширения загружает по требованию.",
  "When xd:// Prompt Docs is Built-ins Only, inline dynamic devices whose names match these glob patterns (for example mcp__context_mode_*). Catalog Only ignores this setting.":
    "В режиме xd:// Prompt Docs = Built-ins Only встраивать динамические устройства, чьи имена соответствуют этим glob-шаблонам (например mcp__context_mode_*). Catalog Only игнорирует настройку.",
  "Load .mcp.json/mcp.json from project root": "Загружать .mcp.json/mcp.json из корня проекта",
  "Render non-JSON MCP text results as Markdown in the transcript":
    "Показывать текстовые результаты MCP не в JSON как Markdown в истории",
  "Inject MCP resource updates into the agent conversation":
    "Добавлять обновления ресурсов MCP в разговор агента",
  "Debounce window in milliseconds for MCP resource updates before injecting them into the conversation":
    "Окно debounce в миллисекундах для обновлений ресурсов MCP перед добавлением в разговор",
  "Enable plan mode for read-only exploration and planning before execution":
    "Включить plan mode для read-only исследования и планирования перед выполнением",
  "Automatically enter plan mode at the start of every new session":
    "Автоматически включать plan mode в начале каждой новой сессии",
  "Enable per-session goal mode and the hidden goal tool":
    "Включить goal mode для сессии и скрытый инструмент goal",
  "Show token budget alongside the goal indicator in the status line":
    "Показывать бюджет токенов рядом с индикатором goal в строке состояния",
  "Run modes where active goals may auto-continue between turns":
    "Режимы запуска, в которых активные цели могут автоматически продолжаться между ходами",
  "Refresh generated session titles after todo init replans unless the title was set by the user":
    "Обновлять сгенерированные заголовки сессий после replanning todo init, если заголовок не был задан пользователем",

  // Provider/privacy settings.
  "Obfuscate configured secrets and redact credential-shaped tokens before sending to AI providers":
    "Обфусцировать настроенные секреты и скрывать токены, похожие на учётные данные, перед отправкой AI-провайдерам",
  "Maximum concurrent Ollama Cloud subagent runs per process; 0 disables the provider-specific limit":
    "Максимум одновременных запусков субагентов Ollama Cloud на процесс; 0 отключает ограничение провайдера",
  "Prioritized providers for the web_search tool; unlisted providers retain their default order afterward":
    "Приоритетный порядок провайдеров для web_search; неуказанные провайдеры сохраняют стандартный порядок после них",
  "Providers that web_search should never use, even as fallbacks":
    "Провайдеры, которые web_search не должен использовать даже как fallback",
  "Model ID for Gemini Google Search grounding. Defaults to gemini-2.5-flash.":
    "ID модели для grounding Google Search в Gemini. По умолчанию gemini-2.5-flash.",
  "Endpoint routing strategy for google-antigravity providers (chat, search, image, discovery)":
    "Стратегия выбора endpoint для провайдеров google-antigravity (chat, search, image, discovery)",
  "Prioritized providers for image generation; unlisted providers follow the active session provider and the built-in order":
    "Приоритетный порядок провайдеров генерации изображений; неуказанные следуют за провайдером активной сессии и встроенным порядком",
  'Serving path for Fireworks requests. Priority sends `service_tier: "priority"` for higher reliability during peak traffic at a higher price; Standard omits it. Fast (`-fast`) models ignore this — Fast is its own serving path.':
    'Маршрут обслуживания запросов Fireworks. Priority отправляет `service_tier: "priority"` для большей надёжности в часы пик за более высокую цену; Standard не отправляет его. Модели Fast (`-fast`) игнорируют настройку.',
  "Voice used by Codex-backed realtime voice sessions":
    "Голос для realtime voice-сессий на базе Codex",
  "Backend for the tts tool: local on-device neural TTS (Kokoro-82M) or xAI Grok Voice":
    "Бэкенд инструмента tts: локальный нейросетевой TTS на устройстве (Kokoro-82M) или xAI Grok Voice",
  "On-device neural TTS model (Kokoro-82M) used by the local TTS backend":
    "Локальная нейросетевая TTS-модель (Kokoro-82M), используемая локальным TTS-бэкендом",
  "Kokoro voice used by the local TTS backend (American/British, female/male)":
    "Голос Kokoro для локального TTS-бэкенда (американский/британский, женский/мужской)",
  "Speak the assistant's output aloud through the speakers as it streams":
    "Озвучивать потоковый вывод ассистента через динамики",
  "What to speak: all = assistant messages + thinking; assistant = messages only; yield = only the final message at turn end":
    "Что озвучивать: all = сообщения ассистента + thinking; assistant = только сообщения; yield = только финальное сообщение в конце хода",
  "Rewrite assistant output into natural spoken prose with the tiny/smol model before synthesis (describes code, drops links and markdown). Falls back to mechanical cleanup on failure":
    "Перед синтезом переписывать вывод ассистента в естественную устную речь моделью tiny/smol (описывать код, убирать ссылки и Markdown). При ошибке использовать механическую очистку.",
  "Kokoro voice used when speaking the assistant's output aloud":
    "Голос Kokoro для озвучивания вывода ассистента",
  "Session-title model: online (the TINY role from /models, else @smol) by default, or a local on-device model":
    "Модель заголовков сессий: по умолчанию онлайн (роль TINY из /models, иначе @smol) либо локальная модель на устройстве",
  "ONNX execution provider for local tiny models (titles + memory). Default uses CPU-only inference. The PI_TINY_DEVICE env var overrides this.":
    "ONNX execution provider для локальных tiny-моделей (заголовки + память). По умолчанию используется только CPU. Переменная PI_TINY_DEVICE переопределяет настройку.",
  "ONNX quantization/precision for local tiny models. Default uses each model's shipped dtype (q4); lower precision is faster, higher is more faithful. The PI_TINY_DTYPE env var overrides this.":
    "Квантование/точность ONNX для локальных tiny-моделей. По умолчанию используется dtype модели (q4); меньшая точность быстрее, большая точнее. PI_TINY_DTYPE переопределяет настройку.",
  "Mnemopi LLM for fact extraction + consolidation: online (the TINY role from /models, else smol/remote) by default, or a local on-device model":
    "LLM Mnemopi для извлечения и консолидации фактов: по умолчанию онлайн (роль TINY из /models, иначе smol/remote) либо локальная модель",
  "Difficulty classifier for the `auto` thinking level: online (the TINY role from /models, else smol) by default, or a local on-device model":
    "Классификатор сложности для уровня thinking `auto`: по умолчанию онлайн (роль TINY из /models, иначе smol) либо локальная модель",
  "Use a small model to detect when the assistant says it will continue but stops without tool calls; automatically prompt it to continue.":
    "Использовать малую модель, чтобы обнаруживать случаи, когда ассистент обещает продолжить, но останавливается без вызовов инструментов; автоматически просить его продолжить.",
  "Classifier for unexpected-stop detection: online (the TINY role from /models, else smol) by default, or a local on-device model.":
    "Классификатор неожиданной остановки: по умолчанию онлайн (роль TINY из /models, иначе smol) либо локальная модель.",
};
