## 2026-11-07 — CI-Agent-Fix: gh pr list Feld korrigiert

- Journal-Run 42416606547 scheiterte vor Gemini: GitHub CLI meldete `Unknown JSON field: baseRepository`; `gh pr list` beendete den Analyse-Step mit Exit 1. Kein Gemini-API-Key-Fehler.
- `.github/ci-agent/repair.mjs` sucht PRs jetzt mit unterstützten JSON-Feldern und dem Head-Filter `nimmsel23:<branch>`. Fix auf `dev` in allen acht Modul-/Coach-Repos.
- CI-Checks der Reparaturcommits grün; Modul-Promotion/Live-Deploy grün, Journals Live-Deploy war beim Eintrag noch in Arbeit. Ein echter roter Gemini-Reparaturlauf bleibt als Abnahme offen.

## 2026-11-07 — GitHub-Pages-Doku vorbereitet

- `docs/README.md` als Jekyll-Landingpage ergänzt. Die Datei ist auf `/index.html` geroutet; GitHub-Pages-Quelle `dev /docs` muss noch in den Repository-Einstellungen geprüft bzw. aktiviert werden.

## 2026-11-07 — Gemini-CI-Agent für Skills vorbereitet

- Agenten-Workflow auf `Check (Skills)`, `Preview (vos-skills)` und `Live Deploy (Skills master)` beschränkt; alte Quer- und Habits/Learn-Trigger entfernt.
- Fehlende Secrets führen in einen strukturierten Block-Bericht; eigene fehlgeschlagene Reparatur-Commits stoppen die Schleife.
- Aktuelle Agentenläufe scheiterten beim Checkout vor der Analyse. `SYNC_TOKEN` in Actions einrichten; `GEMINI_API_KEY` und echter Fehler→Reparatur→Check→Deploy-Lauf bleiben zu verifizieren.

## 2026-11-07 — CI-Agent-Deploy-Routing und No-op-Ausgänge korrigiert

- Reale Modul-Deploy-/Preview-Workflownamen ergänzt; grüne Deploy-Läufe lösen keine Merges aus. Ohne sichere Quellreparatur endet der Agent ohne Commit.
- Tailwind-4- und Dependabot-Upgrades bleiben erhalten; Gemini schreibt keine Lockfiles um.
- Actions-Secrets und ein echter Fehler→Reparatur→Check→Deploy-Rundlauf sind noch zu verifizieren.

## 2026-11-07 — Gemini CI-Agent installiert

- CI-Agent fuer Check-Fehler, Dependabot-PRs und Merge-Konflikte ergänzt; Tailwind-/Paket-Upgrades bleiben erhalten.
- Quellreparaturen werden auf den betroffenen Branch geschrieben; Zielbranch-Reparaturen erhalten einen PR und werden erst nach gruenem Check gemergt.
- Gemini-API und `SYNC_TOKEN` muessen als Actions-Secrets vorhanden sein. Nachweis: erster erfolgreicher automatischer Reparatur- und Deploy-Lauf steht aus.

## 2026-10-21 — Gemeinsamer Changelog

Universalisierten VitalOS-Release-Dialog über vendorte Vite-Module eingebunden. Standalone mit eigener Bestätigung; eingebettet unterdrückt zugunsten des zentralen Shell-Dialogs.

## 2026-10-17 — Direkte Fitness-Integration

Fitness ersetzt die identische frühere Skills/-Kopie durch ein direktes Submodule auf Branch fitness. Die Standalone-Quelle bleibt skills-dev/dev. Beide Production-Builds verwenden denselben gepinnten Skills-Commit über vitalos/fitness-app.

## 2026-10-17 — Videos für alle Skills-Übungen

- Alle 14 Skills / 65 unterschiedliche Progressions- und Conditioning-Übungen: 50 kurze native H.264-Demos plus 15 ausdrücklich gekennzeichnete Tutorials, mit Originalquellen. Keine fremden Clips kopiert.
- Vorschau der aktuellen und späterer Stufen; Anschauen ändert keine Freischaltung. Native Demos im Runner automatisch stumm als Loop; keine Medien in Pausen oder nach Verlassen. Timer, Sätze und Fortschrittsdaten bleiben unverändert.
- Tatsächliche Komponenten-/Runner-Regressionstests, HTTP-/ffprobe-Prüfung aller 50 Clips, oEmbed-Prüfung aller Tutorial-Quellen und Standalone-Build erfolgreich. Handy-Abnahme offen.
- Source nur skills-dev; Fitness hat derzeit noch eine eigene Skills/-Kopie. Kein Production-Deploy Teil dieser Aufgabe. Vollständige Zuordnung: docs/EXERCISE-VIDEOS.md.

# RESULTS — skills-dev

## 2026-10-16: Repo angelegt
Aus `~/fitness-dev` per `git subtree split --prefix=Skills` herausgelöst (Historie:
3 Commits), als Standalone-Mini-App nach dem Muster von `6pack-dev` aufgesetzt:
Vite/React/Tailwind, `mini-app.json` + vendored `mini-app-shell` (Splash, Service Worker,
Register), Icons, `firebase.json`/`.firebaserc` (Ziel `skills` → `vos-skills`),
Deploy-Workflow, Build-Check-Hook, Claude-Doku-Hooks. `pnpm run build` grün.
Nichts gepusht, keine Firebase-Site und kein GitHub-Repo angelegt.


## 2026-10-23 — Eigenständiges Skills-Dataset und Persistenz

Worktree `.worktrees/skills-progression`, Branch `feat/skills-progression`.
14 Skills / 65 Stufen mit stabilen IDs, Technik, Equipment und expliziten
Aufstiegsregeln. Ereignismodell mit idempotenter Legacy-Migration, kontogetrenntem
IndexedDB/localStorage, Firestore-Sync und wiederaufnehmbarem Runner.
Worker precacht Bundles und Katalog und schreibt den Katalog in dieselbe IDB.
Letzte Stufe und Meisterschaft getrennt; keine automatische Freischaltung.

Prüfung: Modell/Katalog, lokale Persistenz/Migration, Sync-Controller,
Firestore-Emulator-Zugriffsregeln, Medienchecks und gebauter Worker.
Produktions-Rules/Seed/Release und echte Geräteabnahme bleiben getrennte Schritte;
siehe `docs/SKILLS-DATA.md`.

2026-10-23: Bezeichnungen präzisiert: Ohne Login ausschließlich lokal in
localStorage/IndexedDB. Kein anonymes Firebase-Konto; Sync nur nach Anmeldung.


### Vorbereitung der Design-Integration

Gemeinsamer `designProgress`-Adapter und wiederverwendbare Speicher-/Login-Anzeige.
Adapter-Tests prüfen dauerhafte Speicherung vor Runner-Löschung, stabile IDs,
explizite Meisterschaft und Fehlererhalt. `scripts/test-design-integration.mjs`
kann einen separaten Vorschaupfad prüfen. Vorabprüfung der uncommitteten
Designvarianten A/B/C in `/tmp/skills-merge-prep/preview`: Build und DOM-Tests für
alle Kategorien, Stufenwechsel, Meisterschaft, Rückstufung, Speicherfehler und
Trainingsnachweise bestanden. Hauptarbeitsverzeichnis dabei unverändert.


### Integration nach Claudes Design-Commit

Nach `bf8cd0e` Skills-Worktree in `dev` zusammengeführt. Die Designvarianten
verwenden den gemeinsamen Ereignisspeicher mit fünf Kategorien, ausdrücklicher
Meisterschaft und wartendem Trainingsabschluss bei Speicherfehlern. Anmeldung,
Speicherstatus und Technik-/Unterstützungsbestätigung sind auch dort verfügbar.
Die Runner-Sicherung bleibt kontolokal; ein später Cleanup kann keine Runnerdaten
in ein inzwischen anderes Konto schreiben.


### Produktionsrelease 2026-10-23, 15:35 Europe/Vienna

- Skills `acdbfd7` auf `origin/dev` und `origin/fitness`; Fitness `f221e52`
  auf `vitalos`; VitalOS-Parent `ed6a7c3` auf `master` veröffentlicht.
- Skills-, Fitness-, Shell- und VOS-Fitness-Deployments erfolgreich in CI.
- Zentrale Firestore-Regeln und `skillsCatalogs/calisthenics-v1` veröffentlicht;
  Regeltests des kombinierten Rulesets und zweimaliger Seed im Emulator bestanden.
- Live https://vos-skills.web.app: HTTP 200, Release-ID `acdbfd7`, Katalog mit
  14 Skills / 65 Stufen identisch zum Quellstand; aktuelles JS und Worker-Precache
  für Katalog und Bundles nachgewiesen. Keine anonyme Anmeldung; ohne Login lokal.
- Hosting-CI: https://github.com/nimmsel23/vitalos/actions/runs/39962182296
- Rules/Katalog: https://github.com/nimmsel23/vitalos/actions/runs/39962251260
- Echte Nutzeranmeldung und Zweigeräte-Sync wurden nicht im Browser abgenommen.


## 2026-10-31 — Dev-Projekte unter ~/dev

Lokale Entwicklungspfade und betroffene Verknüpfungen auf `~/dev/*-dev` umgestellt. Runtime-Daten, Branches und Release-Checkouts behalten ihre Zuständigkeit. Keine Pushes oder Releases. Gesamter Umzug und Prüfungen: `~/RESULTS.md`.
## 2026-10-31 — Dependabot

Enabled Dependabot alerts and security updates. Configured weekly GitHub Actions and npm/pnpm updates; version updates target `dev`. Minor/patch updates are grouped; vendored mini-app-shell copies stay maintained at their source. Validated YAML, repository manifest paths and update targets.


## 2026-11-07 — Gemini CI-Agent aktiviert

- Agent-Workflow und lokale Trigger für `skills-dev` auf `dev` eingerichtet; `GEMINI_API_KEY` als Actions-Secret gesetzt.
- `Check`/Preview und Agent-Run [42405192732](https://github.com/nimmsel23/skills-dev/actions/runs/42405192732) waren auf Commit `098ce474` grün. Dieser Lauf war ein No-op auf einem erfolgreichen Check; ein roter Code-Fehler wurde noch nicht absichtlich simuliert.
- Pushes und PR-Merges verwenden die eng berechtigte `GITHUB_TOKEN`-Workflow-Berechtigung; kein separates `SYNC_TOKEN` erforderlich.
