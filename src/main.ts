import { EBCDrawer, showConfirmOverlay } from "./modules/drawer";
import { drawActionButtons, handleActionButtonClick, initDragListener } from "./modules/actionButtons";
import { handleOutfitCommand, handleRestraintCommand, RESTRAINT_GROUPS } from "./modules/outfitManager";
import { addWhisperEntry } from "./modules/whisperLog";
import { handlePoseComboCommand } from "./modules/poses";
import { handleSceneCommand } from "./modules/scenes";
import { handleDomCommand } from "./modules/domTools";
import { releaseRestraints, unlockItems } from "./modules/restraints";
import { getBadgeEnabled, getShowVersionBadge, getShowOthersBadge, getActionButtonsVisible, getBeepMuted, getSuppressNativeBeep, getUpdateNotify, setUpdateNotify, getAfkEnabled, getAfkThreshold, getAfkMessage, getOocEnabled, recordPersonMet } from "./modules/settings";
import { antiRestraintOnPlayerRefresh, snapshotPlayerRestraints, recordRestrainer, getLastRestrainerName } from "./modules/antiRestraint";
import { onRoomSync, onRoomLeave, onMemberJoin, detectNewJoins } from "./modules/roomHistory";
import { snapshotForLog, checkRestraintChanges, setPendingLogApplier } from "./modules/restraintLog";
import { timerOnRoomEnter, timerOnRoomLeave, timerCheckRestraints } from "./modules/timer";
import { logMessage } from "./modules/devLog";
import { UI } from "./modules/ui";
import { addBeepEntry, cacheName, cacheEBCVersion, updateOnlineFriends, stripBeepMetadata, syncFriendsSince, storeRawBundle } from "./modules/friends";
import { migrateLocalStorageBundles, evictOldBundles } from "./modules/db";
import { checkSafeword, enforceGracePeriod, checkGraceExpiry } from "./modules/safeword";
import { callBC } from "./modules/bcUtils";
import { checkExpressionTriggers } from "./modules/expressions";
import { LUCY_MEMBER, parseKittyCmd, type KittyItem } from "./modules/kitty";
import bcModSdk from "bondage-club-mod-sdk";

const MOD_NAME = "EBC";
const MOD_VERSION = "2.7.5";
const IS_DEV_BUILD = true; // true on dev branch, false on master

let noticeShown = false;

// Members already recorded in "people met" this session — avoids redundant server syncs
// on repeated CharacterRefresh calls for the same person in a large room.
const seenThisSession = new Set<number>();

// -- AFK auto-reply state -------------------------------------------------------
let lastActivityTime = Date.now();
const afkBeepCooldown = new Map<number, number>(); // memberNumber → last beep-reply ts
const AFK_REPLY_COOLDOWN_MS = 30 * 60 * 1000;
const CHANGELOG: Array<{ version: string; changes: string[] }> = [
    {
        version: "2.7.5",
        changes: [
            "UX: EBC Tag Toggles strip — improved readability: description and card sub-text colours brightened significantly; collapse hint changed to explicit 'Hide ▼' / 'Show ▶' pill so it's obvious the header is clickable; header gains a subtle hover tint.",
        ],
    },
    {
        version: "2.7.4",
        changes: [
            "UX: EBC Tag Toggles strip redesigned as card-style toggles — each toggle is now a card showing icon, label, sub-description, and a coloured ON/OFF pill. Added a description line explaining the toggles only affect your own screen.",
        ],
    },
    {
        version: "2.5.23",
        changes: [
            "Removed: Face Presets section from the Buttons tab — will be reworked and re-added later.",
        ],
    },
    {
        version: "2.5.22",
        changes: [
            "UX: EBC Tag Toggles strip redesigned — now has a collapsible header ('EBC Tag Toggles' with ▼/▶ chevron), buttons are centered and larger (font 11px, more padding), collapses state saved to localStorage. Open by default.",
        ],
    },
    {
        version: "2.5.21",
        changes: [
            "UX: Face Presets moved out of the active button category body and into its own standalone accordion section in the Buttons tab — sits below '+ Add Category' with purple-toned styling to distinguish it from user categories.",
            "Fix: Relaxed arm pose button now correctly clears all arm poses regardless of body pose state. Previously it only kept poses explicitly listed in the Body group, which could leave stale arm poses in some edge cases.",
        ],
    },
    {
        version: "2.5.20",
        changes: [
            "UX: EBC tag toggles redesigned — each is now a single self-labelled button ('👤 My tag: ON/OFF' and '👥 Others: ON/OFF') with a tooltip explaining what it controls. No more separate label+toggle pairs.",
            "Removed: pin system (the 📌 tab pin icons and pinned widget panels) — removed as unnecessary.",
        ],
    },
    {
        version: "2.5.19",
        changes: [
            "UX: EBC tag toggles ('My tag' / 'Others') moved to a permanent strip just below the safewords section — always visible on every tab, no need to go to DEV tab to find them.",
            "Fix: 'My EBC tag' toggle is now purely client-side (controls whether YOU see it above your own head). Broadcasting to others is always on regardless. Previously toggling it off also hid your tag from everyone else.",
        ],
    },
    {
        version: "2.5.19",
        changes: [
            "UX: Buttons tab sidebar toggle restyled — removed heavy bordered box; now renders as a slim inline row with a subtle separator line so the tab feels less cramped.",
        ],
    },
    {
        version: "2.5.17",
        changes: [
            "Feature: 'Show quick-emote sidebar buttons' toggle restored to the top of the BUTTONS tab. Turning it OFF hides the canvas sidebar completely; turning it ON brings it back. Setting persists across sessions.",
        ],
    },
    {
        version: "2.5.16",
        changes: [
            "i18n: translate footer — 'UI inspired by CRABS by Sin' line and Online/Room/Bound timer labels.",
            "i18n: translate 'New tag name' placeholder in outfit tag manager, 'No whispers this session yet.' in the Whisper Log, and all five credited people's bio descriptions in the Credits tab.",
            "Fix: German 'Whisper Log' changed from 'Flüsterprotokoll' → 'Flüster-Log' and 'Dev Log' from 'Entwicklungsprotokoll' → 'Entwickler-Log' to match the '-Log' convention used by the other languages.",
        ],
    },
    {
        version: "2.5.15",
        changes: [
            "i18n: translate remaining hardcoded strings — Credits tab (Special Thanks header, intro text); DEV tab section headers (DRAWER PREFERENCES, EBC USERS IN THIS ROOM, DEVELOPER TOOLS, COPY RESTRAINTS FROM MEMBER, STAT EDITOR, PEOPLE MET).",
            "Feature: EBC tag toggle split into two independent controls — 'My EBC tag (visible to others)' controls whether your presence is broadcast; 'Others' EBC tags (on your screen)' controls whether others' tags are rendered on your client. Previously one toggle controlled both.",
            "UX: EBC Tags panel given its own named section header (🏷 EBC TAGS) so it's easy to find at the top of the DEV tab.",
        ],
    },
    {
        version: "2.5.14",
        changes: [
            "i18n: translate remaining hardcoded strings — Buttons tab (Fun Actions, Useful Buttons, OOC Mode on/off, Copy My Member Number, Reset to Default Pose, boop feedback); Anims tab (pose hint, SCENES header, scenes hint); Outfits tab (PROTECTED ITEMS, COLOURS (n saved), Tags (n saved), no saved colours hint).",
            "UX: language pill row is now centered with larger pills (11px font, more padding) and uses flex-wrap so all five fit even at narrow widths. Globe icon removed for cleaner look.",
            "UX: panel width widened from 360px to 390px so the header buttons (refresh / drag / reset pos / close) never overflow.",
        ],
    },
    {
        version: "2.5.13",
        changes: [
            "Fix: panel header no longer overflows its container — .ebc-title gets min-width:0/overflow:hidden/text-overflow:ellipsis; .ebc-header-btns gets flex-shrink:0 so the close button can't be pushed off-screen.",
            "Fix: free-float drag bounds now use panelEl.offsetWidth/offsetHeight instead of a hardcoded 50px margin, so the panel's right/bottom edge stays fully inside the viewport.",
            "Fix: saved panel position is now clamped to the current viewport on restore, so a position saved on a larger screen doesn't put the panel off-screen on a smaller one.",
        ],
    },
    {
        version: "2.5.12",
        changes: [
            "Fix: language switcher moved out of the cramped header buttons row into its own pill-button row between the tab bar and quick-actions bar — 🌐 + one pill per language, active one highlighted pink.",
            "Fix: header drag handler now also guards against select/input/a elements (not just button) so interactive elements inside the header receive their clicks correctly.",
        ],
    },
    {
        version: "2.5.11",
        changes: [
            "i18n (continued): wire remaining static strings — 'People in Room', 'Friends', 'Auto-reply when AFK' labels; slow-leave sequence hint tooltip; pose combos section header; scene/combo save-changes buttons; outfit/restraint command placeholders; add new users.peopleInRoom / users.friends / users.autoReplyWhenAfk keys to translation table.",
        ],
    },
    {
        version: "2.5.10",
        changes: [
            "i18n: replace remaining hardcoded English strings in the drawer with t() calls — covers dev/whisper/message log section headers and clear buttons, QA/DOM rescue panel, settings labels (idle threshold, default nickname/title), users tab (pin, friends-since, reply, message placeholder), palettes section, colour presets label, anims addStep/newPresetName, + Add buttons throughout, and core.yes/core.enable in overlays.",
        ],
    },
    {
        version: "2.5.9",
        changes: [
            "Fix: ↗ Pull Dictionary now includes { ActivityName: '拉到身边' } as required by BC's message pipeline. BC populates metadata.ActivityName from this entry; echo-activity-ext's pullActivityInfo() returns undefined when it's absent, silently skipping the run() handler. This was the root cause of pull-to-side never working despite correct SourceCharacter/TargetCharacter entries.",
        ],
    },
    {
        version: "2.5.8",
        changes: [
            "Fix: leash hold/release button now tracks state in a class-level flag instead of ChatRoomLeashList, which is only updated on the target's client (Emery's) — not Lucy's. Button label and pull-button guard now stay in sync correctly.",
            "Fix: ↗ Pull Dictionary entries corrected from Tag-based { Tag: 'SourceCharacter', MemberNumber: N } to direct-property { SourceCharacter: N } — BC's type guards check for the property directly, so the Tag format was silently ignored by echo-activity-ext's activity manager.",
        ],
    },
    {
        version: "2.5.7",
        changes: [
            "UX: Face Presets name input and Save face button are now stacked (name field full-width above, button below) instead of side-by-side.",
        ],
    },
    {
        version: "2.5.6",
        changes: [
            "Fix: expression/exprPreset migration now also clears the label and disables the slot so migrated buttons (e.g. 'eep') no longer appear in the sidebar.",
        ],
    },
    {
        version: "2.5.5",
        changes: [
            "Remove: Expression and Face-Preset button types removed from action buttons. Any saved buttons of those types are automatically migrated to plain action slots with empty emote text so they can be reconfigured or deleted.",
        ],
    },
    {
        version: "2.5.4",
        changes: [
            "Fix: ↗ Pull button now correctly provides SourceCharacter and TargetCharacter Dictionary entries so echo-activity-ext's run() handler can identify both sides of the pull. Previously the Dictionary only contained FocusAssetGroup, causing both MemberNumber checks to fail silently — Emery received the Activity message but didn't move.",
        ],
    },
    {
        version: "2.5.3",
        changes: [
            "Kitty: ↗ Pull button added to the leash row. Sends echo-activity-ext's '拉到身边' (Pull to One's Side) Activity message — if both clients have echo-activity-ext installed it pairs Emery to Lucy's side and establishes the follow relationship. Requires the leash to be held first; shows a tooltip if not.",
        ],
    },
    {
        version: "2.5.2",
        changes: [
            "Remove: per-group expression chip rows (Blush/Emoticon/Eyebrows/etc.) are gone from FACE PRESETS — just save with BC's emote menu.",
            "Add: quick-apply dropdown in FACE PRESETS (pick a face from the list and hit ✓ Apply) replaces having to scroll to each row.",
            "Revert: button slot style selector restored to the classic () / ** toggle button for action/emote buttons. Seq buttons show a ✨ sequence badge. Expression preset and single-expr buttons still show their relevant dropdowns.",
        ],
    },
    {
        version: "2.5.1",
        changes: [
            "UX: Expression slot editor reworked. 🎭 expr buttons now show two dropdowns (group picker + expression variant picker) instead of a raw 'Group:ExprName' text field. 🎭 preset buttons now show a ♾ keep / 3s / 5s / 10s / 30s / 1min dropdown instead of a bare number input.",
            "UX: New face preset buttons added via → now default to ♾ keep (no auto-revert) instead of 5 s.",
            "UX: Preset names in the FACE PRESETS list are now inline-editable — click the name to rename without having to delete and recreate.",
            "UX: Trigger form duration replaced with same ♾ / time dropdown for consistency.",
        ],
    },
    {
        version: "2.5.0",
        changes: [
            "Fix: 'Save face' now reliably captures the face you built in BC. Previously, captureCurrentExpression relied solely on Property.Expression which BC doesn't always set — it now uses Asset.Name as a fallback so whatever expressions BC shows on your character are correctly saved.",
            "UX: FACE PRESETS save row now shows a live 'Now: …' preview of all currently active expressions so you can confirm the face before clicking 💾 Save face.",
        ],
    },
    {
        version: "2.4.9",
        changes: [
            "Fix: expression buttons (🎭 preset / 🎭 expr) now correctly apply. Root cause: CharacterSetFacialExpression was called with null for the optional Timer argument which some BC builds treat as '0 ms' and immediately clear the expression. Now called without optional args. Fallback path also fixed: tries InventoryWear first, then falls back to manual Appearance splice; both now correctly set Property.Expression so preset capture works.",
            "Fix: sidebar 🎭 preset buttons now show a local notice if clicked with no preset configured, instead of silently doing nothing.",
            "UX: FACE PRESETS section now starts expanded by default so the expression chips are immediately visible when you open the BUTTONS tab.",
        ],
    },
    {
        version: "2.4.8",
        changes: [
            "FACE PRESETS section moved inside the active button category accordion — it now sits at the bottom of the category content alongside the button slots, export/import, etc. Everything expression-related is in one place inside the BUTTONS tab.",
        ],
    },
    {
        version: "2.4.7",
        changes: [
            "Remove: the separate FACE tab is gone. Expression presets now live in a collapsible 'FACE PRESETS' section at the top of the BUTTONS tab — click the expression chips to compose a face, name it, hit Save face, then set any button slot's style dropdown to 🎭 preset and pick it.",
        ],
    },
    {
        version: "2.4.6",
        changes: [
            "Remove: the standalone EXPRESSIONS collapsible section in the BUTTONS tab is gone. Use the style dropdown on any existing slot instead — pick '🎭 preset' or '🎭 expr' directly on NOD, SHAKE, or any other button.",
        ],
    },
    {
        version: "2.4.5",
        changes: [
            "BUTTONS tab: each slot now has a compact style dropdown replacing the old ( )/( * ) toggle. Options are ( ) action, * * emote, 🎭 preset (full-face expression preset), 🎭 expr (single expression group), ✨ seq. You can now set any existing button — including NOD, SHAKE, etc. — to apply an expression or full-face preset directly from the slot editor.",
        ],
    },
    {
        version: "2.4.4",
        changes: [
            "Fix: the EXPRESSIONS collapsible section in the BUTTONS tab now shows all currently-added expression and preset buttons at the top with a × remove button on each. Click × to clear the slot and free it up — the add-chips below still work as before.",
        ],
    },
    {
        version: "2.4.3",
        changes: [
            "Expression presets: default face — mark one preset with ★ to designate it as your default face. Timed expressions and triggers revert to it automatically.",
            "Expression presets → sidebar buttons: each preset in the FACE tab has a → button that pins it as a full-face quick-key in the active sidebar category. The slot editor in the BUTTONS tab shows a preset picker and a 'revert after N seconds' field for these buttons. Default revert is 5 s.",
            "Expression triggers: new collapsible TRIGGERS section at the bottom of the FACE tab. Define a match text (e.g. 'whimpers') and a preset — whenever you send a chat message containing that text (case-insensitive), the preset is applied and reverts to your default face after the set duration. First matching trigger per message fires.",
        ],
    },
    {
        version: "2.4.2",
        changes: [
            "Remove: login outfit feature removed. The '👢 Login outfit' toggle chip and automatic startup outfit application have been removed. Use /outfit commands directly if you want a specific outfit on load.",
            "Fix: facial expressions now correctly detect the active expression. BC stores expression variants in item.Property.Expression, not item.Asset.Name — the FACE tab chips now highlight the right active option, and preset capture now saves the correct expression names instead of the group base asset name.",
            "Whisper log moved to DEV tab: the standalone 💬 tab is gone. Whisper history is now a collapsible 'WHISPER LOG' section inside the DEV tab — same partner-list + conversation view, just tucked away.",
            "Expressions in BUTTONS tab: the BUTTONS tab now has a collapsible 'EXPRESSIONS' section at the bottom. Click any expression chip to instantly add it as an 'expression' style sidebar button in the active category. Expression buttons apply the facial expression directly — no chat message sent. Label and colour are fully editable after adding.",
        ],
    },
    {
        version: "2.4.1",
        changes: [
            "Fix: debounced all ServerPlayerExtensionSettingsSync(\"EmeryBC\") calls across every EBC module (56 call-sites in 14 files). Rapid back-to-back changes (toggling multiple outfit flags, changing settings, saving presets) now coalesce into a single server request 400 ms after the last change instead of firing one per click — directly reduces the 429 Too Many Requests rate.",
            "Fix: debounced the appearance broadcast (ChatRoomCharacterUpdate + ServerPlayerAppearanceSync) in the expression quickbar. Clicking multiple expression chips in quick succession now sends only one room-sync after the burst, not one per chip.",
            "Kitty: added cooldowns to all action pill buttons — 1500 ms for emotes and poses, 2000 ms for punishments, 1000 ms for arousal presets. Prevents accidental double-fires and gives visual feedback that the click registered.",
        ],
    },
    {
        version: "2.4.0",
        changes: [
            "Whisper log: new 💬 tab in the drawer captures all room whispers for the current session. Incoming and outgoing whispers are stored separately per conversation partner. Click a partner to view your chat history with them. Messages are colour-coded by direction. Log clears on page reload (session-only). 'Clear' button wipes the log manually.",
        ],
    },
    {
        version: "2.3.9",
        changes: [
            "Expression quickbar: new FACE tab in the drawer. Shows clickable chips for every BC facial expression grouped by category (Blush, Emoticon, Eyebrows, Eyes L, Eyes R, Mouth, Tears). The active expression per group is highlighted — click it again to clear. Save the current full face as a named preset and re-apply it with one click. 'Clear all expressions' button resets every group at once.",
        ],
    },
    {
        version: "2.3.8",
        changes: [
            "Login outfit: any outfit can now be marked as the login outfit via the '👢 Login outfit' toggle chip in the outfit list. When the addon loads, that outfit is automatically applied after a short delay so BC's appearance system is fully ready. Only one outfit can be the login outfit at a time — toggling a new one automatically clears the previous selection.",
        ],
    },
    {
        version: "2.3.7",
        changes: [
            "Fix: quick emote sidebar buttons are broken in the new BC version. BC deprecated ChatRoomMenuDraw as a canvas draw function (migrated to DOM); EBC's hook on it no longer fired. Now hooks DrawProcess — the actual per-frame draw function — so buttons render every frame regardless of BC version.",
            "Fix: EBC version badge continued showing above players who had disabled the addon. The presence check fell back to ExtensionSettings which persists indefinitely. Removed the fallback — only OnlineSharedSettings (the live broadcast state) is now checked, so disabling the addon immediately clears the badge.",
            "Fix: Remove Restraints was not removing gags in the ItemMouth2 and ItemMouth3 slots (BC's layered mouth groups). Only ItemMouth and ItemMouthAccessory were in RESTRAINT_GROUPS; gag items like the Futuristic Muzzle that live in the layered slots were skipped.",
        ],
    },
    {
        version: "2.3.6",
        changes: [
            "Fix: beeps sent via BC's native UI (the /beep command, the friend-list beep button, or the chat-room beep reply arrow) now appear in EBC's IM window. Previously only beeps sent through EBC's own interface were recorded; native BC beeps went through ServerSendBeepMessage which EBC never saw.",
        ],
    },
    {
        version: "2.3.5",
        changes: [
            "Kitty Leash: removed tug and untug buttons. The leash section now has only a single Grab / Let Go toggle button.",
        ],
    },
    {
        version: "2.3.4",
        changes: [
            "Fix: beep room name now actually works. The previous fix (v2.2.116) sent ChatRoomName from the client, but the BC server ignores that — it derives the room from the sender's session. The correct flag is IsSecret: false, which tells the server to attach the sender's current room to the delivered beep. Recipients now see 'in room X' with a join button.",
        ],
    },
    {
        version: "2.3.3",
        changes: [
            "Kitty Leash: ↙ Untug now fires BC's native LoosenLittle activity on ItemNeck on every single click — same event as the in-game 'Loosen → A little' collar button. The tug counter still decrements for emote purposes but the activity fires every time regardless, so clicking repeatedly keeps loosening the collar further.",
        ],
    },
    {
        version: "2.3.2",
        changes: [
            "Kitty Leash: ↙ Untug now fully resets all tug steps in one click (previously only decremented by 1 per click) and fires Caress + LSCG_ReleaseNeck on ItemNeck to actually release neck pressure — same activities used when the leash is fully dropped.",
        ],
    },
    {
        version: "2.3.1",
        changes: [
            "Fix: kitty buttons (especially poses) sometimes required two clicks. Root cause was a capture-phase click suppressor in the action button sidebar drag code that was too broad — it fired on ANY click after a sidebar drag, including HTML panel buttons. It now only suppresses clicks whose target is the BC game canvas, leaving EBC panel buttons unaffected.",
            "Fix: pose buttons now show a brief disabled state (700ms) after clicking, covering the 600ms emote delay so there is visual feedback that the click registered and a second click is not needed.",
            "Kitty menu: added 📟 Beep quick-access button in the Kitty section header to open the IM window directly to Emery.",
            "Fix: EBC beep window now includes the current chat room name in the AccountBeep payload so recipients see the 'Join room' option in BC's native beep notification.",
        ],
    },
    {
        version: "2.3.0",
        changes: [
            "Fix: built-in emotes (headpat, goodgirl, treat, praise, snuggle → reward; spank, bap → punishment) now correctly seed their reactionCategory for stored emote lists saved before v2.2.114. Previously the category was set on the defaults but never migrated, so existing installations saw no reactions fire.",
        ],
    },
    {
        version: "2.2.114",
        changes: [
            "Kitty Emotes: each emote can now be tagged with a reaction category (⚡ Punishment or 🌸 Reward) via the edit panel. When the emote fires, a random reaction from that pool is auto-sent by Emery. The pool is whatever is configured in the 🐾 Pet Reactions section.",
        ],
    },
    {
        version: "2.2.113",
        changes: [
            "New: 🐾 Pet Reactions section in the Kitty menu — two categories of one-click emotes Emery sends when Lucy triggers them. ⚡ Punishment (eeep~, startled squeak, disgruntled noises) and 🌸 Reward (purrs, meows, chirps). Fully editable — add, edit, or delete any reaction per category.",
        ],
    },
    {
        version: "2.2.112",
        changes: [
            "Fix: expression updates now include ActivePose again — BC treats a missing ActivePose field as 'reset to null', so omitting it was causing every expression click to wipe Emery's current pose for all room members. The original omission was a workaround for a race condition caused by expression triggers on pose buttons; since those were removed in v2.2.110 the race condition is gone and it is safe to send the current pose.",
        ],
    },
    {
        version: "2.2.111",
        changes: [
            "Removed autoreact feature entirely — emote buttons no longer auto-send a reaction emote on Emery's behalf. Removed autoreact/autoreactRough fields from KittyEmote, removed the autoreact kitty command handler, and cleaned up all related migrations.",
        ],
    },
    {
        version: "2.2.110",
        changes: [
            "Kitty UI: expressions can no longer be attached to emotes or poses — they are now exclusive to the Expressions section. The expression-trigger dropdown has been removed from pose edit cards, and expression firing has been removed from both emote and pose click handlers.",
            "Kitty UI: in the Expressions section, custom presets (★ buttons + editor) now appear at the top, above the individual expression buttons.",
        ],
    },
    {
        version: "2.2.109",
        changes: [
            "Fix: beeps sent from inside a BC chatroom (BeepType 'Beep') were being silently passed to BC's native handler without ever reaching EBC's IM window. The BeepType early-return now only skips genuine non-IM types (GriefReport, DominoInvite, etc.) — 'Beep' type flows through to normal friend/IM processing. MemberNumber is now also coerced from string in case BC ever sends it that way.",
        ],
    },
    {
        version: "2.2.108",
        changes: [
            "Kitty Leash: added ↙ Untug button — decrements tug count by one and sends a collar-loosening emote. Both Tug and Untug buttons dim when at their respective limits.",
            "Kitty Bap: fixed migration so stored kind text ('bap on the nose') is caught regardless of trailing emoji variations. Also seeds autoreact/autoreactRough fields for old stored entries — eeep reaction was silently missing.",
            "Kitty Resistance popup: fight-back and auto-fail emotes now include the item name (e.g. 'refusing the gag', 'earns herself a bind'). Manual accept is now silent — no emote sent. Auto-fail emotes are now bratty rather than resigned.",
        ],
    },
    {
        version: "2.2.107",
        changes: [
            "Fix: Expression updates no longer propagate ActivePose to other clients — expression-only ServerSend now omits ActivePose, preventing pose-breaks when expressions fire after a pose change.",
            "Fix: patchKittyExpressions() now runs AFTER CharacterRefresh in the pose handler — CharacterRefresh was wiping expression properties before they could be patched.",
        ],
    },
    {
        version: "2.2.106",
        changes: [
            "Fix: Kneel (and all kitty poses) now apply correctly — CharacterRefresh was called with dirty=false which told BC not to recalculate the pose. Now uses CharacterRefresh(false) + ChatRoomCharacterUpdate, matching the applyPoses pattern.",
            "Kitty Bap: text updated to 'head bap' (was 'nose bap'). Emery now auto-reacts with a startled eeep emote — no popup, fires automatically. Stored text entries migrated.",
            "Kitty Resistance popup: accept button now sends 'accepts obediently' emote. Timer expiry (failed struggle) sends a separate 'crumbles despite herself' emote. Both are mood-aware.",
            "Added 'autoreact' kitty command + KittyEmote fields autoreact/autoreactRough for instant auto-sent reactions without a popup.",
        ],
    },
    {
        version: "2.2.105",
        changes: [
            "Fix: Tug counter and button tooltip now correctly reset when the leash is grabbed or released (refreshTugBtn was not being called in the leash button handler).",
            "Kitty Leash: releasing the leash now runs Caress on ItemNeck (collar relief) in addition to LSCG_ReleaseNeck, and the release emote now describes loosening the collar back to its comfortable fit.",
        ],
    },
    {
        version: "2.2.104",
        changes: [
            "Kitty Leash: Tug no longer fires the Choke activity on ItemNeck — this was triggering LSCG's neck-grab event ('Your neck has been grabbed'). Tug now only sends the room emote and refreshes the HoldLeash signal.",
            "Kitty Leash: Tug is now limited to 3 tugs per grab. A 4th+ click sends a 'already at max tightness' room emote instead. The counter resets whenever the leash is grabbed or released. Button tooltip shows current count.",
        ],
    },
    {
        version: "2.2.103",
        changes: [
            "Kitty Poses: pose + expression are now applied before the room emote, with a 600 ms delay on the emote so Emery's CharacterUpdate reaches the room first — the pose change is visible before the narration text appears.",
        ],
    },
    {
        version: "2.2.102",
        changes: [
            "Fix: 🐾 Bap rough-mode text corrected from 'flick on the nose' to 'flick to the forehead'. Kind-mode bap already referenced the nose correctly. Existing stored entries with the old rough text are migrated automatically.",
        ],
    },
    {
        version: "2.2.101",
        changes: [
            "Fix: 🐾 Bap no longer fires a BC activity — ActivityRun sends its own chat message ('boops nose') that conflicted with the custom emote text. The bap emote text is descriptive enough on its own. Existing stored bap entries have bcGroup/bcActivity cleared automatically.",
        ],
    },
    {
        version: "2.2.100",
        changes: [
            "Fix: Leash release now fires the LSCG_ReleaseNeck activity (instead of Caress) to correctly tear down LSCG's choke/breath-play pairing — Caress is ignored by LSCG's leash system; only LSCG_ReleaseNeck calls DoRelease and clears both sides of the Leashing pairing.",
        ],
    },
    {
        version: "2.2.99",
        changes: [
            "Kitty Leash: releasing the leash now fires BC's 'Caress' activity on ItemNeck immediately after StopHoldLeash — this resets LSCG's choke/breath-play state so Emery's neck is no longer flagged as constricted.",
            "Kitty Emotes: 🐾 Bap now uses ItemNose + Pet (BC's 'boops TargetCharacter's nose' action) instead of ItemHead + Pet — gives the correct nose-boop animation and text. Existing stored bap entries are migrated automatically.",
        ],
    },
    {
        version: "2.2.98",
        changes: [
            "Kitty Restraints: removed the Tighten / Loosen per-item section.",
            "Kitty Leash: Tug now fires BC's 'Choke' activity on ItemNeck — LSCG's breath play module hooks this and triggers the choke / breath-play effect on Emery if she has LSCG installed.",
            "Fix: Fight back emote now goes through BC's own ChatRoomSendChat pipeline (same path as typing *text* manually) instead of a bare ServerSend — eliminates silent drops from BC's rate-limiting or speech-filter checks on Emery's connection.",
        ],
    },
    {
        version: "2.2.97",
        changes: [
            "Kitty: removed 🔗 Leash from the Emotes list — it is now handled entirely by the standalone leash buttons (Grab / Let Go / Tug).",
            "Kitty: added ↗ Tug button next to the leash toggle — sends a mood-aware room emote ('gives Emery's leash a sharp tug~' / 'gives a gentle tug, urging her along~') and re-sends the HoldLeash signal to reinforce BC's follow relationship.",
            "Fix: 🐾 Bap now uses the Pet (gentle touch) BC activity instead of Slap — Slap triggered a face-slap animation; Pet gives a light tap matching the playful bap description. Existing stored bap entries are migrated automatically.",
        ],
    },
    {
        version: "2.2.96",
        changes: [
            "Kitty: Leash button is now a toggle — shows '🔗 Grab Leash' when not held, '🔗 Let Go of Leash' when held. Clicking while leashed sends BC's StopHoldLeash hidden message to Emery (releasing the follow relationship) and a mood-aware room emote ('drops Emery's leash...' / 'gently releases...'). Button label, border and hover colour update immediately to reflect the new state.",
        ],
    },
    {
        version: "2.2.95",
        changes: [
            "Fix: expressions no longer reset when Lucy applies a pose or tightens a restraint — the addon now tracks active expression states and patches them back into Emery's appearance before every ChatRoomCharacterUpdate, so they survive the full appearance-replace that BC performs on other clients.",
            "Rework: Tighten / Loosen buttons now send a mood-aware room emote from Lucy ('yanks X tighter...' / 'adjusts X snugger...' etc.) so the action is visible to everyone in chat.",
            "Fix: Tighten / Loosen difficulty display counter now tracks correctly across multiple clicks on the same item (previously the counter froze after the first click).",
            "Fix: Emery now also reacts in chat when her restraints are tightened or loosened ('winces as her restraints are yanked tighter~' etc.).",
            "Tighten / Loosen buttons now briefly flash on click to confirm the command was sent.",
        ],
    },
    {
        version: "2.2.94",
        changes: [
            "Fix: Grab Leash now uses BC's actual HoldLeash hidden-message protocol instead of the non-existent GrabLeash activity — activates BC's full leash-follow mechanic when Emery has a leash item.",
            "Fix: Kneel & Spread now uses KneelingSpread (the correct BC pose) — PresentationKneel does not exist in BC. Stored poses are migrated automatically.",
            "Fix: Elbow Tie removed — BackElbowTouch conflicts with other upper-body poses and caused broken appearance. Removed from defaults; existing saved poses are cleaned up automatically.",
            "Fix: Fight back button in the resistance popup no longer triggers a ghost auto-accept after you click it — an isResolved flag now stops the countdown timer once you respond.",
            "Fix: Fight back emote now reliably sends to chat (wrapped in callBC, proper SourceCharacter dictionary entry).",
            "Fix: Expression changes via Kitty menu now always sync to all room members — a full ChatRoomCharacterUpdate is pushed after CharacterSetFacialExpression to guarantee visibility.",
        ],
    },
    {
        version: "2.2.93",
        changes: [
            "Fix: Fight back in the resistance popup now sends a mood-aware room emote from Emery ('twists away sharply…' in rough mode, 'squirms and shakes her head…' in kind mode).",
            "Fix: Kneel & Spread pose now uses PresentationKneel — the previous Kneel+Spread combo conflicted in BC.",
            "Kitty Poses: removed Hogtied, Tiptoe, Leg up, and Suspend; added Standing Closed Legs (LegsClosed).",
            "Kitty Restraints: Tighten / Loosen all pills replaced with a live per-item list — each of Emery's current restraints shows individual − / + buttons; sends targeted tighten/loosen command to that group only.",
            "Kitty: Grab Leash promoted to a big standalone button between the mood toggle and collapsibles; uses BC's GrabLeash activity on the neck accessories slot.",
            "Kitty Expressions: new Expression Presets system — create named multi-expression combos (e.g. Shy = Blush:Low + Eyes:Shy), fire them from the Expressions section, or reference them as triggers on poses, actions, and restraint presets.",
        ],
    },
    {
        version: "2.2.92",
        changes: [
            "Fix: Kitty interactive emotes (Treat 🍖, Praise 🎀) now correctly send the react beep to Emery — the Accept/Ignore popup will actually appear for her.",
            "Fix: multi-pose commands (e.g. Kneel + Spread) now split correctly on the receiving side — previously the whole comma-joined string was treated as one pose name.",
            "Kitty Poses: added 8 new default poses — Kneel & spread, Spread, Box tie, Elbow tie, Hogtied, Tiptoe, Leg up, Suspend. Existing users get them appended automatically.",
        ],
    },
    {
        version: "2.2.91",
        changes: [
            "Kitty Restraints: added 🔧 Tighten / 🔓 Loosen buttons — send a mood-aware room emote and adjust the difficulty of every restraint Emery is wearing up or down by 1 step.",
            "Kitty Restraints: added Copy Restraints from Member panel — pick any room member, load their restraints into a checklist, select what to include, generate a BC LZ outfit code, and copy it for your wardrobe.",
            "Kitty Emotes: added 🔗 Leash — sends a mood-aware room emote and runs the BC Yank activity on Emery's neck accessories slot.",
        ],
    },
    {
        version: "2.2.90",
        changes: [
            "Kitty menu: all sections (Emotes, Poses, Actions, Restraints, Arousal, Expressions) are now collapsible — click the section header to expand/collapse; state is remembered.",
            "Kitty menu: added 🔗 Leash emote button (grabs Emery's leash + runs the BC Yank activity).",
            "Kitty menu: Poses now have an optional expression trigger — configure which expression fires when the pose is applied (edit mode, 😊 Expr row).",
            "Kitty menu: Restraint presets now have an optional expression trigger — configure in the preset editor's 😊 Expression dropdown; fires when Apply is pressed.",
        ],
    },
    {
        version: "2.2.89",
        changes: [
            "Slow Leave: removed emoji prefixes from preset names in the dropdown.",
            "Buttons tab: removed the Fun Actions section (Duration/Preset/Name/Seq editor) — Slow Leave is configured entirely from the sidebar collapsible.",
        ],
    },
    {
        version: "2.2.88",
        changes: [
            "Slow Leave: removed button-category dropdown from the sidebar collapsible — it was confusing and isn't needed there.",
        ],
    },
    {
        version: "2.2.87",
        changes: [
            "Slow Leave: added editable textarea below preset picker — shows the current preset's raw sequence, edit inline to customise it; changes are saved immediately.",
            "Slow Leave: category dropdown now has a × delete button so you can remove unwanted categories (e.g. Emotes) — prompts for confirmation; last remaining category cannot be deleted.",
            "Slow Leave: added 😏 Bratty preset (saunters out dramatically).",
            "Slow Leave: preset migration is now additive — newly added default presets are appended to existing user lists instead of resetting them.",
        ],
    },
    {
        version: "2.2.86",
        changes: [
            "Fix: copy-restraints and rescue item list could silently return empty if any item in the character's appearance had an unresolved asset (mod-injected or mismatched BC version) — both paths now null-guard Asset before filtering, so one bad item no longer wipes the whole list.",
            "Fix: rescue item list now filters to RESTRAINT_GROUPS only (was showing all appearance items including hair/clothes).",
            "Fix: KITTY_EXPRESSIONS were using wrong BC state names — Blush used '1'/'3' (should be 'Low'/'Medium'/'High'/'Extreme'), Mouth:Closed does not exist and caused the mouth to go invisible, 'Ears' is not a valid expression group. All states corrected against BC's actual asset directory names. Eyebrows group added.",
            "Fix: headpat/good girl emote expressions were 'Ears:Wiggle' which is not a valid BC expression — updated to Blush:Low / Blush:Medium.",
        ],
    },
    {
        version: "2.2.85",
        changes: [
            "Sidebar: Slow Leave block (button + preset + category + duration slider) now lives inside a collapsible '🚶 Slow Leave ▾' section — click the header to expand/collapse; state is remembered across sessions.",
            "Fixed: category dropdown in the sidebar was always empty — it now refreshes whenever the section is expanded (and whenever you enter a room), so Player is guaranteed to be initialised at that point.",
        ],
    },
    {
        version: "2.2.84",
        changes: [
            "Kitty tab: restored Emotes section (Headpat, Good Girl, Treat, Praise, Mine, Snuggle, Spank, Bap pills) with mood-aware room emotes, BC activity sounds, and expression triggers — removed in v2.2.80 by mistake.",
            "Kitty tab: added Expressions section at the bottom — quick-tap buttons to fire any facial expression (blush, sad eyes, ears wiggle, etc.) directly to Emery via the expression kitty command.",
        ],
    },
    {
        version: "2.2.83",
        changes: [
            "Kitty Restraints section redesigned: now uses a simple create/select/apply/delete pattern — type a name and hit + Create, pick a preset from the dropdown, then Apply to send it to Emery. Item editing (slot+item picker and BC outfit code import) is still available inline below the dropdown when a preset is selected.",
        ],
    },
    {
        version: "2.2.82",
        changes: [
            "Fixed: drawer skeleton now anchored to the DOM immediately at setup start — any unexpected runtime error during panel construction no longer prevents the drawer from appearing.",
        ],
    },
    {
        version: "2.2.81",
        changes: [
            "Fixed: drawer failing to open after v2.2.80 — category dropdown init now guards against Player not yet being available at panel build time.",
        ],
    },
    {
        version: "2.2.80",
        changes: [
            "Kitty tab: removed the Emotes section — emote actions can be built as Action steps instead.",
            "Kitty tab UX overhaul — mood buttons, action pills, and section headers are now significantly bigger and easier to tap.",
            "Sidebar: added button category dropdown (switch Classic/Warm/Quiet/etc.) just below the slow leave button — no need to open the Buttons tab to switch.",
            "Sidebar: added duration slider (⏱) next to slow leave — same accent style as the opacity slider in Drawer Preferences.",
            "Restraint presets: added 'Paste BC outfit/craft code → Import' row to each preset card, so Lucy can import crafting codes directly.",
        ],
    },
    {
        version: "2.2.79",
        changes: [
            "Kitty tab: added a dedicated Restraints section for managing named restraint presets — create, rename, add/remove items, and delete presets directly without going through a punishment step.",
            "Fixed: the 💾 Save button in punishment restraint steps now triggers a step rebuild so the Load ↓ dropdown immediately shows the newly saved preset.",
        ],
    },
    {
        version: "2.2.78",
        changes: [
            "Renamed 'Drawer Appearance' settings section to 'Drawer Preferences'.",
            "Menu Hotkey UI overhauled: now displayed as a prominent bordered card with a large bold key badge, clearer Set/Clear buttons, and a hint line.",
        ],
    },
    {
        version: "2.2.77",
        changes: [
            "Fixed kitty emote/action/pose buttons producing stuck broken messages when clicked outside a chatroom — all buttons now silently no-op if CurrentScreen is not ChatRoom.",
        ],
    },
    {
        version: "2.2.76",
        changes: [
            "Added 🐾 Bap emote (Slap on ItemHead) to default buttons; seeded automatically into existing emote lists so no manual re-add needed.",
            "Spank emote also seeded automatically for users who didn't have it in their stored list.",
            "bcGroup/bcActivity fields seeded into existing headpat and spank entries from storage so the sound picker shows them correctly without re-editing.",
            "Slow Leave: preset dropdown now appears directly below the Slow Leave button in the sidebar — no need to open the settings tab to switch presets.",
            "Slow Leave: click handler now re-reads presets live so edits made in settings take effect immediately without reloading.",
            "⛓ Bound timer in header footer now recovers from persisted per-item timestamps — correctly counts offline time instead of starting fresh every session.",
        ],
    },
    {
        version: "2.2.75",
        changes: [
            "Emote editor: each emote now has a 🔊 Sound row — pick a BC body-group and activity (e.g. Head + Pet, Butt + Spank) to trigger real BC sounds/chat on click. Activity list is populated live from BC's own data.",
            "Headpat/Spank emotes now store their BC activity in data (bcGroup/bcActivity fields) rather than being hardcoded — editing them in the menu will update which activity fires.",
            "Punishment restraint steps: Load Preset dropdown at top (picks from saved kitty presets), Save as Preset row at bottom (saves step's items as a reusable named preset).",
            "Restraint presets (EBC_kittyRestraintSets) re-exposed for use across punishment steps.",
        ],
    },
    {
        version: "2.2.74",
        changes: [
            "Headpat and Spank now use BC's ActivityRun pipeline (same as clicking the button in the dialog) — correct sounds, chat description, and BCX/LSCG reactions all trigger properly.",
        ],
    },
    {
        version: "2.2.73",
        changes: [
            "Removed the standalone Restraints section from the kitty menu — restraints are now managed directly inside Actions (punishment steps).",
            "Actions system overhauled: Lucy can now build custom sequences of Sentence (emote) + Restraints steps in any order.",
            "Per-action reaction picker: Lucy can choose Emery's expression (blush, sad eyes, etc.) and pose (kneel, all-fours, etc.) when the action is accepted.",
        ],
    },
    {
        version: "2.2.72",
        changes: [
            "Headpat now sends a real BC Pet activity on ItemHead (correct sounds + chat format).",
            "Added 👋 Spank emote button — sends a real BC Spank activity on ItemButt.",
            "Slow Leave preset UI redesigned: dropdown + inline name/seq editor below it (no separate toggle).",
        ],
    },
    {
        version: "2.2.71",
        changes: [
            "Restored 'Remove Locks' button and 'Unlock Selected' in the sidebar self-picker (accidentally removed in 2.2.70).",
            "Restored reaction-back emotes when accepting/ignoring kitty react popup (broken in 2.2.70).",
            "Fixed headpat button using ActivityPerformActivity for real BC sounds; fallback uses Content:'Caress'.",
            "Fixed kitty restraint set item picker always showing empty — null-safe BC asset array filtering.",
            "Slow Leave duration slider now uses the same bordered-box style as the opacity slider.",
            "Slow Leave presets are now fully editable (name + sequence) with per-preset reset and reset-all.",
        ],
    },
    {
        version: "2.2.70",
        changes: [
            "Removed 'Remove Locks' button from quick actions sidebar and 'Unlock Selected' from the self-picker — locks are no longer managed here.",
            "Self-picker now only shows restraints.",
            "Rough resistance popup drops to 1 s (was 3 s) — be quick to fight back!",
            "Popup fight/accept/ignore buttons no longer auto-send room emotes — you decide what to say.",
            "Headpat button now registers as a real BC Caress activity on Emery's head.",
            "Removed '🔓 Release all' button from kitty restraints view.",
            "Restraint set editor: each item in the set now shows a colour input and a delete button; new 'Add item' builder with slot/item dropdowns populated from BC's asset list.",
        ],
    },
    {
        version: "2.2.69",
        changes: [
            "Slow Leave overhaul: removed the toggle pill from Fun Actions; added a duration slider (2–30 s) and a preset dropdown (🌸 Classic, 🤗 Warm, 😔 Quiet, 💤 Sleepy, 🐾 Playful) in its place.",
            "Slow Leave sidebar button now toggles to '✕ Cancel Leave' while the sequence is running — clicking it cancels immediately and resets pose.",
            "Slow Leave is now always visible in the sidebar when inside a chatroom (no toggle needed).",
        ],
    },
    {
        version: "2.2.68",
        changes: [
            "'Copy Restraints from Member' in the DEV tab is now visible to credited members only (Emery, Sin, Lara, Lucy, Sybil) — same gate as the Stat Editor.",
        ],
    },
    {
        version: "2.2.67",
        changes: [
            "Kitty emotes now have rough variants: each emote has a separate ⚡ Rough text shown when mood is Rough (e.g. headpat becomes a hair-tug, snuggle becomes a firm hold). Edit mode shows 🌸 Kind / ⚡ Rough rows per emote. Leave rough blank to reuse the kind text.",
            "Headpat (and Good Girl) now trigger Emery's ear-wiggle expression (CharacterSetFacialExpression) via a new 'expression' kitty command. Configurable per-emote via the expression field; seeds automatically on first load.",
            "Kitty restraint set import now accepts LZ-compressed BC outfit codes (same format as BC's own outfit export) — restraint items are extracted automatically. Also added 'From saved restraints' picker: choose any of Emery's saved restraint sets from the outfit manager and use them directly. Craft names/descriptions, item properties, and difficulty are now preserved when items are applied.",
        ],
    },
    {
        version: "2.2.66",
        changes: [
            "Kitty restraint sets now go through the resistance popup (same as punishments) instead of applying directly. Each set gains optional 🌸 Kind / ⚡ Rough emote fields in edit mode — the matching emote is sent to the room before Emery's popup appears. Existing saved sets migrate automatically with empty emotes.",
        ],
    },
    {
        version: "2.2.65",
        changes: [
            "Fix kitty 'Release all': now only removes items in restraint slots (was accidentally removing clothing/hair/body items too). CharacterRefresh now uses Push=true so the change is visible to everyone in the room immediately. Also fixed restraint SET apply button the same way.",
            "Fix /lock: was sending unsupported Action:'Lock' — now mutates ChatRoomData.Locked and calls ChatRoomAdminUpdate() (BC's own function) so the room actually updates, with fallback to Action:'Update' + full room object.",
            "Fix /ebc: unknown subcommands now show a short 'Unknown command — type /ebc help' message instead of dumping the full command list. The full list only appears for /ebc, /ebc help, /ebc ?, etc.",
            "Removed /ebc afk command (was in the list but had no handler, causing the full list to appear when clicked).",
        ],
    },
    {
        version: "2.2.64",
        changes: [
            "Rough punishment timer: 3 s instead of 8 s (kind stays 8 s). Subtitle shows the time remaining so Emery knows how long she has.",
            "Punishments can now carry a restraint set: in edit mode pick a saved kitty restraint set from the '⛓ Bind' dropdown. When Emery accepts (or timer runs out), those items are applied to her and synced to the room.",
            "Interactive emotes: treat 🍖 and praise 🎀 now send a react beep. Emery gets a soft 6-second popup to 'Accept~ 🥰' (sends happy emote) or 'Ignore 🙈' (glances away). Toggle per-emote with the 🔔/🔕 button in emote edit mode.",
        ],
    },
    {
        version: "2.2.63",
        changes: [
            "Slow Leave toggle moved from DEV tab to the top of the BUTTONS tab under a new 'Fun Actions' section — visible and accessible to everyone. Removed it from the DEV tab entirely.",
        ],
    },
    {
        version: "2.2.62",
        changes: [
            "Slow Leave button: restored ON/OFF toggle in settings (defaults to ON). Button stays hidden when toggled off, visible in chatroom when on.",
        ],
    },
    {
        version: "2.2.61",
        changes: [
            "Slow Leave quick button: always visible in sidebar when in a chatroom (no more hidden toggle). Clicking it now runs the real sequence — smiles and waves, slowly heads for the door, then leaves — instead of jumping out instantly. Removed the 'Show Slow Leave button' toggle from settings.",
        ],
    },
    {
        version: "2.2.60",
        changes: [
            "Kitty tab overhaul: KIND/ROUGH mood toggle (🌸/⚡) changes the tone of all pose and punishment room emotes. Poses now narrate a mood-aware room emote before applying. New Punishments section (Bad Girl, Gag, Corner, Bind) — each with kind/rough emotes. Resistance popup: when Lucy applies a punishment, Emery gets an 8-second overlay to 'Fight back! 💪' (sends defiance emote) or 'Accept~ 🌸' (sends acceptance emote); auto-accepts on timeout.",
        ],
    },
    {
        version: "2.2.59",
        changes: [
            "Fix /lock: removed hard block on null ChatRoomData ('room data not loaded') — now uses BC's ChatRoomPlayerIsAdmin() as primary check (no ChatRoomData dependency), falls back to Admin array. Duplicate-state check only fires when ChatRoomData is actually available.",
        ],
    },
    {
        version: "2.2.58",
        changes: [
            "Sequence builder: add Leave Room 🚪 step type — selecting it disables text and hides delay. runSequence now handles 'leaveroom' step (restores pose then leaves room). Added '📤 Slow Leave template' button to step builder: smiles and waves, slowly heads for the door, then leaves.",
        ],
    },
    {
        version: "2.2.57",
        changes: [
            "BUTTONS tab fully restored from stable (master) branch — exact actionButtons.ts and renderButtons/buildSeqStepBuilder from v2.2.17. Default buttons (NOD/SHAKE/WAVE/CHEER/POUT/GIGGLE) restored. Canvas sidebar with drag-to-reposition, DrawButton tiles, and click handler all intact. Tab correctly labelled 'BUTTONS', positioned before ANIMS.",
        ],
    },
    {
        version: "2.2.56",
        changes: [
            "Fix BUTTONS tab: tab was labelled 'BTNS' and appeared after ANIMS — now correctly labelled 'BUTTONS' and positioned before ANIMS (matching original order). actionButtons.ts fully restored from v2.2.46 (621 lines, canvas sidebar with drag-to-reposition, DrawButton tiles, click handler). EBC_USER_TABS and EBC_TAB_LABELS updated to include 'buttons'.",
        ],
    },
    {
        version: "2.2.55",
        changes: [
            "Restored BTNS tab from v2.2.46 — full original implementation with categories, accordions, slot rows, seq/macro step builders, colour picker, sidebar ON/OFF toggle, export/import, fun actions, useful buttons. Canvas sidebar with drag-to-reposition also restored. All saved button data in ExtensionSettings is intact.",
        ],
    },
    {
        version: "2.2.54",
        changes: [
            "Restored BTNS tab — categories, slots, sequences/macros, colour picker, move up/down, delete, collapsible categories. All data persists to localStorage. Click any button to run its sequence.",
        ],
    },
    {
        version: "2.2.53",
        changes: [
            "Fix: /lock and /unlock admin check now handles null ChatRoomData gracefully and normalises numeric vs string member IDs — was incorrectly reporting 'not a room admin' even when you were.",
        ],
    },
    {
        version: "2.2.52",
        changes: [
            "Friends: relationship info colours simplified — 👑 owned and 🔒 you-own-them both show in gold; ❤️ lovers stays pink.",
        ],
    },
    {
        version: "2.2.51",
        changes: [
            "Fix: PEOPLE IN ROOM badge now correctly shows 👑 for your owner and 🔒 for someone you own (was reversed).",
            "New: Kitty menu is now its own 🐱 tab (was buried in Credits). Only visible to Lucy (#230466).",
            "Fix: Arousal changes (/ebc ameter) now broadcast to the room immediately so others see the meter update.",
            "New: /ebc help commands are now stacked with descriptions; click any to auto-fill the chat bar.",
        ],
    },
    {
        version: "2.2.50",
        changes: [
            "Added Kitty menu in Credits tab — visible only to Lucy (#230466). Sections: Emotes (customizable room messages/actions), Poses (send pose commands to Emery), Restraints (apply/remove sets via BC code import), Arousal (presets + custom %), and a direct beep button.",
        ],
    },
    {
        version: "2.2.49",
        changes: [
            "Friends: expand panel now stays open through list refreshes instead of closing unexpectedly.",
            "Friends: expand panel info box now shows relationship info — 👑 owned since, ❤️ lovers since, 🔒 you own them since (room only).",
        ],
    },
    {
        version: "2.2.48",
        changes: [
            "Fix: owner badge in friend list now shows 👑 (you see a crown on your owner) and 🔒 when you own someone — was reversed.",
            "Fix: /lock and /unlock no longer incorrectly report 'not in a chatroom' when ChatRoomData is transiently null.",
            "New: /ebc ameter <0-100> sets arousal to a specific percentage. /ebc ameter with no argument still toggles on/off.",
        ],
    },
    {
        version: "2.2.47",
        changes: [
            "Removed canvas action buttons sidebar. Slow Leave is now a simple button in the quick-actions area (default off — toggle it on in the DEV tab).",
        ],
    },
    {
        version: "2.2.46",
        changes: [
            "Fix: toggling a button's mode (seq ↔ macro) no longer resets the panel scroll position.",
        ],
    },
    {
        version: "2.2.45",
        changes: [
            "DEV tab: Panel opacity slider moved inside the Drawer Appearance section where it belongs.",
        ],
    },
    {
        version: "2.2.44",
        changes: [
            "Fix: crash when adding a tag to a friend — insertBefore was targeting beepBtn which is not a direct child of row. Tag area is now correctly re-inserted into metaRow.",
        ],
    },
    {
        version: "2.2.43",
        changes: [
            "Fix: slow leave (leaveroom macro / seq step) no longer freezes the UI — now switches screen first then calls ChatRoomLeave(), matching the safeword pattern.",
        ],
    },
    {
        version: "2.2.42",
        changes: [
            "Panel is now fully opaque by default — no more text bleeding through from behind. DEV tab: new Panel opacity slider (10%–100%) lets you dial in transparency if you want the frosted-glass look.",
        ],
    },
    {
        version: "2.2.41",
        changes: [
            "New commands: /lock and /unlock — lock or unlock the room from chat. Shows an error if you are not a room admin or not in a room.",
        ],
    },
    {
        version: "2.2.40",
        changes: [
            "DOM tab: new Room Admin section — Lock/Unlock room toggle and Kick / Ban / Promote / Demote buttons. Visible whenever you are a room admin regardless of DOM mode.",
        ],
    },
    {
        version: "2.2.39",
        changes: [
            "Fix: clicking any action in the menu (delete, save, reorder, pose buttons, etc.) no longer snaps the scroll position back to the top of the list.",
        ],
    },
    {
        version: "2.2.38",
        changes: [
            "Fix: slow-leave (seq leaveroom step / macro) left the room but UI didn't update — setLeavePending() was called before setTimeout, letting ChatRoomRun clear the guard flag prematurely before ChatRoomData was null.",
        ],
    },
    {
        version: "2.2.37",
        changes: [
            "Outfit Update button now shows a confirm dialog before overwriting.",
        ],
    },
    {
        version: "2.2.36",
        changes: [
            "Roaming panel now opens vertically centred in the viewport instead of anchored near the bottom.",
        ],
    },
    {
        version: "2.2.35",
        changes: [
            "Fix: closed panel still visually bled — added opacity:0 + visibility:hidden to ebc-closed (matching CRABS's approach). Panel is now completely invisible when closed regardless of transform position.",
        ],
    },
    {
        version: "2.2.34",
        changes: [
            "Fix: drawer panel was partially visible when closed outside chatrooms (root right:34px left 18px on-screen). Root is now right:0 so the closed panel is fully off-screen. Tab uses ebc-roaming CSS class to stay fully visible. Tab anchored near the bottom-right to avoid BC's icon grid.",
        ],
    },
    {
        version: "2.2.33",
        changes: [
            "Fix: drawer tab invisible outside chatrooms — closed tab was 34px off the right edge of the viewport. Root is now positioned at right:34px so the tab lands flush with the screen edge.",
        ],
    },
    {
        version: "2.2.32",
        changes: [
            "Menu is now accessible outside chatrooms (main hall, wardrobe, etc.) — floats at the right edge of the screen. Buttons and Poses tabs are hidden outside a room since they require chat.",
        ],
    },
    {
        version: "2.2.31",
        changes: [
            "Fix: map rooms breaking — the v2.2.30 ChatRoomRun guard was too broad and blocked rendering whenever ChatRoomData was null, which map rooms trigger during normal transitions. Guard now only activates when EBC itself initiated the leave.",
        ],
    },
    {
        version: "2.2.30",
        changes: [
            "Fix: Leave Room crash — BC clears ChatRoomData before the screen transition, causing ChatRoomCustomizationRun to null-crash on the next frame. EBC now guards ChatRoomRun at priority 500 (ahead of CRABS/BCOM) and skips the frame when room data is gone.",
        ],
    },
    {
        version: "2.2.29",
        changes: [
            "Macro button: removed Play Scene and Open Beep/IM from action dropdown — options are now Leave Room, Release Restraints, Open Wardrobe, Apply Outfit.",
        ],
    },
    {
        version: "2.2.28",
        changes: [
            "Fix: EBC user detection used wrong OnlineSharedSettings key ('EmeryBC' instead of 'EBC') — EBC badges in friend list and Dev panel now show correctly for all users regardless of build.",
        ],
    },
    {
        version: "2.2.27",
        changes: [
            "Button style cycle is now seq ↔ macro only — chat emote/action styles removed.",
            "All new button slots default to 🔧 macro style.",
            "Existing emote/action buttons show 💬 and convert to macro on first style click.",
        ],
    },
    {
        version: "2.2.26",
        changes: [
            "Saved Outfits and Saved Restraints headers now match the arrow style of the other collapsible sections.",
        ],
    },
    {
        version: "2.2.25",
        changes: [
            "Fix: Leave Room now defers by one tick to avoid crashing other mods' draw hooks.",
            "Remove 'Unlock Items' from macro options.",
        ],
    },
    {
        version: "2.2.24",
        changes: [
            "Action buttons are now full macros — new 🔧 style supports: Leave Room, Release Restraints, Unlock Items, Open Wardrobe, Apply Outfit, Play Scene, Open Beep/IM.",
            "Style toggle cycles ( ) → * * → ✨ seq → 🔧 macro.",
        ],
    },
    {
        version: "2.2.23",
        changes: [
            "Buttons tab: style toggle now cycles ( ) → * * → ✨ seq so you can create sequence buttons directly from the UI.",
        ],
    },
    {
        version: "2.2.22",
        changes: [
            "Move 'Show EBC tags' toggle into the DEV tab.",
            "Move 'Show action buttons' toggle into the Buttons tab.",
        ],
    },
    {
        version: "2.2.21",
        changes: [
            "Seq builder: 'Leave Room 🚪' is now a selectable step type — no raw syntax needed.",
            "Seq builder: '📤 Slow Leave template' button pre-fills a ready-made 2-message slow leave.",
        ],
    },
    {
        version: "2.2.20",
        changes: [
            "Seq buttons: add 'leaveroom' step token — put it at the end of a sequence to leave the room after your messages play out.",
        ],
    },
    {
        version: "2.2.19",
        changes: [
            "Add toggle in settings to show/hide the action buttons sidebar.",
        ],
    },
    {
        version: "2.2.18",
        changes: [
            "Fix: drawer no longer flashes visible on the first room entry — transition is suppressed on initial display:none→block reveal.",
        ],
    },
    {
        version: "2.2.17",
        changes: [
            "Fix: disabling the EBC badge now actually hides it from other users — presence was always broadcast regardless of the badge setting.",
        ],
    },
    {
        version: "2.2.16",
        changes: [
            "Fix: addon now loads without FUSAM — startup was waiting for window.bcModSDK (uppercase, FUSAM-provided) but the bundled SDK registers as window.bcModSdk (lowercase). Now imports SDK directly and waits for BC's own ChatRoomMenuDraw instead.",
        ],
    },
    {
        version: "2.2.15",
        changes: [
            "Infra: build now generates bundle.user.js — a self-contained Violentmonkey/Tampermonkey userscript with correct @match patterns and auto-update URL. No separate loader script needed.",
        ],
    },
    {
        version: "2.2.14",
        changes: [
            "Perf: character bundles moved from localStorage to IndexedDB via Dexie — no 5MB quota, async I/O won't block BC event loop.",
            "Perf: deep-clone now uses structuredClone() instead of JSON.parse(JSON.stringify()) — faster and handles more types.",
            "Dev: added ts-reset to tighten TypeScript built-in types (JSON.parse → unknown, filter(Boolean) → non-nullable).",
        ],
    },
    {
        version: "2.2.13",
        changes: [
            "Fix: auto-escape no longer shows a confirm popup — restraints are removed immediately regardless of the confirm setting.",
        ],
    },
    {
        version: "2.2.12",
        changes: [
            "Fix: ChatRoomSync no longer blocks on localStorage I/O — bundle writes deferred to async after BC finishes processing.",
            "Fix: storeRawBundle eliminates redundant second JSON.parse (halves JSON work per character).",
            "Fix: friends sync() debounced to 2s — was calling ServerPlayerExtensionSettingsSync immediately with no rate limit.",
        ],
    },
    {
        version: "2.2.11",
        changes: [
            "Fix: large-room server timeout — timerCheckRestraints throttled to once/500ms (was once per character per frame).",
            "Fix: recordPersonMet now batches server sync with 3s debounce and skips unchanged entries.",
            "Fix: CharacterRefresh people-met recording deduplicated per session — was firing N server syncs for N people on room join.",
        ],
    },
    {
        version: "2.2.10",
        changes: [
            "Fix: badge x reverted to left+250*zoom (correct center of 500px char canvas; 500 overshot to right edge).",
        ],
    },
    {
        version: "2.2.9",
        changes: [
            "Fix: overhead badge x corrected to left+500*zoom (true center of 1000px char canvas).",
            "Fix: FUSAM icon redrawn — rounder face, proper ears, eye shine, whisker dots.",
        ],
    },
    {
        version: "2.2.8",
        changes: [
            "Fix: overhead badge x-position corrected to character center (left+250*zoom) — was drifting left in solo rooms.",
        ],
    },
    {
        version: "2.2.7",
        changes: [
            "Add index.html to GitHub Pages root so the addon URL resolves cleanly",
        ],
    },
    {
        version: "2.2.6",
        changes: [
            "UI: badge x reverted to 100 (matches stable alignment under WCE), y kept at 72.",
        ],
    },
    {
        version: "2.2.5",
        changes: [
            "UI: badge shifted left to x=272 to center under WCE text.",
        ],
    },
    {
        version: "2.2.4",
        changes: [
            "UI: badge moved right (x=320) and lower (y=72) to sit below WCE version numbers.",
        ],
    },
    {
        version: "2.2.3",
        changes: [
            "UI: overhead badge repositioned to center (x=250) below WCE instead of far left.",
        ],
    },
    {
        version: "2.2.2",
        changes: [
            "UI: beep windows more transparent (~55%), action buttons less transparent (~90%) for better readability.",
        ],
    },
    {
        version: "2.2.1",
        changes: [
            "Fix: minimized beep windows now transparent (stacked header background was making them appear solid).",
            "UI: overhead EBC badge is now semi-transparent.",
        ],
    },
    {
        version: "2.2.0",
        changes: [
            "UI: beep/IM windows are now semi-transparent with backdrop blur, matching the action button sidebar style.",
        ],
    },
    {
        version: "2.1.9",
        changes: [
            "Infra: build artifacts moved off the repo — GitHub Actions now auto-deploys to GitHub Pages on every push. Loader updated to nekoemery.github.io/EmeryBC/stable/.",
        ],
    },
    {
        version: "2.1.8",
        changes: [
            "UI: People in Room counter is now a proper pill badge — bright, readable, and clearly styled.",
        ],
    },
    {
        version: "2.1.7",
        changes: [
            "UI: action button sidebar boxes are now semi-transparent so names and content behind them are visible.",
        ],
    },
    {
        version: "2.1.6",
        changes: [
            "UI: overhead badge moved further left (x=100) to stop overlapping with WCE and other center/right addon badges.",
            "UI: tag manager redesigned — existing tags now display as interactive colored chips; click the dot to repick color, × to delete. Much more compact.",
            "UI: tag chips on outfit/restraint rows now have subtle inner highlight and drop shadow for more depth.",
        ],
    },
    {
        version: "2.1.5",
        changes: [
            "Fix: Protected Items whitelist now respected by Release Restraints, Unlock, and the self-picker — whitelisted slots are skipped just like owner/lover locks.",
        ],
    },
    {
        version: "2.1.4",
        changes: [
            "Feature: per-button name toggle on action buttons — a 'name'/'anon' chip in the button editor lets you choose whether your name appears in the ( action ) text. Only applies to ( ) style; * emote * always includes the name via BC.",
        ],
    },
    {
        version: "2.1.3",
        changes: [
            "Feature: copy ID button (clipboard icon) on every friend row and every person-in-room row — turns green briefly on copy to confirm.",
        ],
    },
    {
        version: "2.1.2",
        changes: [
            "Fix: overhead EBC badge moved lower (y+50 instead of y+26) so it no longer overlaps with WCE and other addon badges drawn at the top of the character.",
            "Fix: Protected Items 'Current restraints' picker now only lists worn restraint slots — clothing and body items no longer appear.",
        ],
    },
    {
        version: "2.1.1",
        changes: [
            "Feature: per-outfit and per-restraint-set toggle to include or exclude your name from the announce text. 👤 With name / 👤 No name chip on each row.",
        ],
    },
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

// Appends a clickable command row to the chat log. Clicking fills the chat input
// with the command text so the user only has to press Enter to run it.
function appendClickableCmd(cmd: string, desc: string): void {
    const doAppend = (): boolean => {
        const log = document.getElementById("TextAreaChatLog");
        if (!log) return false;
        const row = document.createElement("div");
        row.style.cssText = `
            background: ${UI.cardMuted};
            border-left: 3px solid ${UI.accent};
            padding: 3px 8px;
            margin: 1px 0;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: background 0.12s;
        `;
        row.title = "Click to fill chat bar";
        row.addEventListener("mouseenter", () => { row.style.background = "#2a1a2a"; });
        row.addEventListener("mouseleave", () => { row.style.background = UI.cardMuted; });
        const cmdSpan = document.createElement("span");
        cmdSpan.style.cssText = "font-family:monospace;color:#e0b8d8;font-weight:bold;font-size:11px;white-space:nowrap;font-style:normal;";
        cmdSpan.textContent = cmd;
        const descSpan = document.createElement("span");
        descSpan.style.cssText = `color:${UI.textMuted};font-size:10px;font-style:italic;`;
        descSpan.textContent = desc;
        row.appendChild(cmdSpan);
        row.appendChild(descSpan);
        row.addEventListener("click", () => {
            const input = document.getElementById("InputChat") as HTMLInputElement | HTMLTextAreaElement | null;
            if (input) { input.value = cmd; input.focus(); }
        });
        log.appendChild(row);
        log.scrollTop = log.scrollHeight;
        return true;
    };
    if (!doAppend()) window.setTimeout(() => doAppend(), 300);
}

function showVersionInfo(): void {
    appendLocalLogLine(`[EBC] Version ${MOD_VERSION}`, UI.gold);
}

function showChangelog(): void {
    // Iterate oldest→newest so the most recent entry lands at the bottom of the
    // chat log (where you'd naturally look after scrolling down).
    for (const entry of CHANGELOG.slice().reverse()) {
        appendLocalLogLine(`[EBC] v${entry.version}`, UI.textMuted);
        for (const change of entry.changes) {
            appendLocalLogLine(`- ${change}`, UI.accent);
        }
    }
    appendLocalLogLine(`[EBC] Current version: ${MOD_VERSION}`, UI.gold);
}

// Last non-Inactive arousal level, so toggling off → on restores it.
// Defaults to "Manual" if the setting was already Inactive at load time.
let lastArousalActive = "Manual";

function getArousalSettings(): Record<string, unknown> | undefined {
    return (Player as unknown as Record<string, unknown>).ArousalSettings as
        Record<string, unknown> | undefined;
}

function syncArousalSettings(arousal: Record<string, unknown>): void {
    type AccountUpdater = { QueueData(data: Record<string, unknown>): void };
    const updater = (window as unknown as Record<string, unknown>).ServerAccountUpdate as
        AccountUpdater | undefined;
    updater?.QueueData({ ArousalSettings: arousal });
    // Also broadcast to the room so other players see the change immediately
    callBC(() => {
        type W = Record<string, unknown>;
        const syncFn = (window as unknown as W).ActivityChatRoomArousalSync as ((c: unknown) => void) | undefined;
        if (typeof syncFn === "function") {
            syncFn(Player);
        } else if ((Player as unknown as Record<string, unknown>).OnlineID != null) {
            ServerSend("ChatRoomCharacterUpdate", {
                ID: (Player as unknown as Record<string, unknown>).OnlineID,
                ArousalSettings: arousal,
                Appearance: ServerAppearanceBundle(Player.Appearance),
            });
        }
    });
}

function toggleArometerCommand(): void {
    try {
        const arousal = getArousalSettings();
        if (!arousal) { appendLocalLogLine("[EBC] Arousal settings unavailable.", UI.danger); return; }
        const current = arousal.Active as string | undefined;
        if (current && current !== "Inactive") lastArousalActive = current;
        const next = (current === "Inactive") ? lastArousalActive : "Inactive";
        arousal.Active = next;
        syncArousalSettings(arousal);
        const label = next === "Inactive" ? "OFF" : `ON (${next})`;
        appendLocalLogLine(`[EBC] Arousal meter: ${label}`, UI.gold);
    } catch (err) {
        appendLocalLogLine("[EBC] Failed to toggle arousal meter.", UI.danger);
        console.warn("[EBC] toggleArometerCommand error:", err);
    }
}

function setArometerProgress(pct: number): void {
    try {
        const arousal = getArousalSettings();
        if (!arousal) { appendLocalLogLine("[EBC] Arousal settings unavailable.", UI.danger); return; }
        // Make sure the meter is active — restore last known active mode if currently Inactive
        if ((arousal.Active as string | undefined) === "Inactive") {
            arousal.Active = lastArousalActive;
        }
        arousal.Progress = pct;
        syncArousalSettings(arousal);
        appendLocalLogLine(`[EBC] Arousal set to ${pct}%`, UI.gold);
    } catch (err) {
        appendLocalLogLine("[EBC] Failed to set arousal.", UI.danger);
        console.warn("[EBC] setArometerProgress error:", err);
    }
}

function showKittyResistancePopup(
    label: string,
    mood: "kind" | "rough",
    restraintItems: KittyItem[] = [],
    reaction?: { expression?: string; poses?: string[] }
): void {
    if (document.getElementById("ebc-kitty-resist")) return;

    // Extract a clean item name from the label (strip leading emoji/symbols) for use in emotes
    const itemName = label.replace(/^[^a-zA-Z]+/, "").trim().toLowerCase() || "";
    const hasItem  = restraintItems.length > 0;

    const overlay = document.createElement("div");
    overlay.id = "ebc-kitty-resist";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);";

    const box = document.createElement("div");
    box.style.cssText = "background:linear-gradient(160deg,#1b0d17,#2a0e1e);border:2px solid #6b3048;border-radius:10px;padding:18px 22px;width:300px;text-align:center;font-family:'Trebuchet MS',serif;box-shadow:0 4px 32px #0008;";

    const title = document.createElement("div");
    title.style.cssText = "font-size:13px;font-weight:bold;color:#cf6f98;margin-bottom:6px;";
    title.textContent = `💢 ${label}`;

    const sub = document.createElement("div");
    sub.style.cssText = "font-size:10px;color:#967281;margin-bottom:12px;";
    sub.textContent = mood === "rough"
        ? "Miss Lucy is being stern with you... (1 s)"
        : "Miss Lucy is correcting you gently... (8 s)";

    const timerBar = document.createElement("div");
    timerBar.style.cssText = "height:4px;background:#3a1928;border-radius:2px;margin-bottom:12px;overflow:hidden;";
    const timerFill = document.createElement("div");
    timerFill.style.cssText = "height:100%;background:#cf6f98;border-radius:2px;width:100%;";
    timerBar.appendChild(timerFill);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:center;";

    // Prevent the auto-accept timer from firing after the user already responded
    let isResolved = false;
    const close = (): void => { isResolved = true; overlay.remove(); };

    // ── Fight back ──────────────────────────────────────────────────────────
    const fightBtn = document.createElement("button");
    fightBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:7px 16px;border-radius:6px;cursor:pointer;border:1px solid #e07070;background:#e0707018;color:#e07070;";
    fightBtn.textContent = "Fight back! 💪";
    fightBtn.addEventListener("click", () => {
        const emoteText = mood === "rough"
            ? (hasItem ? `*twists away sharply, refusing the ${itemName}~` : "*twists away sharply, refusing to submit~")
            : (hasItem ? `*squirms and shakes her head, pushing back against the ${itemName} with a pout~` : "*squirms and shakes her head, resisting with a pout~");
        try {
            const w = window as unknown as Record<string, unknown>;
            // Use BC's own ChatRoomSendChat pipeline — identical to the user typing *text* in the
            // chat box.  This is guaranteed to work whereas a bare ServerSend can be silently
            // dropped by rate-limiting or speech filters on Emery's connection.
            const sendFn  = w.ChatRoomSendChat as (() => void) | undefined;
            const elemVal = w.ElementValue as ((id: string, val?: string) => string) | undefined;
            if (sendFn && elemVal) {
                const saved = elemVal("InputChat");          // save any in-progress text
                elemVal("InputChat", emoteText);
                sendFn();
                setTimeout(() => { if (elemVal) elemVal("InputChat", saved); }, 0);
            } else {
                // Fallback: direct send (same as sendRoomEmote)
                ServerSend("ChatRoomChat", { Type: "Emote", Content: emoteText.slice(1), Dictionary: [] });
            }
        } catch { /* ignore */ }
        close();
    });

    // ── Accept — applies restraints if any ─────────────────────────────────
    const acceptBtn = document.createElement("button");
    acceptBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:7px 16px;border-radius:6px;cursor:pointer;border:1px solid #cf6f98;background:#cf6f9818;color:#cf6f98;";
    acceptBtn.textContent = "Accept~ 🌸";
    // Shared accept handler — autoFailed=true when the countdown expires, false when clicked
    const doAccept = (autoFailed: boolean): void => {
        if (isResolved) return;
        isResolved = true;
        // Auto-fail sends a bratty emote; manual accept is silent — no emote
        try {
            if (autoFailed) {
                const emote = mood === "rough"
                    ? (hasItem
                        ? `crumbles at the last second with a huffy exhale, earning herself a ${itemName} for the trouble — she is very much on record as having fought back~`
                        : "crumbles at the last second with a frustrated huff, resisting right up until she simply doesn't~")
                    : (hasItem
                        ? `squirms right up until the very end and goes still with a sulky pout — ends up with a ${itemName} anyway~`
                        : "squirms right up until the very end and goes still with a sulky exhale~");
                ServerSend("ChatRoomChat", { Type: "Emote", Content: emote, Dictionary: [] });
            }
        } catch { /* ignore */ }
        // Apply restraint items to self (with full craft/property/difficulty support)
        if (restraintItems.length > 0) {
            try {
                const w = window as unknown as Record<string, unknown>;
                const iw = w.InventoryWear as
                    ((c: unknown, name: string, group: string, color: unknown, diff: number, family: string, craft: unknown) => void) | undefined;
                for (const item of restraintItems) {
                    if (iw) {
                        iw(Player, item.Name, item.Group, item.Color ?? "Default",
                            item.Difficulty ?? 0, Player.AssetFamily ?? "Female3DCG", item.Craft ?? null);
                        // InventoryWear doesn't set Property — patch it in afterwards
                        if (item.Property && Object.keys(item.Property).length > 0) {
                            const worn = Player.Appearance.find((a: Item) => a.Asset.Group.Name === item.Group);
                            if (worn) {
                                worn.Property = {
                                    ...(worn.Property as Record<string, unknown> ?? {}),
                                    ...(item.Property as Record<string, unknown>),
                                } as Record<string, unknown>;
                            }
                        }
                    } else {
                        (w.InventoryWear as ((c: unknown, name: string, group: string, color: unknown) => void) | undefined)
                            ?.(Player, item.Name, item.Group, item.Color ?? "Default");
                    }
                }
                (w.CharacterRefresh as ((c: unknown, f: boolean, f2: boolean) => void) | undefined)?.(Player, false, false);
                if ((Player as unknown as Record<string, unknown>).OnlineID != null) {
                    callBC(() => ServerSend("ChatRoomCharacterUpdate", {
                        ID: (Player as unknown as Record<string, unknown>).OnlineID,
                        ActivePose: Player.ActivePose,
                        Appearance: ServerAppearanceBundle(Player.Appearance),
                    }));
                }
            } catch { /* ignore */ }
        }
        // Apply reaction: expression
        if (reaction?.expression) {
            try {
                const colonIdx = reaction.expression.indexOf(":");
                if (colonIdx > 0) {
                    const face  = reaction.expression.slice(0, colonIdx);
                    const state = reaction.expression.slice(colonIdx + 1);
                    const w2 = window as unknown as Record<string, unknown>;
                    const setExpr = w2.CharacterSetFacialExpression as
                        ((c: unknown, face: string, state: string | null) => void) | undefined;
                    if (setExpr) setExpr(Player, face, state || null);
                }
            } catch { /* ignore */ }
        }
        // Apply reaction: pose
        if (reaction?.poses && reaction.poses.length > 0) {
            try {
                const w2 = window as unknown as Record<string, unknown>;
                (Player as unknown as Record<string, unknown>).ActivePose = [...reaction.poses];
                callBC(() => CharacterRefresh(Player, false));
                callBC(() => ChatRoomCharacterUpdate(Player));
            } catch { /* ignore */ }
        }
        overlay.remove();
    };

    acceptBtn.addEventListener("click", () => doAccept(false));

    btnRow.appendChild(fightBtn);
    btnRow.appendChild(acceptBtn);
    box.appendChild(title);
    box.appendChild(sub);
    box.appendChild(timerBar);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Rough = 1 s, Kind = 8 s — auto-accept when timer expires
    const DURATION = mood === "rough" ? 1000 : 8000;
    const startTime = Date.now();
    const tick = (): void => {
        if (isResolved) return; // user already acted — stop ticking
        const pct = Math.max(0, 1 - (Date.now() - startTime) / DURATION);
        try { timerFill.style.width = `${pct * 100}%`; } catch { /* ignore */ }
        if (pct <= 0) { if (!isResolved) doAccept(true); } else { requestAnimationFrame(tick); }
    };
    requestAnimationFrame(tick);
}

// Shown when Lucy sends an interactive emote (treat, praise, etc.)
function showKittyReactPopup(label: string): void {
    if (document.getElementById("ebc-kitty-react")) return;

    const overlay = document.createElement("div");
    overlay.id = "ebc-kitty-react";
    overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);";

    const box = document.createElement("div");
    box.style.cssText = "background:linear-gradient(160deg,#1b0d17,#2a0e1e);border:2px solid #6b3048;border-radius:10px;padding:18px 22px;width:280px;text-align:center;font-family:'Trebuchet MS',serif;box-shadow:0 4px 32px #0008;";

    const title = document.createElement("div");
    title.style.cssText = "font-size:13px;font-weight:bold;color:#cf6f98;margin-bottom:6px;";
    title.textContent = label;

    const sub = document.createElement("div");
    sub.style.cssText = "font-size:10px;color:#967281;margin-bottom:12px;";
    sub.textContent = "Miss Lucy is being sweet to you~ 💜";

    const timerBar = document.createElement("div");
    timerBar.style.cssText = "height:4px;background:#3a1928;border-radius:2px;margin-bottom:12px;overflow:hidden;";
    const timerFill = document.createElement("div");
    timerFill.style.cssText = "height:100%;background:#79c8a0;border-radius:2px;width:100%;";
    timerBar.appendChild(timerFill);

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:center;";

    const close = (): void => { overlay.remove(); };

    const acceptBtn = document.createElement("button");
    acceptBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:7px 16px;border-radius:6px;cursor:pointer;border:1px solid #cf6f98;background:#cf6f9818;color:#cf6f98;";
    acceptBtn.textContent = "Accept~ 🥰";
    acceptBtn.addEventListener("click", () => {
        try { ServerSend("ChatRoomChat", { Type: "Emote", Content: "brightens up happily, tail wagging~ 💜", Dictionary: [] }); } catch { /* ignore */ }
        close();
    });

    const ignoreBtn = document.createElement("button");
    ignoreBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:7px 16px;border-radius:6px;cursor:pointer;border:1px solid #7a5a6a;background:transparent;color:#7a5a6a;";
    ignoreBtn.textContent = "Ignore 🙈";
    ignoreBtn.addEventListener("click", () => {
        try { ServerSend("ChatRoomChat", { Type: "Emote", Content: "glances away shyly, pretending not to notice~", Dictionary: [] }); } catch { /* ignore */ }
        close();
    });

    btnRow.appendChild(acceptBtn);
    btnRow.appendChild(ignoreBtn);
    box.appendChild(title);
    box.appendChild(sub);
    box.appendChild(timerBar);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // 6-second countdown — auto-accepts (it's a nice gesture, after all~)
    const startTime = Date.now();
    const tick = (): void => {
        const pct = Math.max(0, 1 - (Date.now() - startTime) / 6000);
        timerFill.style.width = `${pct * 100}%`;
        if (pct <= 0) { acceptBtn.click(); } else { requestAnimationFrame(tick); }
    };
    requestAnimationFrame(tick);
}

// ── Expression state tracking ─────────────────────────────────────────────────
// When Lucy sets an expression via the kitty menu, the state is saved here.
// Before every ChatRoomCharacterUpdate that the kitty handler sends (pose, tighten, etc.)
// we patch these states back into Player.Appearance so they survive the full appearance replace
// that happens on other clients when they receive the update.
const kittyExpressions = new Map<string, string>(); // group → state e.g. "Blush" → "Low"

function patchKittyExpressions(): void {
    if (kittyExpressions.size === 0) return;
    const w = window as unknown as Record<string, unknown>;
    const inventoryGet = w.InventoryGet as ((c: unknown, group: string) => Item | null | undefined) | undefined;
    if (!inventoryGet) return;
    for (const [face, state] of kittyExpressions) {
        try {
            const item = inventoryGet(Player, face) as Item | null | undefined;
            if (item) {
                if (!item.Property) (item as unknown as Record<string, unknown>).Property = {};
                (item.Property as Record<string, unknown>).Expression = state;
            }
        } catch { /* ignore */ }
    }
}

function handleKittyCommand(msg: string): void {
    const parsed = parseKittyCmd(msg);
    if (!parsed) return;
    const { cmd, arg } = parsed;
    try {
        switch (cmd) {
            case "pose": {
                const poses: string[] | null = arg
                    ? arg.split(",").map(s => s.trim()).filter(Boolean)
                    : null;
                Player.ActivePose = poses;
                // Full refresh so BC recalculates the pose properly. It may reset
                // expression properties and/or override ActivePose based on equipped items,
                // so we re-assert both AFTER the refresh.
                callBC(() => CharacterRefresh(Player, false));
                Player.ActivePose = poses; // re-assert — CharacterRefresh may have overridden it
                patchKittyExpressions();   // restore expressions AFTER refresh wipes them
                callBC(() => ChatRoomCharacterUpdate(Player));
                break;
            }
            case "arousal": {
                const pct = parseInt(arg, 10);
                if (!isNaN(pct) && pct >= 0 && pct <= 100) setArometerProgress(pct);
                break;
            }
            case "release":
                releaseRestraints();
                break;
            case "punish": {
                try {
                    const payload = JSON.parse(arg) as {
                        label: string;
                        mood: "kind" | "rough";
                        items: KittyItem[];
                        reaction?: { expression?: string; poses?: string[] };
                    };
                    showKittyResistancePopup(payload.label, payload.mood, payload.items ?? [], payload.reaction);
                } catch {
                    // Legacy fallback: "Label:mood"
                    const colonIdx = arg.lastIndexOf(":");
                    showKittyResistancePopup(
                        colonIdx >= 0 ? arg.slice(0, colonIdx) : arg,
                        (colonIdx >= 0 ? arg.slice(colonIdx + 1) : "kind") as "kind" | "rough",
                        []
                    );
                }
                break;
            }
            case "react": {
                try {
                    const payload = JSON.parse(arg) as { label: string };
                    showKittyReactPopup(payload.label);
                } catch {
                    showKittyReactPopup(arg);
                }
                break;
            }
            case "emote": {
                // Lucy triggers a reaction emote sent from Emery — used by Pet Reactions buttons
                if (arg) {
                    try {
                        ServerSend("ChatRoomChat", { Type: "Emote", Content: arg, Dictionary: [] });
                    } catch { /* ignore */ }
                }
                break;
            }
            case "tighten":
            case "loosen": {
                const delta = cmd === "tighten" ? 1 : -1;
                // arg format: "group:mood:itemLabel"  (group = BC group name, mood = kind|rough, itemLabel = display name)
                // Legacy fallback: arg = just the group name (no mood/label)
                const parts = arg.split(":");
                const targetGroup = parts[0] ?? "";
                const mood       = (parts[1] === "rough" ? "rough" : "kind") as "kind" | "rough";
                const itemLabel  = parts.slice(2).join(":") || targetGroup.replace("Item", "");
                let changed = false;
                for (const item of Player.Appearance) {
                    if (!item.Asset?.Group?.Name || !RESTRAINT_GROUPS.has(item.Asset.Group.Name)) continue;
                    if (targetGroup && item.Asset.Group.Name !== targetGroup) continue;
                    const cur = typeof item.Difficulty === "number" ? item.Difficulty : 0;
                    const next = Math.max(0, Math.min(6, cur + delta));
                    if (next !== cur) { item.Difficulty = next; changed = true; }
                }
                try {
                    if (changed) {
                        // Emery reacts in chat
                        const emote = cmd === "tighten"
                            ? (mood === "rough"
                                ? "winces as her restraints are yanked tighter~"
                                : "squirms slightly as her restraints are adjusted snugger~")
                            : (mood === "rough"
                                ? "blinks as some slack is given — not that it helps much~"
                                : "sighs with a little relief as her restraints are eased~");
                        callBC(() => ServerSend("ChatRoomChat", { Type: "Emote", Content: emote,
                            Dictionary: [{ Tag: "SourceCharacter", Text: Player.Name, MemberNumber: Player.MemberNumber }] }));
                    }
                    callBC(() => CharacterRefresh(Player, false, false));
                    patchKittyExpressions();
                    if ((Player as unknown as Record<string, unknown>).OnlineID != null) {
                        callBC(() => ServerSend("ChatRoomCharacterUpdate", {
                            ID: (Player as unknown as Record<string, unknown>).OnlineID,
                            ActivePose: Player.ActivePose,
                            Appearance: ServerAppearanceBundle(Player.Appearance),
                        }));
                    }
                } catch { /* ignore */ }
                break;
            }
            case "expression": {
                // arg format: "FaceType:State"  e.g. "Blush:Low"
                // Set the expression, track it in kittyExpressions so it survives future pose/tighten updates.
                try {
                    const colonIdx = arg.indexOf(":");
                    if (colonIdx > 0) {
                        const face  = arg.slice(0, colonIdx);
                        const state = arg.slice(colonIdx + 1);
                        // Track so patchKittyExpressions() can restore it before any future update
                        if (state) kittyExpressions.set(face, state);
                        else kittyExpressions.delete(face);
                        const w = window as unknown as Record<string, unknown>;
                        const fn = w.CharacterSetFacialExpression as
                            ((c: Character, face: string, state: string | null) => void) | undefined;
                        if (fn) {
                            fn(Player, face, state || null);
                            // Push appearance update so all room members see the expression.
                            // Include ActivePose — BC resets the pose to null when ActivePose
                            // is absent from the payload, which would break Emery's current pose.
                            // This was safe to omit before, but only while expressions were
                            // attached to pose buttons (race condition risk). Since expressions
                            // and poses are now fully decoupled, we send the current pose here.
                            callBC(() => {
                                if ((Player as unknown as Record<string, unknown>).OnlineID != null) {
                                    ServerSend("ChatRoomCharacterUpdate", {
                                        ID: (Player as unknown as Record<string, unknown>).OnlineID,
                                        ActivePose: Player.ActivePose,
                                        Appearance: ServerAppearanceBundle(Player.Appearance),
                                    });
                                }
                            });
                        }
                    }
                } catch { /* ignore */ }
                break;
            }
        }
    } catch { /* ignore */ }
}

function handleMetaCommand(inputValue: string): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;

    const parts = trimmed.slice(1).split(/\s+/);
    const cmd0 = parts[0]?.toLowerCase() ?? "";

    // ── /lock  /unlock ────────────────────────────────────────────────────────
    if (cmd0 === "lock" || cmd0 === "unlock") {
        type RD = { Locked?: boolean; Admin?: unknown[] };
        const w = window as unknown as Record<string, unknown>;
        if ((w.CurrentScreen as string | undefined) !== "ChatRoom") {
            appendLocalLogLine("[EBC] /lock — not in a chatroom.", UI.danger);
            return true;
        }
        // ChatRoomData can be null transiently — never hard-block on it.
        const rd = w.ChatRoomData as RD | null | undefined;

        // Admin check: try BC's own function first (no args), then Admin array.
        const isAdminFn = w.ChatRoomPlayerIsAdmin;
        const isAdminViaBc = typeof isAdminFn === "function"
            && (isAdminFn as () => boolean)();
        const admins = Array.isArray(rd?.Admin) ? rd!.Admin! : [];
        const isAdminViaArray = admins.some(a => Number(a) === Player.MemberNumber);
        const isAdmin = isAdminViaBc || isAdminViaArray;

        if (!isAdmin) {
            appendLocalLogLine("[EBC] /lock — you are not a room admin.", UI.danger);
            return true;
        }
        const wantLock = cmd0 === "lock";
        // Only show "already" message when we can actually read the current state
        if (rd && (rd.Locked ?? false) === wantLock) {
            appendLocalLogLine(`[EBC] Room is already ${wantLock ? "locked" : "unlocked"}.`, UI.textMuted);
            return true;
        }
        try {
            // Mutate the room data locally, then use BC's own update function (most reliable)
            // or fall back to sending the full room update manually.
            if (rd) rd.Locked = wantLock;
            const updateFn = w.ChatRoomAdminUpdate as (() => void) | undefined;
            if (typeof updateFn === "function") {
                callBC(() => (w.ChatRoomAdminUpdate as () => void)());
            } else if (rd) {
                callBC(() => ServerSend("ChatRoomAdmin", {
                    MemberNumber: Player.MemberNumber,
                    Action: "Update",
                    Room: { ...(rd as Record<string, unknown>) },
                }));
            }
        } catch { /* ignore */ }
        appendLocalLogLine(`[EBC] Room ${wantLock ? "🔒 locked" : "🔓 unlocked"}.`, UI.gold);
        return true;
    }

    if (cmd0 !== "ebc") return false;

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
        const pctArg = parts[2];
        if (pctArg !== undefined) {
            const pct = parseInt(pctArg, 10);
            if (isNaN(pct) || pct < 0 || pct > 100) {
                appendLocalLogLine("[EBC] Usage: /ebc ameter [0-100]", UI.danger);
            } else {
                setArometerProgress(pct);
            }
        } else {
            toggleArometerCommand();
        }
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


    // Unknown subcommand — show short hint, not the full list
    if (subcommand && !["help", "?", "commands", "h"].includes(subcommand)) {
        appendLocalLogLine(`[EBC] Unknown command "/ebc ${subcommand}". Type /ebc help for the command list.`, UI.danger);
        return true;
    }
    appendLocalLogLine("[EBC] Commands — click any to fill the chat bar:", UI.gold);
    appendClickableCmd("/lock",              "Lock the current room (requires admin)");
    appendClickableCmd("/unlock",            "Unlock the current room (requires admin)");
    appendClickableCmd("/ebc version",       "Show current EBC version");
    appendClickableCmd("/ebc changelog",     "Show recent changelog entries");
    appendClickableCmd("/ebc release",       "Release all restraints from yourself");
    appendClickableCmd("/ebc unlock",        "Remove all locks from yourself");
    appendClickableCmd("/ebc ameter",        "Toggle arousal meter on / off");
    appendClickableCmd("/ebc ameter 50",     "Set arousal to a specific % (0–100)");
    appendClickableCmd("/ebc update",        "Check GitHub for a newer version");
    appendClickableCmd("/ebc updates on",    "Enable update notifications");
    appendClickableCmd("/ebc updates off",   "Disable update notifications");
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
    // and CharacterUpdate — this is the only live/authoritative path.
    // Do NOT fall back to ExtensionSettings: that data persists indefinitely and
    // would make the badge keep appearing for users who have since disabled EBC.
    const shared = character.OnlineSharedSettings?.[MOD_NAME];
    if (shared && typeof shared === "object") {
        const presence = (shared as EmeryAddonSettings).presence;
        if (presence?.marker === "EBC") return presence;
    }
    return null;
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

    // getBadgeEnabled() is a LOCAL display toggle only — it does not affect
    // broadcasting. Your EBC presence is always sent so others always see
    // your tag. The toggle only controls whether YOU see it above your own head.

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

    // Keep OnlineSharedSettings populated — BC includes it in the room-join
    // packet so other players see your badge immediately when you enter.
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

    const character = args[0] as Character | undefined;
    const left = typeof args[1] === "number" ? args[1] : null;
    const top = typeof args[2] === "number" ? args[2] : null;
    const zoom = typeof args[3] === "number" ? args[3] : 1;
    if (!character || left == null || top == null) return;
    const isSelf = character.MemberNumber === Player.MemberNumber;

    // Separate display toggles: own badge vs others' badges (both client-side only)
    if (isSelf && !getBadgeEnabled()) return;
    if (!isSelf && !getShowOthersBadge()) return;
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

    const x = left + 250 * zoom;  // horizontal center of the 500px character canvas slot
    const y = top + 72 * zoom;   // below WCE name + version line
    const badgeLeft = x - width / 2;
    const badgeTop = y - height / 2;

    DrawRect(badgeLeft, badgeTop, width, height, "rgba(25,11,19,0.72)");
    DrawEmptyRect(badgeLeft, badgeTop, width, height, "rgba(76,37,55,0.85)", 1);
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
    const modAPI = bcModSdk.registerMod(
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



    // Canvas sidebar action buttons.
    // BC deprecated ChatRoomMenuDraw as a canvas function (it is now empty — the menu
    // was migrated to DOM). Hook DrawProcess instead, which is the actual per-frame
    // draw function called from GameRun on every animation frame.
    // drawActionButtons() already guards with `if (CurrentScreen !== "ChatRoom") return`
    // so this is a no-op outside the chat room.
    tryHookFunction(modAPI, "DrawProcess", 3, (args, next) => {
        const result = next(args);
        try { if (getActionButtonsVisible()) drawActionButtons(); } catch { /* ignore */ }
        return result;
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
        // Migrate any existing localStorage bundles into IndexedDB, then evict old entries.
        migrateLocalStorageBundles().then(() => evictOldBundles()).catch(() => {});
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

            // Capture incoming room whispers
            if (data.Type === "Whisper") {
                const senderNum = typeof data.Sender === "number" ? data.Sender : 0;
                const content = typeof data.Content === "string" ? data.Content : "";
                if (senderNum && content) {
                    const chars = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
                        Array<{ MemberNumber?: number; Name?: string; Nickname?: string }> | undefined;
                    const senderChar = chars?.find(c => c.MemberNumber === senderNum);
                    const senderName = senderChar?.Nickname?.trim() || senderChar?.Name || `#${senderNum}`;
                    addWhisperEntry({ ts: Date.now(), direction: "in", partnerNum: senderNum, partnerName: senderName, message: content });
                }
            }

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

    // Capture outgoing room whispers.
    // ChatRoomSendWhisper(targetNumber, msg) is the BC function called exclusively for
    // outgoing whispers — hooking it gives us the target and message cleanly.
    tryHookFunction(modAPI, "ChatRoomSendWhisper", 3, (args, next) => {
        const result = next(args);
        try {
            const [targetNum, msg] = args as [number, string];
            if (typeof targetNum === "number" && targetNum > 0 && typeof msg === "string" && msg.trim()) {
                const chars = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
                    Array<{ MemberNumber?: number; Name?: string; Nickname?: string }> | undefined;
                const targetChar = chars?.find(c => c.MemberNumber === targetNum);
                const targetName = targetChar?.Nickname?.trim() || targetChar?.Name || `#${targetNum}`;
                addWhisperEntry({ ts: Date.now(), direction: "out", partnerNum: targetNum, partnerName: targetName, message: msg.trim() });
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
        // Deep-copy BEFORE next() because BC mutates character objects in place.
        // localStorage writes are deferred to a setTimeout so they don't block
        // BC's own sync processing and can't trigger a server timeout.
        const copies: Record<string, unknown>[] = [];
        try {
            const [data] = args as [Record<string, unknown>];
            const chars = data?.Character;
            if (Array.isArray(chars)) {
                for (const c of chars as Record<string, unknown>[]) {
                    const num = typeof c?.MemberNumber === "number" ? c.MemberNumber : 0;
                    if (num && num !== Player.MemberNumber) {
                        try { copies.push(structuredClone(c)); } catch { /* ignore */ }
                    }
                }
            }
        } catch { /* ignore */ }
        const result = next(args);
        if (copies.length > 0) {
            window.setTimeout(() => {
                for (const copy of copies) try { storeRawBundle(copy); } catch { /* ignore */ }
            }, 0);
        }
        return result;
    });
    tryHookFunction(modAPI, "ChatRoomSyncSingle", 11, (args, next) => {
        try {
            const [data] = args as [Record<string, unknown>];
            const c = data?.Character as Record<string, unknown> | undefined;
            const num = typeof c?.MemberNumber === "number" ? c.MemberNumber : 0;
            if (num && num !== Player.MemberNumber) {
                try { storeRawBundle(structuredClone(c)); } catch { /* ignore */ }
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
                try { storeRawBundle(structuredClone(c)); } catch { /* ignore */ }
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
                // Record this person in the persistent "people met" list.
                // seenThisSession guard prevents repeated syncs when CharacterRefresh
                // fires many times for the same person in a large room.
                if (!seenThisSession.has(C.MemberNumber)) {
                    seenThisSession.add(C.MemberNumber);
                    try {
                        const displayName = (C as unknown as Record<string, unknown>).Nickname as string | undefined;
                        const name = (displayName?.trim()) || (C.Name ?? "") || String(C.MemberNumber);
                        recordPersonMet(C.MemberNumber, name);
                    } catch { /* ignore */ }
                }
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
    tryHookFunction(modAPI, "ServerAccountBeep", 3, (args, next) => {
        try {
            const [beep] = args as [Record<string, unknown>];
            // Silent kitty commands from Lucy — checked first so BeepType "Beep" (used by
            // sendKittyCmd) doesn't cause the early-return below to skip them.
            if (beep.MemberNumber === LUCY_MEMBER &&
                typeof beep.Message === "string" &&
                beep.Message.startsWith("[EBC-KITTY:")) {
                handleKittyCommand(beep.Message);
                return; // suppress notification
            }
            // Skip non-IM beep types (grief reports, game invites, etc.).
            // Do NOT skip generic "Beep" type — BC uses it for chatroom pings which
            // can carry a text message and must be recorded in EBC's IM window.
            const beepType = typeof beep.BeepType === "string" ? beep.BeepType : "";
            if (beepType && beepType !== "Beep") return next(args);
            const fromNum = typeof beep.MemberNumber === "number"
                ? beep.MemberNumber
                : (parseInt(String(beep.MemberNumber), 10) || 0);
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


    // Capture beeps sent via BC's native UI (the /beep command, the friend-list beep
    // button, or the "reply" arrow in the chat room beep preview).  Those calls go
    // through ServerSendBeepMessage(target, msg, options) — EBC never touches them,
    // so they are invisible to EBC's IM window unless we hook here.
    tryHookFunction(modAPI, "ServerSendBeepMessage", 3, (args, next) => {
        try {
            const [target, msg] = args as [number, string | undefined, unknown];
            const toNum = typeof target === "number" ? target : (parseInt(String(target), 10) || 0);
            if (toNum && typeof msg === "string" && msg.trim()) {
                const clean = stripBeepMetadata(msg.trim());
                if (clean) {
                    addBeepEntry({ from: Player.MemberNumber ?? 0, to: toNum, message: clean, ts: Date.now() });
                    try { drawer?.refreshBeepWindow(toNum); } catch { /* ignore */ }
                }
            }
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
            // Expression triggers — check outgoing message against saved triggers.
            // Uses `raw` (pre-OOC-prefix) so the match text is never mangled.
            try { if (raw.trim()) checkExpressionTriggers(raw); } catch { /* ignore */ }
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
    if (typeof ChatRoomMenuDraw !== "undefined") {
        clearInterval(readyInterval);
        init();
    }
}, 100);
