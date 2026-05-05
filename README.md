# EmeryBC

A personal Bondage Club addon.

## Features

### Action Buttons
Configurable quick-action buttons drawn on the left side of the chatroom screen, below BCAR's ear/tail/wings buttons.

Each button sends a `/me` style emote when clicked — e.g. a button set to `waves goodbye` sends `* Name waves goodbye *` to the room.

Configure in **Preferences → Extensions → EmeryBC → Action Buttons tab:**
- Toggle each button on/off
- Set the label shown on the button (up to 6 characters)
- Set the hex color of the button
- Set the action text (what comes after `/me`)

---

### Outfit Commands
Save full outfits and load them with a custom slash command.

#### Setting up an outfit
1. Dress your character how you want (clothes, accessories, restraints — whatever you want saved)
2. Open **Preferences → Extensions → EmeryBC → Outfits tab**
3. Fill in:
   - **Command** — the slash command to use, e.g. `dom` (type `/dom` in chat to load it)
   - **Name** — a display name, e.g. `Dom Clothes`
   - **Include restraints** — tick this if you want restraint items saved too
   - **Announce text** — emote sent to the room when the outfit loads, e.g. `switches to dom mode`
4. Click **+ Save Current Appearance as New Outfit**

#### Using an outfit
Type your command in chat — e.g. `/dom` — and it loads instantly and announces to the room.

#### Updating an outfit
Dress up the way you want → go back to the Outfits tab → click **Save Current** on that outfit row.

#### Notes on restraints
- When **Include restraints** is off: only clothing and accessories are loaded. Any locked restraints you're currently wearing are left alone.
- When **Include restraints** is on: restraint items from the saved outfit are applied, but lock data is stripped so they can always be removed after loading.

---

## Installation

Install via Tampermonkey / Violentmonkey:

[loader.user.js](https://raw.githubusercontent.com/NekoEmery/EmeryBC/master/loader.user.js)
