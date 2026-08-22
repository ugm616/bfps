# HAD Engine

A browser-based retro FPS engine inspired by Doom, Duke Nukem 3D, and other 90s classics. Built with vanilla JavaScript (ES modules), no dependencies. Features a built-in level editor, compressed seed keys, and a custom `.HAD` file format for distributing complete games.

## Features

- **Retro Raycasting Engine** — Sector-based architecture with variable floor/ceiling heights, custom vertex geometry, per-sector lighting & flickering
- **Level Editor** — Top-down drag-and-drop: vertices, walls, sectors, portals, things (enemies, pickups, weapons, lights, player start)
- **Seed Keys** — Entire levels compressed into a single string (`HAD1:...`) using deflate + base64url
- **`.HAD` Format** — JSON container for full games: ordered scenes with seed keys, start/end connections for level chaining, cutscenes
- **Cutscenes** — Text-on-background with typewriter effect, defined in seed data
- **Weapons** — Fist, Pistol, Shotgun, Chaingun with ammo, reload, spread patterns
- **Enemies** — Grunt (melee), Imp (plasma projectile), Demon (fast melee) with basic AI
- **Pickups** — Health, armor, ammo, weapons
- **Controls** — WASD + Arrow keys, mouse look, LMB fire, RMB reload, mouse wheel / 1–9 weapon switch

## Quick Start

### Prerequisites
- A local HTTP server (required for ES modules)

### Run
```bash
cd D:\Browser FPS
npx serve .
# or: python -m http.server 8000
```
Open `http://localhost:3000` (or 8000).

### Play the Demo
1. Click **New Game** (loads built-in demo)  
   OR click **Load .HAD File** → select `demo.had`
2. Click **Start Game** from the menu

### Controls
| Action | Keys |
|--------|------|
| Move | W/A/S/D or Arrow Keys |
| Look | Mouse (click to lock pointer) |
| Fire | Left Click |
| Reload | Right Click / R |
| Weapon Switch | Mouse Wheel / 1–9 |
| Run | Shift |

## Project Structure

```
├── index.html          # Main UI (menu, HUD, editor toolbar, cutscene canvas)
├── main.js             # App entry: game flow, HAD loading, scene transitions
├── engine.js           # Raycasting engine, player, enemies, weapons, rendering
├── editor.js           # Top-down map editor
├── seed.js             # Seed compression/decompression (deflate + base64url)
├── assets.js           # 20+ built-in SVG assets (procedural, no external files)
├── had.js              # .HAD file parser/generator
├── demo.had            # Playable demo game (2 scenes: level + cutscene)
└── generate-demo.mjs   # Script to regenerate demo.had
```

## .HAD File Format

```json
{
  "game-name": "MY GAME",
  "menu-options": "start game, options",
  "scenes": [
    {
      "scene": "level_1",
      "title": "Level 1 - Entry Point",
      "start-from": "start game",
      "seed-key": "HAD1:...compressed seed...",
      "end-goto": "cutscene_1"
    },
    {
      "scene": "cutscene_1",
      "title": "The Journey Begins",
      "start-from": "level_1",
      "seed-key": "HAD1:...cutscene seed...",
      "end-goto": "ENDGAME"
    }
  ],
  "reload": "on"
}
```

- **scene** — Internal identifier (unique)
- **title** — Display name (optional)
- **start-from** — Which menu option or previous scene leads here
- **seed-key** — Compressed seed string (level or cutscene)
- **end-goto** — Next scene on completion, or `ENDGAME`

## Seed Key Format

`HAD1:` + base64url(deflate-raw(JSON))

Contains:
```json
{
  "v": 1,
  "name": "Level Name",
  "player": { "x": 0, "y": 0, "z": 0, "angle": 0, "sector": 0 },
  "sectors": [...],
  "vertices": [...],
  "walls": [...],
  "things": [...],
  "settings": { "fogColor": "#000", "fogDistance": 1000, "ambientLight": "#333", "reloadEnabled": true }
}
```

Cutscene seeds have `"type": "cutscene"` with `background` (SVG key) and `lines[]` (text + delay).

## Level Editor

Open via **Level Editor** button in main menu.

### Tools
| Tool | Key | Description |
|------|-----|-------------|
| Select | V | Click to select vertices, walls, sectors, things |
| Add Vertex | V | Click to place grid-snapped vertex |
| Draw Wall | W | Click-drag between two vertices |
| Create Sector | S | Click 3+ vertices, click first to close |
| Player Start | P | Click to set player position |
| Enemy | E | Place enemy (type in properties) |
| Pickup | U | Place pickup |
| Weapon | W | Place weapon pickup |
| Light | L | Place dynamic light |
| Portal | O | Click two walls to connect sectors |

### Properties Panel
Select any object to edit:
- **Vertex** — X, Y
- **Wall** — Texture, colors, portal target
- **Sector** — Floor/ceiling height, textures, colors, light level, flicker, exit target
- **Thing** — Type, position, angle, light properties

### Testing & Export
- **Test Level** (T) — Launch current map in engine
- **Save Seed** — Copy seed key to clipboard / download `.seed` file
- **Load Seed** — Load `.seed` or paste seed key
- **Export .HAD** — Package current level as playable `.had` file

## Creating Custom Assets

All graphics are inline SVG strings in `assets.js`. To add custom weapons/enemies/pickups:

1. Create SVG (viewBox 0 0 64 64 for sprites, 128 128 for weapons)
2. Add to `DEFAULT_SVG_ASSETS` in `assets.js` with a unique key
3. Reference the key in editor thing types or weapon definitions

Example:
```js
'my_custom_gun': `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">...</svg>`
```

## Architecture Notes

- **No external dependencies** — Uses browser APIs: `CompressionStream`, `DecompressionStream`, `PointerLock`, `Canvas 2D`
- **Single HTML file deployable** — All modules can be inlined for distribution
- **Compressed seeds** — Typical levels ~1–5 KB compressed
- **Sector-based geometry** — Rooms defined by vertex loops, portals connect sectors for multi-room maps
- **Painter's algorithm rendering** — Walls sorted by distance, sprites drawn back-to-front

## Browser Support

Requires modern browser with:
- ES Modules
- `CompressionStream` / `DecompressionStream` (Chrome 80+, Firefox 113+, Safari 16.4+, Edge 80+)
- Pointer Lock API
- Canvas 2D

## License

MIT — Free to use, modify, distribute.

## Credits

Inspired by id Software's Doom, 3D Realms' Duke Nukem 3D, Ken Silverman's Build Engine, and the demoscene spirit of packing everything into tiny self-contained packages.