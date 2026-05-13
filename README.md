# EBC — EmeryBC

A [Bondage Club](https://www.bondageprojects.com/) addon by **Emery** — outfits, action buttons, friends management, poses, scenes, palettes, and a bunch of quality-of-life tools packed into a sliding drawer on the right side of the chat screen.

---

## Installation

### Tampermonkey / Violentmonkey

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. Click the loader link for your channel:
   - **Stable** → [loader.user.js](https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader.user.js)
   - **Dev** → [loader-dev.user.js](https://raw.githubusercontent.com/NekoEmery/EmeryBC/dev/loader-dev.user.js)
3. Confirm the install prompt
4. Load Bondage Club — the EBC drawer appears on the right side of the chat screen

### FUSAM

EBC is listed in the [FUSAM](https://gitlab.com/Sidiousious/bc-addon-loader) addon registry. Install FUSAM and enable **EBC** from the addon list. Both stable and dev channels are available.

---

## Channels

| Channel | Bundle | Updated on |
|---------|--------|------------|
| **Stable** | [nekoemery.github.io/EmeryBC/stable/bundle.js](https://nekoemery.github.io/EmeryBC/stable/bundle.js) | Push to `master` |
| **Dev** | [nekoemery.github.io/EmeryBC/dev/bundle.js](https://nekoemery.github.io/EmeryBC/dev/bundle.js) | Push to `dev` |

Builds are deployed automatically via GitHub Actions on every push.

---

## Feature Overview

- [🎽 Outfits](#-outfits)
- [⛓️ Restraint Sets](#️-restraint-sets)
- [🔘 Action Buttons](#-action-buttons)
- [💬 Buttons & Toggles](#-buttons--toggles)
- [🛡️ Anti-Restraint](#️-anti-restraint)
- [🧍 Poses](#-poses)
- [🎨 Palettes & Colors](#-palettes--colors)
- [🎬 Scenes](#-scenes)
- [👥 Users & Friends](#-users--friends)
- [📝 Notes](#-notes)
- [🌐 People Met](#-people-met)
- [🛠️ Dev Tools](#️-dev-tools)
- [🖼️ Drawer Appearance](#️-drawer-appearance)
- [✨ Quality of Life](#-quality-of-life)
- [⌨️ Slash Commands](#️-slash-commands)

---

## 🎽 Outfits

Save full outfit sets and load them with a custom `/command` in chat.

**Creating an outfit**
1. Dress your character how you want
2. Open the EBC drawer → **Outfits** tab
3. Fill in a command (e.g. `dom`), display name, and optional announce text
4. Click **+ Save Current Appearance as New Outfit**

**Using an outfit** — type `/dom` (or whatever command you set) in chat. The outfit loads instantly and sends the announce emote to the room.

**Per-outfit options**
- **Preserve restraints** — keep whatever restraints you're wearing when loading; off = swap restraints too
- **Preserve clothing** — keep current clothing layers when loading a restraint-focused outfit
- **Announce text** — emote sent to the room on load, e.g. `switches into dom mode`
- **Nickname / Title override** — automatically change your displayed name and title when the outfit loads
- **Outfit tags** — colour-coded labels to organise outfits (e.g. "casual", "formal", "scene")

**Other outfit tools**
- **Save Current** — overwrite an existing outfit with your current appearance
- **Export / Import** — share outfits as JSON or load from a BC outfit code
- **Reorder** — move outfits up/down in the list

---

## ⛓️ Restraint Sets

Separate from outfits — save and apply restraint-only presets without touching clothing.

Same options as outfits: command, display name, announce text, tags, reorder, export/import.

---

## 🔘 Action Buttons

Up to 20 configurable quick-action buttons drawn on the side of the chatroom.

Each button sends an action or emote to the room when clicked. The sidebar is draggable and collapsible.

**Per-button settings**
- Label (up to 6 characters shown on the button)
- Hex color
- Action text (what comes after your name, e.g. `waves goodbye`)
- Style — `action` `( )`, `emote` `* *`, or `sequence`
- Enable / disable toggle
- **Name in announce** — include or exclude your name from the message (action style only)

**Categories** — group buttons into named tabs and switch between them with the arrow chips on the sidebar. Each category has its own set of buttons.

---

## 💬 Buttons & Toggles

Found in the **Buttons** tab of the EBC drawer.

| Toggle | What it does |
|---|---|
| **OOC Mode** | Prefixes every chat message with `(` so it reads as out-of-character. Commands, emotes, and already-OOC messages are never modified. |
| **Safeword** | One-click safeword button. Configure the word in settings. |
| **AFK Auto-Reply** | Sends a custom beep reply when someone messages you after X minutes of inactivity (default 10 min). 30-minute cooldown per sender to avoid spam. |
| **Beep Mute** | Silences all incoming beeps without leaving the room. |
| **Suppress Native Beep** | Stops plain beeps from also showing in BC's main chat log when EBC's IM handles them. |

---

## 🛡️ Anti-Restraint

Automatically remove any restraint applied to you by someone else.

- Toggle on/off from the **Buttons** tab
- **Protected Items** — items on the whitelist are always kept, even if applied by others. Add items from the settings panel.
- **Confirm dialog** — shows a prompt before auto-escaping so you can choose to accept the restraint
- Covers all restraint slots including collar and neck
- Retries removal up to 2 times per slot before giving up on locked items
- Sends a glare emote to the room after a successful escape

---

## 🧍 Poses

Quick-access pose combo buttons — apply a full set of BC poses in one click.

- Create named combos from any combination of BC poses
- Apply combos from the drawer or define a slash command for each
- Edit and delete combos

---

## 🎨 Palettes & Colors

Save and reapply color schemes across your character.

- **Outfit palettes** — capture your current outfit colors and restore them later
- **Restraint palettes** — same for restraint-slot items
- **Custom color library** — save individual hex colors as swatches for quick access
- **Apply to group** — paint a single color across all zones of a body group
- **Restraint presets** — save a restraint color configuration and reapply it to matching items

---

## 🎬 Scenes

Scripted multi-step sequences you can trigger with a slash command.

**Step types**
- **Emote** — send a `/me` action to the room
- **Outfit** — load one of your saved outfits
- **Restraints** — apply a restraint set
- **Pose** — apply a pose combo
- **Delay** — wait N seconds before the next step

Build scenes in the **Scenes** tab, assign a command, and run them with `/yourcommand` in chat. Export and import scenes as JSON.

---

## 👥 Users & Friends

The **Users** tab has three sections.

### People in Room
Collapsible panel showing everyone currently in the chat room:
- Green presence dot, name (nickname if set), member number
- Relationship badge (Owner, Lover, etc.)
- EBC version badge (if they're running EBC)
- Friend tags
- **Profile** button — opens the BC information sheet
- **Beep** button — opens the EBC IM window (friends only)
- **Copy ID** button — copies the member number to clipboard

### Friends List
Your BC friends list with expandable rows. Click a friend row to expand:

- 🤝 **Friends since** date
- 🕑 **Last seen** timestamp (tracked across sessions)
- **Tags** — add custom colour-coded labels (e.g. "dominant", "close friend")
- **Note** — inline text editor for personal notes. Auto-saves 800ms after you stop typing
- **📌 Pin** — pin a friend to the top of the list

Friends are sorted: pinned first → alphabetical. Unread beep badge shows on the friend row.

### Outfit Schedules
Set an outfit to auto-apply at a specific time of day. Schedules run when you're logged in and the time matches.

---

## 📝 Notes

The **User Notes** tab shows all characters you've written notes about, with an expandable editor per person. Notes auto-save and sync server-side so they're available across devices.

Notes can also be written directly from the Friends list expand panel without switching tabs.

---

## 🌐 People Met

Everyone you've ever shared a room with — saved server-side and synced across devices. Capped at 2 000 entries (oldest evicted first).

- Browse in the **People Met** section of the Users tab
- Includes name, member number, and a Profile button
- Use **Clear list** to wipe all entries

---

## 🛠️ Dev Tools

Found in the **Dev** tab (bottom of the drawer).

### EBC Users in Room
Lists all room members currently running EBC and their version number.

### Copy Restraints from Member
Copy another room member's current restraints onto yourself.
- Select a member from the dropdown
- Preview which restraints will be copied before confirming
- Lock data is stripped — you own the items freely
- Only the copied slots are replaced; your other restraints are untouched

### Character Inspector
Dump raw appearance and property data for any room member — useful for debugging item states, craft names, and property values.

### Addons Loaded
Lists all `bcModSdk` mods currently active in the session, with their version and hooked functions.

### Logs

| Log | What it records |
|---|---|
| **Rooms Visited** | Room names, join/leave timestamps, time spent per room. Opt-in. |
| **Restraint Log** | Every restraint added or removed from your character, with who did it and when. Opt-in. |
| **Message Log** | Recent chat messages from the current session. |

---

## 🖼️ Drawer Appearance

Customisation options found in the **Dev** tab under *Drawer Appearance*.

| Setting | What it does |
|---|---|
| **Colour theme** | Choose from Default (Pink), Purple, Blue, Green, Red, or Dark (Mono). |
| **Tab visibility** | Hide tabs you never use. |

---

## ✨ Quality of Life

**Overhead EBC badge** — broadcasts a small `EBC` tag above your character's head to other EBC users. Optionally show your version number. Both toggleable from Settings.

**IM / Beep window** — threaded beep conversations with message history, unread badges, and timestamps per person.

**Timers** — passive counters in the drawer:
- ⏱ Time online this session
- 🚪 Time in current room
- ⛓ Time wearing current restraints

**Update notifications** — EBC checks GitHub for a newer version 30 seconds after load, then every hour. Silence with `/ebc updates off`.

---

## ⌨️ Slash Commands

| Command | Aliases | What it does |
|---|---|---|
| `/ebc` | | Show all available commands |
| `/ebc version` | `/ebc ver`, `/ebc v` | Print current EBC version |
| `/ebc changelog` | `/ebc changes` | Show recent version history in local chat |
| `/ebc release` | `/ebc free` | Remove all non-protected restraints from yourself |
| `/ebc unlock` | | Remove all non-owner/lover locks from your items |
| `/ebc ameter` | `/ebc arousal`, `/ebc lust` | Toggle the arousal/lust meter |
| `/ebc update` | `/ebc check` | Manually check GitHub for a newer version |
| `/ebc updates on` | | Re-enable automatic update notifications |
| `/ebc updates off` | | Silence automatic update notifications |

Outfit, restraint set, pose, and scene commands are defined per-item.

---

## Building from source

```bash
npm install
npm run build       # dev build
npm run build:prod  # production build (minified)
npm run dev         # watch mode
```

Requires Node.js. Built with TypeScript + Rollup. `dist/` is gitignored — builds are handled by CI.

### Deploying

Use the included `deploy.sh` script:

```bash
./deploy.sh                              # bump patch, no changelog entry
./deploy.sh patch "Fixed the thing"     # bump patch + add changelog message
./deploy.sh minor "New feature"         # bump minor
./deploy.sh major "Breaking change"     # bump major
```

The script bumps the version in all files, builds locally to catch errors, commits to `dev`, pushes, then prompts whether to also release to `stable`. GitHub Actions handles the actual deployment to GitHub Pages automatically on push.

---

## Credits

The sliding drawer UI was inspired by **[CRABS](https://github.com/sin-1337/CRABS)** by **Sin** — thank you for the open design! ♥

---

## License

[MIT](LICENSE) — © Emery
