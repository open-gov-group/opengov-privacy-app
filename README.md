# OpenGov Privacy – App (UI)

## Überblick
Die **OpenGov Privacy App** ist eine clientseitige React-Anwendung (Vite + Tailwind), die **OSCAL-Artefakte** (SSP/POA&M) visualisiert, **Evidence-Links** aus back-matter anzeigt und **Quellformate** (xDOMEA, BPMN) via Mapping-Pipeline in ein **RoPA/SSP** überführt.
Ziel: eine leichtgewichtige Reader-/Review-UI, die mit den Repos **opengov-privacy-oscal** (Kataloge/Profiles) und **opengov-privacy-mappings** (Konvertierung) zusammenspielt.
## Kernfunktionen
- SSP/POA&M Viewer: Laden und Anzeigen von OSCAL-JSON (v1.1.2), inkl. system-characteristics, system-implementation, implemented-requirements.
- Evidence/Back-Matter: Anzeige von resources.rlinks (Titel, Media-Type, optional Hashes), Deep-Links an Statements/By-Components.
- Mapping-Trigger: Button zum Erzeugen eines SSP aus xDOMEA/BPMN via Mapping-CLI/API (optional).
-I18n (DE/EN): UI-Labels zweisprachig vorbereitbar; Texte in den OSCAL-Dokumenten bleiben unverändert.
- Client-only: Läuft als GitHub Pages (keine Serverabhängigkeit) – ideal für Demo/Review.
## Architektur
- React + Vite (vite, @vitejs/plugin-react)
- Styling: Tailwind CSS, kleine UI-Bausteine (Cards, Tabs, Inputs)
- OSCAL-Modelle: einfaches JSON-Parsing; keine Spezial-Libs nötig
- Konfiguration über ENV/Query-Parameter (Profile/Kataloge/Beispieldateien)
## Browser (UI)
  ├─ Lädt: SSP/POA&M (JSON) über HTTPS (raw GitHub o. ä.)
  ├─ Optional: stößt Mapping an (API-Endpoint aus mappings-Repo oder lokale CLI)
  └─ Visualisiert: Controls, Components, Evidence, POA&M
## Verzeichnisstruktur
```bash
ui/
  src/
    App.jsx                 # Hauptansicht (Tabs: SSP, POA&M, Evidence)
    main.jsx                # React-Einstieg; importiert index.css vor App
    index.css               # Tailwind-Basis + UI-Styles
    lib/                    # Loader/Parser, kleine Utils
    components/ui/          # Card, Tabs, Inputs, PoamList, ...
    assets/                 # Logos/Icons (optional)
  public/
    index.html              # Vite Entry
  package.json
  vite.config.js
```

Hinweis zur Import-Reihenfolge: In main.jsx zuerst index.css importieren, danach App.jsx, damit Tailwind/Resets sicher greifen.

## Lokale Entwicklung

```bash
# Voraussetzung: Node 20+
npm install
npm run dev
# öffnet http://localhost:5173/<repo-name>/ (oder http://localhost:5173 bei root)
```

## Build & Deploy (GitHub Pages)
```bash
# Production-Build
npm run build

# Optional lokal testen
npm run preview
```

## GitHub Actions (Pages)

- Build-Artefakt: dist/
- Achte auf die base-Option in vite.config.js, z. B.:
```bash
        // vite.config.js
        export default {
        base: '/opengov-privacy-app/', // <- Repo-Name auf GitHub Pages
        plugins: [react()]
        }
        upload-pages-artifact vorher läuft.
```
 - Pages unter Settings → Pages aktivieren (Branch gh-pages oder „GitHub Actions“ Workflow).
- Falls Artefakt-Deploy via actions/deploy-pages@v4: prüfe, dass 

## Konfiguration (Profile/Katalog/Beispiele)

Die App kann per Query-Param oder ENV auf Quellen zeigen:
- ?ssp=<URL> – lädt ein OSCAL-SSP (JSON)
- ?poam=<URL> – lädt POA&M (optional)
-  ?lang=de|en – UI-Sprache

```bash
Beispiel:
https://open-gov-group.github.io/opengov-privacy-app/?ssp=https://raw.githubusercontent.com/open-gov-group/opengov-privacy-oscal/main/oscal/ssp/ssp_template_ropa.json&lang=de
```

## Zusammenspiel mit Mappings

- **Option A (manuell/CI)**: Das Repo **opengov-privacy-mappings** erzeugt via CLI build/ssp.json. Die App lädt die Datei über eine öffentlich erreichbare URL (z. B. raw GitHub).
- **Option B (API-Gateway)**: Ein schlanker Read-Only-Endpoint (z. B. /api/to-ssp?xdomea=...&bpmn=...) liefert ein fertiges SSP zurück. Die App zeigt das Ergebnis unmittelbar an.
Empfehlenswert: Back-Matter-Kontrakt einhalten (keine Self/Profile-HREFs, eindeutige UUIDs, Links an genau einer Stelle).

## Troubleshooting
- **Weiße Seite / Build-Fehler**: index.html nicht gefunden → Vite-base prüfen.
- **React is not defined**: In Komponenten import React from 'react' bei klassischen JSX-Setups, oder sicherstellen, dass @vitejs/plugin-react aktiv ist.
-  **Tailwind greift nicht**: Import-Reihenfolge (index.css vor App), Tailwind-Config vorhanden, Klassen nicht „gepurged“.
- **CORS / 404 beim Laden**: Raw-URLs testen (im Browser öffnen), Repo-Sichtbarkeit/Branch prüfen, ggf. Access-Control-Allow-Origin auf Server setzen.
- **POA&M/SSP Schema**: Mit dem Validator aus opengov-privacy-mappings/tools/validate-ssp.mjs gegen 1.1.2 prüfen.
## Roadmap
- Such-/Filterfunktionen in SSP (Controls, Components, Evidence)
- CSV/JSON-Export von Findings/Evidence
- Parametrisierung (Set-Parameters) interaktiv bearbeiten
- I18n-Texte als austauschbare YAML-Bundles
## Lizenz & Beitrag
- Code unter Apache-2.0.
- Beiträge willkommen – Issues/PRs mit kurzen Repro-Schritten & Beispieldatei.

## Kurz: „Wie nutze ich das jetzt?“
    1. SSP-Quelle bestimmen (z. B. aus opengov-privacy-oscal).
    2. URL in die App hängen: ?ssp=<RAW-URL>.
    3. Öffnen, Inhalte prüfen, Evidence anklicken, POA&M einsehen.
    4. Optional: Über Mappings-CLI ein eigenes SSP bauen und verlinken.
