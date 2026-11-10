- 2026-11-10: chore(deps) major stack align — React 19 / Vite 8.3.6 / plugin-react 6.2.1 / Firebase 13 (age-safe pins, pnpm-workspace overrides).

## 2026-11-09 — deps: minor/patch Upgrades

- ncu minor + age-safe vite/rolldown pins.

## 2026-11-09 — APK `android-latest` Abweichung (AL)

- `gh release view android-latest`: Asset `skills-app-debug.apk` (5.1 MB, updated 2026-11-06T03:10:46Z) gebaut aus `1700952` („Qualitätsfelder entfernt…“).
- `origin/dev` = `origin/master` = `c475d86` — Abstand `1700952..c475d86` = 32 Commits. Live Deploy zuletzt grün (`42625371656`).
- Kein Rebuild/Upload im AL-Lauf (Owner-Gate, kein Store). Folge-Task `b559bbe6-859e-4ad8-9685-45f60b757790` (+al/+lr).

## 2026-11-09 — Shell-Pin auf origin/master (CI/AGENTS)

CI/AGENTS: kein vitalos-Vorspulen; Merge-Agent nur master; Release-Weg = dev→master + Shell-Pin.
