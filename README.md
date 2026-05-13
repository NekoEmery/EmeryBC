# EmeryBC

A personal [Bondage Club](https://www.bondageprojects.com/) addon by **Emery** — outfits, action buttons, friends management, poses, scenes, palettes, and a bunch of quality-of-life tools packed into a sliding drawer.

**Install via Tampermonkey / Violentmonkey:**
[loader.user.js](https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader.user.js)

---

## Features

### 🎽 Outfits
- Save full outfit sets (clothing, accessories, restraints) and load them with a custom `/command` in chat
- Per-outfit options: announce text sent to the room on load, nickname & title override, preserve/replace restraints
- **Restraint Sets** — save and load restraint-only presets separately from clothing
- **Outfit Schedules** — automatically apply an outfit at a set time of day
- Import / export outfits via JSON or BC outfit codes

### 🔘 Action Buttons
- Up to 20 quick-action buttons drawn on the left side of the chatroom
- Each sends a `/me` style emote on click — fully configurable label, color, and action text
- Organize buttons into named categories and reorder them by drag or arrow

### 💬 Buttons & Toggles
- **OOC Mode** — prefix every chat message with `(` automatically so it reads as out-of-character
- **Safeword** — one-click safeword button with configurable word, saved across sessions
- **AFK Auto-Reply** — send a custom beep reply when a message arrives after X minutes of inactivity
- **Beep Mute** — silence all incoming beeps without leaving the room
- **Anti-Restraint** — automatically remove any restraint applied by someone else; whitelist items you want to keep; optional confirm dialog before escaping

### 🧍 Poses
- Quick-access pose combo buttons — apply a full set of poses in one click
- Create, rename, and delete custom pose combos

### 🎨 Palettes
- Save and apply color palettes across your outfit
- Outfit-specific and restraint-specific palette presets
- Custom color swatch library

### 🎬 Scenes
- Build scripted multi-step sequences (emotes, outfit swaps, pose changes, delays)
- Run scenes from the drawer or via slash command

### 👥 Users
- **People in Room** — collapsible panel listing everyone in the current room with their name, member number, relationship badges, EBC version tag, friend tags, Profile button, and Beep button
- **Friends** — full friends list with expandable rows showing:
  - Friends-since date and last-seen timestamp
  - Custom color tags (add, remove, color-pick)
  - Inline note editor — write and auto-save notes directly from the row
  - Pin friends to the top of the list
- **User Notes** — dedicated tab for browsing and editing all saved character notes
- **People Met** — everyone you've shared a room with, saved server-side across devices (up to 2 000 entries)

### 🛠️ Dev Tools
- **Character Inspector** — dump raw appearance and property data for any room member
- **Copy Restraints from Member** — copy another person's current restraints onto yourself with locks stripped, with a confirm preview before applying
- **EBC Users in Room** — see which room members are running EmeryBC and their version
- **Addons Loaded** — list all bcModSdk mods active in the current session
- **Logs** — room history, restraint change log, and message log

### ✨ Quality of Life
- Overhead **EBC badge** broadcast to other EBC users (toggle on/off, optionally show version number)
- **Update notifications** — local chat notice when a room member is running a newer EBC version
- **IM / Beep window** — threaded beep chat with unread badge, message history, and timestamps
- **Timers** — track time online, time in current room, and time wearing current restraints
- **`/ebc` commands** — control most features from chat: `/ebc help`, `/ebc update`, `/ebc afk on`, `/ebc ooc on`, etc.

---

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. Click the install link: **[loader.user.js](https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader.user.js)**
3. Confirm the install prompt
4. Load Bondage Club — the EBC drawer appears on the right side of the chat screen

---

## Building from source

```bash
npm install
npm run build   # outputs dist/bundle.js
npm run dev     # watch mode
```

Requires Node.js. Built with TypeScript + Rollup.

---

## Credits

The sliding drawer UI was inspired by **[CRABS](https://github.com/sin-1337/CRABS)** by **Sin** — thank you for the open design! ♥

---

## License

[MIT](LICENSE) — © Emery
