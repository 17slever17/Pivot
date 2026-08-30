export const RU_VISUAL_AUDIT: Readonly<Record<string, string>> = {
  // Browser / agents / preview.
  "Hard reload": "Полная перезагрузка",
  "Open DevTools": "Открыть инструменты разработчика",
  "Clear cookies": "Очистить файлы cookie",
  "Clear cache": "Очистить кэш",
  "When this thread spawns subagents or runs a workflow, they show up here with live status, activity, and token usage.":
    "Когда в этом чате запускаются субагенты или рабочий процесс, они появляются здесь со статусом, активностью и расходом токенов.",
  "Type a URL above, or run a dev script. Listening localhost ports will show up here automatically.":
    "Введите URL выше или запустите скрипт разработки. Прослушиваемые порты localhost появятся здесь автоматически.",

  // Capabilities: use “скилл” consistently instead of “навык”.
  Skills: "Скиллы",
  Skill: "Скилл",
  "Manage skills": "Управление скиллами",
  "Project skills": "Скиллы проекта",
  "Global skills": "Глобальные скиллы",
  "Create skill": "Создать скилл",
  "Edit skill": "Изменить скилл",
  "Delete skill": "Удалить скилл",
  "Skill name": "Название скилла",
  "Skill description": "Описание скилла",
  "No skills": "Скиллы отсутствуют",
  "No matching skills": "Подходящие скиллы не найдены",
  "Search skills": "Поиск скиллов",
  "Global skill": "Глобальный скилл",
  "Project skill": "Скилл проекта",
  "New skill": "Новый скилл",
  "All skills": "Все скиллы",
  "Skills are invoked on demand when a task matches their description.":
    "Скиллы вызываются по необходимости, когда задача соответствует их описанию.",
  "Global skills live in the omp agent directory; project skills live under the project's .omp folder.":
    "Глобальные скиллы хранятся в каталоге агента omp, а скиллы проекта — в папке .omp проекта.",
  "Project and global skills coexist — a project skill is available in addition to the same-named global one.":
    "Проектные и глобальные скиллы сосуществуют: проектный скилл доступен вместе с одноимённым глобальным.",
  "Skills live in this project's .omp folder and run when a task matches their description.":
    "Скиллы хранятся в папке .omp этого проекта и запускаются, когда задача соответствует их описанию.",
  "A project skill with the same name is available in addition to the one in the omp agent directory.":
    "Проектный скилл с тем же именем доступен вместе со скиллом из каталога агента omp.",
  "Connect an environment to manage its skills.":
    "Подключите окружение для управления его скиллами.",
  "Loading skills…": "Загрузка скиллов…",
  "Could not load omp skills": "Не удалось загрузить скиллы omp",
  "No skills match the current search.": "Скиллы по текущему запросу не найдены.",
  "No skills exist yet. Create one to get started.": "Скиллов пока нет. Создайте первый скилл.",
  "skill files are plain markdown with optional frontmatter.":
    "Файлы скиллов — обычный Markdown с необязательным frontmatter.",
  "Create a skill in the global omp agent directory.":
    "Создать скилл в глобальном каталоге агента omp.",
  "Create a skill in the project's .omp folder.": "Создать скилл в папке .omp проекта.",

  "New rule": "Новое правило",
  "All rules": "Все правила",
  "Rules are loaded into every session and shape how the agent behaves.":
    "Правила загружаются в каждую сессию и определяют поведение агента.",
  "Global rules live in the omp agent directory; project rules live under the project's .omp folder.":
    "Глобальные правила хранятся в каталоге агента omp, а правила проекта — в папке .omp проекта.",
  "A project rule with the same name shadows the global rule for that project.":
    "Правило проекта с тем же именем перекрывает глобальное правило для этого проекта.",
  "Rules live in this project's .omp folder and load into every session.":
    "Правила хранятся в папке .omp этого проекта и загружаются в каждую сессию.",
  "A project rule with the same name shadows the rule in the omp agent directory.":
    "Правило проекта с тем же именем перекрывает правило из каталога агента omp.",
  "Connect an environment to manage its rules.":
    "Подключите окружение для управления его правилами.",
  "Loading rules…": "Загрузка правил…",
  "Could not load omp rules": "Не удалось загрузить правила omp",
  "No rules match the current search.": "Правила по текущему запросу не найдены.",
  "No rules exist yet. Create one to get started.": "Правил пока нет. Создайте первое правило.",
  "rule files are plain markdown with optional frontmatter.":
    "Файлы правил — обычный Markdown с необязательным frontmatter.",
  "Create a rule in the global omp agent directory.":
    "Создать правило в глобальном каталоге агента omp.",
  "Create a rule in the project's .omp folder.": "Создать правило в папке .omp проекта.",
  "Letters, digits, dots, dashes and underscores — no spaces or slashes.":
    "Допустимы буквы, цифры, точки, дефисы и подчёркивания — без пробелов и слешей.",
  "Move to omp": "Переместить в omp",
  "The chat isn't ready to accept input right now.": "Чат сейчас не готов принимать ввод.",
  "Overrides global": "Перекрывает глобальное",

  // Models and roles.
  "Connect an environment to edit its model roles.":
    "Подключите окружение, чтобы редактировать роли моделей.",
  "Loading model roles…": "Загрузка ролей моделей…",
  "Could not load model roles": "Не удалось загрузить роли моделей",
  "Models and roles apply to this project's .omp config.":
    "Модели и роли применяются к конфигурации .omp этого проекта.",
  "Models and roles apply to the global omp agent directory.":
    "Модели и роли применяются к глобальному каталогу агента omp.",
  "Every model your connected providers expose. Assign one to a role below.":
    "Все модели, доступные через подключённых провайдеров. Ниже можно назначить модель каждой роли.",
  "No models match the current search.": "Модели по текущему запросу не найдены.",
  "No models available — connect a provider.": "Нет доступных моделей — подключите провайдера.",
  "Show fewer": "Показать меньше",
  "Role to model mapping": "Сопоставление ролей и моделей",
  "OMP model-routing roles choose a model for each job. They are not Codex subagent types such as worker or verifier. The @smol selector is stored as smol.":
    "Роли маршрутизации моделей OMP выбирают модель для каждой задачи. Это не типы субагентов Codex, такие как worker или verifier. Селектор @smol сохраняется как smol.",
  "Connect a provider to pick models for your roles.":
    "Подключите провайдера, чтобы выбрать модели для ролей.",
  "No roles yet — add one below.": "Ролей пока нет — добавьте роль ниже.",
  "New role name": "Название новой роли",
  "OMP role preset": "Предустановка роли OMP",
  "Choose an OMP role preset": "Выберите предустановленную роль OMP",
  "custom-role": "своя-роль",
  "Primary model for ordinary work.": "Основная модель для обычной работы.",
  "Fast mechanical task agents (scout, librarian, and sonic).":
    "Быстрые агенты для механических задач (scout, librarian и sonic).",
  "Slower reviewer for careful analysis.": "Более медленная модель для тщательной проверки.",
  "Image and visual-understanding tasks.": "Задачи с изображениями и визуальным пониманием.",
  "Planning and decomposition.": "Планирование и декомпозиция.",
  "Design and UI-focused work.": "Задачи по дизайну и интерфейсам.",
  "Small commit/message-oriented tasks.": "Небольшие задачи для коммитов и сообщений.",
  "Lightweight background work and thread titles.": "Лёгкие фоновые задачи и заголовки чатов.",
  "Full subagents for substantial tasks.": "Полноценные субагенты для больших задач.",
  "Secondary advice/reasoning model.": "Дополнительная модель для советов и рассуждений.",
  "Saved model roles": "Роли моделей сохранены",
  "Cleared model roles": "Роли моделей очищены",

  // omp settings descriptions reported by the settings surface.
  "Path to the omp binary used by this instance.":
    "Путь к исполняемому файлу omp, используемому этим экземпляром.",
  "Model slug for omp modelRoles.default.": "Slug модели для omp modelRoles.default.",
  "Model slug for omp modelRoles.smol.": "Slug модели для omp modelRoles.smol.",
  "Model slug for omp modelRoles.slow.": "Slug модели для omp modelRoles.slow.",
  "Model slug for omp modelRoles.plan.": "Slug модели для omp modelRoles.plan.",
  "Model slug for omp modelRoles.advisor.": "Slug модели для omp modelRoles.advisor.",
  "Model slug for omp modelRoles.task.": "Slug модели для omp modelRoles.task.",
  "Model slug for omp modelRoles.vision.": "Slug модели для omp modelRoles.vision.",
  "Model slug for omp modelRoles.designer.": "Slug модели для omp modelRoles.designer.",
  "Model slug for omp modelRoles.commit.": "Slug модели для omp modelRoles.commit.",
  "Model slug for omp modelRoles.tiny.": "Slug модели для omp modelRoles.tiny.",
  "Enable omp automatic context compaction.": "Включить автоматическое сжатие контекста omp.",
  "Enable omp automatic retries on API errors.":
    "Включить автоматические повторные попытки omp при ошибках API.",
  "Enable the omp advisor secondary model.": "Включить дополнительную модель advisor в omp.",
  "omp memory.backend value (off, local, mnemopi, hindsight).":
    "Значение omp memory.backend (off, local, mnemopi, hindsight).",
  "Enable the omp github tool (github.enabled).":
    "Включить инструмент GitHub в omp (github.enabled).",
  "Enable the omp security_scan tool (security.enabled).":
    "Включить инструмент security_scan в omp (security.enabled).",
  "Automatically resume the most recent session in the current directory":
    "Автоматически продолжать последнюю сессию в текущем каталоге",
  "Prevent macOS sleep during active sessions. Each level is cumulative — it adds the flags of all lower levels.":
    "Не давать macOS переходить в сон во время активных сессий. Каждый уровень включает флаги всех более низких уровней.",
  "Pair a second model (assigned to the 'advisor' role) that passively reviews each turn and injects notes.":
    "Подключить вторую модель (роль 'advisor'), которая пассивно проверяет каждый ход и добавляет заметки.",
  "Start on the active model, then switch to a fast/cheap model (default the 'smol' role) at the first edit/write after the plan nudge's todo list exists — the strong model plans, commits the todos, and starts the implementation before handing off. Overridable per session with --prewalk / --no-prewalk.":
    "Начинать на активной модели, а после появления списка задач плана при первом изменении переключаться на быструю/дешёвую модель (по умолчанию роль 'smol'). Сильная модель планирует, фиксирует задачи и начинает реализацию перед передачей работы. Можно переопределить для сессии через --prewalk / --no-prewalk.",
  "Pause the main agent for up to 30 seconds if the advisor falls behind by this many turns. Off disables catch-up delays.":
    "Приостанавливать основного агента максимум на 30 секунд, если advisor отстал на указанное число ходов. Off отключает задержки для синхронизации.",
  "After an advisor concern or blocker interrupts, route further concerns/blockers non-interruptingly for this many primary turns.":
    "После прерывания из-за замечания или блокера advisor обрабатывать следующие замечания без прерывания в течение указанного числа основных ходов.",
  "Show git branch, status, and PR information in the TUI and watch repository metadata.":
    "Показывать ветку Git, статус и сведения о PR в TUI и отслеживать метаданные репозитория.",
  "Connect an environment to edit its omp settings.":
    "Подключите окружение, чтобы редактировать настройки omp.",
  "Loading settings…": "Загрузка настроек…",
  "Writes and resets apply to this project's .omp config.":
    "Изменения и сбросы применяются к конфигурации .omp этого проекта.",
  "Move to project": "Переместить в проект",

  // Project actions / scripts.
  "Actions are project-scoped commands you can run from the top bar or keybindings.":
    "Действия — это команды проекта, которые можно запускать с верхней панели или сочетаниями клавиш.",
  "Press a shortcut. Use Backspace to clear.":
    "Нажмите сочетание клавиш. Backspace очищает назначение.",
  "Open this URL in the in-app preview when this action runs.":
    "Открывать этот URL во встроенном предпросмотре при запуске действия.",
  "A project script that team members can import into T3 Code.":
    "Скрипт проекта, который участники команды могут импортировать в T3 Code.",
  "Display name for the script, shown in the T3 Code scripts menu.":
    "Отображаемое имя скрипта в меню скриптов T3 Code.",
  "Project scripts shared with everyone who opens this repository in T3 Code.":
    "Скрипты проекта, доступные всем, кто открывает этот репозиторий в T3 Code.",
  "Shell command executed in a T3 Code terminal at the project root.":
    "Shell-команда, выполняемая в терминале T3 Code из корня проекта.",
  "URL opened in the in-app browser preview when this script runs. Only honored on the desktop build.":
    "URL, открываемый во встроенном браузере при запуске скрипта. Используется только в настольной сборке.",
  "When true, automatically open the preview panel at `previewUrl` the moment the script starts.":
    "Если включено, автоматически открывать панель предпросмотра `previewUrl` при запуске скрипта.",
  "When true, the script runs automatically after a worktree is created for a new thread.":
    "Если включено, автоматически запускать скрипт после создания worktree для нового чата.",

  // Themes and notifications found by the description audit.
  "Search community themes": "Поиск тем сообщества",
  "Find open-source themes from Open VSX": "Найти темы с открытым исходным кодом в Open VSX",
  "It’s now active.": "Тема активирована.",
  "Toast when a subscription window (Codex, OpenCode Go, Cursor, …) crosses into warning or exhausted, and again after it resets.":
    "Показывать уведомление, когда окно лимита подписки (Codex, OpenCode Go, Cursor, …) переходит в предупреждение или исчерпано, а также после его сброса.",

  // Usage.
  cost: "стоимость",
  tokens: "токены",
  model: "модель",
  day: "день",
  COST: "СТОИМОСТЬ",
  TOKENS: "ТОКЕНЫ",
  MODEL: "МОДЕЛЬ",
  DAY: "ДЕНЬ",
  "By day cost": "Стоимость по дням",
  "* if billed at full API rate": "* при расчёте по полному тарифу API",
  "vs full input rates": "по сравнению с полной стоимостью ввода",
  "No activity in this window.": "В этом интервале нет активности.",

  // Diagnostics.
  "Native counters identify which process is reading or writing. These application-level counters identify known T3 operations so process spikes can be correlated with specific persistence and logging paths.":
    "Нативные счётчики определяют, какой процесс читает или записывает данные. Счётчики уровня приложения отмечают известные операции T3, чтобы всплески нагрузки процессов можно было сопоставить с конкретными путями сохранения данных и логирования.",

  // Pull request / preview descriptions missed by the focused audit.
  "The task is in the composer — read it over, then send.":
    "Задача добавлена в поле ввода — проверьте её и отправьте.",
  "Pending — sent when you submit the review": "Ожидает отправки вместе с ревью",
  "Open Piπot in the desktop app to use the in-app preview.":
    "Откройте Piπot в настольном приложении, чтобы использовать встроенный предпросмотр.",
};
