# EmeryBC

A personal [Bondage Club](https://www.bondageprojects.com/) addon by **Emery** — outfits, action buttons, friends management, poses, scenes, palettes, and a bunch of quality-of-life tools packed into a sliding drawer on the right side of the chat screen.

**Install via Tampermonkey / Violentmonkey:**
[loader.user.js](https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader.user.js)

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

Up to 20 configurable quick-action buttons drawn on the left side of the chatroom, below the game's built-in buttons.

Each button sends a `/me` style emote to the room when clicked.

**Per-button settings**
- Label (up to 6 characters shown on the button)
- Hex color
- Action text (what comes after your name, e.g. `waves goodbye`)
- Enable / disable toggle

**Categories** — group buttons into named tabs and switch between them. Each category can have its own set of buttons. Reorder buttons and categories with arrows.

---

## 💬 Buttons & Toggles

Found in the **Buttons** tab of the EBC drawer.

| Toggle | What it does |
|---|---|
| **OOC Mode** | Prefixes every chat message with `(` so it reads as out-of-character. Commands, emotes (`*`), and already-OOC messages are never modified. |
| **Safeword** | One-click safeword button. Configure the word in settings; state saves across sessions. |
| **AFK Auto-Reply** | Sends a custom beep reply when someone messages you after X minutes of inactivity (default 10 min). Configurable threshold and message text. 30-minute cooldown per sender to avoid spam. |
| **Beep Mute** | Silences all incoming beeps without leaving the room. |
| **Suppress Native Beep** | Stops plain beeps from also showing in BC's main chat log when EBC's IM handles them. Game beeps (friend requests etc.) always pass through. |

---

## 🛡️ Anti-Restraint

Automatically remove any restraint applied to you by someone else.

- Toggle on/off from the **Buttons** tab
- **Whitelist** — items on the whitelist are always kept, even if applied by others. Populate the whitelist by wearing the item and clicking **+ Add worn** in the settings, or add by name
- **Confirm dialog** — when enabled, shows a prompt before auto-escaping so you can choose to accept the restraint instead of removing it
- Covers all restraint slots including collar and neck (`ItemNeck`, `ItemNeckAccessories`, `ItemNeckRestraints`)
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
- EBC version badge (if they're running EmeryBC)
- Friend tags
- **Profile** button — opens the BC information sheet
- **Beep** button — opens the EBC IM window (friends only)

### Friends List
Your BC friends list with expandable rows. Click a friend row to expand:

- 🤝 **Friends since** date
- 🕑 **Last seen** timestamp (tracked across sessions)
- **Tags** — add custom colour-coded labels (e.g. "dominant", "close friend"). Tags appear as chips on the friend row.
- **Note** — inline text editor for personal notes about this person. Auto-saves 800ms after you stop typing.
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
Lists all room members currently running EmeryBC and their version number.

### Copy Restraints from Member
Copy another room member's current restraints onto yourself.
- Select a member from the dropdown
- Preview which restraints will be copied before confirming
- Lock data (LockedBy, password, combination, etc.) is stripped — you own the items freely
- Only the copied slots are replaced; your other restraints are untouched

### Character Inspector
Dump raw appearance and property data for any room member — useful for debugging item states, craft names, and property values.

### Addons Loaded
Lists all `bcModSdk` mods currently active in the session, with their version and hooked functions.

### Logs
Three sub-sections, each collapsible:

| Log | What it records |
|---|---|
| **Rooms Visited** | Room names, join/leave timestamps, time spent per room. Opt-in — disabled by default. |
| **Restraint Log** | Every restraint added or removed from your character, with who did it and when. Opt-in — disabled by default. |
| **Message Log** | Recent chat messages from the current session. |

---

## 🖼️ Drawer Appearance

Customisation options found in the **Buttons** tab under *Drawer Appearance*.

| Setting | What it does |
|---|---|
| **Accent color** | Change the default pink (`#cf6f98`) to any hex value. The CSS reloads instantly — a Reset button restores the original. |
| **Tab visibility** | Hide tabs you never use. Each tab has a chip toggle; hidden tabs disappear from the tab bar and EBC falls back to the first visible tab automatically. |
| **Drawer width** | Drag the left edge of the drawer to resize it (280–600 px). Width is saved to localStorage. |

**Outfit search** — a text filter appears at the top of the Outfits tab so you can narrow a long list by name as you type.

---

## ✨ Quality of Life

**Overhead EBC badge**
Broadcasts a small `EBC` tag above your character's head to other EBC users. Optionally show your version number in the badge. Both toggleable from Settings.

**IM / Beep window**
Threaded beep conversations with:
- Message history per person
- Unread badge on the friend row
- Timestamps on each message
- Opens from the friend row Beep button or People in Room panel

**Timers**
Passive counters visible in the drawer:
- ⏱ Time online this session
- 🚪 Time in current room
- ⛓ Time wearing current restraints (tracks the longest-worn item)

**Update notifications**
EBC checks GitHub for a newer version 30 seconds after load, then every hour. If a room member is running a newer version, a local chat notice appears. Silence with `/ebc updates off`.

---

## ⌨️ Slash Commands

Type these in the BC chat input.

| Command | Aliases | What it does |
|---|---|---|
| `/ebc` | | Show all available commands |
| `/ebc version` | `/ebc ver`, `/ebc v` | Print current EBC version |
| `/ebc changelog` | `/ebc changes` | Show recent version history in local chat |
| `/ebc release` | `/ebc free` | Remove all restraints from yourself instantly |
| `/ebc unlock` | | Remove all non-owner/lover locks from your items |
| `/ebc ameter` | `/ebc arousal`, `/ebc lust` | Toggle the arousal/lust meter on and off |
| `/ebc update` | `/ebc check` | Manually check GitHub for a newer version |
| `/ebc updates on` | | Re-enable automatic update notifications |
| `/ebc updates off` | | Silence automatic update notifications |

Outfit and restraint set commands are defined per-item — type `/<command>` where `<command>` is whatever you saved.

---

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. Click: **[loader.user.js](https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader.user.js)**
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
