# AGENTS.md — Skills

<!-- release-weg:start -->
## Release-Weg und Branches (Skills)

Stand 2026-10-29. Ausführlich: `~/vitalos/docs/DEPLOYMENT.md` (GitHub: nimmsel23/vitalos, `docs/DEPLOYMENT.md`).

**dev → master → vitalos**

| Branch | Rolle | Lokal |
|---|---|---|
| `dev` | Edits und Previews (Preview-Channel `dev`, PR-Channel je PR) | ja — dieser Klon steht fest auf `dev` |
| `master` | **Standalone-Prod** (Hosting-Target `skills` = vos-skills.web.app); deployt nur per CI (`Live Deploy (Skills master)`) | nein, muss nicht existieren |
| `vitalos` | Stand für die Shell (`~/vitalos/skills-app`); darf hinter `master` liegen | nur als `-app`-Checkout im Meta-Repo |

- Release (automatisch): `dev` committen und pushen ist ausdrücklich erwünscht, nichts bleibt liegen. Nach grünem `Check (Skills)` promotet `.github/workflows/automerge.yml` `dev` per Fast-Forward nach `master` und startet den Live-Deploy per Dispatch (Vorlage und Logik: `~/vitalos-prod/docs/product-dev/ci-auto-promote/`). Kein PR nötig, kein Force-Push. Direkte Pushes auf `master` vermeiden (sie erzeugen Divergenz, der Workflow läuft dann rot): auch Hotfixes über `dev`; ist es doch passiert, `master` per normalem Push nach `dev` mergen.
- Shell: `vos-release skills` merged `origin/master` nach `vitalos` und bumpt den Pointer im Meta-Repo (deployt die Shell).
  Vorher `vos-overview`.
- Branch-Schutz auf `master` (seit 2026-10-29): Merge nur per PR mit grünem Check `check`; Force-Push und Löschen gesperrt;
  Admin darf für Hotfixes direkt pushen. Kein „Branch muss aktuell sein", sonst blockiert der Auto-Merge.
- `master` wird nie lokal ausgecheckt; `git fetch` genügt. Das Meta-Repo `vitalos` deployt nur noch die Shell.
- Nicht auf `dev` im Hauptordner arbeiten, wenn ein Agent-/Feature-Branch nötig ist: Worktree
  (`git worktree add .worktrees/<name> <branch>`).
- Default-Branch des Repos ist `master`; die `.github/workflows/*.yml` auf `master` bestimmen das Live-Verhalten.

### Release-Ablauf für Agents (Stand 2026-10-30, so ohne Rückfragen durchziehen)

Nach „committen/releasen“ vom User gilt die Freigabe für die ganze Kette, nicht nur für den Commit:

1. Tests: `pnpm test` (inkl. `pnpm run test:designs`) und `pnpm run build`. Änderung in `APP.md` vermerken.
2. Commit auf `dev` (Co-Authored-By-Zeile laut Session), `git push origin dev`.
3. `dev` pushen — nach grünem `check` promotet `automerge.yml` automatisch nach `master` und startet `Live Deploy (Skills master)`. Status: `gh run list --limit 5` (ohne `-R`, sobald das Standard-Repo gesetzt ist, siehe Stolperfalle unten).
4. Erst wenn `master` den Stand enthält und der Live-Deploy grün ist: `vos-release skills --yes` (Shell-Seite: `origin/master` → `vitalos`,
   Pointer im Meta-Repo bumpen). `--yes` ist ohne TTY Pflicht, sonst bricht `gum confirm` mit „could not open TTY“ ab.
   Vorher optional `vos-release --dry-run skills`.
5. Schritt 4 blockiert der Auto-Mode-Classifier von Claude Code als „Production Deploy“. Dann nicht umgehen, sondern
   den Befehl dem User nennen (`! vos-release skills --yes`) oder dort eine Bash-Permission-Regel für `vos-release skills`
   setzen lassen. Schritte 1–3 gehen ohne Freigabe-Theater.

**Stolperfalle `gh`:** Dieser Klon hat neben `origin` (skills-dev) noch den Alt-Remote `upstream` (→ fitness-dev, vom
Subtree-Split). Ohne gesetztes Standard-Repo hat `gh` deshalb PRs/Runs von **fitness-dev** gezeigt (PR #7 war plötzlich
ein Dependabot-PR). Gelöst mit `gh repo set-default nimmsel23/skills-dev` (steht in `.git/config`, ist pro Klon). Bei
frischem Klon einmal wiederholen; im Zweifel immer `-R nimmsel23/skills-dev` mitgeben. Der Remote `upstream` bleibt
bestehen (Historie des Splits).
<!-- release-weg:end -->

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
