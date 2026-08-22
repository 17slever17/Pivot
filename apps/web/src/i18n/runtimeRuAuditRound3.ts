export const RU_AUDIT_ROUND3: Readonly<Record<string, string>> = {
  // Archive metadata is split across React text nodes; the middle node includes
  // the separator, so translating only `Created` leaves a mixed-language row.
  "· Created": "· Создан",

  // Connections / WSL recovery and lifecycle states.
  "Removing…": "Удаление…",
  "Couldn't load the WSL backend state.": "Не удалось загрузить состояние WSL-бэкенда.",
  "The WSL backend will stop. Threads and projects opened against WSL stay safe inside the distro, but they'll be unavailable in Piπot until you re-enable WSL.":
    "WSL-бэкенд будет остановлен. Чаты и проекты, открытые в WSL, останутся в дистрибутиве, но будут недоступны в Piπot, пока вы снова не включите WSL.",
  "Piπot will restart and start only the WSL backend. Your Windows-side projects won't be accessible until you turn this off again.":
    "Piπot перезапустится и запустит только WSL-бэкенд. Проекты на стороне Windows будут недоступны, пока вы снова не отключите этот режим.",
  "this server": "этот сервер",

  // Diagnostics strings that live in tooltips/table headers rather than the
  // section chrome caught by the previous pass.
  "Approximate active CPU time for the T3 server root process and its descendants during the selected window. It grows only while sampled processes use CPU and older samples leave as the window moves.":
    "Приблизительное активное процессорное время корневого процесса сервера T3 и его дочерних процессов за выбранный интервал. Оно увеличивается только когда отслеживаемые процессы используют CPU; старые образцы удаляются по мере сдвига окна.",
  Max: "Максимум",

  // Provider model management and validation.
  hidden: "скрыта",
  custom: "пользовательская",
  default: "по умолчанию",
  none: "нет",
  "Instance ID is required.": "Укажите ID инстанса.",
  "Instance ID must be 64 characters or fewer.":
    "ID инстанса должен содержать не более 64 символов.",
  "Instance ID must start with a letter and use only letters, digits, '-', or '_'.":
    "ID инстанса должен начинаться с буквы и содержать только буквы, цифры, «-» или «_».",

  // Capabilities destructive-action copy.
  "This cannot be undone.": "Это действие нельзя отменить.",

  // Appearance / theme discovery.
  "e.g. Aurora": "например, Aurora",
  "A community color theme for your editor.": "Цветовая тема сообщества для вашего редактора.",

  // Desktop update release notes.
  "What's changed": "Что изменилось",

  // Usage labels assembled from multiple text nodes.
  "processed tokens": "обработанные токены",

  // Right-panel and preview states that only appear for unavailable surfaces.
  "This thread's branch has no pull request yet.": "У ветки этого чата пока нет pull request.",
  "Page didn't load — pick unavailable until the page renders":
    "Страница не загрузилась — выбор элемента будет доступен после её отображения",
  "Update this environment's Piπot server to browse pull requests.":
    "Обновите сервер Piπot в этом окружении, чтобы просматривать pull requests.",

  // Pull-request checkout / handoff edge states and compact badges.
  "The checkout could not be moved onto the pull request's latest commits, so the code there is older than the pull request. Uncommitted work or local commits keep it where it is.":
    "Не удалось переместить checkout на последние коммиты pull request, поэтому код в нём старее. Незакоммиченные изменения или локальные коммиты не позволяют переключить его.",
  "This repository is on the pull request's branch, with a thread open on it.":
    "Репозиторий переключён на ветку pull request, и на ней открыт чат.",
  "Adds the pull request to this thread's composer.":
    "Добавляет pull request в поле ввода этого чата.",
  outdated: "устарело",
  team: "команда",

  // Timeline compact states missed by source-string-only passes.
  Empty: "Пусто",
  "✓ completed": "✓ завершено",

  // Sidebar action failure missed because it is emitted only from an error path.
  "Failed to archive thread": "Не удалось архивировать чат",

  // Project settings fallback shown only for grouped multi-checkout projects.
  "Default (each checkout's t3.json or global setting)":
    "По умолчанию (t3.json каждого checkout или глобальная настройка)",
};
