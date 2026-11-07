# CI-Agent — offener Betriebspunkt

- [ ] Repository-Secrets `SYNC_TOKEN` und `GEMINI_API_KEY` einrichten/prüfen; echten roten Check bis Reparatur, Check, Promote und Deploy beobachten.
- [ ] Gmail-Ausgang mit Run-Diagnose und Gmail-Eingang `[ci:betta]` bis zur Agenten-Routing-Übergabe nachweisen.
# NEXT — skills-dev

## Plan „Skills praktisch einsatzfähig“ (Stand 2026-11-06)
- [x] Gemeinsamer Runner + idempotentes Speichern + Wiederaufnahme (Etappe 1/2)
- [x] Feste Progression, EXP-Freischaltung, Stoppuhr-Runner ohne Countdowns, Slider-Anpassung
- [x] Release: dev → master → vitalos, Rules (Owner-Delete) live, Debug-APK als GitHub-Release `android-latest`
- [ ] Geräteabnahme am Android-Handy (Anruf, Bildschirmsperre, Zurück-Geste, Neustart)
- [ ] Native Google-Anmeldung (Capacitor-Plugin + SHA-1/OAuth in Firebase — braucht Konsole)
- [ ] Datenschutzerklärung + öffentliche Löschanfrage-Seite, Release-Signierung (`SKILLS_UPLOAD_*`), Play-Eintrag
- [ ] Optional: „Letzte Einheit wiederholen“ / Vorlagen (bewusst einfach halten)

- Remote `nimmsel23/skills-dev` + Firebase-Site `vos-skills` anlegen (nur auf Zuruf)
- ~~Submodul in fitness-dev/vitalos, `vos-release skills`~~ erledigt 2026-10-23 (Modul `skills` in `~/vitalos/bin/vos-release`, impliziert `fitness`)
- fitness-dev: `Skills/` durch Import/Alias auf dieses Repo ersetzen


## Gemini CI-Agent — verbleibende Betriebsprüfung

- [ ] Einen echten roten, code-behebbaren CI-Lauf beobachten und bestätigen, dass Reparatur-Commit, grüner Check und vorgesehener Promote/Deploy enden.
- [ ] Fehler außerhalb des Codes (fehlende Deploy-Credentials, externe Dienste, Runner-Ausfälle) separat als Diagnose melden; keine ungeprüften Änderungen an Secrets oder Deploy-Konfiguration.
- [ ] GitHub Pages fuer `skills-dev` auf Branch `dev`, Ordner `/docs` prüfen/aktivieren; Pages-Admin-Einstellungen sind über die aktuelle GitHub-Schnittstelle nicht erreichbar.
