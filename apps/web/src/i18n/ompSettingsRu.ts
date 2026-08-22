const OMP_SETTING_DESCRIPTIONS_RU: Readonly<Record<string, string>> = {
  autoResume: "Автоматически возобновлять последнюю сессию в текущем каталоге.",
  "power.sleepPrevention":
    "Предотвращает переход macOS в сон во время активных сессий. Каждый уровень включает флаги всех более слабых уровней.",
  "advisor.enabled":
    "Подключает вторую модель в роли advisor: она пассивно проверяет каждый ход и при необходимости добавляет замечания.",
  "prewalk.enabled":
    "Начинает работу на основной модели, а после первого изменения файла переключается на быструю/дешёвую модель роли smol. Можно переопределить для отдельной сессии.",
  "advisor.syncBacklog":
    "Приостанавливает основного агента максимум на 30 секунд, если advisor отстал на много ходов. Off отключает ожидание.",
  "advisor.immuneTurns":
    "После прерывания от advisor делает его следующие замечания непрерывающими на указанное число ходов основного агента.",
  "git.enabled":
    "Показывает ветку Git, статус и сведения о PR в TUI и отслеживает изменения метаданных репозитория.",
  "providers.maxInFlightRequests":
    "Максимум одновременных LLM-запросов на одного провайдера во всех локальных процессах OMP с этим корнем конфигурации. Если не задано, лимита нет.",
  "providers.openai-codex.codeMode":
    "Направляет модели Codex с code_mode_only через eval как программный интерфейс выполнения. В direct режиме eval/ask/todo остаются прямыми инструментами; auto следует каталогу модели.",
  "providers.openai-codex.codeModeDirectTools":
    "Дополнительные инструменты, которые остаются напрямую доступными рядом с eval/ask/todo при включённом Codex Code Mode.",
  modelRoleStorage: "Определяет, где сохраняются назначения моделей для ролей селектора моделей.",
  "theme.dark": "Тема терминала для тёмного фона.",
  "theme.light": "Тема терминала для светлого фона.",
  symbolPreset: "Набор глифов для значков и символов: Unicode, Nerd Font или ASCII.",
  colorBlindMode: "Использует синий вместо зелёного для добавленных строк в diff.",
  "composer.shape": "Визуальная компоновка редактора ввода и строки состояния.",
  "statusLine.preset": "Предустановленная конфигурация строки состояния.",
  "statusLine.separator": "Стиль разделителей в строке состояния.",
  "statusLine.contextLine":
    "Показывает между сегментами строки состояния индикатор использования контекста.",
  "statusLine.sessionAccent":
    "Использует цвет имени сессии для рамки и промежутков строки состояния.",
  "statusLine.transparent":
    "Использует фон терминала для строки состояния вместо собственного фона; декоративные края Powerline отключаются.",
  "statusLine.compactThinkingLevel":
    "Показывает уровень рассуждений компактным значком вместо текстового суффикса.",
  "statusLine.showHookStatus": "Показывает состояние хуков под строкой состояния.",
  "tools.artifactSpillThreshold":
    "Вывод инструмента больше этого размера сохраняется как артефакт, а в контексте остаётся только сокращённая часть.",
  "tools.artifactTailBytes":
    "Сколько байт конца вывода оставлять в контексте после переноса в артефакт.",
  "tools.artifactHeadBytes":
    "Сколько байт начала вывода оставлять вместе с концом; 0 оставляет только конец.",
  "tools.outputMaxColumns":
    "Максимум байт на строку для потокового вывода и read. 0 отключает ограничение.",
  "tools.artifactTailLines":
    "Максимальное число последних строк, оставляемых в контексте после переноса в артефакт.",
  "terminal.showImages":
    "Отображает изображения прямо в терминале, если терминал поддерживает соответствующий протокол.",
  "images.autoResize": "Автоматически уменьшает слишком большие изображения до 2000×2000.",
  "images.blockImages": "Не отправляет изображения LLM.",
  "images.describeForTextModels":
    "Для модели без vision сохраняет изображение как local:// и добавляет описание, полученное от vision-модели.",
  "images.urls.enabled":
    "Публикует исходящие изображения через цепочку backend-ов и передаёт модели короткие URL; при ошибке использует inline-данные.",
  "images.urls.backends": "Порядок backend-ов для публикации изображений.",
  "images.urls.command":
    "Шаблон argv для command-backend публикации изображений с {file}, {mime} и {ext}; последняя строка stdout должна быть URL.",
  "images.urls.publicBaseUrl": "Внешний базовый URL blob-сервера изображений.",
  "images.urls.ttlHours":
    "Сколько часов опубликованное изображение доступно. 0 — пока работает broker.",
  "images.urls.bindHost": "Адрес, на котором blob-сервер изображений принимает подключения.",
  "images.urls.sshTarget": "SSH-цель user@host для обратного проброса порта изображений.",
  "images.urls.sshRemotePort": "Удалённый порт для обратного SSH-проброса изображений.",
  "tui.maxInlineImageColumns":
    "Максимальная ширина inline-изображения в колонках терминала. 0 — без ограничения.",
  "tui.maxInlineImageRows":
    "Максимальная высота inline-изображения в строках терминала. 0 — использовать ограничение viewport.",
  "tui.maxInlineImages":
    "Максимум одновременно живых графических объектов терминала. Более старые заменяются fallback-представлением; 0 — без ограничения.",
  "terminal.showProgress":
    "Передаёт терминалу OSC 9;4 с неопределённым прогрессом во время работы агента и обработки контекста.",
  "tui.textSizing":
    "Увеличивает заголовки H1 в 2 раза через Kitty OSC 66; работает только в Kitty-совместимых терминалах.",
  "tui.renderMermaid": "Отрисовывает fenced-блоки Mermaid как ASCII-схемы.",
  "tui.codexResetFireworks":
    "Показывает фейерверк при еженедельном сбросе лимита Codex до нажатия Escape.",
  "tui.titleState": "Добавляет состояние выполнения в заголовок окна терминала.",
  "tui.hyperlinks": "Добавляет OSC 8-гиперссылки для путей и URL.",
  "tui.tight": "Убирает горизонтальные отступы у вывода терминала.",
  "tui.scrollbackRebuild":
    "После завершения предпросмотра очищает и заново воспроизводит scrollback терминала.",
  "tui.resizeScrollback":
    "Определяет, как после изменения размера терминала перестраивается уже выведенный scrollback.",
  "display.shimmer": "Стиль анимации состояния работы/загрузки.",
  "display.smoothStreaming":
    "Плавно раскрывает потоковый ответ ассистента и входные данные инструментов.",
  "display.hideToolActivity": "Скрывает вызовы инструментов модели и их результаты.",
  "display.showTokenUsage": "Показывает использование токенов для каждого хода.",
  "display.cacheMissMarker":
    "Добавляет разделитель перед ходом, в котором произошёл промах prompt cache.",
  "display.collapseCompacted": "Сворачивает историю до точки compaction.",
  showHardwareCursor: "Показывает аппаратный курсор терминала для корректной работы IME.",
  "tui.imeSafeCursor": "Перемещает нижнюю границу prompt для совместимости с IME на macOS.",
  defaultThinkingLevel: "Уровень глубины рассуждений по умолчанию.",
  hideThinkingBlock: "Скрывает блоки рассуждений модели в интерфейсе.",
  proseOnlyThinking: "Убирает блоки кода из отображаемых кратких рассуждений.",
  omitThinking: "Просит поддерживаемых провайдеров не возвращать краткие рассуждения.",
  externalThinking:
    "Использует приватный scratchpad вместо встроенного provider reasoning там, где это поддерживается.",
  "model.loopGuard.enabled": "Обнаруживает циклы в рассуждениях и тексте модели.",
  "model.loopGuard.checkAssistantContent":
    "Дополнительно проверяет обычный текст ответа ассистента на циклы.",
  "model.loopGuard.toolCallReminder":
    "Прерывает зацикливание Gemini на planning-заголовках и напоминает вызвать инструмент.",
  "model.toolCallLoopGuard.enabled":
    "Обнаруживает повторение одинаковых вызовов инструментов между ходами.",
  "model.toolCallLoopGuard.threshold":
    "Число повторений одинакового вызова инструмента до корректирующего вмешательства.",
  "model.toolCallLoopGuard.exemptTools":
    "Инструменты, исключённые из защиты от повторяющихся вызовов.",
  inlineToolDescriptors:
    "Встраивает описания инструментов в system prompt и убирает их из provider schema; auto включает это для Gemini.",
  includeModelInPrompt: "Добавляет идентификатор активной модели в system prompt.",
  includeWorkspaceTree:
    "Добавляет дерево workspace в system prompt. Может ухудшать попадание в prompt cache при изменениях дерева.",
  "workspace.additionalDirectories":
    "Дополнительные каталоги multi-root workspace; ими также управляют /add-dir и /remove-dir.",
  personality: "Стиль общения, добавляемый в system prompt.",
  temperature: "Температура sampling модели.",
  topP: "Порог nucleus sampling (top-p).",
  topK: "Ограничение top-k sampling.",
  minP: "Минимальная относительная вероятность токена для sampling.",
  presencePenalty: "Штраф за токены, уже встречавшиеся в контексте.",
  repetitionPenalty: "Штраф за повторение токенов.",
  textVerbosity:
    "Уровень подробности ответа для OpenAI/Codex-моделей, которые поддерживают этот параметр.",
  "tier.openai": "Service tier для запросов OpenAI.",
  "tier.anthropic": "Service tier для запросов Anthropic.",
  "tier.google": "Service tier для запросов Google.",
  "tier.subagent": "Service tier для подагентов task/eval.",
  "tier.advisor": "Service tier для advisor.",
  "retry.maxRetries": "Максимальное число повторных попыток API-запроса.",
  "retry.maxDelayMs":
    "Максимальная задержка между повторами. Если провайдер требует ждать дольше и fallback недоступен, запрос завершается ошибкой.",
  "retry.modelFallback": "Разрешает при ошибках переключаться на fallback-модели.",
  "retry.usageAwareFallback":
    "Учитывает квоты тарифного плана: сначала выбирает другие аккаунты того же провайдера, затем fallback до достижения жёсткого лимита.",
  "retry.usageReservePct":
    "Остаток квоты в процентах, ниже которого аккаунт считается находящимся в резерве.",
  "retry.usageReservePolicy":
    "Поведение, когда все аккаунты одного провайдера достигли резервного порога.",
  "retry.fallbackChains":
    "JSON-карта ролей/селекторов/провайдеров на упорядоченные цепочки fallback-моделей.",
  "retry.fallbackRevertPolicy": "Определяет, когда после fallback возвращаться к основной модели.",
  "providers.anthropic.serverSideFallback":
    "Разрешает серверный safety-fallback Anthropic для Claude Fable/Mythos на Opus 4.8.",
  treeFilterMode: "Фильтр дерева сессий по умолчанию.",
  autocompleteMaxVisible: "Максимальное число видимых вариантов в списке автодополнения.",
  "spelling.typoDetection": "Подсвечивает опечатки в prompt, используя словари macOS.",
  "spelling.autocomplete":
    "Предлагает словарные варианты автодополнения, принимаемые клавишей Tab.",
  "spelling.autocorrect": "Автоматически применяет уверенные исправления орфографии macOS.",
  emojiAutocomplete: "Включает автодополнение emoji по :name: и текстовым emoticon.",
  "paste.largeMenuThreshold":
    "Показывает меню обработки для больших вставок (код/XML/файл). 0 отключает меню.",
  "startup.quiet": "Пропускает приветствие и стартовые сообщения состояния.",
  "startup.showSplash":
    "Показывает полный стартовый splash при обычном запуске; quiet всё равно его подавляет.",
  "startup.setupWizard": "Один раз показывает новые шаги onboarding после повышения версии setup.",
  "startup.checkUpdate": "Проверяет обновления OMP при запуске.",
  "marketplace.autoUpdate": "Проверяет обновления плагинов при запуске.",
  "startup.changelogMode":
    "Определяет объём release notes после обновления: краткий, полный или скрытый.",
  "magicKeywords.enabled":
    "Включает специальные ключевые слова ultrathink, orchestrate и workflowz.",
  "magicKeywords.ultrathink":
    "Отдельное слово ultrathink запрашивает максимальный уровень автоматических рассуждений.",
  "magicKeywords.orchestrate":
    "Отдельное слово orchestrate добавляет инструкции для мультиагентной оркестрации.",
  "magicKeywords.workflow": "Отдельное слово workflowz добавляет инструкции eval-workflow.",
  "completion.notify": "Отправляет уведомление по завершении хода.",
  "error.notify": "Отправляет уведомление при ошибке.",
  "ask.timeout":
    "Через указанное число секунд автоматически выбирает рекомендованный вариант ask. 0 отключает таймаут.",
  "ask.notify": "Отправляет уведомление, когда ask ожидает ответа пользователя.",
  "recap.enabled": "После простоя терминала создаёт короткое LLM-резюме текущего состояния.",
  "recap.idleSeconds": "Сколько секунд простоя ждать перед созданием recap.",
  "collab.relayUrl": "URL relay-сервера для /collab.",
  "collab.webUrl":
    "URL браузерного интерфейса для ссылок /collab; если пусто, вычисляется автоматически.",
  "collab.displayName": "Имя, показываемое другим участникам совместной сессии.",
  "share.serverUrl": "Базовый URL сервиса загрузки зашифрованных данных и viewer для /share.",
  "share.store": "Хранилище для /share: blob-сервис или секретный gist.",
  "share.redactSecrets":
    "Перед публикацией /share обфусцирует секреты и похожие на credentials токены.",
  "stt.enabled": "Включает локальное распознавание речи с микрофона.",
  "stt.modelName": "Локальная модель распознавания речи и её размер/уровень качества.",
  "stt.submitTrigger": "Определяет, при каком событии диктовка автоматически отправляет prompt.",
  "contextPromotion.enabled":
    "При переполнении контекста пытается перейти на модель с большим окном вместо compaction.",
  extendedContext:
    "Разрешает расширенные контекстные окна с повышенной стоимостью; Off ограничивает стандартным окном.",
  "compaction.enabled": "Автоматически сжимает историю, когда контекст становится слишком большим.",
  "compaction.midTurnEnabled":
    "Проверяет пороги compaction в безопасных точках внутри цикла инструментов, а не только между ходами.",
  "compaction.methodOrder": "Порядок fallback-методов поддержания контекста.",
  "compaction.thresholdPercent":
    "Процент заполнения контекста, при котором запускается compaction.",
  "compaction.thresholdTokens":
    "Фиксированный порог в токенах для compaction; если задан, перекрывает процентный порог.",
  "compaction.handoffSaveToDisk":
    "Сохраняет автоматически созданные handoff-документы на диск как Markdown.",
  "compaction.remoteStreamingV2Enabled":
    "Использует совместимый remote streaming compaction для поддерживаемых Responses-моделей.",
  "compaction.asyncEnabled":
    "Заранее строит фоновое summary, когда контекст приближается к порогу.",
  "compaction.idleEnabled":
    "Выполняет compaction во время простоя, если контекст уже выше заданного порога.",
  "compaction.idleThresholdTokens": "Порог токенов для compaction во время простоя.",
  "compaction.idleTimeoutSeconds": "Сколько секунд простоя ждать перед idle-compaction.",
  "compaction.supersedeReads":
    "На каждом ходу удаляет из контекста более старые результаты read того же файла.",
  "compaction.dropUseless":
    "Удаляет из истории уже использованные результаты инструментов, признанные бесполезными.",
  "snapcompact.systemPrompt":
    "Экспериментально преобразует большой system prompt в PNG для экономии текстового контекста.",
  "snapcompact.toolResults":
    "Экспериментально преобразует крупные старые результаты инструментов в PNG.",
  "tools.format":
    "Выбирает режим и диалект вызовов инструментов: auto, native или совместимый диалект.",
  "branchSummary.enabled": "Предлагает создать summary перед уходом с текущей ветки диалога.",
  "memory.backend": "Backend памяти: выключено, локальный Mnemopi или Hindsight.",
  "autolearn.enabled":
    "После остановки агента извлекает полезные уроки и создаёт/улучшает управляемые скиллы.",
  "autolearn.autoContinue":
    "Автоматически запускает приватное извлечение знаний после остановки агента.",
  "mnemopi.dbPath": "Путь к SQLite-базе Mnemopi.",
  "mnemopi.bank": "Базовое имя общего банка памяти Mnemopi.",
  "mnemopi.scoping":
    "Область памяти Mnemopi: глобальная, отдельная на проект или проектная с тегами.",
  "mnemopi.embeddingVariant": "Семейство локальной embedding-модели: английское или многоязычное.",
  "mnemopi.autoRecall": "Автоматически добавляет релевантную локальную память в первый ход.",
  "mnemopi.autoRetain": "Автоматически сохраняет ходы в локальную память.",
  "mnemopi.polyphonicRecall":
    "Объединяет vector, graph, fact и temporal recall в одном ранжировании.",
  "mnemopi.enhancedRecall": "Использует многоуровневый кэш результатов recall.",
  "mnemopi.proactiveLinking": "При сохранении связывает новые воспоминания с episodic-графом.",
  "mnemopi.noEmbeddings": "Отключает embeddings и использует только полнотекстовый поиск.",
  "mnemopi.embeddingModel": "Явно задаёт embedding-модель Mnemopi вместо варианта по умолчанию.",
  "mnemopi.llmApiKey": "Необязательный API-ключ LLM для удалённого режима Mnemopi.",
  "mnemopi.llmModel": "Необязательная LLM для удалённого режима Mnemopi.",
  "hindsight.apiUrl": "URL сервера Hindsight.",
  "hindsight.apiToken": "Bearer-токен Hindsight.",
  "hindsight.bankId": "Идентификатор банка Hindsight; по умолчанию выводится из проекта.",
  "hindsight.scoping": "Область памяти Hindsight: глобальная, проектная или проектная с тегами.",
  "hindsight.autoRecall": "Автоматически добавляет память Hindsight в первый ход.",
  "hindsight.autoRetain":
    "Автоматически сохраняет транскрипт в Hindsight по ходу сессии и на её границах.",
  "hindsight.retainMode":
    "Сохраняет либо всю сессию, либо только последние ходы небольшими чанками.",
  "hindsight.mentalModelsEnabled":
    "Добавляет read-only mental-model summaries Hindsight в developer instructions.",
  "hindsight.mentalModelAutoSeed": "Создаёт встроенные mental models, если они отсутствуют.",
  "ttsr.enabled": "Прерывает агента во время потока, когда срабатывает одно из правил TTSR.",
  "ttsr.contextMode": "Определяет, что делать с частичным ответом при срабатывании TTSR.",
  "ttsr.interruptMode":
    "Выбирает немедленное прерывание или предупреждение после завершения ответа.",
  "ttsr.repeatMode": "Определяет, может ли одно правило срабатывать повторно в рамках сессии.",
  "ttsr.repeatGap": "Минимальное число сообщений между повторными срабатываниями одного правила.",
  "ttsr.builtinRules": "Загружает встроенный набор правил TTSR.",
  "ttsr.disabledRules": "Имена отключённых правил TTSR.",
  "edit.mode": "Вариант инструмента редактирования файлов.",
  "edit.fuzzyMatch": "Разрешает высокоуверенное fuzzy-сопоставление с отличиями только в пробелах.",
  "edit.fuzzyThreshold": "Минимальная уверенность fuzzy-сопоставления для edit.",
  "edit.streamingAbort":
    "Прерывает потоковое редактирование, если предварительная проверка изменения уже не проходит.",
  "edit.blockAutoGenerated": "Запрещает edit изменять автоматически сгенерированные файлы.",
  "edit.enforceSeenLines": "Отклоняет edit, если якорные строки файла ещё не были показаны модели.",
  readLineNumbers: "Добавляет номера строк к результатам read.",
  "read.summarize.enabled":
    "Для read без селектора сначала показывает структурное summary исходного кода.",
  "read.summarize.prose": "Разрешает summary для Markdown и обычных текстовых файлов.",
  "read.summarize.minBodyLines":
    "Минимальный размер тела символа в строках, после которого его можно свернуть в summary.",
  "read.summarize.minCommentLines":
    "Минимальная длина комментария в строках, после которой его можно свернуть.",
  "read.summarize.minTotalLines":
    "Минимальный размер файла для автоматического структурного summary.",
  "read.summarize.unfoldUntil":
    "Автоматически раскрывает summary, пока результат не достигнет этого размера.",
  "read.summarize.unfoldLimit": "Максимум элементов, автоматически раскрываемых за один read.",
  "read.toolResultPreview":
    "Показывает результаты read прямо в ленте вместо компактных строк-summary.",
  "lsp.enabled": "Включает инструмент Language Server Protocol.",
  "lsp.lazy":
    "Запускает language server только при первом обращении или редактировании подходящего файла.",
  "lsp.shared":
    "Использует один language server на проект через daemon broker вместо отдельного на сессию.",
  "lsp.formatOnWrite": "Форматирует файл через LSP после записи.",
  "lsp.diagnosticsOnWrite": "Запрашивает LSP-диагностику после write.",
  "lsp.diagnosticsOnEdit": "Запрашивает LSP-диагностику после edit.",
  "lsp.diagnosticsDeduplicate": "Убирает повторяющиеся LSP-диагностические сообщения.",
  "bash.enabled": "Включает инструмент bash/shell.",
  "bash.autoBackground.enabled": "Автоматически переводит подходящие долгие shell-команды в фон.",
  "bash.patterns":
    "Упорядоченные правила подтверждения shell-команд с match/approval; поддерживается wildcard *.",
  "bashInterceptor.enabled":
    "Блокирует shell-команды, для которых существует специализированный инструмент.",
  "bash.direnv": "Автоматически загружает разрешённый .envrc через direnv/devenv для репозитория.",
  "bash.direnvLoadTimeoutMs": "Таймаут загрузки direnv/devenv в миллисекундах.",
  "shellMinimizer.enabled": "Сжимает многословный shell-вывод перед добавлением в контекст агента.",
  "shellMinimizer.sourceOutlineLevel":
    "Уровень детализации структурного outline исходников при минимизации shell-вывода.",
  "eval.py": "Разрешает eval выполнять Python-код.",
  "eval.js": "Разрешает eval выполнять JavaScript-код.",
  "eval.rb": "Разрешает eval выполнять Ruby-код.",
  "eval.jl": "Разрешает eval выполнять Julia-код.",
  "eval.autoBackground.enabled": "Автоматически переводит подходящие долгие eval-задачи в фон.",
  "python.kernelMode":
    "Выбирает постоянный Python-kernel на сессию или новый процесс для каждого вызова.",
  "python.interpreter":
    "Явный путь к Python; если задан, автоматический поиск интерпретатора не используется.",
  "ruby.interpreter":
    "Явный путь к Ruby; если задан, автоматический поиск интерпретатора не используется.",
  "julia.interpreter":
    "Явный путь к Julia; если задан, автоматический поиск интерпретатора не используется.",
  "tools.approval": "Политики allow/prompt/deny для отдельных инструментов.",
  "tools.approvalMode":
    "Политика подтверждений по умолчанию: всегда спрашивать, разрешать запись или Yolo.",
  "todo.enabled": "Включает инструмент и виджет todo.",
  "todo.reminders": "Добавляет напоминания о незавершённых todo в контекст агента.",
  "todo.remindersMax": "Максимальное число напоминаний о todo за сессию.",
  "todo.eager": "Насколько настойчиво модель должна создавать todo автоматически.",
  "glob.enabled": "Включает инструмент glob для поиска файлов по шаблону.",
  "grep.enabled": "Включает инструмент grep для поиска текста.",
  "grep.contextBefore": "Число строк контекста до совпадения grep.",
  "grep.contextAfter": "Число строк контекста после совпадения grep.",
  "astGrep.enabled": "Включает структурный поиск ast-grep.",
  "astEdit.enabled": "Включает структурное редактирование AST.",
  "debug.enabled": "Включает инструмент отладки.",
  "launch.enabled": "Включает общий supervisor для долгоживущих процессов.",
  "speechgen.enabled": "Включает инструмент генерации речи TTS.",
  "generate_image.enabled": "Включает инструмент генерации изображений.",
  "inspect_image.mode":
    "Режим inspect_image: auto, on или off; при необходимости делегирует vision-модели.",
  "computer.enabled": "Включает управление рабочим столом хоста.",
  "computer.display": "Дисплей/экран, используемый инструментом computer.",
  "computer.maxWidth":
    "Максимальная ширина изображения экрана, передаваемого инструменту computer.",
  "computer.maxHeight":
    "Максимальная высота изображения экрана, передаваемого инструменту computer.",
  "inspect_image.timeoutMs": "Таймаут inspect_image в миллисекундах.",
  "checkpoint.enabled": "Включает создание checkpoint-ов состояния.",
  "fetch.enabled": "Включает инструмент чтения URL.",
  "vault.enabled": "Включает доступ к vault:// через Obsidian CLI.",
  "github.enabled": "Включает GitHub-инструмент.",
  "github.cache.enabled": "Включает локальный кэш GitHub-инструмента.",
  "github.cache.softTtlSec": "Мягкий TTL кэша GitHub в секундах.",
  "github.cache.hardTtlSec": "Жёсткий TTL кэша GitHub в секундах.",
  "task.isolation.apply":
    "Автоматически применяет успешные изменения из изолированной task-среды к родительскому checkout. При отключении остаётся patch или branch-артефакт.",
  "task.isolation.merge":
    "Способ интеграции изменений из изолированных task: применение patch или merge ветки.",
  "task.isolation.commits":
    "Стиль commit message для изменений во вложенных репозиториях: стандартный или созданный AI.",
  "worktree.base":
    "Базовый каталог для worktree, которыми управляет агент. По умолчанию ~/.omp/wt; путь должен быть абсолютным или начинаться с ~. OMP_WORKTREE_DIR имеет приоритет.",
  "task.eager": "Насколько настойчиво предлагать делегирование работы подагентам.",
  "task.batch":
    "Переключает task на batch-форму: один вызов содержит общий context и tasks[], по одному подагенту на задачу; async запускает их независимо в фоне.",
  "task.enableEffort":
    "Добавляет к task необязательный параметр effort для переопределения уровня рассуждений каждого подагента.",
  "task.maxConcurrency": "Максимальное число одновременно работающих подагентов.",
  "task.enableLsp":
    "Разрешает подагентам, запущенным через task, использовать LSP. По умолчанию выключено для экономии токенов.",
  "task.maxRecursionDepth":
    "Максимальная глубина, на которой подагенты могут запускать своих подагентов.",
  "task.maxRuntimeMs": "Жёсткий лимит времени одного подагента в миллисекундах. 0 отключает лимит.",
  "task.agentIdleTtlMs":
    "Сколько миллисекунд idle-подагент остаётся в памяти до парковки на диск. 0 держит его живым до завершения процесса.",
  "task.softRequestBudget":
    "Мягкий лимит запросов ассистента на один запуск подагента. После превышения добавляется просьба завершить работу; на 1.5× запуск принудительно останавливается. 0 отключает защиту.",
  "task.softRequestBudgetNotice":
    "После превышения мягкого request budget один раз просит подагента завершить работу до принудительной остановки на 1.5×.",
  "task.maxEffort":
    "Максимальный reasoning effort, который task может назначить отдельному подагенту.",
  "task.prewalk":
    "Включает prewalk для встроенного generic task: подагент начинает на своей модели и после первого edit/write передаёт работу роли smol.",
  "tasks.todoClearDelay": "Задержка перед удалением завершённых или отменённых todo из виджета.",
  "task.showResolvedModelBadge":
    "Показывает фактический model ID каждого подагента в строке состояния task-виджета.",
  "skills.enableSkillCommands": "Регистрирует скиллы как команды /skill:name.",
  "commands.enableClaudeUser": "Загружает пользовательские команды из ~/.claude/commands/.",
  "commands.enableClaudeProject": "Загружает проектные команды из .claude/commands/.",
  "commands.enableOpencodeUser":
    "Загружает пользовательские команды из ~/.config/opencode/commands/.",
  "commands.enableOpencodeProject": "Загружает проектные команды из .opencode/commands/.",
  "secrets.enabled":
    "Обфусцирует настроенные секреты и скрывает похожие на credentials токены перед отправкой AI-провайдерам.",
  "providers.ollama-cloud.maxConcurrency":
    "Максимум одновременных запусков подагентов Ollama Cloud на процесс. 0 отключает отдельный лимит провайдера.",
  "providers.webSearchOrder":
    "Приоритет провайдеров для web_search; неуказанные остаются после них в стандартном порядке.",
  "providers.webSearchExclude":
    "Провайдеры, которые web_search никогда не должен использовать даже как fallback.",
  "providers.webSearchTimeoutSeconds":
    "Жёсткий таймаут каждого search-backend в секундах перед переходом web_search к следующему fallback.",
  "providers.webSearchGeminiModel":
    "Model ID Gemini для Google Search grounding. По умолчанию gemini-2.5-flash.",
  "providers.antigravityEndpoint":
    "Стратегия выбора endpoint для google-antigravity: chat, search, image и discovery.",
  "providers.imageOrder":
    "Приоритет провайдеров генерации изображений; остальные следуют за активным провайдером сессии и встроенным порядком.",
  "providers.fireworksTier":
    "Serving tier Fireworks. Priority повышает надёжность в часы пик, но стоит дороже; Fast-модели используют собственный путь.",
  "live.voice": "Голос для realtime voice-сессий на базе Codex.",
  "providers.tts": "Backend инструмента TTS: локальная Kokoro-82M или xAI Grok Voice.",
  "tts.localModel": "Локальная on-device TTS-модель Kokoro-82M.",
  "tts.localVoice": "Голос Kokoro для локального TTS backend.",
  "speech.enabled": "Озвучивает потоковый ответ ассистента через динамики.",
  "speech.mode":
    "Что озвучивать: все сообщения и thinking, только ответы ассистента или только финальное сообщение хода.",
  "speech.enhanced":
    "Перед синтезом переписывает ответ в естественную устную речь через tiny/smol-модель; при ошибке применяет механическую очистку.",
  "speech.voice": "Голос Kokoro для озвучивания ответа ассистента.",
  "providers.tinyModel":
    "Модель для заголовков сессий: online через роль TINY/smol или локальная on-device модель.",
  "providers.tinyModelDevice":
    "ONNX execution provider для локальных tiny-моделей. По умолчанию CPU; PI_TINY_DEVICE имеет приоритет.",
  "providers.tinyModelDtype":
    "Квантование/точность ONNX для локальных tiny-моделей. PI_TINY_DTYPE имеет приоритет.",
  "providers.memoryModel":
    "Mnemopi LLM для извлечения и консолидации фактов: online через TINY/smol или локальная модель.",
  "providers.autoThinkingModel":
    "Классификатор сложности для уровня thinking=auto: online через TINY/smol или локальная модель.",
  "providers.autoThinkingMaxEffort":
    "Максимальный effort, который может выбрать классификатор auto; xhigh оставляет max только для явного ultrathink.",
  "features.unexpectedStopDetection":
    "Маленькая модель определяет, когда ассистент обещал продолжить, но остановился без вызова инструмента, и автоматически просит продолжить.",
  "providers.unexpectedStopModel":
    "Классификатор unexpected-stop: online через TINY/smol или локальная on-device модель.",
  "providers.kimiApiFormat":
    "Формат API для Kimi Code; auto следует протоколу, объявленному сервером модели.",
  "providers.openaiWebsockets":
    "Политика WebSocket для OpenAI Codex: auto использует настройки модели, on принудительно включает, off отключает.",
  "providers.cacheRetention":
    "Срок хранения prompt cache для провайдеров, которые это поддерживают: Anthropic, Bedrock, OpenRouter и OpenAI.",
  "providers.streamFirstEventTimeoutSeconds":
    "Сколько секунд ждать первое событие model stream. -1 использует defaults/env, 0 отключает watchdog.",
  "providers.streamIdleTimeoutSeconds":
    "Сколько секунд model stream может молчать между событиями. -1 использует defaults/env, 0 отключает watchdog.",
  "providers.openrouterVariant":
    "Суффикс routing-варианта, добавляемый к OpenRouter model ID, если селектор уже не задаёт вариант.",
  "providers.fetch": "Приоритет reader-backend для инструмента чтения URL.",
  "codexResets.autoRedeem":
    "Автоматически расходует сохранённые сбросы лимитов Codex, чтобы восстановить заблокированный аккаунт или не потерять истекающий reset.",
  "codexResets.minBlockedMinutes":
    "Автовосстановление применяется только если естественная разблокировка Codex не раньше указанного числа минут.",
  "codexResets.keepCredits":
    "Минимальное число сохранённых reset-кредитов, которое нельзя тратить автоматически; истекающие кредиты исключены из резерва.",
  "codexResets.salvageHorizonHours":
    "Автоматически расходует reset Codex, если тот истечёт в пределах указанного числа часов и есть использованное окно, которое можно восстановить.",
  "provider.appendOnlyContext":
    "Кэширует system prompt и specs инструментов и ведёт append-only журнал сообщений для максимальных попаданий в prefix cache.",
  "exa.enabled": "Включает провайдер веб-поиска Exa.",
  "exa.searchDelayMs":
    "Минимальная задержка между запросами Exa в миллисекундах. 0 отключает pacing.",
};

export function translateOmpSettingDescription(key: string, fallback: string): string {
  return OMP_SETTING_DESCRIPTIONS_RU[key] ?? fallback;
}
