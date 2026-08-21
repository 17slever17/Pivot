import type { DisplayLanguage } from "@t3tools/contracts/settings";

import { useClientSettings } from "./hooks/useSettings";

const en = {
  "settings.general": "General",
  "settings.appearance": "Appearance",
  "settings.notifications": "Notifications",
  "settings.keybindings": "Keybindings",
  "settings.providers": "Providers",
  "settings.sourceControl": "Source Control",
  "settings.connections": "Connections",
  "settings.archive": "Archive",
  "settings.language": "Language",
  "settings.language.description": "Choose the display language for the Pivot interface.",
  "settings.language.english": "English",
  "settings.language.russian": "Русский",
  "settings.projectGrouping": "Project grouping",
  "settings.projectGrouping.description": "Combine matching repositories across environments.",
  "settings.timeFormat": "Time format",
  "settings.timeFormat.description": "System default follows your browser or OS clock preference.",
  "settings.wordWrap": "Word wrap",
  "settings.wordWrap.description":
    "Wrap long lines in code blocks, tables, diffs, and file previews by default.",
  "settings.typography": "Typography",
  "settings.advanced": "Advanced",
  "settings.search": "Search",
  "settings.searchAria": "Search settings",
  "settings.clearSearch": "Clear settings search",
  "settings.noResults": "No settings found",
  "settings.searchResults": "Settings search results",

  "nav.back": "Back",
  "nav.settings": "Settings",
  "nav.goToThreads": "Go to threads",
  "nav.usage": "Usage",
  "nav.pullRequests": "Pull Requests",

  "home.start": "What should we work on?",
  "home.startDescription": "Add a project to start your first thread.",
  "home.addProject": "Add project",
  "home.threadStartError": "Couldn’t start a new thread",
  "home.threadStartErrorDescription":
    "The project is still available. Try opening the draft again.",
  "home.tryAgain": "Try again",
  "home.connect": "Connect an environment to get started",
  "home.connectCloud":
    "Sign in to T3 Connect to connect a linked environment through its managed tunnel, or add a reachable backend manually.",
  "home.connectManual": "Add a reachable backend manually to start working from this browser.",
  "home.openConnections": "Open Connections",
  "home.addEnvironment": "Add environment",

  "sidebar.search": "Search",
  "sidebar.searchThreads": "Search threads",
  "sidebar.clearSearch": "Clear thread search",
  "sidebar.newThread": "New thread",
  "sidebar.newThreadCurrentProject": "New thread in current project",
  "sidebar.filterByProject": "Filter threads by project",
  "sidebar.allProjects": "All projects",
  "sidebar.projectSettings": "Project settings for {project}",
  "sidebar.newProject": "New project",
  "sidebar.searchResults": "Thread search results",
  "sidebar.noSearchResults": "No threads found",
  "sidebar.noProjects": "No projects yet",
  "sidebar.addProject": "Add project",
  "sidebar.noThreads": "No threads yet",
  "sidebar.noThreadsInProject": "No threads in {project} yet",
  "sidebar.snoozed": "Snoozed",
  "sidebar.settled": "Settled",
  "sidebar.showMore": "Show {count} more",

  "rightPanel.browser": "Browser",
  "rightPanel.terminal": "Terminal",
  "rightPanel.files": "Files",
  "rightPanel.diff": "Diff",
  "rightPanel.pullRequest": "Pull request",
  "rightPanel.agents": "Agents",
  "rightPanel.openSurface": "Open a surface",
  "rightPanel.chooseSurface": "Choose what to show in the right panel.",
  "rightPanel.openBrowser": "Open a local app or URL.",
  "rightPanel.openTerminal": "Start a shell in this workspace.",
  "rightPanel.openFiles": "Browse and read workspace files.",
  "rightPanel.openDiff": "Review changes in this thread.",
  "rightPanel.openPullRequest": "Open this branch's pull request.",
  "rightPanel.openAgents": "Follow subagents and workflows.",
  "rightPanel.addSurface": "Add panel surface",
  "rightPanel.close": "Close",

  "omp.accounts": "omp accounts",
  "omp.refresh": "Refresh",
  "omp.loadFailed": "Could not load omp login providers",
  "omp.checkInstalled": "Check that omp is installed and try again.",
  "omp.loginFailed": "Login failed for {provider}",
  "omp.loginFailedDescription":
    "Complete login in the browser opened on the server host, or run omp login there.",
  "omp.signedInTo": "Signed in to {provider}",
  "omp.loginDescription":
    "Login opens in a browser on the machine running the Pivot server. OAuth callbacks stay on that host.",
  "omp.loadingProviders": "Loading login providers…",
  "omp.noProviders": "No login providers reported by omp.",
  "omp.signedIn": "Signed in",
  "omp.notSignedIn": "Not signed in",
  "omp.unavailable": "unavailable",
  "omp.relogin": "Re-login",
  "omp.login": "Login",

  "root.somethingWentWrong": "Something went wrong.",
  "root.tryAgain": "Try again",
  "root.reload": "Reload app",
  "root.showError": "Show error details",
  "root.hideError": "Hide error details",
  "root.unexpectedError": "An unexpected router error occurred.",
} as const;

export type TranslationKey = keyof typeof en;
export type TranslationParams = Readonly<Record<string, string | number>>;

const ru: Partial<Record<TranslationKey, string>> = {
  "settings.general": "Основные",
  "settings.appearance": "Оформление",
  "settings.notifications": "Уведомления",
  "settings.keybindings": "Горячие клавиши",
  "settings.providers": "Providers",
  "settings.sourceControl": "Source Control",
  "settings.connections": "Подключения",
  "settings.archive": "Архив",
  "settings.language": "Язык",
  "settings.language.description": "Язык интерфейса Pivot.",
  "settings.language.english": "English",
  "settings.language.russian": "Русский",
  "settings.projectGrouping": "Группировка проектов",
  "settings.projectGrouping.description": "Объединять одинаковые репозитории из разных окружений.",
  "settings.timeFormat": "Формат времени",
  "settings.timeFormat.description":
    "Системный вариант использует настройки времени браузера или ОС.",
  "settings.wordWrap": "Перенос строк",
  "settings.wordWrap.description":
    "Переносить длинные строки в блоках кода, таблицах, Diff и предпросмотре файлов.",
  "settings.typography": "Типографика",
  "settings.advanced": "Расширенные",
  "settings.search": "Поиск",
  "settings.searchAria": "Поиск по настройкам",
  "settings.clearSearch": "Очистить поиск",
  "settings.noResults": "Ничего не найдено",
  "settings.searchResults": "Результаты поиска настроек",

  "nav.back": "Назад",
  "nav.settings": "Настройки",
  "nav.goToThreads": "К чатам",
  "nav.usage": "Использование",
  "nav.pullRequests": "Pull Requests",

  "home.start": "Над чем будем работать?",
  "home.startDescription": "Добавьте проект, чтобы начать первый чат.",
  "home.addProject": "Добавить проект",
  "home.threadStartError": "Не удалось начать новый чат",
  "home.threadStartErrorDescription":
    "Проект всё ещё доступен. Попробуйте открыть черновик ещё раз.",
  "home.tryAgain": "Повторить",
  "home.connect": "Подключите окружение, чтобы начать",
  "home.connectCloud":
    "Войдите в T3 Connect, чтобы подключить связанное окружение через managed tunnel, или добавьте доступный backend вручную.",
  "home.connectManual": "Добавьте доступный backend вручную, чтобы работать из этого браузера.",
  "home.openConnections": "Открыть подключения",
  "home.addEnvironment": "Добавить окружение",

  "sidebar.search": "Поиск",
  "sidebar.searchThreads": "Поиск по чатам",
  "sidebar.clearSearch": "Очистить поиск по чатам",
  "sidebar.newThread": "Новый чат",
  "sidebar.newThreadCurrentProject": "Новый чат в текущем проекте",
  "sidebar.filterByProject": "Фильтр чатов по проекту",
  "sidebar.allProjects": "Все проекты",
  "sidebar.projectSettings": "Настройки проекта: {project}",
  "sidebar.newProject": "Новый проект",
  "sidebar.searchResults": "Результаты поиска чатов",
  "sidebar.noSearchResults": "Чаты не найдены",
  "sidebar.noProjects": "Пока нет проектов",
  "sidebar.addProject": "Добавить проект",
  "sidebar.noThreads": "Пока нет чатов",
  "sidebar.noThreadsInProject": "В проекте {project} пока нет чатов",
  "sidebar.snoozed": "Отложенные",
  "sidebar.settled": "Завершённые",
  "sidebar.showMore": "Показать ещё {count}",

  "rightPanel.browser": "Браузер",
  "rightPanel.terminal": "Терминал",
  "rightPanel.files": "Файлы",
  "rightPanel.diff": "Diff",
  "rightPanel.pullRequest": "Pull request",
  "rightPanel.agents": "Агенты",
  "rightPanel.openSurface": "Открыть панель",
  "rightPanel.chooseSurface": "Выберите, что показать в правой панели.",
  "rightPanel.openBrowser": "Открыть локальное приложение или URL.",
  "rightPanel.openTerminal": "Запустить shell в этом workspace.",
  "rightPanel.openFiles": "Просматривать файлы workspace.",
  "rightPanel.openDiff": "Просмотреть изменения в этом чате.",
  "rightPanel.openPullRequest": "Открыть pull request этой ветки.",
  "rightPanel.openAgents": "Следить за subagents и workflows.",
  "rightPanel.addSurface": "Добавить панель",
  "rightPanel.close": "Закрыть",

  "omp.accounts": "Аккаунты omp",
  "omp.refresh": "Обновить",
  "omp.loadFailed": "Не удалось загрузить провайдеры входа omp",
  "omp.checkInstalled": "Проверьте, что omp установлен, и повторите попытку.",
  "omp.loginFailed": "Не удалось войти в {provider}",
  "omp.loginFailedDescription":
    "Завершите вход в браузере, открывшемся на хосте сервера, либо выполните omp login на нём.",
  "omp.signedInTo": "Вход в {provider} выполнен",
  "omp.loginDescription":
    "Вход открывается в браузере на машине, где запущен сервер Pivot. OAuth callbacks остаются на этом хосте.",
  "omp.loadingProviders": "Загрузка провайдеров входа…",
  "omp.noProviders": "omp не сообщил ни одного провайдера входа.",
  "omp.signedIn": "Вход выполнен",
  "omp.notSignedIn": "Вход не выполнен",
  "omp.unavailable": "недоступен",
  "omp.relogin": "Войти заново",
  "omp.login": "Войти",

  "root.somethingWentWrong": "Что-то пошло не так.",
  "root.tryAgain": "Повторить",
  "root.reload": "Перезапустить приложение",
  "root.showError": "Показать детали ошибки",
  "root.hideError": "Скрыть детали ошибки",
  "root.unexpectedError": "Произошла непредвиденная ошибка роутера.",
};

function interpolate(message: string, params?: TranslationParams): string {
  if (!params) return message;
  let result = message;
  for (const [name, value] of Object.entries(params)) {
    result = result.replaceAll(`{${name}}`, String(value));
  }
  return result;
}

export function translate(
  language: DisplayLanguage,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  return interpolate(language === "ru" ? (ru[key] ?? en[key]) : en[key], params);
}

export function useTranslation() {
  const language = useClientSettings((settings) => settings.displayLanguage);
  return {
    language,
    t: (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
  };
}
