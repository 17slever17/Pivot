import { describe, expect, it } from "vite-plus/test";

import { translate } from "./i18n";

describe("i18n", () => {
  it("uses the English catalog when English is selected", () => {
    expect(translate("en", "sidebar.newThread")).toBe("New thread");
    expect(translate("en", "settings.language")).toBe("Language");
  });

  it("translates ordinary interface copy to Russian", () => {
    expect(translate("ru", "sidebar.newThread")).toBe("Новый чат");
    expect(translate("ru", "settings.language")).toBe("Язык");
    expect(translate("ru", "omp.refresh")).toBe("Обновить");
  });

  it("keeps technical terms intentionally unchanged", () => {
    expect(translate("ru", "rightPanel.diff")).toBe("Diff");
    expect(translate("ru", "rightPanel.pullRequest")).toBe("Pull request");
    expect(translate("ru", "nav.pullRequests")).toBe("Pull Requests");
    expect(translate("ru", "settings.sourceControl")).toBe("Source Control");
  });

  it("interpolates user and provider values", () => {
    expect(translate("ru", "sidebar.projectSettings", { project: "Nemika" })).toBe(
      "Настройки проекта: Nemika",
    );
    expect(translate("ru", "omp.loginFailed", { provider: "anthropic" })).toBe(
      "Не удалось войти в anthropic",
    );
  });
});
