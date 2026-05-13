import { drawActionButtons, handleActionButtonClick, initDragListener } from "./modules/actionButtons";
import { EBCDrawer, showConfirmOverlay } from "./modules/drawer";
import { handleOutfitCommand, handleRestraintCommand } from "./modules/outfitManager";
import { handlePoseComboCommand } from "./modules/poses";
import { handleSceneCommand } from "./modules/scenes";
import { handleDomCommand } from "./modules/domTools";
import { releaseRestraints, unlockItems } from "./modules/restraints";
import { getBadgeEnabled, getShowVersionBadge, getBeepMuted, getSuppressNativeBeep, getUpdateNotify, setUpdateNotify, getAfkEnabled, getAfkThreshold, getAfkMessage, getOocEnabled, recordPersonMet } from "./modules/settings";
import { antiRestraintOnPlayerRefresh, snapshotPlayerRestraints, recordRestrainer, getLastRestrainerName } from "./modules/antiRestraint";
import { onRoomSync, onRoomLeave, onMemberJoin, detectNewJoins } from "./modules/roomHistory";
import { snapshotForLog, checkRestraintChanges, setPendingLogApplier } from "./modules/restraintLog";
import { timerOnRoomEnter, timerOnRoomLeave, timerCheckRestraints } from "./modules/timer";
import { logMessage } from "./modules/devLog";
import { UI } from "./modules/ui";
import { addBeepEntry, cacheName, cacheEBCVersion, updateOnlineFriends, stripBeepMetadata, syncFriendsSince, storeRawBundle } from "./modules/friends";
import { checkSafeword, enforceGracePeriod, checkGraceExpiry } from "./modules/safeword";

const MOD_NAME = "EBC";
const MOD_VERSION = "2.1.0";
const IS_DEV_BUILD = true; // true on dev branch, false on master

let noticeShown = false;

// -- AFK auto-reply state -------------------------------------------------------
let lastActivityTime = Date.now();
const afkBeepCooldown = new Map<number, number>(); // memberNumber → last beep-reply ts
const AFK_REPLY_COOLDOWN_MS = 30 * 60 * 1000;
const CHANGELOG: Array<{ version: string; changes: string[] }> = [
    {
        version: "2.1.0",
        changes: [
            "Fix: EBC badge invisible on other players — OnlineSharedSettings was no longer populated before entering a room, so the room-join packet carried empty data and nobody saw your badge. Presence is now always written to OnlineSharedSettings regardless of screen; only the AccountUpdate broadcast is gated to ChatRoom.",
        ],
    },
    {
        version: "2.0.9",
        changes: [
            "Feature: outfit/restraint-set commands now show a confirm dialog if the outfit would remove or replace currently worn restraints.",
            "Feature: PROTECTED ITEMS section in the outfits tab — whitelist any worn item slot so outfits and restraint sets can never touch it.",
        ],
    },
    {
        version: "2.0.8",
        changes: [
            "Fix: overhead badge now always shows the correct running version — was reading stale cached presence data (e.g. 1.9.12) instead of the actual MOD_VERSION.",
        ],
    },
    {
        version: "2.0.7",
        changes: [
            "Fix: overhead badge now reliably broadcasts to room members on join — the rate-limit clock was being consumed at module load (before any room was joined), causing the first ChatRoomSync broadcast to be silently skipped.",
        ],
    },
    {
        version: "2.0.6",
        changes: [
            "UI: colours tab reworked — picker is always visible (no extra toggle click), + Save button inline, My Colours swatches compact below picker.",
            "UX: save-as-preset row moved to top of COLOUR PRESETS section with a 'from' dropdown; no longer buried inside the zones panel.",
            "Cleanup: removed 💾 save-colours button from restraint log entries.",
        ],
    },
    {
        version: "2.0.5",
        changes: [
            "UI: member number now sits directly beside the name (no longer pushed to the far right).",
            "UX: 'Currently wearing' whitelist picker is now a collapsible dropdown — ▶ to open, ▼ to close.",
            "UX: whitelist chip labels are now renameable — click the text on any chip to give it a custom name.",
        ],
    },
    {
        version: "2.0.4",
        changes: [
            "UI: member number now sits beside the name on the top line in the friends list.",
        ],
    },
    {
        version: "2.0.3",
        changes: [
            "UI: dev tab is now locked — it can never be toggled off in the visible tabs list; existing hidden state is repaired on load.",
            "UI: menu hotkey — assign any key (e.g. F2) in the Dev tab to open/close the EBC panel without clicking the tab button.",
            "Feature: colour presets — save named colour configurations from restraint log entries (💾 button); presets appear in the restraint sets section and can be applied to any matching set item.",
            "Feature: rename colour presets inline by clicking the name; delete with ×; apply to set with ▶ Set picker.",
        ],
    },
    {
        version: "1.9.12",
        changes: [
            "Fix: suppress-native-beep now reliably blocks friend beeps from BC chat — addBeepEntry exceptions could fall through to next(args) and leak the beep; inner try/catch now isolates message handling from the suppress gate.",
            "Fix: removed document.hidden guard from suppress check — OS notifications come via FriendListBeep, not ServerAccountBeep, so the hidden-tab exception was causing beeps to slip through whenever the window lost focus.",
        ],
    },
    {
        version: "1.9.11",
        changes: [
            "UX: clear button confirmations now use the same custom in-game overlay as the anti-restraint escape prompt instead of window.confirm.",
        ],
    },
    {
        version: "1.9.10",
        changes: [
            "UX: all log-channel clear buttons now show a confirm dialog before wiping data (rooms visited, restraint log, message log, people met).",
        ],
    },
    {
        version: "1.9.9",
        changes: [
            "UI: log channel section headers bumped from 9px → 11px font; clear buttons bumped to 11px font so they're readable and tappable.",
        ],
    },
    {
        version: "1.9.8",
        changes: [
            "UI: clear buttons on log channels (room history, restraint log, message log, people met) now have proper tap-friendly padding.",
        ],
    },
    {
        version: "1.9.7",
        changes: [
            "Fix: beep window chat history now scrolls correctly — replaced justify-content:flex-end (CSS overflow bug) with a flex spacer that pushes messages to the bottom without breaking scroll.",
            "Fix: suppress-native-beep now works for all friend beeps including metadata-only ones — the empty-message early-return was firing before the suppress check, leaking friend beeps into BC chat.",
        ],
    },
    {
        version: "1.9.6",
        changes: [
            "UI: tablet/touch pass — all buttons bumped to comfortable tap targets; slot buttons 22→28px; added touch-action:manipulation globally to kill 300ms tap delay.",
        ],
    },
    {
        version: "1.9.5",
        changes: [
            "Fix: presence sync rate-limited to 6 s to prevent AccountUpdate spam on rapid ChatRoomSync bursts.",
            "Fix: isDev field now included in alreadyStored check so it's always re-saved if missing.",
            "Fix: saveTabOffset, savePanelPosition, getBarks, saveBarks now use callBC() wrapper to safely handle async hook rejections from ServerPlayerExtensionSettingsSync.",
            "UI: colour slot labels renamed for clarity — 'Input BG' → 'Inset BG', 'Text (sub)' → 'Subtext', 'Text (muted)' → 'Dim Text'.",
        ],
    },
    {
        version: "1.9.4",
        changes: [
            "Fix: beep button height now matches profile icon button in friends list — padding and border unified.",
        ],
    },
    {
        version: "1.9.3",
        changes: [
            "Fix: dev badge now always shows above other dev-branch users — presence was silently skipping the AccountUpdate broadcast if the version matched a stale cached entry without isDev.",
        ],
    },
    {
        version: "1.9.2",
        changes: [
            "Fix: profile buttons in in-room people list and People Met list are now icon-only (person SVG, no text).",
            "New: profile icon button added to online/offline friends list beside the beep button.",
        ],
    },
    {
        version: "1.9.1",
        changes: [
            "Fix: quick-action sidebar can no longer be dragged behind the chat log panel (X clamped to 1150).",
            "Fix: Reset pos button now also resets the sidebar to its default position.",
            "New: profile button (person icon) added to beep window header — opens BC info sheet for that player.",
            "Fix: other dev-branch users now show 'dev' above their head (isDev broadcast in presence data).",
        ],
    },
    {
        version: "1.9.0",
        changes: [
            "Fix: overhead EBC badge now shows in crowded rooms — was incorrectly hidden when BC reduced zoom to fit many characters.",
            "Fix: quick-action grip is now hold-to-drag — press and hold to move, release to drop. Dropping no longer accidentally clicks characters.",
            "Fix: grip icon replaced with a proper 2×3 dot grid drawn with filled rects (braille glyph didn't render in BC's font).",
            "Fix: DEV chip restored to drawer header title on dev builds.",
            "Fix: AFK beep reply logs one confirmation line when it fires.",
            "Fix: AFK chat mention-reply removed (was unreliable); beep-only reply remains.",
        ],
    },
    {
        version: "1.8.8",
        changes: [
            "Fix: AFK beep reply and AFK mention reply now use separate 30-min cooldown maps — a mention reply to person A no longer blocks a beep reply from person A (this was introduced when mention reply defaulted to ON in 1.8.7).",
            "Fix: AFK beep check now runs before the empty-message early-return so it fires even when beep has no text.",
        ],
    },
    {
        version: "1.8.7",
        changes: [
            "Fix: sidebar drag now uses DOM mousemove/mouseup + touchmove/touchend events — hold grip and release anywhere to drop; works on tablet too. Grip height increased to 22px.",
            "Fix: AFK chat mention-reply now defaults to ON (was opt-in, so it never fired unless you explicitly enabled the sub-toggle).",
        ],
    },
    {
        version: "1.8.6",
        changes: [
            "Tweak: sidebar grip and collapse toggle are now dark and minimal — no more big pink block; grip shows '· · ·' dots, collapse shows a dim ▶/▼ arrow.",
        ],
    },
    {
        version: "1.8.5",
        changes: [
            "Tweak: AFK mention-reply now sends a regular chat message instead of a whisper.",
        ],
    },
    {
        version: "1.8.4",
        changes: [
            "Fix: AFK mention-reply now fires correctly — removed silent error suppression, made member-number parsing robust, added local gold log line confirming reply was sent.",
            "Tweak: DEV chip removed from drawer title — the overhead badge already says 'dev | v...' for dev builds.",
            "Tweak: AFK idle threshold inputs now have their label on a separate line with more spacing between the h/m/s boxes.",
        ],
    },
    {
        version: "1.8.3",
        changes: [
            "Fix: overhead badge is now hidden in map/zoom-out view (zoom < 0.75) — positioning is unreliable at low zoom and the badge is too small to read anyway.",
        ],
    },
    {
        version: "1.8.2",
        changes: [
            "Tweak: drawer header DEV badge now sits below the version text (stacked) instead of inline, so the header reads cleaner.",
        ],
    },
    {
        version: "1.8.1",
        changes: [
            "Tweak: AFK idle threshold input split into three boxes — hours, minutes, seconds (e.g. 00h 10m 00s). Zero fields pad to 00 on blur. Minimum effective threshold is 1 second.",
        ],
    },
    {
        version: "1.8.0",
        changes: [
            "Tweak: dev overhead badge format changed from D-v1.x.x to 'dev | v1.x.x' for clarity.",
        ],
    },
    {
        version: "1.7.9",
        changes: [
            "Tweak: overhead presence badge uses full size in normal room view; shrinks only when zoomed out (map/overview, zoom < 0.75).",
            "Tweak: on dev build your own badge shows D-v1.7.9 (or D-EBC) so it's clear you're on dev.",
            "Tweak: removed redundant '(dev)' text from drawer title — the pink DEV chip is already there.",
        ],
    },
    {
        version: "1.7.8",
        changes: [
            "Fix: AFK mention-reply was using minutes multiplier instead of seconds — whisper now fires correctly.",
            "Fix: AFK auto-reply beep is now recorded in beep history and refreshes the chat window so you can see it was sent.",
            "Tweak: Idle threshold field now shows computed time next to seconds — e.g. '120 sec (2 min)' — updating live as you type.",
        ],
    },
    {
        version: "1.7.7",
        changes: [
            "Fix: overhead presence badge restored to solid style — reverted accidental transparency, made it smaller instead.",
        ],
    },
    {
        version: "1.7.6",
        changes: [
            "New: Restraint log now captures colours, lock type, locker name, and craft name at time of application — shown as colour swatches, a lock badge, and gold italic craft name per entry.",
            "New: SAVED COMBOS and SCENES sections in the Anims tab are now collapsible (▼/▶) with state saved to localStorage.",
            "Tweak: Tab buttons are taller (10 px padding) and slightly larger font for easier tapping on tablets.",
        ],
    },
    {
        version: "1.7.5",
        changes: [
            "Rework: Drawer Appearance now has individual colour pickers for every UI element — Panel BG, Card, Input BG, Border, Accent, Gold, Text, Text (sub), Text (muted). Each picker updates the CSS instantly and is saved to localStorage.",
            "Keep: Quick preset dropdown still works as a one-click starting point; Reset button restores all 9 colours to Default (Pink).",
            "Fix: Gold / yellow highlight colour (#c9ab72) is now part of the theme system and can be customised.",
        ],
    },
    {
        version: "1.7.4",
        changes: [
            "Rework: Drawer Appearance moved to Dev tab as a collapsible section.",
            "Rework: Accent color picker replaced with a full colour theme dropdown — choose from Default (Pink), Purple, Blue, Green, Red, or Dark (Mono). Changing the theme rewrites the entire CSS palette instantly.",
            "Remove: drawer resize handle removed.",
        ],
    },
    {
        version: "1.7.3",
        changes: [
            "New: Drawer resize — drag the left edge of the EBC drawer to set a custom width (280–600 px), saved to localStorage.",
            "New: Accent color picker in Buttons tab — change the pink highlight color to any hex value; the CSS reloads instantly. Reset button restores default.",
            "New: Tab visibility settings in Buttons tab — hide tabs you never use to reduce clutter; hidden tabs are excluded from the tab bar and a fallback to the first visible tab is automatic.",
            "New: Outfit search — text filter at the top of the Outfits tab narrows the list as you type.",
        ],
    },
    {
        version: "1.7.2",
        changes: [
            "Fix: Release Restraints (/ebc release) and related functions now cover collar and neck slots — was using BC's IsRestraint flag which excludes those groups. Switched to RESTRAINT_GROUPS throughout restraints.ts.",
            "Rework: Copy Restraints from Member now exports a BC outfit code instead of directly applying — load a member's restraints, pick individual items via checkboxes, generate the code, and copy to clipboard for BC wardrobe import.",
        ],
    },
    {
        version: "1.7.1",
        changes: [
            "New: Copy Restraints from Member in Dev tab — select any room member, preview their restraints, and apply them to yourself with lock data stripped.",
            "Fix: User Notes tab now live-updates when a note is saved from the friend expand panel.",
        ],
    },
    {
        version: "1.7.0",
        changes: [
            "Fix: friend notes now save reliably — notes.ts getStore() was not null-safe and saveNote/deleteNote used bare ServerPlayerExtensionSettingsSync calls; wrapped with callBC and added null guards.",
            "Fix: notes can now be added directly from the Friends list expand panel — each friend row now includes an inline note editor that auto-saves, so you no longer need to visit the User Notes tab to write a note for the first time.",
        ],
    },
    {
        version: "1.6.9",
        changes: [
            "Fix: OOC toggle and anti-restraint whitelist (add/remove) now save correctly — all set* functions in settings.ts were calling ServerPlayerExtensionSettingsSync bare, missing async rejections from mod hooks. Wrapped with callBC across the board.",
            "Fix: whitelist 'currently wearing' picker now shows collar and neck items (same IsRestraint flag gap as the escape logic, now uses RESTRAINT_GROUPS).",
        ],
    },
    {
        version: "1.6.8",
        changes: [
            "Fix: auto-escape now covers collar and neck slots (ItemNeck / ItemNeckAccessories / ItemNeckRestraints) — previously only groups with BC's IsRestraint flag were monitored, which excluded those slots. Now uses the same RESTRAINT_GROUPS set as the outfit manager.",
        ],
    },
    {
        version: "1.6.7",
        changes: [
            "Fix: safeword enable toggle now re-reads its saved state every time the drawer opens (not just once on construction when ExtensionSettings might not be ready yet). setSafewordConfig now uses callBC to handle async rejections from mod hooks that wrap ServerPlayerExtensionSettingsSync.",
        ],
    },
    {
        version: "1.6.6",
        changes: [
            "Fix: rate-limit disconnect when joining large rooms — last-seen timestamps for offline friends are now written in a single batched server sync instead of one per friend. syncPresenceMarker also skips the ExtensionSettings sync when presence is already recorded.",
        ],
    },
    {
        version: "1.6.5",
        changes: [
            "New: People in Room section added above Friends in the notes tab — collapsible header showing every person currently in the chat room with their name, member number, relationship badges, EBC badge, friend tags, a Profile button, and a Beep button for friends.",
        ],
    },
    {
        version: "1.6.4",
        changes: [
            "Fix: safeword toggle state now saves correctly — getStore() in safeword.ts was missing null safety so setSafewordConfig silently threw and never persisted the change.",
        ],
    },
    {
        version: "1.6.3",
        changes: [
            "Fix: /ebc update now always shows both your current version and the latest GitHub version in the result line. appendLocalLogLine retries once if the chat log isn't mounted yet.",
        ],
    },
    {
        version: "1.6.2",
        changes: [
            "Fix: Profile button now actually opens the BC info sheet correctly — root cause was bundle capture happening AFTER BC mutated the data (changed string IDs to integers, replaced raw Appearance with loaded Assets). Now captures a deep copy before BC processes the sync, matching WCE exactly. Also adds ChatRoomBackground restore so the profile screen renders fully.",
            "Fix: Chat windows now open with messages pinned to the bottom instead of the top.",
        ],
    },
    {
        version: "1.6.1",
        changes: [
            "Fix: Lucy's client now shows ♛ Mistress on Emery's name in her friends panel.",
        ],
    },
    {
        version: "1.6.0",
        changes: [
            "Fix: removed ♛ Mistress locked tag from Emery's entry — only Emery's own panel shows it on Lucy.",
        ],
    },
    {
        version: "1.5.9",
        changes: [
            "Fix: ♛ Mistress locked tag is now viewer-aware — Emery's client shows it on Lucy, Lucy's client shows it on Emery. Neither player sees the tag on themselves in their own panel.",
        ],
    },
    {
        version: "1.5.8",
        changes: [
            "Fix: Profile button in People Met now shows diagnostic error in button text so we can pinpoint exactly why it fails.",
        ],
    },
    {
        version: "1.5.7",
        changes: [
            "Fix: removed incorrect #235168 entry — Emery's confirmed member number is #130267. Locked ♛ Mistress tag now targets the correct number only.",
        ],
    },
    {
        version: "1.5.6",
        changes: [
            "Fix: added #235168 as a second entry for Emery so the ♛ Mistress tag shows correctly in Lucy's panel. Lucy's own user-set tags on Emery still appear — the locked tag is always forced to index 0, user tags follow behind it.",
        ],
    },
    {
        version: "1.5.5",
        changes: [
            "Emery (#130267) now also carries a permanent ♛ Mistress tag — visible to anyone running this EBC who has Emery in their friends panel, including Lucy's view.",
        ],
    },
    {
        version: "1.5.4",
        changes: [
            "Fix: Lucy's ♛ Mistress tag now always appears in the friends panel even if she is not in Player.FriendList. Locked-tag contacts are rendered at the top of the friends list with their hardcoded fallback name so the tag is visible regardless of friend status.",
        ],
    },
    {
        version: "1.5.3",
        changes: [
            "Lucy (#230466) now permanently displays a gold ♛ Mistress tag. It appears first, overrides normal tag order, cannot be removed, and renders with a distinct gold glow style in the friend row, expand panel, and hover tooltip.",
        ],
    },
    {
        version: "1.5.2",
        changes: [
            "Fix: Profile button in People Met now works for people met in previous sessions. Character bundles are now persisted to localStorage (up to 150 entries, oldest evicted) so they survive page reloads — previously only people seen in the current session could have their profile opened.",
        ],
    },
    {
        version: "1.5.1",
        changes: [
            "Fix: Profile button in People Met now actually opens the BC info sheet instead of falling back to clipboard copy. Root cause was a missing ChatRoomHideElements() call — without it the profile screen rendered underneath the chat room UI and appeared invisible. Also switched bundle capture to hook ChatRoomSync/ChatRoomSyncSingle/ChatRoomSyncMemberJoin (matching WCE's approach) for correct raw server-format bundles.",
        ],
    },
    {
        version: "1.5.0",
        changes: [
            "Profile button in People Met now opens the full BC info sheet for anyone you've shared a room with this session, even after they've left. Uses the same raw-bundle approach as WCE: CharacterLoadOnline is hooked to capture each character's server-format data (correct string ID + raw Appearance bundle) so it can be reconstructed offline. Clipboard copy is kept as a last-resort fallback.",
        ],
    },
    {
        version: "1.4.9",
        changes: [
            "Friends since: expand panel now shows the date EBC first recorded each friend — synced across devices.",
            "Last seen is now stored in ExtensionSettings (server-synced) instead of localStorage — your offline timestamps follow you across devices. Existing localStorage history is automatically merged on first load.",
            "Last seen in expand panel now shows the full date & time alongside the relative label (e.g. '2 hours ago').",
        ],
    },
    {
        version: "1.4.8",
        changes: [
            "Skills fix: BC's skill entries use the property 'Type' (not 'Skill'). All previous apply attempts were looking up the wrong key. Skills now apply correctly via BC's own SkillChange() which calls ServerPlayerSkillSync() internally. Added Dressage skill. Display now uses SkillGetLevelReal (base level, no modifiers).",
            "People Met: new DEV tab section that records every player you share a room with. Saved server-side so it syncs across devices. Search by name or member number. Profile button opens their BC info sheet if they're in the current room, otherwise copies their member number.",
        ],
    },
    {
        version: "1.4.7",
        changes: [
            "Stat editor — Skills: inputs now show your actual current skill levels on open (uses BC's own SkillGetLevel) and correctly save to the server on Apply.",
            "Stat editor — Reputation: all 12 known reputation types are always shown with their current values (0 if not yet earned). No more dropdown — just set any value and Apply adds it automatically.",
            "Beep chat: Credits members now display their personal animated gradient name. Any other EBC user gets a soft pink–lavender gradient. Non-EBC senders keep the existing solid colour.",
        ],
    },
    {
        version: "1.4.6",
        changes: [
            "Bark sounds are now fully editable: all barks (built-in and custom) appear in a single list. Click the pencil icon on any entry to rename it inline, or the × to delete it. Built-in barks are no longer locked.",
            "Bark storage migrated to a unified 'barks' list — existing custom barks are automatically carried over.",
        ],
    },
    {
        version: "1.4.5",
        changes: [
            "Room History split into two sections: 'Current Room' (always-on, in-memory — shows who was present on entry and who joined after) and 'Rooms Visited' (opt-in, persisted to localStorage — saves a record of each room you enter when enabled).",
        ],
    },
    {
        version: "1.4.4",
        changes: [
            "Room History and Restraint Log are now opt-in (off by default) — each has an enable toggle inside its section in DEV → LOG.",
            "Restraint log no longer records items that are in your anti-restraint whitelist.",
            "Room history join detection now runs directly from BC hooks (ChatRoomSync, ChatRoomSyncMemberJoin) so joins are captured even when the DEV tab is closed.",
            "OOC mode toggle moved from Notes tab to Buttons tab → Fun Actions section.",
        ],
    },
    {
        version: "1.4.3",
        changes: [
            "Fix room history not showing people who joined after you: getRoomHistory() now merges the live in-memory current visit so joins appear immediately, without waiting until you leave the room.",
        ],
    },
    {
        version: "1.4.2",
        changes: [
            "Footer layout changed to stacked column — version credit and session timer now appear on separate lines instead of cramped side-by-side.",
            "Escape whitelist now saves by specific item identity (asset name + craft name) instead of slot. A whitelisted chain collar no longer prevents escaping every neck item.",
            "Whitelist UI now shows item display names and craft names on chips; 'Currently wearing' list iterates items rather than slots.",
            "Improved text contrast throughout the whitelist section and drawer footer — previously invisible or near-invisible labels are now readable.",
            "Message log 'Enable' button replaced with a subtle low-profile style that matches the surrounding UI instead of the loud action-button look.",
        ],
    },
    {
        version: "1.4.1",
        changes: [
            "DEV tab restructured into three collapsible dropdowns: EBC USERS IN THIS ROOM, DEVELOPER TOOLS (version badge toggle, Character Inspector, Addons Loaded), and LOG (Room History, Restraint Log, Message Log). All three default to collapsed.",
            "Removed standalone LOG tab — all log content is now inside DEV → LOG.",
        ],
    },
    {
        version: "1.4.0",
        changes: [
            "Room visit history: new LOG tab tracks the last 15 rooms you visited — name, space, entry/exit times, who was in the room on entry, and who joined while you were there. Click any room card to expand the member lists.",
            "Restraint log: LOG tab also records every restraint applied to you — item name, slot, who put it on, when, and how long it was worn. Stored in localStorage; clear button available.",
            "AFK auto-reply: configurable in the USERS tab — enable, set an idle threshold (minutes), and write a custom message. EBC auto-replies to incoming beeps when you've been inactive longer than the threshold. Each sender has a 30-minute cooldown so they're never spammed.",
            "Fix: offline friend 'last seen' timestamp is now clearly readable (brighter colour, larger text).",
        ],
    },
    {
        version: "1.3.25",
        changes: [
            "Friends list: offline friends now show a 'last seen' timestamp (e.g. '2h ago', 'yesterday', 'Mon'). Recorded automatically when a friend goes offline while the addon is running; stored in localStorage so it persists across sessions.",
        ],
    },
    {
        version: "1.3.24",
        changes: [
            "Remove UI zoom (A-/A+) entirely. Header restored to original buttons only. Default Nickname moved to top of Outfits tab. Active Restraints collapse state now saves reliably (switched to display:none). Removed non-functional Legs Closed pose button (ClosedLegs is an item-forced pose, not directly applicable).",
        ],
    },
    {
        version: "1.3.23",
        changes: [
            "Outfit Schedule section is now collapsible (▶/▼) with state saved to localStorage. Fix update checker: package.json version was stuck at 1.3.6 so /ebc update always said 'up to date' — now kept in sync with MOD_VERSION.",
        ],
    },
    {
        version: "1.3.22",
        changes: [
            "Move A− / A+ zoom controls from footer to header row — always accessible regardless of zoom level. Remove broken height-compensation that was crushing the body at high zoom; body now scrolls naturally.",
        ],
    },
    {
        version: "1.3.21",
        changes: [
            "Fix A− / A+ zoom buttons not working: replaced raw text node in footer with a proper span element (the text node was consuming all flex space, making buttons invisible). Also compensate panel height when zoomed so footer never scrolls off-screen.",
        ],
    },
    {
        version: "1.3.20",
        changes: [
            "Removed panel resize (width/height drag). Added UI zoom: A− and A+ buttons in the footer step through 75/85/100/110/120/135% scale — scales all buttons, text, and layout together. Scale is saved and restored across sessions.",
        ],
    },
    {
        version: "1.3.19",
        changes: [
            "Fix unhandled Promise rejection errors: every call to CharacterRefresh, ChatRoomCharacterUpdate, and ServerPlayerAppearanceSync across all modules (poses, restraints, palettes, expressions, antiRestraint, domTools, actionButtons) now uses the callBC() helper that silences async rejections from mod hooks (WCE, BCX, CRABS, etc.).",
        ],
    },
    {
        version: "1.3.18",
        changes: [
            "Resize rework: replaced the bottom grip bar with a bottom-left corner triangle handle — drag left/right to adjust width, drag up/down to adjust height, just like standard OS windows. Double-click to reset both. Both dimensions are saved and restored across sessions.",
            "Friends tab: relationship icons now appear beside each friend's name — ❤️ lover, 🔒 they own you, 👑 you own them.",
        ],
    },
    {
        version: "1.3.17",
        changes: [
            "Resize: switched to Pointer Capture API (setPointerCapture) — routes all drag events directly to the grip bar regardless of what BC or other mods are doing with mouse events, making the drag impossible to intercept.",
            "Resize: height is now set directly on the .ebc-panel flex container itself (the innermost visual box), bypassing every height:100% inheritance step in the DOM chain.",
        ],
    },
    {
        version: "1.3.16",
        changes: [
            "Resize grip rework: replaced the tiny invisible 8px strip with a clearly visible 22px drag bar at the panel bottom. The three-line grip indicator is visible at rest and turns pink on hover. Drag up/down to resize; double-click to reset to auto height.",
            "Resize reliability fix: panel height is now set directly on the slide container element rather than relying on height:100% propagation from the zero-width root anchor — fixes browsers where that chain didn't reflow correctly.",
        ],
    },
    {
        version: "1.3.15",
        changes: [
            "All collapsible sections now remember their open/closed state across sessions: Tags, Active Restraints, Colours, Saved Palettes, Offline Friends, and the Buttons accordion active category.",
            "Empty-state hint text (\"No combos yet\", \"No tags yet\", etc.) is brighter — was nearly invisible against the dark background.",
        ],
    },
    {
        version: "1.3.14",
        changes: [
            "Resize rework: the resize grip is now a dedicated thin strip at the very bottom of the panel (below the version credit line), completely separate from the footer text. It's a normal flex child — no absolute positioning, no stacking-context issues. Drag it up/down to resize; double-click to reset to auto height.",
        ],
    },
    {
        version: "1.3.12",
        changes: [
            "Buttons tab: categories are now collapsible accordion sections — click a category header to expand it and edit its buttons, click another to switch. Rename/delete buttons sit in each header. Add Category button at the bottom.",
            "Outfits tab: removed ⛓ icon from Saved Restraints section header.",
        ],
    },
    {
        version: "1.3.11",
        changes: [
            "Resize rework: replaced the corner triangle with a full-width resize bar at the panel bottom — three horizontal lines appear on hover, drag up/down to resize, double-click to reset to auto height.",
        ],
    },
    {
        version: "1.3.10",
        changes: [
            "Fix: resize grip triangle moved to bottom-right corner (correct side for a right-anchored panel).",
        ],
    },
    {
        version: "1.3.9",
        changes: [
            "Fix: resize grip moved outside panel overflow context — no longer clipped; drag the triangle in the bottom-left corner to resize panel height.",
            "Buttons tab: category dropdown now lives at the top of the Buttons tab itself — 'Active Category' selector is the first thing you see when switching to Buttons.",
        ],
    },
    {
        version: "1.3.8",
        changes: [
            "Poses: added 'Legs Closed' (ClosedLegs) to the Body pose group — available as a quick-apply button in the Poses tab and as a step in the combo/animation editor.",
        ],
    },
    {
        version: "1.3.7",
        changes: [
            "Beep chat: room location shown under contact name in chat window header — see at a glance which room they are in.",
            "Beep chat: emoji picker added — click 😊 next to the send bar to open an emoji grid and insert emojis at the cursor.",
        ],
    },
    {
        version: "1.3.6",
        changes: [
            "Fix: beep messages no longer show □ box characters — private-use Unicode separators inserted by WCE/FBC/etc. are now stripped alongside their JSON metadata blob.",
            "Fix: native BC beeps that contain only mod metadata (empty after stripping) no longer get stored as blank messages in EBC chat history.",
            "UI: text contrast improved across the board (section labels, tab names, button text, notes, credits). Member numbers in credits are now highlighted chips.",
            "Category dropdown added to the quick actions bar — switch button categories without touching the BC sidebar.",
        ],
    },
    {
        version: "1.3.3",
        changes: [
            "Fix: offline messages now actually delivered — when a recipient comes back online, EBC re-sends the original message(s) as real beeps so they appear in chat history (BC silently drops beeps to offline players).",
            "Resize handle: replaced A-/A+ scale buttons with a drag handle at the bottom edge of the panel — drag down/up to resize the panel height, saved across sessions.",
            "BC sidebar: category ◀/▶ arrows are now larger and easier to click.",
        ],
    },
    {
        version: "1.3.2",
        changes: [
            "Button categories: Quick Action Buttons now support multiple named categories (e.g. RP, Casual). Switch between them with ◀/▶ chips in the BC sidebar or the tab bar in the Buttons drawer. Each category has its own independent set of up to 12 buttons. Existing buttons are automatically migrated to a 'Default' category.",
            "Offline message notification: if you send someone a beep while they are offline, EBC will automatically notify them the moment they come online.",
            "Chat windows: drag is now clamped to the browser viewport -- windows can no longer be dragged off-screen.",
            "Chat windows: member number (#XXXXX) is now shown in the window title bar and in each message bubble so you always know who you are talking to.",
        ],
    },
    {
        version: "1.3.1",
        changes: [
            "Buttons tab: ▲/▼ reorder buttons on every slot row — move any button up or down in the list.",
        ],
    },
    {
        version: "1.3.0",
        changes: [
            "User Notes: removed 'You' and 'In This Room' auto-populated sections — only explicitly saved notes are shown now.",
        ],
    },
    {
        version: "1.2.9",
        changes: [
            "Beep windows: restored windows on relog now start collapsed (minimized) instead of fully open, so they don't flood the screen on login.",
        ],
    },
    {
        version: "1.2.8",
        changes: [
            "Beep windows: open windows are now saved to localStorage and automatically restored on relog — they reappear in the same position where you left them.",
        ],
    },
    {
        version: "1.2.7",
        changes: [
            "Timer bar fix: opening wardrobe, preferences, or any other in-room menu no longer resets the Room and Bound timers. Timers now only reset when actually leaving the chatroom.",
            "Boop: 'Boop all friends in room' now uses BC's native Boop Nose activity (Pet on ItemNose) — targets with reaction mods (BCX, LSCG, etc.) will respond with their nose boop reactions.",
        ],
    },
    {
        version: "1.2.6",
        changes: [
            "Beep windows: drag position is now saved to localStorage per contact and restored the next time that window is opened (survives relogs and room changes).",
        ],
    },
    {
        version: "1.0.8",
        changes: [
            "/ebc features — credited members only (Emery, Sin, Lara, Lucy). Sends a clean 9-line emote to the room listing all EBC features, readable by everyone including non-addon users.",
        ],
    },
    {
        version: "1.0.7",
        changes: [
            "Update notifications: EBC checks GitHub for a newer version 30s after load then every hour. Shows a local notice with the new version number and a page-refresh prompt. Silence permanently with /ebc updates off, re-enable with /ebc updates on. On by default.",
        ],
    },
    {
        version: "1.0.6",
        changes: [
            "Outfits: ▲/▼ reorder buttons on every outfit row to move outfits up and down in the list.",
            "Outfits: Tag system — create named colour-coded tags, assign them to outfits via toggle chips in the edit panel. Tags show as coloured chips on each outfit row. Manage tags (add, recolour, delete) via the collapsible Tags section at the top of the outfits tab.",
        ],
    },
    {
        version: "1.0.5",
        changes: [
            "Rebranded display name to EBC with 'EmeryBC' shown as small subtext in the drawer header. All log prefixes, footer, and load message now say EBC. Internal mod ID and storage keys unchanged.",
        ],
    },
    {
        version: "1.0.4",
        changes: [
            "Outfits: Default nickname field at the top of the outfits tab — outfits with no specific nickname fall back to this instead of leaving the nickname unchanged.",
        ],
    },
    {
        version: "1.0.3",
        changes: [
            "Outfits: optional Nickname field — set a nickname per outfit and it applies automatically when you wear it. Leave blank for no change.",
        ],
    },
    {
        version: "1.0.2",
        changes: [
            "Beep chat: message timestamps now include the date for messages from previous days (e.g. '9 May · 14:32'). Today's messages still show just the time.",
        ],
    },
    {
        version: "1.0.1",
        changes: [
            "Dom Tools: multiple targets in announce now join with 'and' instead of a comma — e.g. 'Lucy and Lara' instead of 'Lucy, Lara'.",
        ],
    },
    {
        version: "1.0.0",
        changes: [
            "Colours tab: hex code text beside colour selectors is now a visible light-pink colour instead of dark/unreadable.",
            "Dev tab: Hook Inspector renamed to 'Addons Loaded'; removed the 'no hooks listed' / hook-count badge from each addon row — rows now show addon name + version only.",
        ],
    },
    {
        version: "0.9.9",
        changes: [
            "Fix persistent unhandled-rejection error on red/yellow safeword: added callBC() helper that silences async rejections from mod-hooked BC functions (CharacterRefresh, ChatRoomCharacterUpdate, ServerPlayerAppearanceSync, ChatRoomLeave, CommonSetScreen). Any mod that wraps these with async hooks can no longer produce visible promise rejection errors through EmeryBC's safeword or scene execution.",
        ],
    },
    {
        version: "0.9.8",
        changes: [
            "Added /ebc ameter command — toggles the arousal/lust meter on and off. Turning it off sets Active to Inactive; turning it back on restores your previous level (Manual, Hybrid, Automatic, etc.). Aliases: /ebc arousal, /ebc lust.",
        ],
    },
    {
        version: "0.9.7",
        changes: [
            "Fix unhandled Promise rejection when using red/yellow safeword: CommonSetScreen is async in BC R127, so .catch() is now attached to silence any async error without affecting behaviour.",
        ],
    },
    {
        version: "0.9.6",
        changes: [
            "Scenes equip: variant options are now detected via TypedItemGetOptionNames (BC R91+ global) — all typed items including Ceiling Shackles show their real options (HeadLevel, Overhead, etc.) instead of a text box.",
            "Scenes equip: equipping with a variant now also sets Property.TypeRecord for full BC R91+ compatibility.",
            "Scenes equip: 📷 capture button now reads TypeRecord (BC R91+) to detect the active variant, falling back to Property.Type for older items.",
        ],
    },
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
    const doAppend = (): boolean => {
        const log = document.getElementById("TextAreaChatLog");
        if (!log) return false;
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
        return true;
    };
    // Try immediately; if the chat log isn't mounted yet retry once after a short delay
    if (!doAppend()) {
        window.setTimeout(() => doAppend(), 300);
    }
}

function showVersionInfo(): void {
    appendLocalLogLine(`[EBC] Version ${MOD_VERSION}`, UI.gold);
}

function showChangelog(): void {
    appendLocalLogLine(`[EBC] Version ${MOD_VERSION}`, UI.gold);
    for (const entry of CHANGELOG) {
        appendLocalLogLine(`[EBC] v${entry.version}`, UI.textMuted);
        for (const change of entry.changes) {
            appendLocalLogLine(`- ${change}`, UI.accent);
        }
    }
}

// Last non-Inactive arousal level, so toggling off → on restores it.
// Defaults to "Manual" if the setting was already Inactive at load time.
let lastArousalActive = "Manual";

function toggleArometerCommand(): void {
    try {
        const arousal = (Player as unknown as Record<string, unknown>).ArousalSettings as
            Record<string, unknown> | undefined;
        if (!arousal) {
            appendLocalLogLine("[EBC] Arousal settings unavailable.", UI.danger);
            return;
        }
        const current = arousal.Active as string | undefined;
        if (current && current !== "Inactive") lastArousalActive = current;

        const next = (current === "Inactive") ? lastArousalActive : "Inactive";
        arousal.Active = next;

        // Sync to server the same way the Preference screen does
        type AccountUpdater = { QueueData(data: Record<string, unknown>): void };
        const updater = (window as unknown as Record<string, unknown>).ServerAccountUpdate as
            AccountUpdater | undefined;
        updater?.QueueData({ ArousalSettings: arousal });

        const label = next === "Inactive" ? "OFF" : `ON (${next})`;
        appendLocalLogLine(`[EBC] Arousal meter: ${label}`, UI.gold);
    } catch (err) {
        appendLocalLogLine("[EBC] Failed to toggle arousal meter.", UI.danger);
        console.warn("[EBC] toggleArometerCommand error:", err);
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

    if (["ameter", "arousal", "lust"].includes(subcommand)) {
        toggleArometerCommand();
        return true;
    }

    if (["update", "checkupdate", "check"].includes(subcommand)) {
        checkUpdateManual().catch(() => {
            appendLocalLogLine("[EBC] Update check failed.", UI.danger);
        });
        return true;
    }

    if (subcommand === "updates") {
        const arg = (parts[2] || "").toLowerCase();
        if (arg === "off") {
            setUpdateNotify(false);
            appendLocalLogLine("[EBC] Update notifications disabled. Type /ebc updates on to re-enable.", UI.textMuted);
        } else if (arg === "on") {
            setUpdateNotify(true);
            appendLocalLogLine("[EBC] Update notifications enabled.", UI.gold);
        } else {
            const state = getUpdateNotify() ? "ON" : "OFF";
            appendLocalLogLine(`[EBC] Update notifications are currently ${state}. Use /ebc updates on or /ebc updates off.`, UI.gold);
        }
        return true;
    }


    appendLocalLogLine("[EBC] Commands: /ebc version  |  /ebc changelog  |  /ebc release  |  /ebc unlock  |  /ebc ameter  |  /ebc update  |  /ebc updates on/off  |  /ebc afk", UI.gold);
    return true;
}

// -- Update notification -------------------------------------------------------
// Fetches package.json from GitHub after a short delay, then every hour.
// Uses localStorage to avoid re-notifying for a version the user has already seen.

const EBC_PACKAGE_URL = "https://raw.githubusercontent.com/NekoEmery/EmeryBC/refs/heads/master/package.json";
const EBC_UPDATE_STORAGE_KEY = "EBC_NotifiedVersion";

function isNewerVersion(remote: string, local: string): boolean {
    const parse = (v: string): number[] =>
        v.replace(/[^0-9.]/g, "").split(".").map(n => parseInt(n, 10) || 0);
    const r = parse(remote);
    const l = parse(local);
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
        const rv = r[i] ?? 0, lv = l[i] ?? 0;
        if (rv > lv) return true;
        if (rv < lv) return false;
    }
    return false;
}

async function checkForUpdateFromGitHub(): Promise<void> {
    try {
        if (!getUpdateNotify()) return;
        const res = await fetch(`${EBC_PACKAGE_URL}?t=${Date.now()}`);
        if (!res.ok) return;
        const data = await res.json() as Record<string, unknown>;
        const remote = typeof data.version === "string" ? data.version : null;
        if (!remote) return;

        if (!isNewerVersion(remote, MOD_VERSION)) {
            // Already up to date — clear any stale localStorage entry
            try { localStorage.removeItem(EBC_UPDATE_STORAGE_KEY); } catch { /* ignore */ }
            return;
        }

        // Only notify once per remote version
        try {
            if (localStorage.getItem(EBC_UPDATE_STORAGE_KEY) === remote) return;
            localStorage.setItem(EBC_UPDATE_STORAGE_KEY, remote);
        } catch { /* localStorage unavailable — notify anyway */ }

        appendLocalLogLine(`[EBC] 🔔 Update available — v${remote} is out (you have v${MOD_VERSION}).`, UI.gold);
        appendLocalLogLine(`[EBC]    Refresh the page to get the latest version.`, UI.gold);
        appendLocalLogLine(`[EBC]    To silence these: /ebc updates off`, UI.textMuted);
    } catch { /* network error — ignore silently */ }
}

// Manual check triggered by /ebc update — always fetches, ignores notify toggle and dedup.
async function checkUpdateManual(): Promise<void> {
    appendLocalLogLine(`[EBC] Checking for updates…`, UI.textMuted);
    try {
        const res = await fetch(`${EBC_PACKAGE_URL}?t=${Date.now()}`);
        if (!res.ok) {
            appendLocalLogLine(`[EBC] Could not reach GitHub to check for updates.`, UI.danger);
            return;
        }
        const data = await res.json() as Record<string, unknown>;
        const remote = typeof data.version === "string" ? data.version : null;
        if (!remote) {
            appendLocalLogLine(`[EBC] Received an unexpected response from GitHub.`, UI.danger);
            return;
        }

        if (!isNewerVersion(remote, MOD_VERSION)) {
            appendLocalLogLine(`[EBC] ✔ Up to date — you are on v${MOD_VERSION}, latest is v${remote}.`, UI.gold);
            return;
        }

        // Update available
        try { localStorage.setItem(EBC_UPDATE_STORAGE_KEY, remote); } catch { /* ignore */ }
        appendLocalLogLine(`[EBC] 🔔 Update available! v${remote} is out (you have v${MOD_VERSION}).`, UI.gold);
        appendLocalLogLine(`[EBC]    Refresh the page to load the latest version.`, UI.gold);
        appendLocalLogLine(`[EBC]    To silence auto-notifications: /ebc updates off`, UI.textMuted);
    } catch {
        appendLocalLogLine(`[EBC] Network error while checking for updates.`, UI.danger);
    }
}

function startUpdateChecker(): void {
    // First check after 30s so the game is fully loaded before we hit the network
    window.setTimeout(() => { checkForUpdateFromGitHub().catch(() => {}); }, 30_000);
    // Then every hour
    window.setInterval(() => { checkForUpdateFromGitHub().catch(() => {}); }, 3_600_000);
}

interface EmeryPresence {
    version: string;
    marker: string;
    isDev?: boolean;
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

// Cooldown so rapid ChatRoomSync bursts don't spam AccountUpdate.
let lastPresenceSyncTime = 0;
const PRESENCE_SYNC_COOLDOWN_MS = 6_000; // 6 s between sends

function syncPresenceMarker(): void {
    const shared = (Player.OnlineSharedSettings ??= {});

    // Always broadcast presence regardless of local display toggle —
    // the toggle only controls what YOU see, not what others see.
    const presence: EmeryPresence = { version: MOD_VERSION, marker: "EBC", ...(IS_DEV_BUILD ? { isDev: true } : {}) };

    // Write to ExtensionSettings only if presence isn't already recorded —
    // avoids a redundant ServerPlayerExtensionSettingsSync on every room join.
    const settings = getAddonSettings(Player, true);
    if (settings) {
        const alreadyStored = settings.presence?.version === MOD_VERSION
            && settings.presence?.isDev === (IS_DEV_BUILD ? true : undefined);
        if (!alreadyStored) {
            settings.presence = presence;
            ServerPlayerExtensionSettingsSync(MOD_NAME);
        }
    }

    // Always keep OnlineSharedSettings populated — BC includes it in the room-join
    // packet so other players see your badge immediately when you enter. Without this,
    // the join packet has empty OnlineSharedSettings and nobody sees the badge until
    // a follow-up AccountUpdate arrives.
    shared[MOD_NAME] = { presence };

    // Send AccountUpdate to notify people already in the room. Only meaningful in a
    // ChatRoom, and rate-limited to once every 6 s to prevent spam on rapid syncs.
    if (CurrentScreen !== "ChatRoom") return;
    const now = Date.now();
    if (now - lastPresenceSyncTime < PRESENCE_SYNC_COOLDOWN_MS) return;
    lastPresenceSyncTime = now;
    ServerSend("AccountUpdate", { OnlineSharedSettings: shared });
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
    const showVer  = getShowVersionBadge();
    // For self, always use the live MOD_VERSION — cached presence may be stale.
    const verStr   = isSelf ? MOD_VERSION : (presence?.version ?? "?");
    const isDevUser = isSelf ? IS_DEV_BUILD : (presence?.isDev === true);
    const label = isDevUser
        ? (showVer ? "dev | v" + verStr : "dev | EBC")
        : (showVer ? "v" + verStr : "EBC");

    // Hide in map/bird's-eye view (very low zoom). Crowded rooms reduce zoom too
    // but stay well above 0.3, so only skip true map-view zoom.
    if (zoom < 0.3) return;

    const isDevLabel = isDevUser;
    const width  = isDevLabel
        ? (showVer ? Math.max(70, 78 * zoom) : Math.max(52, 58 * zoom))
        : (showVer ? Math.max(44, 50 * zoom) : Math.max(30, 34 * zoom));
    const height = Math.max(12, 14 * zoom);

    const x = left + 197 * zoom;
    const y = top + 26 * zoom;
    const badgeLeft = x - width / 2;
    const badgeTop = y - height / 2;

    DrawRect(badgeLeft, badgeTop, width, height, UI.cardMuted);
    DrawEmptyRect(badgeLeft, badgeTop, width, height, UI.panelEdge, 1);
    DrawTextFit(label, badgeLeft + width / 2, badgeTop + height / 2 + 1, width - 4, UI.accent);
}

function showRoomLoadNotice(): void {
    if (noticeShown) return;
    noticeShown = true;
    appendLocalLogLine(`- EBC v${MOD_VERSION} loaded successfully.`);
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

    // Seed the arousal restore-target with whatever the player has set right now
    try {
        const arousal = (Player as unknown as Record<string, unknown>).ArousalSettings as
            Record<string, unknown> | undefined;
        const active = arousal?.Active as string | undefined;
        if (active && active !== "Inactive") lastArousalActive = active;
    } catch { /* ignore */ }

    // Canvas sidebar action buttons
    modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
        next(args);
        try { drawActionButtons(); } catch { /* ignore */ }
    });

    modAPI.hookFunction("ChatRoomClick", 3, (args, next) => {
        try { if (handleActionButtonClick()) return; } catch { /* ignore */ }
        return next(args);
    });

    // Attach hold-to-drag for the grip handle (mousedown/touchstart on canvas)
    try { initDragListener(); } catch { /* ignore */ }

    // DOM drawer - outfit switcher panel beside the chat log
    let drawer: EBCDrawer | null = null;
    try {
        drawer = new EBCDrawer(MOD_VERSION, IS_DEV_BUILD);
        // Fire an initial visibility check in case the addon loads while the
        // player is already in a chat room (ChatRoomSync won't fire again).
        window.setTimeout(() => { try { drawer?.updateVisibility(); } catch { /* ignore */ } }, 400);
        // Bootstrap room history in case the addon loaded while already in a room
        // (ChatRoomSync won't fire again so we seed the current visit manually).
        window.setTimeout(() => { try { onRoomSync(); detectNewJoins(); } catch { /* ignore */ } }, 600);
    } catch (err) {
        console.warn("[EBC] Drawer failed to initialise:", err);
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
        try { snapshotForLog();             } catch { /* ignore */ }
        try { onRoomSync(args[0] as Record<string, unknown>); } catch { /* ignore */ }
        try { detectNewJoins();             } catch { /* ignore */ }
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
                // Also stash the name for the restraint log — it flushes any
                // pending additions that are waiting on the applier name.
                try { setPendingLogApplier(getLastRestrainerName() ?? `#${sourceNum}`, sourceNum); } catch { /* ignore */ }
            }
        } catch { /* ignore */ }
        return result;
    });

    // Capture raw server-format character bundles for offline profile viewing.
    // CRITICAL: bundles must be deep-copied BEFORE calling next(args) — BC's ChatRoomSync
    // mutates the character objects in place (converts string IDs to integers, replaces raw
    // Appearance arrays with loaded Asset objects). Capturing after next() gives corrupted data.
    // Mirrors WCE's saveProfile approach exactly.
    tryHookFunction(modAPI, "ChatRoomSync", 11, (args, next) => {
        try {
            const [data] = args as [Record<string, unknown>];
            const chars = data?.Character;
            if (Array.isArray(chars)) {
                for (const c of chars as Record<string, unknown>[]) {
                    const num = typeof c?.MemberNumber === "number" ? c.MemberNumber : 0;
                    // Deep-copy via JSON before BC mutates the objects
                    if (num && num !== Player.MemberNumber) {
                        try { storeRawBundle(JSON.parse(JSON.stringify(c))); } catch { /* ignore */ }
                    }
                }
            }
        } catch { /* ignore */ }
        return next(args);
    });
    tryHookFunction(modAPI, "ChatRoomSyncSingle", 11, (args, next) => {
        try {
            const [data] = args as [Record<string, unknown>];
            const c = data?.Character as Record<string, unknown> | undefined;
            const num = typeof c?.MemberNumber === "number" ? c.MemberNumber : 0;
            if (num && num !== Player.MemberNumber) {
                try { storeRawBundle(JSON.parse(JSON.stringify(c))); } catch { /* ignore */ }
            }
        } catch { /* ignore */ }
        return next(args);
    });
    tryHookFunction(modAPI, "ChatRoomSyncMemberJoin", 11, (args, next) => {
        try {
            const [data] = args as [Record<string, unknown>];
            const c = data?.Character as Record<string, unknown> | undefined;
            const num = typeof c?.MemberNumber === "number" ? c.MemberNumber : 0;
            if (num && num !== Player.MemberNumber) {
                try { storeRawBundle(JSON.parse(JSON.stringify(c))); } catch { /* ignore */ }
            }
        } catch { /* ignore */ }
        return next(args);
    });

    // Anti-restraint + grace period: detect new restraints on the player after any refresh
    // Also record every non-player character we see as a "person met".
    tryHookFunction(modAPI, "CharacterRefresh", 3, (args, next) => {
        const result = next(args);
        try {
            const [C] = args as [Character];
            if (C === Player) {
                checkGraceExpiry();
                enforceGracePeriod();
                // Detect restraint changes — applier name is resolved asynchronously
                // via setPendingLogApplier when the Action message arrives.
                try { checkRestraintChanges(); } catch { /* ignore */ }
                antiRestraintOnPlayerRefresh();
            } else if (C?.MemberNumber != null && C.MemberNumber !== Player.MemberNumber) {
                // Record this person in the persistent "people met" list
                try {
                    const displayName = (C as unknown as Record<string, unknown>).Nickname as string | undefined;
                    const name = (displayName?.trim()) || (C.Name ?? "") || String(C.MemberNumber);
                    recordPersonMet(C.MemberNumber, name);
                } catch { /* ignore */ }
            }
        } catch { /* ignore */ }
        return result;
    });

    // Keep drawer visibility in sync whenever the BC screen changes.
    // Do NOT reset room timers here — transient screens (wardrobe, preferences, etc.)
    // temporarily leave ChatRoom but the player hasn't actually left the room.
    tryHookFunction(modAPI, "CommonSetScreen", 3, (args, next) => {
        const result = next(args);
        try { drawer?.updateVisibility(); } catch { /* ignore */ }
        return result;
    });

    // Only reset room timers when the player actually leaves the chatroom.
    tryHookFunction(modAPI, "ChatRoomLeave", 3, (args, next) => {
        const result = next(args);
        try { timerOnRoomLeave(); } catch { /* ignore */ }
        try { onRoomLeave();     } catch { /* ignore */ }
        return result;
    });

    // Track member joins for room history.
    // BC may pass the character directly as data, or wrapped as data.Character —
    // handle both shapes to be safe across BC versions.
    tryHookFunction(modAPI, "ChatRoomSyncMemberJoin", 3, (args, next) => {
        const result = next(args);
        try {
            const [data] = args as [Record<string, unknown>];
            const char = (data.Character ?? data) as { MemberNumber?: number; Nickname?: string; Name?: string };
            if (char.MemberNumber) onMemberJoin(char);
            try { detectNewJoins(); } catch { /* ignore */ }
        } catch { /* ignore */ }
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
            if (!fromNum) return next(args);
            const name = typeof beep.MemberName === "string" ? beep.MemberName : null;
            if (name) cacheName(fromNum, name);

            // Non-friend beeps (addon bots, update notices, etc.) always pass through
            // to BC's native handler so they stay visible regardless of suppress setting.
            const friendList = (Player.FriendList as number[] | undefined) ?? [];
            const isFriendBeep = friendList.includes(fromNum);

            // AFK auto-reply — runs for all plain beeps before any early-return
            try {
                if (isFriendBeep && getAfkEnabled()
                    && Date.now() - lastActivityTime >= getAfkThreshold() * 1000
                    && Date.now() - (afkBeepCooldown.get(fromNum) ?? 0) > AFK_REPLY_COOLDOWN_MS) {
                    afkBeepCooldown.set(fromNum, Date.now());
                    const replyMsg = `[AFK] ${getAfkMessage()}`;
                    ServerSend("AccountBeep", { MemberNumber: fromNum, Message: replyMsg, BeepType: "" });
                    addBeepEntry({ from: Player.MemberNumber ?? 0, to: fromNum, message: replyMsg, ts: Date.now() });
                    const senderLabel = (typeof beep.MemberName === "string" && beep.MemberName) ? beep.MemberName : String(fromNum);
                    appendLocalLogLine(`[AFK] Replied to ${senderLabel}`, UI.gold);
                    try { drawer?.refreshBeepWindow(fromNum); } catch { /* ignore */ }
                }
            } catch { /* ignore */ }

            if (!isFriendBeep) return next(args);

            // Strip metadata and add to IM — isolated in its own try so any
            // exception here can never cause fall-through to return next(args).
            try {
                const msg = stripBeepMetadata(typeof beep.Message === "string" ? beep.Message : "");
                if (msg) {
                    addBeepEntry({ from: fromNum, to: Player.MemberNumber ?? 0, message: msg, ts: Date.now() });
                    if (!getBeepMuted()) { try { playBeepSound(); } catch { /* ignore */ } }
                    try { drawer?.onIncomingBeep(fromNum); } catch { /* ignore */ }
                }
            } catch { /* ignore */ }

            // Suppress BC's native chat-log notification for ALL friend beeps when
            // the toggle is on. document.hidden is intentionally NOT checked here —
            // OS-level notifications come through FriendListBeep, not this path.
            if (getSuppressNativeBeep()) return;
        } catch { /* ignore */ }
        return next(args);
    });


    // Cache friend names whenever BC notifies us a friend came online.
    // FriendListBeep is a real BC global called with {MemberNumber, MemberName, ...}.
    // We also call syncFriendsSince() here so newly added friends are stamped as soon
    // as they come online (covers the gap before the next AccountQueryResult fires).
    tryHookFunction(modAPI, "FriendListBeep", 1, (args, next) => {
        try {
            const [data] = args as [Record<string, unknown>];
            const num = typeof data.MemberNumber === "number" ? data.MemberNumber : 0;
            const name = typeof data.MemberName === "string" ? data.MemberName : null;
            if (num && name) cacheName(num, name);
            try { syncFriendsSince(); } catch { /* ignore */ }
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
                try { syncFriendsSince(); } catch { /* ignore */ }
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

    // Track user activity for AFK detection
    document.addEventListener("keydown", () => { lastActivityTime = Date.now(); }, true);
    document.addEventListener("mousedown", () => { lastActivityTime = Date.now(); }, true);

    const onChatKeydownCapture = (e: KeyboardEvent): void => {
        try {
            if (e.key !== "Enter" && e.keyCode !== 13) return;
            const el = (e.target ?? document.activeElement) as HTMLElement | null;
            if (!el || (el as HTMLInputElement).id !== "InputChat") return;
            const raw = (el as HTMLInputElement).value;
            if (!raw.trim()) return;
            if (checkSafeword(raw)
                || handleMetaCommand(raw)
                || handleRestraintCommand(raw, (msg, cb) => showConfirmOverlay(msg, "Cancel", "Apply", cb))
                || handleOutfitCommand(raw, (msg, cb) => showConfirmOverlay(msg, "Cancel", "Apply", cb))
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
                    || handleRestraintCommand(input.value, (msg, cb) => showConfirmOverlay(msg, "Cancel", "Apply", cb))
                    || handleOutfitCommand(input.value, (msg, cb) => showConfirmOverlay(msg, "Cancel", "Apply", cb))
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
                || handleRestraintCommand(raw, (msg, cb) => showConfirmOverlay(msg, "Cancel", "Apply", cb))
                || handleOutfitCommand(raw, (msg, cb) => showConfirmOverlay(msg, "Cancel", "Apply", cb))
                || handlePoseComboCommand(raw)
                || handleSceneCommand(raw)
                || handleDomCommand(raw)
                || handleEmoteShortcut(raw)
            )) {
                if (input) input.value = "";
                return;
            }
            // OOC mode: prepend "(" to normal messages.
            // Skip commands (/), emotes (*), and already-OOC messages (().
            if (input && getOocEnabled()) {
                const v = input.value;
                if (v.trim() && !v.startsWith("/") && !v.startsWith("*") && !v.startsWith("(")) {
                    input.value = "(" + v;
                }
            }
        } catch { /* ignore */ }
        return next(args);
    });

    try {
        syncPresenceMarker();
    } catch {
        // Ignore early sync failures.
    }

    startUpdateChecker();
    console.log(`[${MOD_NAME}] v${MOD_VERSION} loaded`);
}

const readyInterval = setInterval(() => {
    if (typeof bcModSDK !== "undefined") {
        clearInterval(readyInterval);
        init();
    }
}, 100);
