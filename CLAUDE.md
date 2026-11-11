# CLAUDE.md — skills-dev

Standalone-App für die Calisthenics-Skills (Progressionen, Workout-Runner,
Verlauf). Herausgelöst am 2026-10-16 aus `~/fitness-dev` (`Skills/`) per
`git subtree split --prefix=Skills` — die drei Commits, die `Skills/` berührt
haben, sind die Historie dieses Repos (Basis `c514177`).

## Aufbau

- `SkillsCard.jsx` — die gesamte Skill-Logik und -Oberfläche (Default-Export,
  optionale Prop `onWorkoutComplete(workout)`), `skills.css` — Theme
  `[data-theme="skills"]` (Lime `#c8ff00`) + Slider-Styles.
- `main.jsx` — Standalone-Hülle: setzt `data-theme="skills"`, rendert die Karte
  und zeigt Release-Notizen für noch nicht bestätigte Updates.
- `scripts/vos-changelog/` — gemeinsamer Vite-Plugin mit eingebetteten Release-Metadaten; in VitalOS zeigt nur die Shell den gebündelten Dialog.
- `designs/` — Design-Phase (2026-10-23): drei Varianten A/B/C als Vanilla-Module im Shadow-DOM + `DesignSwitcher.jsx`/`DesignHost.jsx`; `core.js` nutzt `data/designProgress.js` und denselben IndexedDB-/localStorage-Ereignisspeicher wie das Original; Firestore-Sync nur nach Login. Nach der Entscheidung unterlegene Varianten löschen.
- Nach dauerhaft gespeichertem Workout senden die Design-Varianten `skills:workout-completed` mit demselben Host-Payload wie `SkillsCard.jsx`; VitalOS kann damit auch alternative Designs ins Fitness-Tageslog übernehmen.
- `APP.md` — Produktverhalten, Release-Notizen und laufender Änderungsverlauf.
  Neue App- und Release-Änderungen dort ergänzen.
- `mini-app.json` + `scripts/mini-app-shell/` (vendored aus
  `~/vitalos/packages/mini-app-shell`, nicht editieren; Drift: `pnpm run vendor:check`) —
  `pnpm run build` erzeugt Manifest, Splash, Service Worker (`sw.js`) und Register-Snippet.
- `public/` — Icons (Pfeil nach oben, Lime), Manifest-Quelle.

## Daten

Eigenständiger Katalog: `public/skills-catalog.v1.json` (14 Skills / 65 Stufen).
`data/` besitzt Modell, IndexedDB, localStorage und Firestore-Sync.
Vertrag, Migration, Rules-Integration und Prüfungen: `docs/SKILLS-DATA.md`.
Legacy-Fitness-Keys dienen nur der einmaligen, nicht destruktiven Übernahme.
Firestore-Namespace: `skillsUsers/{uid}/events`, Katalog: `skillsCatalogs`.
Runner bleibt lokal; ein Stufenindex allein bedeutet keine Meisterschaft.

## Befehle

`pnpm install`, `pnpm run dev` (Vite), `pnpm run build` (inkl. Stempel),
`pnpm run firebase` (Build + `firebase deploy --only hosting:skills`),
`pnpm run deploy` (deployt das vorhandene `dist/` ohne Build-Schritt),
`pnpm run build:android` (baut natives Bundle & Debug-APK),
`pnpm run run:android` (deployt auf Android-Gerät/Emulator).

## Integration und Release (Stand 2026-11-11)

- Entwicklung: `~/dev/skills-dev`, Branch `dev`. Standalone-Prod: `master` (CI Auto-Promote + Live Deploy).
- Fitness bindet Skills **nicht** mehr als verschachteltes Git-Submodule `Skills/` ein.
  Auflösung: Nachbar-Checkout `skills-app`/`skills-dev` über `vite-miniapp-submodules.mjs`
  (`src/views/Skills` → Repo-Wurzel; Alias `@vos-skills/`). Keine UI-Dateien nach Fitness kopieren.
- Shell-Vessel: `~/vitalos/skills-app`, Branch-Pin `master` (`.gitmodules`). `vos-release` /
  `vos-ship` pinnt `origin/master` und bumpt den Meta-Pointer.
- Legacy: lokaler Branch `fitness` (ohne `origin/fitness`) und alte Gitlink-Doku sind obsolet —
  Freigabestand für Fitness ist derselbe `master`-Tip wie Standalone.
- Production: Skills-Hosting über Skills-CI (`vos-skills`); Fitness-Live klont Nachbar-`master`.
- Vor Änderungen Gitstatus/Branch/Pointer prüfen, fremde Daten und Änderungen erhalten.

## Übungsvideos

`exerciseVideos.json` ist die explizite Medienzuordnung für alle Progressionen
und Conditioning-Übungen. `ExerciseVideo.jsx` wird von Vorschau und Runner
genutzt: kurze native Demos automatisch nur im Runner; Tutorials auf Wunsch.
Quellen und Prüfgrenzen: `docs/EXERCISE-VIDEOS.md`. Bei Übungsumbenennungen
`node scripts/test-exercise-videos.mjs` ausführen und den Katalog mitziehen.

## Org-Taskwarrior (global) — gilt fuer alle Agenten der VitalOS-Org

Verbindlich fuer alle Agenten (Vibe, Claude, Codex, Gemini) in Org-Kontexten
(Owner-Weisung 2026-11-07):

1. EINE globale Org-Task-DB — KEINE eigenen Rollen- oder Repo-DBs mehr:
   `TASKRC=~/.local/state/vitalos-org/taskrc` (DB liegt daneben in `task/`).
   Alte Repo-DBs sind archiviert unter `~/.local/state/vitalos-org/archive-repodb/`.
2. Daniels private Taskwarrior-DB (`~/.task`, u. a. Hotlist `+hot`) bleibt
   TABU fuer Schreibzugriffe — nur lesend (CEO-Runde: Task `status:pending +hot`).
3. Rolle = Tag: Jeder Agent taggt seine eigenen Aufgaben mit seiner Rolle:
   `+ceo`, `+cto`, `+al`, `+pm`, `+alpha`, `+betta` …
4. Abteilung/Repo = project: `project:fitness-dev`, `project:journal-dev`,
   `project:vitalos-prod`, `project:dotfiles`, `project:aos` …
5. Prio-Encoder (in der Org-taskrc verankert):
   - `+hit` und `+br` sind EIN Tier (Hits = Big Rocks, Koeffizient 8.0) —
     hoechste Dringlichkeit, `+hit` = `+br`.
   - `+lr` 2.0 (Little Rocks).
   - `+hot` 1.0 — NUR Potential/Sichtbarkeit, wird NIE automatisch ausgefuehrt;
     ob ein Potential jetzt anfaellt, entscheidet der Door War (Sonntagsrunde).
   - `+s` -1.0 (Sand, Zeitverschwendungsroutine).
   - `+go` ist KEINE Prioritaet und bewirkt nichts — Freigaben laufen ueber
     die Rollen (CTO-Freigabeprozess), nicht ueber Urgency.
6. Aufgaben IMMER per UUID anfassen (`task <uuid> modify|done|info`), NIE per
   ID — IDs renummerieren sich nach jedem `done` (Fehltreffer-Gefahr).
7. Guard: orgsh und die Runner verweigern den Lauf, wenn die Org-taskrc fehlt —
   kein stiller Rueckfall auf die Privat-DB.
8. Uebersicht/Rang: `TASKRC=~/.local/state/vitalos-org/taskrc \
   ~/.org/venv/bin/python ~/aos/bin/aos door plan quadrants --json`
   (Eisenhower-Sicht Q1–Q4).
