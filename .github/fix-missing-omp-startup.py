from pathlib import Path

path = Path("apps/server/src/provider/Drivers/OmpDriver.ts")
text = path.read_text(encoding="utf-8")
old = '''        const result = yield* processRunner
          .run({ command: launchBinary, args: ["config", "path"] })
          .pipe(Effect.orDie);
'''
new = '''        // Keep spawn failures in the typed error channel so the fallback below
        // can keep Pivot bootable before omp has been installed from Settings.
        const result = yield* processRunner.run({
          command: launchBinary,
          args: ["config", "path"],
        });
'''
count = text.count(old)
if count != 1:
    raise SystemExit(f"expected one OmpDriver config-path anchor, found {count}")
path.write_text(text.replace(old, new, 1), encoding="utf-8", newline="\n")
