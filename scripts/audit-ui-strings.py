from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "apps" / "web" / "src"
CATALOGS = [
    SRC / "components" / "settings" / "SettingsRuntimeLocalization.tsx",
    *sorted((SRC / "i18n").glob("runtimeRu*.ts")),
]

key_re = re.compile(r'^\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|([A-Za-z][A-Za-z0-9 ]*))\s*:', re.M)
known: set[str] = set()
for catalog in CATALOGS:
    catalog_text = catalog.read_text(encoding="utf-8")
    for match in key_re.finditer(catalog_text):
        raw = match.group(1) or match.group(2)
        if raw:
            known.add(bytes(raw, "utf-8").decode("unicode_escape") if "\\" in raw else raw)

patterns = [
    re.compile(r'>([^<>{}\n]*[A-Za-z][^<>{}\n]*)<'),
    re.compile(r'\b(?:title|description|placeholder|aria-label|ariaLabel|label|tooltipText|revealTooltip|hideTooltip|children)\s*=\s*["\']([^"\']+)["\']'),
    re.compile(r'\b(?:title|description|placeholder|label|hint|message|tooltip|emptyLabel|actionLabel)\s*:\s*["\']([^"\']+)["\']'),
    re.compile(r'(?<![A-Za-z0-9_])(["\'])([A-Z][A-Za-z0-9][^"\'\n]{2,180})\1'),
]

skip_exact = {
    "use client", "Success", "Failure", "Error", "Warning", "Info",
    "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS",
    "Windows", "Linux", "Win32", "MacIntel", "darwin", "linux", "win32",
    "GitHub", "GitLab", "Bitbucket", "Azure DevOps", "Git", "Jujutsu", "omp",
    "DeepSeek-R1", "DeepSeek-V3", "SSH", "HTTPS", "URL", "OAuth", "T3 Connect",
    "Commit", "Push", "Pull", "Rebase", "Stash", "Diff", "Pull Request", "worktree",
}

skip_fragments = (
    "className", "data-", "@t3tools/", "~/", "../", "./", "http://", "https://",
    "bg-", "text-", "border-", "hover:", "focus:", "sm:", "md:", "lg:", "dark:",
    "var(--", "calc(", "radial-gradient", "linear-gradient", "font-", "rounded-",
    "PrimaryConnectionTarget", "RelayConnectionTarget", "SshConnectionTarget",
)

results: dict[str, set[str]] = defaultdict(set)
for path in SRC.rglob("*"):
    if path.suffix not in {".ts", ".tsx"}:
        continue
    name = path.name
    if any(token in name for token in (".test.", ".spec.", ".stories.")):
        continue
    if name in {"routeTree.gen.ts", "SettingsRuntimeLocalization.tsx", "i18n.ts"} or name.startswith("runtimeRu"):
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    for pattern in patterns:
        for match in pattern.finditer(text):
            value = match.group(2) if pattern is patterns[-1] else match.group(1)
            value = re.sub(r"\s+", " ", value).strip()
            if not value or value in known or value in skip_exact:
                continue
            if len(value) < 3 or len(value) > 220:
                continue
            if not re.search(r"[A-Za-z]", value):
                continue
            if any(fragment in value for fragment in skip_fragments):
                continue
            if re.fullmatch(r"[a-z0-9_.:-]+", value):
                continue
            if value.startswith(("/", "C:\\")):
                continue
            results[str(path.relative_to(ROOT))].add(value)

print(f"Catalogs: {len(CATALOGS)}")
print(f"Known exact translations: {len(known)}")
print(f"Files with candidate unmapped UI strings: {len(results)}")
print()
for rel in sorted(results):
    values = sorted(results[rel], key=lambda s: (s.lower(), s))
    print(f"## {rel} ({len(values)})")
    for value in values:
        print(f"- {value}")
    print()
