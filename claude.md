# Projekt: Monsters Mathe-Markt

## Zielgruppe
- Mädchen, 2. Klasse (Niedersachsen)
- Fokus: Mathe 2. Halbjahr (1x1, Zahlenraum 100, Euro/Cent)

## Tech-Stack
- **Framework:** Kaplay.js (Game Engine)
- **Bundler:** Vite + TypeScript
- **Asset-Pipeline:** Pixellab MCP (nur zur Dev-Zeit). Assets werden lokal in `/public/assets/` gespeichert.
- **Runtime:** 100% lokal/offline ohne API-Calls.

## Architektur
- `src/logic/MathEngine.ts`: Generiert Aufgaben nach NDS-Lehrplan.
- `src/logic/AssetManager.ts`: Lädt lokale Assets aus `assets.json`.
- `public/assets/`: Unterordner für `monsters`, `items`, `ui`.
- `scripts/generate-pixellab-assets.ts`: Triggert die Asset-Generierung via MCP.
- `scripts/finalize-pixellab-assets.ts`: Lädt fertige Assets herunter und aktualisiert die Manifest-Datei.

## Gameplay-Mechanik

### Stationen-System
- **Kasse (x: 174, y: 430):** Fokus auf Geldwerte (Zählen von Euro-Münzen).
- **Mülleimer (x: 674, y: 485):** Fokus auf Grundrechenarten (Mathe-Müll entsorgen).
- **Bodenregal (x: 537, y: 300):** Fokus auf Ergänzungsaufgaben (Waren auffüllen).

### Gast-Sequenz (game.ts)
Der Ablauf pro Runde ist eine mehrstufige State-Machine:

1. **Eingang** — Monster erscheint an der Tür `DOOR { x: 402, y: 389 }` mit Sprechblase.
   - Phase 1 (0–2s): Zufälliger Eingangsgedanke (`ENTRANCE_THOUGHTS`).
   - Phase 2 (2–4s): Stationsbezogener Entschluss (`STATION_DECISIONS`).
   - Blase faded aus, `sequenceActive = false` → Monster läuft los.
2. **Laufweg** — Monster läuft zur Zielstation, macht kurzen Halt (`reachedStation`), springt dann mit Hüpf-Sound (`pj1`/`pj2` zufällig) zur festen Präsentationsposition `PRES_POS { x: 670, y: 460 }`.
3. **Aufgabe** — UI (Panel, Frage, Buttons) federn animiert ein. Monster schwebt sanft.
4. **Antwort** — Bei richtig: Visuals fliegen als Animation zum Score-Icon, das kurz pulsiert. Nach 0.8s Pause: North-Sprite → Rücklauf zur Tür → `feedback`-Scene.
5. **Walk-out** — Monster läuft zurück zur Tür, dann Szenenübergang zu `feedback`.

### Dynamische Gäste & Schwierigkeit
- **Kunden-Logik:** Freigeschaltete Monster aus dem Sticker-Album erscheinen zufällig an der Tür.
- **Difficulty Scaling:**
    - *Starter (Blubbo):* Zahlenraum bis 20, einfache Beträge bis 10€.
    - *Freigeschaltete Gäste:* Zahlenraum bis 100, komplexere Ergänzungen, Beträge bis 25€.

### Audio-System
BGM läuft persistent über Module-Scope-Handles (`gameMusicHandle`, `menuMusicHandle`).
Fade-in/out beim Szenenwechsel via `audioManager.fadeIn/fadeOut()`.

Registrierte Sound-IDs: `btn-click`, `btn-hover`, `answer-correct`, `answer-wrong`,
`coin-collect`, `game-start`, `door-bell`, `arrival-pop`, `think-pop`, `trash-impact`,
`shelf-place`, `unlock-fanfare`, `monster-jump`, `pj1`, `pj2`, `bgm-menu`, `bgm-game`.

## Belohnungssystem
- **Sticker-Album:** 34 Monster, 33 Unlocks. Ramp 1–9 Min/Schritt, dann flat 10 Min/Schritt; alle 4 Legendaries (Tidaros, Pyragon, Sylvara, Drako) am Ende. Total ~7h11m (Drako bei 1263 Punkten).
- **Visual Juice:** Münz/Item-Fly-Animation zum Score-Icon + Pulse, Screen-Shake bei Fehler, Konfetti-Burst bei richtiger Antwort (`canvas-confetti`, 80 Partikel, Spielfarben).
- **UI-Feedback:** Gestaffelte Button-Einblend-Animation (`easeOutBack`), Panel-Fade-in.
- **Sounds:** Richtige Antwort → `confirmation_002.ogg`. Falsche Antwort → `error_001.ogg` + Screen-Shake.

## Asset-Übersicht

### Monster (12 Stück, alle mit South + North Sprite)
Blubbo (Wasser), Zappy (Elektro), Bubsy (Fee), Flarky (Feuer), Mossy (Gras), Crysto (Eis),
Stinki (Gift/Pilz), Mangoman (Frucht), Mooni (Mond/Psycho),
Flambo (Feuer-Eidechse), Weedy (Gras/Sonnenblume), Frosty (Eis/Schneeball)

### Regal-Items (7 Stück)
`item-bottle`, `item-apple`, `item-milk`, `item-banana`, `item-can`, `item-bread`, `item-cookie-jar`

### Münzen (5 Sorten)
`coin-2e` (silber/gold), `coin-1e` (gold/silber), `coin-50c`, `coin-20c`, `coin-10c` (alle bronze)

### MathEngine — Geldaufgaben
- Difficulty 1: 1€ + 50ct, Beträge bis 2,00€ in 50ct-Schritten, Antwort in Cent
- Difficulty 2: alle 5 Münzsorten, 2–5 zufällige Münzen, Antwort in Cent

## Richtlinien
1. Assets IMMER lokal speichern. Nie externe URLs im Spiel-Code hartcodieren.
2. UI einfach und großflächig für Kinderhände/Augen gestalten.
3. Mathe-Aufgaben müssen visuelle Hilfestellung bieten, wenn Fehler passieren.