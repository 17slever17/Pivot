from pathlib import Path
import os
import shutil

script = Path("scripts/apply_visual_audit_fixes_v2.py").read_text(encoding="utf-8")
exec(compile(script, "scripts/apply_visual_audit_fixes_v2.py", "exec"))

# This temporary workflow predates Vite+'s current formatter CLI and invokes
# `vp exec oxfmt`, which is now LSP/stdin-only. Keep the workflow reusable by
# adapting just that legacy invocation to the supported `vp fmt` command.
vp = Path(shutil.which("vp") or "")
if vp.is_file():
    real_vp = vp.with_name("vp.real")
    if not real_vp.exists():
        vp.rename(real_vp)
        vp.write_text(
            "#!/usr/bin/env bash\n"
            "set -e\n"
            "SELF_DIR=\"$(cd \"$(dirname \"$0\")\" && pwd)\"\n"
            "if [[ \"${1:-}\" == \"exec\" && \"${2:-}\" == \"oxfmt\" ]]; then\n"
            "  exec \"$SELF_DIR/vp.real\" fmt\n"
            "fi\n"
            "exec \"$SELF_DIR/vp.real\" \"$@\"\n",
            encoding="utf-8",
        )
        os.chmod(vp, 0o755)
