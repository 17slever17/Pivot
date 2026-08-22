from pathlib import Path

script = Path("scripts/apply_visual_audit_fixes_v2.py").read_text(encoding="utf-8")
exec(compile(script, "scripts/apply_visual_audit_fixes_v2.py", "exec"))
