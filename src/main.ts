import { drawActionButtons, handleActionButtonClick } from "./modules/actionButtons";
import { EBCDrawer } from "./modules/drawer";
import { handleOutfitCommand } from "./modules/outfitManager";
import { handlePoseComboCommand } from "./modules/poses";
import { handleSceneCommand } from "./modules/scenes";
import { handleDomCommand } from "./modules/domTools";
import { releaseRestraints, unlockItems } from "./modules/restraints";
import { getBadgeEnabled, getShowVersionBadge, getBeepMuted, getSuppressNativeBeep } from "./modules/settings";
import { antiRestraintOnPlayerRefresh, snapshotPlayerRestraints, recordRestrainer } from "./modules/antiRestraint";
import { timerOnRoomEnter, timerOnRoomLeave, timerCheckRestraints } from "./modules/timer";
import { logMessage } from "./modules/devLog";
import { UI } from "./modules/ui";
import { addBeepEntry, cacheName, cacheEBCVersion, updateOnlineFriends } from "./modules/friends";
import { checkSafeword, enforceGracePeriod, checkGraceExpiry } from "./modules/safeword";

const MOD_NAME = "EmeryBC";
const MOD_VERSION = "0.9.5";

let noticeShown = false;
const CHANGELOG: Array<{ version: string; changes: string[] }> = [
    {
        version: "0.9.5",
        changes: [
            "Scenes equip: typed items where BC hides options in module closures (e.g. Ceiling Shackles) now show a free-text type input instead of a disabled '— no variants —'. Equip the item in BC, set the state you want, then hit 📷 — it auto-fills the type name. Works for all restraints.",
        ],
    },
    {
        version: "0.9.4",
        changes: [
            "Scenes equip: type variants now extracted from asset Layer.AllowTypes when BC R91+ stores options in module-level closures rather than on the asset object. Fixes items like Ceiling Shackles showing '— no variants —'.",
        ],
    },
    {
        version: "0.9.3",
        changes: [
            "Scenes: 'Equip' step is now split into 'Equip Restraint' (shows only restraint slots) and 'Equip Clothes' (shows only clothing/body slots). Old saved scenes with the generic 'Equip' type continue to work.",
        ],
    },
    {
        version: "0.9.2",
        changes: [
            "Scenes equip: VariableHeight items (e.g. ceiling chains) now show a numeric height input instead of a type dropdown. The 📷 capture button reads Property.HeightModifier automatically. Height is applied via Property.HeightModifier at playback.",
            "Scenes equip: type variant lookup now checks Extended.Options and Extended.Typed.Options in addition to AllowType, fixing items that use the newer BC Extended API and previously showed '— no variants —'.",
        ],
    },
    {
        version: "0.9.1",
        changes: [
            "Room Rescue: item list now shows checkboxes. 🔓 Unlock Selected clears locks without removing items. 🗑 Remove Selected removes only checked items. ⛑ Remove All still strips everything at once. Select-all checkbox at the top.",
        ],
    },
    {
        version: "0.9.0",
        changes: [
            "🐾 Puppy tab: Bark button now picks from a pool of 16 built-in sounds (Arf~, Woof!, Wuf~, Ruff!, Wroof~, Bork!, Awoo~, Yip!, and more). Custom sounds can be added and removed — persisted to server settings.",
        ],
    },
    {
        version: "0.8.9",
        changes: [
            "Dom tab: new ⛑ Room Rescue section — pick any person from a dropdown, preview their worn items and locks, then hit Rescue to strip everything. Bypasses all BC lock rules (direct Appearance filter). No target setup required.",
            "🐾 Puppy tab added — only visible to Lucy (#230466). Has a Bark button that sends 'arf' in chat.",
        ],
    },
    {
        version: "0.8.8",
        changes: [
            "Dev tab EBC presence list: users now display as 'Nickname' with '(GameName)' shown underneath when the BC nickname differs from the character name.",
        ],
    },
    {
        version: "0.8.7",
        changes: [
            "Scene Equip steps: new State dropdown auto-populated from the item's available variants (e.g. Tight, Loose, Wrist). Shows '— no variants —' for items with no variants. 📷 capture button also reads the current state from the worn item.",
            "UI: dim secondary text brightened throughout — hint text, labels, arrows, and section markers were near-invisible dark pink, now readable.",
        ],
    },
    {
        version: "0.8.6",
        changes: [
            "Safewords: each word (yellow & red) now has individual action toggles — Release restraints, Start grace, Announce in chat, Leave room. All on by default except 'Leave' for yellow.",
            "Safeword UI redesigned into two colour-coded sections (yellow / red) with toggle buttons for each action.",
        ],
    },
    {
        version: "0.8.5",
        changes: [
            "Fix: Scene Equip steps now actually wear the item. Was calling InventoryAdd (adds to wardrobe) instead of InventoryWear (puts item on character). Color is now passed directly to InventoryWear.",
            "Fix: Action button colour dot is now clickable — opens a floating colour picker popup. Click the dot to pick, click Done or outside to close.",
            "UI: 'No colour selected' hint text is now readable (was nearly invisible dark pink).",
            "UI: Colour picker toggle renamed from 'Edit v'/'Close ^' to '🎨 Colour ▾'/'▴ Close' for clarity.",
        ],
    },
    {
        version: "0.8.3",
        changes: [
            "Fix: Typing '*text' in chat no longer produces '*Emery Emery text*'. BC's Type:Emote auto-prepends the sender's name — we were also including it in Content. Now sends only the body text.",
        ],
    },
    {
        version: "0.8.2",
        changes: [
            "Fix: Scene '( )' OOC steps no longer produce double parens. BC's Type:Action already wraps the output in ( ) — we were adding our own, giving ((text)). Now sends just the name + text.",
            "Fix: Safeword restraint release now works on locked items. InventoryRemove silently fails on owner/exclusive-locked restraints. Now directly filters Player.Appearance to bypass lock checks, then syncs.",
            "Fix: Grace period enforcement (yellow safeword) uses the same direct-filter approach so locked restraints are stripped during the grace period too.",
        ],
    },
    {
        version: "0.8.1",
        changes: [
            "Fix: Scene chat '* *' emote steps no longer double the name. BC's Type:Emote auto-prepends the sender's name — we were also including it, producing '*Emery Emery screams*'. Now sends only the raw text so BC renders it correctly as '*Emery screams*'.",
            "Fix: Scene chat '( )' OOC steps now render as '(Emery text)' instead of '*Emery (text)*'. Switched from Type:Emote (which wraps in asterisks) to Type:Action which renders the content as-is.",
        ],
    },
    {
        version: "0.8.0",
        changes: [
            "Colours tab: native OS colour pickers removed from restraint zone rows. Zones now use the custom picker — click a zone dot or Set without a colour selected to auto-open the picker above.",
            "Action buttons: native colour picker replaced with a small preview dot + hex text input consistent with the rest of the addon.",
        ],
    },
    {
        version: "0.7.9",
        changes: [
            "Fix: Safeword ON/OFF toggle no longer shows as an unstyled white square. The style was silently dropped when Player data wasn't fully ready on first paint — now uses individual style properties with a safe fallback.",
            "Colours tab: picker is now collapsible (closed by default). Saved swatches are always visible. Click 'Edit' to open the picker, 'Close' to hide it again.",
        ],
    },
    {
        version: "0.7.8",
        changes: [
            "Fix: Red safeword no longer crashes other mods (CRABS etc.) when leaving the room. BC's ChatRoomLeave() clears room state before switching screens, causing ChatRoomRun hooks in other mods to crash on the next frame. Now navigates to the lobby screen first so the render loop stops running ChatRoomRun before the state is cleared.",
        ],
    },
    {
        version: "0.7.7",
        changes: [
            "Emote shortcut: type *text in chat (e.g. *nods or * waves) and it sends as a BC Emote — rendered as *Your Name text* in chat, bypassing gag speech.",
        ],
    },
    {
        version: "0.7.6",
        changes: [
            "Fix: Safewords now default to ENABLED — previously the system was off by default so safewords were never checked.",
            "Safeword toggle is now larger and clearly visible: green-on-pink when enabled, red warning when disabled, so you always know the current state at a glance.",
        ],
    },
    {
        version: "0.7.5",
        changes: [
            "Colours tab — replaced native OS colour wheel with a fully custom HSV picker styled to match the addon theme. Includes a saturation/value gradient box, rainbow hue slider, live hex input, and a colour preview square.",
            "Fix: Beep messages from other mods (WCE, FBC) that append JSON metadata blobs are now stripped automatically so only the plain message text is shown.",
        ],
    },
    {
        version: "0.7.4",
        changes: [
            "Fix: Scene chat step '* *' format now sends as Type:Emote so it renders as *Name text* in BC chat instead of (Name text). The emote style is not affected by gag speech.",
            "Fix: Scene chat step '( )' OOC format now also sends as Type:Emote so the OOC text bypasses gag speech garbling.",
            "Fix: Safewords now use a direct capture-phase keydown listener that fires before BC's keyboard handler — catches the raw typed text before any gag processing. Works reliably even when gagged.",
        ],
    },
    {
        version: "0.7.3",
        changes: [
            "Colours tab — full picker rework: colour wheel and hex code input are now side by side in a card and stay in sync bidirectionally. Type a hex code, press Enter or click Select to activate it.",
            "Saved colours are now 28×28 swatches with a hover scale effect and a selection ring. Clicking a swatch loads it into the picker and selects it instantly.",
            "Selected colour bar now shows the hex code in monospace with a colour preview dot. Clicking the dot inside a restraint zone applies the selected colour without needing the Set button.",
            "Zone rows inside restraint panels now show the current hex code next to each zone's colour dot, and update live when you change colours via the inline wheel.",
            "Set / All buttons no longer grey out — if no colour is selected they flash the selected-colour bar to guide you instead.",
        ],
    },
    {
        version: "0.7.2",
        changes: [
            "Colours tab: restraints now expand per-zone — each colour zone gets an inline colour picker plus a 'Set' button to apply your selected swatch colour to that zone individually.",
            "Colours tab: 'All' button on each restraint header applies the selected colour to every zone at once.",
            "Colours tab: 'Save as preset' at the bottom of each restraint's zone panel saves the current colour combination as a named Restraint Preset.",
            "Restraint Presets section: manage saved presets (rename, delete), pick a worn restraint from a dropdown, and apply the preset's colours to it in one click.",
            "Friend list: offline friends now collapse under a toggle header — click 'Offline (N)' to expand/collapse. Collapsed by default to keep the active list clean.",
        ],
    },
    {
        version: "0.7.1",
        changes: [
            "Fix: Scene equip steps now work correctly — the anti-restraint system's known-restraint snapshot is updated immediately after equipping so it no longer strips the item back off.",
            "Fix: Scene chat steps with the '* *' format now send as BC action messages (same format as nod/giggle buttons) instead of plain chat. OOC '( )' and plain chat remain as regular chat messages.",
        ],
    },
    {
        version: "0.7.0",
        changes: [
            "Users tab loads instantly — friend rows now render asynchronously (requestAnimationFrame) and tag/pin panels are built lazily on first click instead of all at once.",
            "Safeword system: set a Yellow and Red safeword in the Outfits tab. Yellow releases binding restraints and starts a configurable grace period (no new restraints). Red does the same, announces your exit, and leaves the room after a short pause.",
        ],
    },
    {
        version: "0.6.9",
        changes: [
            "Touch support: the drawer tab, panel, and all beep chat windows can now be dragged on tablet/touch screens — touchstart/touchmove/touchend wired alongside the existing mouse events.",
        ],
    },
    {
        version: "0.6.8",
        changes: [
            "Friends list updates live: refreshes automatically when BC reports online-status changes, when room membership changes, and every 30 s while the tab is open. Also fires an immediate query when you switch to the tab.",
        ],
    },
    {
        version: "0.6.7",
        changes: [
            "Colours rework: build a personal swatch list, select a colour, then click any worn restraint to apply it directly. Existing saved-palette capture/apply is still available collapsed below.",
            "Beep chat: sender/receiver names are now larger, bold, and colour-coded (pink = you, blue = them) so they stand out clearly.",
        ],
    },
    {
        version: "0.6.6",
        changes: [
            "Friends: tags now support multiple tags per friend, each with a custom colour (8 presets). Existing tags are automatically migrated.",
            "Tag display: first tag shows on the friend row; hover it to see all tags in a tooltip. Add/remove tags from the click-to-expand panel.",
        ],
    },
    {
        version: "0.6.5",
        changes: [
            "Fix: Bound timer no longer counts collars, leashes, or other neck items — only actual binding restraints (arms, legs, etc.) start the timer.",
            "Scenes: export any scene to clipboard JSON (clipboard icon on each row) and import scenes shared by others (↓ Import Scene button at the bottom of the scene list).",
        ],
    },
    {
        version: "0.6.4",
        changes: [
            "Friends list: click any friend row to expand a panel where you can set/clear their tag and pin them to the top of the list.",
            "Pinned friends always appear first in the friend list with a 📌 indicator and a pink left border.",
        ],
    },
    {
        version: "0.6.3",
        changes: [
            "Fix: drawer icon position now reliably restores after reload — previously it could be lost if BC finished loading ExtensionSettings after the first room sync.",
        ],
    },
    {
        version: "0.6.2",
        changes: [
            "Beep windows now expand upward — dragging anchors to the bottom edge so windows near the bottom of the screen open toward the top instead of disappearing off screen.",
        ],
    },
    {
        version: "0.6.1",
        changes: [
            "Friends: EBC users now show a pink 'EBC vX.X.X' badge next to their name — populated the first time you share a room with them.",
            "Credits: added Sybil #80.",
        ],
    },
    {
        version: "0.6.0",
        changes: [
            "Beep chat: multiple windows can now be open simultaneously, each staggered so they don't overlap.",
            "Scrollbars throughout EBC now match the pink/dark theme instead of the default browser style.",
        ],
    },
    {
        version: "0.5.9",
        changes: [
            "Friends: member numbers now shown in a distinct blue-gray (#7a9ab8) instead of near-invisible dark pink.",
            "Friends: online friends show a room tag — 🔒 private (purple), 📢 public (teal), 🔐 locked (orange); 'full' shown if room is full.",
        ],
    },
    {
        version: "0.5.8",
        changes: [
            "Beep window: close, minimize, and mute buttons are now styled as proper pill buttons — larger and easier to hit.",
            "Beep window: opening an already-open window now immediately refreshes the message history.",
            "Beep window: drag is now fully free — no viewport clamping, move it anywhere on screen.",
        ],
    },
    {
        version: "0.5.7",
        changes: [
            "Beep messages no longer spam BC's main chat log (suppressed by default). Toggle '💬 hide/show in chat' button in the Friends section header to restore the native notification.",
        ],
    },
    {
        version: "0.5.6",
        changes: [
            "Drawer tab: pink unread dot appears when you have any unread beep messages.",
            "Beep window: minimize button collapses the chat to a title bar at the bottom of the screen.",
            "Beep window: unread dot on the minimized bar when a new message arrives while minimized.",
            "Beep window: mute toggle (bell icon) silences the sound notification; state saved across sessions.",
        ],
    },
    {
        version: "0.5.5",
        changes: [
            "Fix: incoming beeps now hooked via ServerAccountBeep (the real BC function name, confirmed from WCE source).",
            "Fix: outgoing beeps now use ServerSend('AccountBeep') instead of 'Beep' — messages were not being delivered.",
            "Fix: AccountQueryResult handled via ServerSocket.on (socket event, not a patchable global).",
        ],
    },
    {
        version: "0.5.4",
        changes: [
            "Fix: Friends online count and status dots now reflect BC's full online list (not just your current room) — hooks AccountQueryResult OnlineFriends query.",
            "Friends list sorted: room (bright green) → online elsewhere (yellow-green) → offline (gray).",
            "Sound notification on incoming beep — short descending tone via Web Audio API.",
        ],
    },
    {
        version: "0.5.3",
        changes: [
            "Beep chat: reply system — click '↩ reply' on any received message to quote it; reply bar shows above the input and can be dismissed with ×.",
            "Beep chat: image auto-embed — image URLs (png/jpg/gif/webp/svg) render as inline thumbnails; click to open full size.",
            "Removed 'Beep All In Room' button.",
        ],
    },
    {
        version: "0.5.2",
        changes: [
            "Fix: Confirm before escaping toggle now re-reads saved state when entering a room, so it no longer resets to OFF on every script reload.",
            "Fix: Friend names now populated from FriendListBeep hook and ChatRoomSync — friends you've been in a room with will show their name instead of their ID.",
            "Fix: Incoming beep names cached from AccountBeep socket payload (MemberName field).",
            "Fix: Unread badge on the 💬 button — red dot with count appears for any friend who messaged you while the window was closed.",
        ],
    },
    {
        version: "0.5.1",
        changes: [
            "Friends section in Users tab: lists all BC friends with green (in room) / gray (away) status dot, tag system (click to edit inline), and per-friend beep chat window.",
            "Beep chat window: floating draggable overlay with conversation history, synced across devices via ExtensionSettings.",
            "Beep All In Room button: send one message to every friend currently in your room.",
            "Incoming beeps are recorded to history automatically so the chat window stays up to date.",
        ],
    },
    {
        version: "0.5.0",
        changes: [
            "Scene equip/unequip steps now use dropdowns populated from BC's asset data — no need to know group names.",
            "Scene unequip targets a slot (removes whatever is worn there) instead of a specific item — scenes work with any outfit.",
            "Scene: added Chat step type for sending chat messages with * emotes, ( OOC, or plain dialogue.",
        ],
    },
    {
        version: "0.4.9",
        changes: [
            "New: Scene sequencer in the ANIMS tab — chain pose changes, item equips/unequips, emotes and waits into timed sequences with optional chat commands.",
        ],
    },
    {
        version: "0.4.8",
        changes: [
            "Removed Front Cuffs and Elbow Cuffs from the Arms pose list.",
            "Fix: restraint palette capture now uses BC's IsRestraint flag instead of a hardcoded group list — all binds are captured correctly.",
            "Fix: 'That's you' label in Users tab is now readable gold instead of invisible pink-on-pink.",
        ],
    },
    {
        version: "0.4.7",
        changes: [
            "Removed floating expression panel and its toggle entirely — all expression UI is gone.",
        ],
    },
    {
        version: "0.4.6",
        changes: [
            "Removed face/expression picker from ANIMS tab — poses and combos only.",
            "Confirm before escaping now also gates Release Restraints and Remove Locks buttons — shows Cancel / Yes overlay before acting.",
        ],
    },
    {
        version: "0.4.5",
        changes: [
            "Fix: confirm-before-escaping now uses a custom in-game overlay (Keep it / Escape!) instead of window.confirm — shows reliably in all browser environments.",
            "Fix: body and arm pose buttons now apply and sync correctly (CharacterRefresh + ChatRoomCharacterUpdate + ServerPlayerAppearanceSync).",
            "Restraint palette apply now skips items with owner/exclusive/high-security/mistress/lover locks — protected items are never recolored.",
            "Confirm before escaping label is now more readable in the quick-action bar.",
        ],
    },
    {
        version: "0.4.4",
        changes: [
            "Removed expression sequence creator and button — expression tab now shows picker and presets only.",
            "Notes tab renamed to Users; your own character now appears at the top (name + member number, no note editor).",
            "Room section shows all other players in the room; Saved section shows offline notes.",
        ],
    },
    {
        version: "0.4.3",
        changes: [
            "Fix: expression face rows now scroll properly — min-width:0 added so overflow-x:auto actually constrains buttons.",
            "Fix: asset query now only checks Group.Family (where BC stores it) so all expression options are found correctly.",
        ],
    },
    {
        version: "0.4.2",
        changes: [
            "Confirm before escaping moved to the quick-action bar between Release/Remove Locks and the item picker — always visible.",
            "Expressions tab redesigned: presets as a quick-apply pill strip at top, face groups in a clean box, emoticons in their own wrap grid, sequences section with inline + New button.",
            "Preset apply now syncs picker highlights immediately.",
            "Floating expression button toggle moved to bottom of ANIMS tab.",
        ],
    },
    {
        version: "0.4.1",
        changes: [
            "Auto-escape toggle and whitelist moved to the DOM tab (visible to all, DOM tools below remain creator-only).",
            "Emoticons now shown in a wrapping grid instead of a horizontal scroll row — no more cut-off options.",
            "Expanded emoticon list with all known BC options (BecomeLeader, Bed, Captured, CollaredPickup, LostLeader, Meditate, Obey, Orgasm, Pain, Snow, Whisper, XP, and more).",
            "Fixed asset query for expression options: now checks Group.Family as well so expressions are never missed.",
        ],
    },
    {
        version: "0.4.0",
        changes: [
            "ANIMS: full expression picker — every BC facial expression shown per group as clickable buttons; click to apply instantly.",
            "Picker reads available options from BC's runtime Asset array so it always matches the character's actual options.",
            "Sequences redesigned: steps now embed the full face state directly (no preset reference). Set expressions in the picker, enter a hold time, click '+ Add Step' to build each frame.",
            "Saved presets kept as a quick-apply shortcut (separate 'Saved Presets' section below the picker).",
        ],
    },
    {
        version: "0.3.13",
        changes: [
            "Auto-escape (toggle, confirm, whitelist) moved from DOM tab to Buttons tab — accessible to everyone regardless of DOM tools.",
        ],
    },
    {
        version: "0.3.12",
        changes: [
            "Fix: expression presets now use CharacterSetFacialExpression (BC's own API) so apply actually works; direct-push fallback kept for safety.",
            "Fix: expression store is now null-safe so saving no longer silently fails before Player.ExtensionSettings is ready.",
            "Auto-escape: 'Confirm before escaping' toggle (off by default) — shows OK/Cancel; OK accepts the restraint, Cancel escapes it.",
        ],
    },
    {
        version: "0.3.11",
        changes: [
            "Auto-escape whitelist: mark specific restraint slots as 'keep' — they'll never be escaped even when applied by others.",
            "Whitelist UI in Settings shows your currently worn restraints with one-click add buttons and × to remove.",
            "Auto-escape now retries up to 2 times before giving up on a locked/unclearable item, then stops attempting.",
        ],
    },
    {
        version: "0.3.10",
        changes: [
            "DEV log: logging is OFF by default and only starts when you explicitly enable it — no background accumulation.",
            "DEV log: status indicator (● CAPTURING / ○ OFF) shows current state at a glance.",
            "DEV log: Test button now works even when logging is disabled so you can verify the UI independently.",
            "Removed auto room-sync log entry — the log stays completely silent until you turn it on.",
        ],
    },
    {
        version: "0.3.9",
        changes: [
            "EXP button is now draggable — same drag/click logic as the main drawer icon.",
            "EXP button position saved to ExtensionSettings and restored on next load.",
            "Right-click EXP button to reset it back to its default position.",
        ],
    },
    {
        version: "0.3.8",
        changes: [
            "DEV log: Test button — injects a dummy entry so you can verify the log UI is working independently of room activity.",
            "DEV log: Room sync now writes a System entry ([EBC] Room synced) so you can confirm the logging hook is active as soon as you enter a room.",
            "DEV log: clearer empty-state text.",
        ],
    },
    {
        version: "0.3.7",
        changes: [
            "Fix: expression preset apply now uses AssetGet + direct Appearance manipulation instead of InventoryWear, which was silently rejected for cosmetic groups.",
            "ANIMS tab: Expression Sequences — chain saved presets into an animated sequence with per-step hold durations; play button runs the sequence live.",
        ],
    },
    {
        version: "0.3.6",
        changes: [
            "DEV log: auto-refreshes every 1.5 s while the DEV tab is open — no more manual ↻.",
            "DEV log: prominent 'Enable' banner when logging is off so the toggle is hard to miss.",
            "DEV log: toggling the checkbox now immediately refreshes the list.",
        ],
    },
    {
        version: "0.3.5",
        changes: [
            "EXP button now shows a face icon instead of text.",
            "Expression panel is now draggable via the ⠿ handle on its header.",
            "Expression panel position is saved to ExtensionSettings and restored on next open.",
        ],
    },
    {
        version: "0.3.4",
        changes: [
            "Fix: expression preset apply was silently bailing due to unnecessary window-wrapping guard; rewrote to call BC globals directly.",
            "Fix: missing ChatRoomCharacterUpdate meant expression changes were invisible to others in the room.",
            "Fix: captureCurrentExpression now has error handling so a bad Appearance state can't silently swallow a save.",
        ],
    },
    {
        version: "0.3.3",
        changes: [
            "Outfit schedule: time input now uses military time (HH:MM, 24h) with auto-colon and validation.",
        ],
    },
    {
        version: "0.3.2",
        changes: [
            "ANIMS tab: Expression Presets section added at the top — capture, apply, and delete face presets without leaving the panel.",
            "ANIMS tab: Toggle to show/hide the EXP floating quick-panel button.",
            "EXP floating panel: drag handle on header for free repositioning.",
        ],
    },
    {
        version: "0.3.1",
        changes: [
            "DEV: Character Inspector — pick any room member, dump their full appearance + property data as JSON.",
            "DEV: Hook Inspector — lists all mods loaded via bcModSdk with version and hook count.",
            "DEV: Message Log — toggle-enabled circular buffer of the last 60 ChatRoomMessages. Click any entry to expand its full dictionary.",
        ],
    },
    {
        version: "0.3.0",
        changes: [
            "Sequence builder: each step now has its own delay — edit sequences as individual step rows with type/text/delay instead of raw text.",
            "Outfit schedule: auto-wear an outfit at a set time (HH:MM). Schedule section at the bottom of the Outfits tab.",
            "Expression presets: save and apply face/expression state (eyes, mouth, blush, etc.) separately from outfits. Toggle the Expressions panel with the new floating button below the main tab.",
        ],
    },
    {
        version: "0.2.9",
        changes: [
            "Boop: fixed 'MISSING ACTIVITY DESCRIPTION' error — Boop is not a native BC activity so reverted to Type:Action with standard possessive format (Emery boops Lucy's nose.).",
        ],
    },
    {
        version: "0.2.8",
        changes: [
            "Fixed: closed panel no longer blocks clicks on BC UI behind it (pointer-events inherit fix).",
            "Fixed: tab icon now stays visible when drawer is closed (slide instead of clip-path).",
            "Boop: nose boops only.",
        ],
    },
    {
        version: "0.2.7",
        changes: [
            "Fixed: panel tab no longer blocks BC canvas clicks when the drawer is closed (clip-path hit area).",
            "Header: move-handle icon (⠿) added beside refresh for an explicit drag target.",
            "Buttons tab: 'Boop all friends in room' — sends a unique playful emote to each friend in the room with a small delay between each boop.",
        ],
    },
    {
        version: "0.2.6",
        changes: [
            "Anti-Restraint: toggle in the DOM tab. When on, any restraint applied to you is instantly removed and a playful room emote is sent.",
        ],
    },
    {
        version: "0.2.5",
        changes: [
            "DEV and CREDITS are now separate tabs — DEV holds developer tools, CREDITS holds special thanks cards.",
            "DOM Tools restraint picker fix — all BC restraint groups (including gags) now appear correctly in the removal picker.",
        ],
    },
    {
        version: "0.2.4",
        changes: [
            "DOM Tools: target checkboxes — tick which targets to include before hitting Apply, All Restraints, or All Locks.",
            "DOM Tools: sync fix — CharacterAppearanceSortLayers now called before ChatRoomCharacterUpdate so the appearance packet is properly ordered.",
            "DEV tab (was CREDITS): developer tools section shows EBC version badge toggle and a live list of EBC users in the room with their versions.",
            "Version badge toggle — when on, the overhead badge shows 'v0.2.4' instead of 'EBC' so you can see what version everyone is running.",
        ],
    },
    {
        version: "0.2.3",
        changes: [
            "Fixed 'No restraint items found' error: parser now returns ALL items from a BC outfit code and lets you pick. Restraints are pre-checked; clothing items show unchecked so you can ignore them.",
            "Checklist groups items into Restraints and Clothing / Other sections with a count per section.",
        ],
    },
    {
        version: "0.2.2",
        changes: [
            "Fixed restraint states not being preserved when applying DOM sets: Property (tight gag, device settings, etc.) is now restored after InventoryWear since BC's function does not accept it as a parameter.",
            "Self item picker: 'Pick items to remove from yourself' toggle in the quick-actions bar expands a panel showing your own restraints and locks as checkboxes, with Remove Selected and Unlock Selected buttons.",
            "Quick 'Release Restraints' and 'Remove Locks' buttons now also refresh the self-picker panel if it is open.",
        ],
    },
    {
        version: "0.2.1",
        changes: [
            "DOM Tools: Release / Rescue section with quick 'All Restraints' and 'All Locks' buttons to strip or unlock targets.",
            "DOM Tools: Per-item picker to choose exactly which restraints to remove from each in-room target.",
        ],
    },
    {
        version: "0.2.0",
        changes: [
            "DOM Tools tab renamed from bowtie emoji to DOM for clarity.",
            "Multiple named restraint sets: each set has its own name, chat command, and announce template.",
            "Per-set item picker: paste a BC outfit code, tick which restraints to include, then Use Selected.",
            "Per-set announce template with {name} (set name) and {targets} (restrained players) tokens.",
            "Inline set editor: expand any set with the pencil button to edit name, command, announce, items, or delete it.",
            "Chat command handler wired into main hooks so /command applies the matching restraint set.",
            "Improved server sync: ChatRoomCharacterUpdate called explicitly after item application.",
        ],
    },
    {
        version: "0.1.76",
        changes: [
            "Active Restraints panel in Outfits tab: see every equipped restraint, lock type, and who locked it at a glance.",
            "Outfit Export / Import: copy any outfit to clipboard from its edit panel; import via paste form at the bottom of Outfits.",
            "Colour Palettes: snapshot your full appearance colour map as a named palette and reapply it any time.",
            "Poses tab: one-click preset poses (Kneel, All Fours, Arms Up, etc.) and saveable custom pose combos with multiple poses combined.",
            "Room & Restraint Timer: footer now shows how long you have been in the room and how long you have been restrained.",
        ],
    },
    {
        version: "0.1.75",
        changes: [
            "Added Export / Import to the Buttons tab — export copies a JSON string to clipboard; import accepts a pasted string and loads it instantly.",
        ],
    },
    {
        version: "0.1.74",
        changes: [
            "Reset button and slot delete button in the Buttons tab now require a two-click confirm before acting.",
        ],
    },
    {
        version: "0.1.73",
        changes: [
            "Added pencil (edit) button to outfit rows — expand inline form to rename, change command, announce text, and restraint flags without deleting and recreating.",
        ],
    },
    {
        version: "0.1.72",
        changes: [
            "Increased gap between CRABS tab and EBC tab from 4 px to 8 px to clear the visual overlap.",
        ],
    },
    {
        version: "0.1.71",
        changes: [
            "Fixed EBC tab position sometimes overlapping CRABS: now polls CRABS's tab position every 200 ms instead of reading it once at layout time, eliminating the race condition.",
        ],
    },
    {
        version: "0.1.70",
        changes: [
            "Clean rebuild to resolve stale build artifact from v0.1.69.",
            "Updated credits text for Lara and Lucy in the Special Thanks tab.",
        ],
    },
    {
        version: "0.1.55",
        changes: [
            "Fixed drawer not appearing: badge toggle called Player.ExtensionSettings during setup() before Player was ready, crashing the whole panel construction.",
        ],
    },
    {
        version: "0.1.54",
        changes: [
            "Added EBC overhead tag toggle in the drawer — hide or show your EBC badge from other users at any time.",
        ],
    },
    {
        version: "0.1.53",
        changes: [
            "Removed Room Auto-Announce feature.",
            "Added Special Thanks tab (heart tab) crediting Lara, Lucy, and Sin.",
        ],
    },
    {
        version: "0.1.43",
        changes: [
            "Fixed cheer animation returning to neutral: BC requires null (not []) for neutral pose — empty array was being silently ignored so character stayed Yoked.",
            "Removed BOW from default buttons; added GIGGLE (* giggles. *) default button.",
        ],
    },
    {
        version: "0.1.42",
        changes: [
            "Cheer animation check now runs BEFORE the chat message — if arms are restrained, the message is suppressed too.",
            "Fixed false positive: ItemHands (paws, mittens, gloves) no longer counts as restrained; only ItemArms (armbinders, straitjackets) blocks cheering.",
        ],
    },
    {
        version: "0.1.41",
        changes: [
            "Outfit rows now have a × delete button — click once to arm (turns red), click again to confirm.",
            "Added POUT default button (emote style: * pouts. *).",
        ],
    },
    {
        version: "0.1.40",
        changes: [
            "Cheer animation now checks if arms are restrained (ItemArms/ItemHands) — blocked with a chat log notice if tied up.",
            "CHEER/CHEERS label-based animation is purely internal; no UI change needed.",
        ],
    },
    {
        version: "0.1.39",
        changes: [
            "Hamburger collapse button is now shorter (28px) so it reads as a control rather than a content button.",
            "CHEER default button: triggers automatic cheer pose animation (Yoked cycling) when label matches CHEER or CHEERS.",
            "Animation is label-driven and fully internal — no extra UI or style options exposed.",
        ],
    },
    {
        version: "0.1.38",
        changes: [
            "Per-outfit restraint preservation toggle: lock icon in outfit row controls whether existing restraints are kept or cleared when the outfit is worn.",
            "New outfits default to preserving restraints (safe default). Toggle persists per outfit.",
            "Smart conflict resolution: if the outfit itself has an item for a restraint slot, it takes priority over preserved restraints.",
        ],
    },
    {
        version: "0.1.37",
        changes: [
            "Fixed action emotes showing MISSING TEXT prefix — now uses poison trick with player name directly in Content.",
            "Fixed outfit announce text with same poison trick fix.",
            "Added per-button style choice: ( ) action or * * emote, toggled in the Buttons drawer tab.",
        ],
    },
    {
        version: "0.1.36",
        changes: [
            "Fixed drawer tab disappearing when panel is closed: tab now lives outside the sliding element and never transforms.",
            "Fixed drawer not appearing when addon loads while already in a chat room (initial visibility check on startup).",
            "Restructured drawer DOM: zero-width anchor holds the always-visible tab, only the panel slides.",
        ],
    },
    {
        version: "0.1.35",
        changes: [
            "Drawer widened to 300px for more comfortable reading.",
            "Version number shown in drawer header beside EmeryBC.",
            "Quick Actions bar added below tabs: Release Restraints and Remove Locks buttons always visible.",
            "Restraint/lock logic moved to shared module so commands and drawer use identical code.",
        ],
    },
    {
        version: "0.1.34",
        changes: [
            "/ebc release and /ebc unlock now also skip family padlocks (OwnerPadlock, LoverPadlock, FamilyPadlock, etc.).",
        ],
    },
    {
        version: "0.1.33",
        changes: [
            "Removed Extensions/Preferences settings screen - all management now lives in the EBC drawer.",
            "Drawer now has two tabs: Outfits and Buttons.",
            "Buttons tab: inline DOM editor for all action button slots (toggle, label, color, emote, delete, add, save).",
            "Drawer positioned to match CRABS x-alignment, 10% down from chat log top.",
            "Hamburger collapse chip restored to original simple - / + style.",
            "Added /ebc unlock command - removes all non-owner/lover locks from your items.",
        ],
    },
    {
        version: "0.1.32",
        changes: [
            "Fixed action emotes - name now appears correctly as (Name emotes.) using proper BC dictionary tag lookup.",
            "Fixed outfit announce text with same name-substitution fix.",
            "Re-added hamburger collapse toggle chip above sidebar action buttons.",
            "Drawer tab now sits just below CRABS's tab (50px offset from chat log top).",
            "Fixed drawer appearing in the middle of the screen on first room join.",
            "Drawer: added Update button on each outfit row to snapshot current look.",
            "Drawer: added New Outfit inline form with command, name, announce, and restraints toggle.",
        ],
    },
    {
        version: "0.1.31",
        changes: [
            "Removed all non-ASCII characters from source files and bundle to fix Tampermonkey internal error on load.",
            "Action type dictionary poison now uses String.fromCharCode(0x200C) instead of embedded Unicode.",
            "Drawer HTML built imperatively to avoid any template literal encoding issues.",
        ],
    },
    {
        version: "0.1.30",
        changes: [
            "Fixed potential crash: drawer initialisation is now wrapped in try/catch so a DOM error can no longer prevent the rest of the addon from loading.",
            "Drawer DOM queries use safe optional chaining instead of hard assertions.",
        ],
    },
    {
        version: "0.1.29",
        changes: [
            "Restored canvas sidebar action buttons alongside the drawer.",
            "Action buttons now send as (Name action.) using the MBCHC Action type trick instead of * emote *.",
            "Outfit announce text also uses Action type for consistent formatting.",
            "Drawer repositioned to the lower 40% of the chat log and now shows outfit switcher.",
            "Drawer outfit panel: one-click Wear buttons for all saved outfits.",
        ],
    },
    {
        version: "0.1.28",
        changes: [
            "Replaced canvas sidebar action buttons with a CRABS-inspired DOM drawer.",
            "A small EmeryBC icon tab sits beside the chat log - click it to expand your action buttons.",
            "Drawer auto-hides when leaving the chat room and never overlaps the map UI.",
            "Added credit to Sin / CRABS in the README and drawer footer.",
        ],
    },
    {
        version: "0.1.27",
        changes: [
            "Action buttons now collapse behind a small toggle chip (-) to avoid overlapping map build UI.",
            "Click the chip to expand/collapse the button panel at any time.",
        ],
    },
    {
        version: "0.1.26",
        changes: [
            "/ebc release now skips items locked with owner or lover locks, and reports how many were skipped.",
        ],
    },
    {
        version: "0.1.25",
        changes: [
            "Fixed /ebc release - now calls ChatRoomCharacterUpdate so the restraint removal is visible to all room members.",
        ],
    },
    {
        version: "0.1.24",
        changes: [
            "Added /ebc release (alias: /ebc free) - removes all restraints from yourself instantly.",
        ],
    },
    {
        version: "0.1.23",
        changes: [
            "Moved EBC badge another 15% to the left.",
        ],
    },
    {
        version: "0.1.22",
        changes: [
            "Moved EBC badge 10% to the left.",
        ],
    },
    {
        version: "0.1.21",
        changes: [
            "Stripped version line from EBC badge - now just a small subtle EBC chip.",
        ],
    },
    {
        version: "0.1.20",
        changes: [
            "Scaled EBC badge down by 50%.",
        ],
    },
    {
        version: "0.1.19",
        changes: [
            "Moved EBC badge further right and scaled it up for better text readability.",
        ],
    },
    {
        version: "0.1.18",
        changes: [
            "Moved EBC badge 15% to the right.",
            "Widened badge so EBC text and version number render without clipping.",
        ],
    },
    {
        version: "0.1.17",
        changes: [
            "Made EBC overhead badge much smaller and shifted it 15% to the left.",
        ],
    },
    {
        version: "0.1.16",
        changes: [
            "Made EBC overhead badge slightly smaller and moved it further down.",
        ],
    },
    {
        version: "0.1.15",
        changes: [
            "Removed login screen popup - no more dialog on startup.",
            "Added a quiet chat message on room join confirming EmeryBC loaded successfully.",
            "Fixed badge version text visibility by widening the overhead badge further.",
        ],
    },
    {
        version: "0.1.14",
        changes: [
            "Added version number back under EBC in the overhead badge.",
        ],
    },
    {
        version: "0.1.13",
        changes: [
            "Badge 50% bigger, fixed EBC text clipping by increasing internal padding.",
        ],
    },
    {
        version: "0.1.12",
        changes: [
            "EBC badge scaled up 45% and text rendering fixed to always show EBC.",
        ],
    },
    {
        version: "0.1.11",
        changes: [
            "Made EBC badge slightly bigger so 'EBC' text is no longer clipped to 'BC'.",
            "Moved badge further down by 25%.",
        ],
    },
    {
        version: "0.1.10",
        changes: [
            "Made EBC overhead badge significantly smaller and moved it further down.",
            "Reverted action buttons back to Emote type (* Name text *).",
        ],
    },
    {
        version: "0.1.9",
        changes: [
            "Fixed outfit page row and editor overlaps - labels, inputs and buttons no longer stack on each other.",
            "Action buttons now use Type:Action so they show as (Name text.) instead of * Name text *.",
            "Default action emotes updated to match the new format.",
            "EBC overhead badge made smaller and drops the version line.",
            "Outfit notice messages bumped to 12px to match other log messages.",
        ],
    },
    {
        version: "0.1.8",
        changes: [
            "Fixed EBC badge visibility - now uses OnlineSharedSettings so all room members can see it.",
            "Shrunk outfit notice messages in chat to 11px so they are less intrusive.",
            "Bumped version number that was missed in previous release.",
        ],
    },
    {
        version: "0.1.7",
        changes: [
            "Moved the overhead EBC badge higher and removed the extra logo chip beside it.",
            "Spread the action button builder out further to reduce label and picker overlap.",
            "Reworked the outfit list and editor spacing to reduce overlapping text and controls.",
        ],
    },
    {
        version: "0.1.6",
        changes: [
            "Moved EmeryBC presence sharing onto BC's shared online settings path so other clients can receive the head tag.",
            "The badge now reads shared presence from online settings first, with local settings as a fallback.",
        ],
    },
    {
        version: "0.1.5",
        changes: [
            "Changed /ebc version so it only prints the current addon version.",
            "Kept the full history on /ebc changelog and /ebc changes.",
        ],
    },
    {
        version: "0.1.4",
        changes: [
            "Shifted the overhead EmeryBC badge a little further left for better alignment above characters.",
        ],
    },
    {
        version: "0.1.3",
        changes: [
            "Synced EmeryBC presence/version data automatically so the overhead badge has real data to read.",
            "Moved the badge above the character and added a version line under the EBC label.",
            "Keep the overhead version marker and pushed bundle version in lockstep on update.",
        ],
    },
    {
        version: "0.1.2",
        changes: [
            "Redesigned the Extensions UI into wider multi-panel layouts instead of the cramped left-column stack.",
            "Replaced the action button color hex field with a real click-to-pick color control.",
            "Added quicker wardrobe-side buttons for wearing, refreshing, and editing saved outfits.",
        ],
    },
    {
        version: "0.1.1",
        changes: [
            "Removed unstable overhead marker hooks so the addon loads safely again.",
            "Improved outfit command handling and reduced refresh delay during swaps.",
            "Updated the userscript loader and bundle versioning for cleaner updates.",
        ],
    },
    {
        version: "0.1.0",
        changes: [
            "Added action buttons and outfit command support.",
            "Added editable outfit name, command, restraint mode, and announce text settings.",
            "Added refreshed EmeryBC settings styling and startup notice.",
        ],
    },
];

function playBeepSound(): void {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
        osc.onended = () => ctx.close();
    } catch { /* ignore — AudioContext may not be available */ }
}

function appendLocalLogLine(text: string, color = UI.accent): void {
    const log = document.getElementById("TextAreaChatLog");
    if (!log) return;

    const msg = document.createElement("div");
    msg.style.cssText = `
        background: ${UI.cardMuted};
        color: ${color};
        border-left: 3px solid ${UI.accent};
        padding: 4px 8px;
        margin: 2px 0;
        font-style: italic;
        font-size: 12px;
    `;
    msg.textContent = text;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
}

function showVersionInfo(): void {
    appendLocalLogLine(`[EmeryBC] Version ${MOD_VERSION}`, UI.gold);
}

function showChangelog(): void {
    appendLocalLogLine(`[EmeryBC] Version ${MOD_VERSION}`, UI.gold);
    for (const entry of CHANGELOG) {
        appendLocalLogLine(`[EmeryBC] v${entry.version}`, UI.textMuted);
        for (const change of entry.changes) {
            appendLocalLogLine(`- ${change}`, UI.accent);
        }
    }
}

function handleMetaCommand(inputValue: string): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;

    const parts = trimmed.slice(1).split(/\s+/);
    if (parts[0]?.toLowerCase() !== "ebc") return false;

    const subcommand = (parts[1] || "version").toLowerCase();
    if (["version", "ver", "v"].includes(subcommand)) {
        showVersionInfo();
        return true;
    }

    if (["changelog", "changes"].includes(subcommand)) {
        showChangelog();
        return true;
    }

    if (["release", "free"].includes(subcommand)) {
        releaseRestraints();
        return true;
    }

    if (subcommand === "unlock") {
        unlockItems();
        return true;
    }

    appendLocalLogLine("[EmeryBC] Commands: /ebc version  |  /ebc changelog  |  /ebc release  |  /ebc unlock", UI.gold);
    return true;
}

interface EmeryPresence {
    version: string;
    marker: string;
}

interface EmeryAddonSettings {
    presence?: EmeryPresence;
    [key: string]: unknown;
}

function getSharedPresence(character: Character | null | undefined): EmeryPresence | null {
    if (!character) return null;

    // OnlineSharedSettings are broadcast to all room members via ChatRoomSync
    // and CharacterUpdate - this is the reliable cross-client path.
    const shared = character.OnlineSharedSettings?.[MOD_NAME];
    if (shared && typeof shared === "object") {
        const presence = (shared as EmeryAddonSettings).presence;
        if (presence?.marker === "EBC") return presence;
    }

    // Fallback: ExtensionSettings (visible if they were synced before room join)
    const addon = getAddonSettings(character, false)?.presence;
    return addon?.marker === "EBC" ? addon : null;
}

function getAddonSettings(character: Character | null | undefined, create = false): EmeryAddonSettings | null {
    if (!character) return null;
    const extensionSettings = character.ExtensionSettings as Record<string, unknown> | undefined;
    if (!extensionSettings) return null;

    const existing = extensionSettings[MOD_NAME];
    if (existing && typeof existing === "object") {
        return existing as EmeryAddonSettings;
    }

    if (!create) return null;
    const created: EmeryAddonSettings = {};
    extensionSettings[MOD_NAME] = created;
    return created;
}

function syncPresenceMarker(): void {
    const shared = (Player.OnlineSharedSettings ??= {});

    // Always broadcast presence regardless of local display toggle —
    // the toggle only controls what YOU see, not what others see.
    const presence: EmeryPresence = { version: MOD_VERSION, marker: "EBC" };

    // Write to ExtensionSettings for local persistence
    const settings = getAddonSettings(Player, true);
    if (settings) settings.presence = presence;
    ServerPlayerExtensionSettingsSync(MOD_NAME);

    // Write to OnlineSharedSettings - this IS broadcast to all room members
    // via ChatRoomSync and CharacterUpdate packets, making the badge visible
    // to every other EmeryBC user in the room.
    const current = shared[MOD_NAME];
    const alreadySynced = current && typeof current === "object" &&
        (current as EmeryAddonSettings).presence?.version === MOD_VERSION;
    if (!alreadySynced) {
        shared[MOD_NAME] = { presence };
        ServerSend("AccountUpdate", { OnlineSharedSettings: shared });
    }
}

function hasEmeryBC(character: Character | null | undefined): boolean {
    return !!getSharedPresence(character);
}

function drawPresenceMarker(args: unknown[]): void {
    if (CurrentScreen !== "ChatRoom") return;
    // Local display toggle — if off, skip drawing badges on everyone (client-side only)
    if (!getBadgeEnabled()) return;

    const character = args[0] as Character | undefined;
    const left = typeof args[1] === "number" ? args[1] : null;
    const top = typeof args[2] === "number" ? args[2] : null;
    const zoom = typeof args[3] === "number" ? args[3] : 1;
    if (!character || left == null || top == null) return;
    const isSelf = character.MemberNumber === Player.MemberNumber;
    if (!isSelf && !hasEmeryBC(character)) return;

    const presence = getSharedPresence(character);
    const showVer = getShowVersionBadge();
    const verStr = presence?.version ?? MOD_VERSION;
    const label = showVer ? ("v" + verStr) : "EBC";
    const width = showVer ? Math.max(44, 50 * zoom) : Math.max(30, 34 * zoom);
    const height = Math.max(12, 14 * zoom);
    const x = left + 197 * zoom;
    const y = top + 26 * zoom;
    const badgeLeft = x - width / 2;
    const badgeTop = y - height / 2;

    DrawRect(badgeLeft + 1, badgeTop + 1, width, height, "rgba(0, 0, 0, 0.28)");
    DrawRect(badgeLeft, badgeTop, width, height, UI.cardMuted);
    DrawEmptyRect(badgeLeft, badgeTop, width, height, UI.panelEdge, 1);
    DrawTextFit(label, badgeLeft + width / 2, badgeTop + height / 2 + 1, width - 6, UI.accent);
}

function showRoomLoadNotice(): void {
    if (noticeShown) return;
    noticeShown = true;
    appendLocalLogLine(`- EmeryBC v${MOD_VERSION} loaded successfully.`);
}

function tryHookFunction(
    modAPI: ModSDKModAPI,
    funcName: string,
    priority: number,
    hook: (args: unknown[], next: (args: unknown[]) => unknown) => unknown
): void {
    try {
        modAPI.hookFunction(funcName, priority, hook);
    } catch (error) {
        console.warn(`[${MOD_NAME}] Optional hook "${funcName}" unavailable:`, error);
    }
}

function init(): void {
    const modAPI = bcModSDK.registerMod(
        { name: MOD_NAME, fullName: "EmeryBC", version: MOD_VERSION },
        { allowReplace: true }
    );

    // Canvas sidebar action buttons
    modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
        next(args);
        try { drawActionButtons(); } catch { /* ignore */ }
    });

    modAPI.hookFunction("ChatRoomClick", 3, (args, next) => {
        try { if (handleActionButtonClick()) return; } catch { /* ignore */ }
        return next(args);
    });

    // DOM drawer - outfit switcher panel beside the chat log
    let drawer: EBCDrawer | null = null;
    try {
        drawer = new EBCDrawer(MOD_VERSION);
        // Fire an initial visibility check in case the addon loads while the
        // player is already in a chat room (ChatRoomSync won't fire again).
        window.setTimeout(() => { try { drawer?.updateVisibility(); } catch { /* ignore */ } }, 400);
    } catch (err) {
        console.warn("[EmeryBC] Drawer failed to initialise:", err);
    }

    tryHookFunction(modAPI, "DrawCharacter", 3, (args, next) => {
        const result = next(args);
        try {
            drawPresenceMarker(args);
        } catch {
            // Ignore marker draw failures.
        }
        return result;
    });

    modAPI.hookFunction("ChatRoomSync", 3, (args, next) => {
        const result = next(args);
        try { syncPresenceMarker();         } catch { /* ignore */ }
        try { showRoomLoadNotice();         } catch { /* ignore */ }
        try { timerOnRoomEnter();           } catch { /* ignore */ }
        try { drawer?.updateVisibility();   } catch { /* ignore */ }
        try { snapshotPlayerRestraints();   } catch { /* ignore */ }
        try { drawer?.refreshFriendList();  } catch { /* ignore */ }
        // Cache names and EBC presence for everyone currently in the room.
        try {
            const chars = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
                Array<{ MemberNumber?: number; Nickname?: string; Name?: string; OnlineSharedSettings?: Record<string, unknown> }> | undefined;
            if (chars) for (const c of chars) {
                if (!c.MemberNumber) continue;
                cacheName(c.MemberNumber, c.Nickname?.trim() || c.Name || String(c.MemberNumber));
                const shared = c.OnlineSharedSettings?.[MOD_NAME];
                if (shared && typeof shared === "object") {
                    const p = (shared as Record<string, unknown>).presence;
                    if (p && typeof p === "object") {
                        const v = (p as Record<string, unknown>).version;
                        if ((p as Record<string, unknown>).marker === "EBC" && typeof v === "string")
                            cacheEBCVersion(c.MemberNumber, v);
                    }
                }
            }
        } catch { /* ignore */ }
        return result;
    });

    // Anti-restraint: record who last acted on the player so the escape emote
    // can name them. BC sends an Action message with SourceCharacter / TargetCharacter
    // in the Dictionary whenever someone uses an item on another character.
    tryHookFunction(modAPI, "ChatRoomMessage", 3, (args, next) => {
        const result = next(args);
        try {
            const [data] = args as [Record<string, unknown>];
            logMessage(data);
            if (data.Type !== "Action") return result;
            const dict = data.Dictionary as Array<Record<string, unknown>> | undefined;
            if (!dict) return result;

            // Dictionary entries can use either {Tag, MemberNumber} or direct keys.
            let sourceNum: number | undefined;
            let targetNum: number | undefined;
            for (const entry of dict) {
                if (entry.Tag === "SourceCharacter" && typeof entry.MemberNumber === "number")
                    sourceNum = entry.MemberNumber;
                if (entry.Tag === "TargetCharacter" && typeof entry.MemberNumber === "number")
                    targetNum = entry.MemberNumber;
                // Alternative flat format
                if (typeof entry.SourceCharacter === "number") sourceNum = entry.SourceCharacter;
                if (typeof entry.TargetCharacter === "number") targetNum = entry.TargetCharacter;
            }

            if (typeof targetNum === "number" && targetNum === Player.MemberNumber &&
                typeof sourceNum === "number" && sourceNum !== Player.MemberNumber) {
                recordRestrainer(sourceNum);
            }
        } catch { /* ignore */ }
        return result;
    });

    // Anti-restraint + grace period: detect new restraints on the player after any refresh
    tryHookFunction(modAPI, "CharacterRefresh", 3, (args, next) => {
        const result = next(args);
        try {
            const [C] = args as [Character];
            if (C === Player) {
                checkGraceExpiry();
                enforceGracePeriod();
                antiRestraintOnPlayerRefresh();
            }
        } catch { /* ignore */ }
        return result;
    });

    // Keep drawer visibility in sync whenever the BC screen changes
    tryHookFunction(modAPI, "CommonSetScreen", 3, (args, next) => {
        const result = next(args);
        try {
            const screen = typeof CurrentScreen !== "undefined" ? CurrentScreen : "";
            if (screen !== "ChatRoom") timerOnRoomLeave();
        } catch { /* ignore */ }
        try { drawer?.updateVisibility(); } catch { /* ignore */ }
        return result;
    });

    // Keep restraint timer up to date on every draw tick (lightweight check)
    tryHookFunction(modAPI, "DrawCharacter", 1, (args, next) => {
        try { timerCheckRestraints(); } catch { /* ignore */ }
        return next(args);
    });

    // Record incoming beeps. The real BC function is ServerAccountBeep (a patchable global).
    // Only handle plain beeps (BeepType === "" or undefined) — skip game/friend-request beeps.
    tryHookFunction(modAPI, "ServerAccountBeep", 3, (args, next) => {
        try {
            const [beep] = args as [Record<string, unknown>];
            // Non-chat beeps (friend requests, etc.) always pass through unchanged.
            if (beep.BeepType) return next(args);
            const fromNum = typeof beep.MemberNumber === "number" ? beep.MemberNumber : 0;
            const msg = typeof beep.Message === "string" ? beep.Message : "";
            if (!fromNum || !msg) return next(args);
            const name = typeof beep.MemberName === "string" ? beep.MemberName : null;
            if (name) cacheName(fromNum, name);
            addBeepEntry({ from: fromNum, to: Player.MemberNumber ?? 0, message: msg, ts: Date.now() });
            if (!getBeepMuted()) { try { playBeepSound(); } catch { /* ignore */ } }
            try { drawer?.onIncomingBeep(fromNum); } catch { /* ignore */ }
            // Suppress BC's native chat-log notification when our IM handles it.
            if (getSuppressNativeBeep()) return;
        } catch { /* ignore */ }
        return next(args);
    });


    // Cache friend names whenever BC notifies us a friend came online.
    // FriendListBeep is a real BC global called with {MemberNumber, MemberName, ...}.
    tryHookFunction(modAPI, "FriendListBeep", 1, (args, next) => {
        try {
            const [data] = args as [Record<string, unknown>];
            const num = typeof data.MemberNumber === "number" ? data.MemberNumber : 0;
            const name = typeof data.MemberName === "string" ? data.MemberName : null;
            if (num && name) cacheName(num, name);
        } catch { /* ignore */ }
        return next(args);
    });

    // Track which friends BC considers online (not just in our room).
    // AccountQueryResult is a socket event, not a patchable global.
    try {
        const socket2 = (window as unknown as Record<string, unknown>).ServerSocket as
            { on(event: string, cb: (data: unknown) => void): void } | undefined;
        socket2?.on("AccountQueryResult", (raw: unknown) => {
            try {
                const data = raw as Record<string, unknown>;
                if (data.Query !== "OnlineFriends") return;
                const results = data.Result as Array<Record<string, unknown>> | undefined;
                if (!Array.isArray(results)) return;
                for (const r of results) {
                    const n = typeof r.MemberNumber === "number" ? r.MemberNumber : 0;
                    const name = typeof r.MemberName === "string" ? r.MemberName : null;
                    if (n && name) cacheName(n, name);
                }
                updateOnlineFriends(results);
                try { drawer?.updateAllBeepWindowStatuses(); } catch { /* ignore */ }
                try { drawer?.refreshFriendList(); } catch { /* ignore */ }
            } catch { /* ignore */ }
        });
    } catch { /* ignore */ }

    // ── Emote shortcut (*text → Type:Emote "*Name text*") ────────────────────
    // Typing *text (or * text) in the chat box sends a BC Emote message so it
    // renders as *Name text* in chat without going through gag processing.
    const handleEmoteShortcut = (raw: string): boolean => {
        if (!raw.startsWith("*")) return false;
        const body = raw.slice(1).replace(/^\s+/, "");
        if (!body) return false; // bare * alone — ignore
        try {
            ServerSend("ChatRoomChat", {
                Type: "Emote",
                Content: body,  // BC auto-prepends sender name for Type:"Emote"
            });
        } catch { /* ignore */ }
        return true;
    };

    // ── Direct capture-phase keydown — fires before BC touches anything ──────
    // This is the most reliable interceptor for safewords and chat commands.
    // It catches Enter on #InputChat in the capture phase, reads the raw value
    // (before gag processing), and cancels propagation if a word matches.
    // Works for normal chat AND gag speech (we see the original typed text).
    const getChatInput = (): HTMLInputElement | null =>
        document.getElementById("InputChat") as HTMLInputElement | null;

    const onChatKeydownCapture = (e: KeyboardEvent): void => {
        try {
            if (e.key !== "Enter" && e.keyCode !== 13) return;
            const el = (e.target ?? document.activeElement) as HTMLElement | null;
            if (!el || (el as HTMLInputElement).id !== "InputChat") return;
            const raw = (el as HTMLInputElement).value;
            if (!raw.trim()) return;
            if (checkSafeword(raw)
                || handleMetaCommand(raw)
                || handleOutfitCommand(raw)
                || handlePoseComboCommand(raw)
                || handleSceneCommand(raw)
                || handleDomCommand(raw)
                || handleEmoteShortcut(raw)) {
                (el as HTMLInputElement).value = "";
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        } catch { /* ignore */ }
    };
    document.addEventListener("keydown", onChatKeydownCapture, true);

    // ── ModSDK hooks — belt-and-suspenders fallback ───────────────────────────
    modAPI.hookFunction("ChatRoomKeyDown", 10, (args, next) => {
        try {
            if (typeof KeyPress !== "undefined" && KeyPress === 13) {
                const input = getChatInput();
                if (input?.value.trim() && (
                    checkSafeword(input.value)
                    || handleMetaCommand(input.value)
                    || handleOutfitCommand(input.value)
                    || handlePoseComboCommand(input.value)
                    || handleSceneCommand(input.value)
                    || handleDomCommand(input.value)
                    || handleEmoteShortcut(input.value)
                )) {
                    input.value = "";
                    return;
                }
            }
        } catch { /* ignore */ }
        return next(args);
    });

    modAPI.hookFunction("ChatRoomSendChat", 10, (args, next) => {
        try {
            const input = getChatInput();
            // args[0] may be the processed (possibly gag-garbled) text — prefer input.value (raw)
            const raw = input?.value ?? (typeof args[0] === "string" ? args[0] : "");
            if (raw.trim() && (
                checkSafeword(raw)
                || handleMetaCommand(raw)
                || handleOutfitCommand(raw)
                || handlePoseComboCommand(raw)
                || handleSceneCommand(raw)
                || handleDomCommand(raw)
                || handleEmoteShortcut(raw)
            )) {
                if (input) input.value = "";
                return;
            }
        } catch { /* ignore */ }
        return next(args);
    });

    try {
        syncPresenceMarker();
    } catch {
        // Ignore early sync failures.
    }

    console.log(`[${MOD_NAME}] v${MOD_VERSION} loaded`);
}

const readyInterval = setInterval(() => {
    if (typeof bcModSDK !== "undefined") {
        clearInterval(readyInterval);
        init();
    }
}, 100);
