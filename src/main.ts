import { EBCDrawer, showConfirmOverlay } from "./modules/drawer";
import { drawActionButtons, handleActionButtonClick, initDragListener } from "./modules/actionButtons";
import { handleOutfitCommand, handleRestraintCommand, RESTRAINT_GROUPS } from "./modules/outfitManager";
import { addWhisperEntry } from "./modules/whisperLog";
import { handlePoseComboCommand } from "./modules/poses";
import { handleExprSequenceCommand, getAutoApplyDefaultFace, getDefaultExprPresetId, getExpressionPresets, applyExpressionPreset } from "./modules/expressions";
import { handleSceneCommand } from "./modules/scenes";
import { handleDomCommand, applyPositions, clearAllPositions } from "./modules/domTools";
import { releaseRestraints, unlockItems } from "./modules/restraints";
import { getBadgeEnabled, getShowVersionBadge, getShowOthersVersionBadge, getShowOthersBadge, getActionButtonsVisible, getBeepMuted, getSuppressNativeBeep, getUseNativeBeepSound, getOnlineSoundEnabled, getUpdateNotify, setUpdateNotify, getAfkEnabled, getAfkThreshold, getAfkMessage, getOocEnabled, recordPersonMet, migratePeopleMetToLocal, getBadgeStyle, getOthersBadgeStyle, getBadgeScale, getTextBadgeScale, getCatBadgeScale, getBadgeBgOpacity, getBadgeTextOpacity, getBadgeOffsetX, getBadgeOffsetY, setBadgeOffsetX, setBadgeOffsetY, getCatBadgeOffsetX, getCatBadgeOffsetY, setCatBadgeOffsetX, setCatBadgeOffsetY, getBadgeDragMode, setBadgeDragMode, getBadgeDragStyleTarget, getVersionTextOffsetX, getVersionTextOffsetY, setVersionTextOffsetX, setVersionTextOffsetY, isBeepMemberMuted, getShowSalVersion, getLianChatCompat } from "./modules/settings";
import { antiRestraintOnPlayerRefresh, snapshotPlayerRestraints, recordRestrainer, getLastRestrainerName } from "./modules/antiRestraint";
import { onRoomSync, onRoomLeave, onMemberJoin, detectNewJoins } from "./modules/roomHistory";
import { snapshotForLog, checkRestraintChanges, setPendingLogApplier } from "./modules/restraintLog";
import { timerOnRoomEnter, timerOnRoomLeave, timerCheckRestraints } from "./modules/timer";
import { logMessage } from "./modules/devLog";
import { UI } from "./modules/ui";
import { appendLocalLogLine } from "./modules/notify";
import { addBeepEntry, cacheName, cacheAccountName, getCachedNames, cacheEBCVersion, updateOnlineFriends, stripBeepMetadata, syncFriendsSince, storeRawBundle, extractGroupTag, addGroupBeepEntry, flushNameCache, setOnFriendCameOnlineCallback, resolveName } from "./modules/friends";
import { migrateLocalStorageBundles, evictOldBundles } from "./modules/db";
import { checkSafeword, enforceGracePeriod, checkGraceExpiry } from "./modules/safeword";
import { callBC, syncSettings, initSettings, reinitFromExtensionSettings, isLeavePending, clearLeavePending, setCurrentRoomName, clearCurrentRoomName, fireRoomSearchResult } from "./modules/bcUtils";
import { checkExpressionTriggers } from "./modules/expressions";
import { LUCY_MEMBER, EMERY_MEMBER, parseKittyCmd, type KittyItem } from "./modules/kitty";
import bcModSdk from "bondage-club-mod-sdk";

const MOD_NAME = "EBC";
const MOD_VERSION = "8.3.1";
const SAL_VERSION  = 146;   // internal sub-version - shown when Emery Versioning is ON
const IS_DEV_BUILD = true; // true on dev branch, false on master

let noticeShown = false;
// Set to true by the beep hook when we want to let the mod chain through
// (for LianChat/WCE compat) but still block BC's native notification.
let _ebcBlockBeepNative = false;

// Members already recorded in "people met" this session — avoids redundant server syncs
// on repeated CharacterRefresh calls for the same person in a large room.
const seenThisSession = new Set<number>();

// -- AFK auto-reply state -------------------------------------------------------
let lastActivityTime = Date.now();
const afkBeepCooldown = new Map<number, number>(); // memberNumber → last beep-reply ts
const AFK_REPLY_COOLDOWN_MS = 30 * 60 * 1000;
const CHANGELOG: Array<{ version: string; changes: string[] }> = [
    {
        version: "8.3.1",
        changes: [
            "Removed: Auto-greet feature.",
            "UX: AFK Auto-Reply is now a top-level section in the Notes tab instead of a hidden sub-section inside Chat and Notifications.",
            "Dev: member 147036 now has access to the PiShock menu.",
            "Fix: EBC no longer intercepts *emote sends before BC's hook chain runs, restoring UBC's whisper-emote feature. Root cause: EBC's capture-phase keydown listener and ChatRoomSendChat/ChatRoomKeyDown hooks were intercepting emotes and calling ServerSend directly, bypassing ChatRoomSendChat entirely so UBC's hook on that function never fired. Fix: removed EBC's emote interception entirely - BC's native emote handling runs the full hook chain as expected.",
            "Fix: clicking a beep notification for a window that is already open (but minimized elsewhere) no longer snaps it to screen center. Root cause: openBeepWindow always repositioned existing windows to viewport center when re-opening. Fix: existing windows are now un-minimized and focused in place.",
            "Removed: 'Member # to DM' input from Notes tab - AccountBeep is not reliably delivered to non-friends so the feature was not useful.",
            "Fix: chat textarea now resets its height after sending a * emote message. Root cause: BC skips its own textarea height reset for emote sends; EBC now clears the inline height explicitly after every ChatRoomSendChat call.",
            "Fix: resize handles on beep/DM windows are now hidden when the window is minimized, preventing the corner hitbox from covering the close button.",
            "Anims: added 'Tight Back' pose (BackElbowTouch) to the Arms section and pose combos (Tight Back, Kneel+Tight).",
            "Anims: pose buttons in the Anims tab now announce the action in room chat (e.g. 'kneels down', 'raises their arms above their head').",
            "Action buttons: each button now has a Pose row in the editor - pick a body pose, arm pose, or both to apply automatically when the button fires.",
            "Fix: dragging a minimized beep window to the top of the screen and then restoring it no longer pushes the header off-screen. Root cause: bottom was clamped to innerHeight-44 while minimized but not re-clamped to innerHeight-fullHeight on restore. Fix: re-clamp bottom in a rAF after removing the minimized class.",
            "Fix: group chat windows can no longer be dragged off the top or sides of the screen. Root cause: the group window drag used unclamped top/left. Fix: clamp both axes to keep the window within the viewport.",
            "Feedback form: added optional 'Include my name' checkbox (off by default) - when checked, appends the user's nickname and username to the version field in the submission.",
            "Fix: resizing a beep window downward past the viewport bottom no longer causes the window to grow upward. Root cause: height was computed directly from the raw drag delta, so once the bottom anchor hit 0 it kept increasing. Fix: clamp bottom first, then derive height from how far the bottom actually moved.",
            "Chat and notifications: added 'Keep beep popups until dismissed' toggle (sticky mode - popups stay until clicked) and 'Popup dismiss time' number input (1-60 s, default 5) to control how long beep toasts stay on screen.",
        ],
    },
    {
        version: "8.3.0",
        changes: [
            "Fix: text size scaling above 100% no longer shows dead space at the bottom of the panel. Root cause: Chrome's flex algorithm does not account for CSS zoom when computing a flex child's main-axis contribution - at scale>1 the zoom wrapper's layout size was under 100% of the panel height, leaving visible dark space. Fix: switched from CSS zoom to transform:scale on the zoom wrapper. transform changes only the visual rendering and does not affect layout, so flex always sees the raw inv% size and the visual exactly fills the panel.",
            "Fix: dragging the panel by the header no longer snaps to the wrong position when text size is above 100%. Root cause: CSS zoom on the zoom wrapper affected coordinate reporting for elements inside it in Chrome. Switching to transform:scale removes CSS zoom from the coordinate system entirely, fixing the snap.",
            "Fix: Live support badge now appears correctly when the EBC HQ room is open. Root cause: BC R128 changed the room search API from { Name } to { Query, Language } - the old payload was silently ignored by the server, returning empty results. Also removed the window.ChatRoomList fallback which does not exist in BC R128.",
            "Fix: dragging a beep window no longer snaps to the wrong position when text size is above 100%. Root cause: Chrome scales clientX/Y for mousedown events fired on children of a CSS-zoomed element (divides by the zoom factor), so the cursor-to-window offset was wrong at scale != 1. Fix: switched to anchoring from the first document-level move event, which is always in true viewport coordinates regardless of any CSS zoom on child elements.",
            "Fix: Live support badge and room info chips now receive search results correctly. Root cause: the previous socket.io fallback used window.io.managers which does not exist in socket.io v4 (it was a v2-era API), so the ChatRoomSearchResult listener was silently never registered. Fix: switched to window.ServerSocket.on() - ServerSocket is declared as a top-level var in BC's classic Server.js and is reliably accessible on window.",
            "Fix: beep window drag no longer snaps at scale != 1. Root cause: CSS zoom distorts event clientX/Y inside a zoomed element (Chrome divides by zoom factor). getBoundingClientRect also has ambiguous values for scaled elements depending on the transform origin, making offset-based drag calculations brittle. Fix: switched beep/group windows from CSS zoom to transform:scale (event coords are always true viewport coords). Drag now uses getComputedStyle to read the initial layout-space left/bottom (resolving right:X correctly and never affected by transforms), then tracks a simple clientX/Y delta from the mousedown position.",
            "Fix: Live support badge now actually appears when the EBC HQ room is open. Root cause: EBC initializes before BC fires window.load, so window.ServerSocket is still null when the ChatRoomSearchResult relay listener was registered - the call was a silent no-op and results never reached the HQ scanner. Fix: the HQ scanner now registers its own ServerSocket.once() listener directly inside doScan (runs 8 s after drawer init, well after window.load), and the shared relay in main.ts retries every 2 s until ServerSocket is non-null.",
            "Fix: panel position is now saved correctly across restarts. Root cause: savePanelPosition wrote directly to Player.ExtensionSettings.EmeryBC.panelPos, but syncSettings() runs flushToExtensionSettings() 400 ms later which overwrites it with _mem.panelPos (still null from the server). Fix: route panelPos through getSettings()/_mem so flushToExtensionSettings picks it up correctly.",
            "Fix: newlines in beep messages are now preserved in the chat history. Root cause: the message div used the default white-space:normal, which collapses \\n to spaces. Fix: white-space:pre-wrap on the text div.",
            "Fix: Imgur links now embed as images in beep windows. Previously only URLs with explicit image extensions (.jpg, .png, etc.) were embedded. imgur.com/ID and i.imgur.com/ID links (without extension) are now detected and embedded via i.imgur.com/ID directly.",
            "Fix: URLs in beep messages are now rendered as clickable links. Previously all message text was plain textContent so URLs were unclickable. Album links (imgur.com/a/) and other non-image URLs are not embedded but are now at least clickable.",
            "Fix: Live support badge no longer disappears while EBC HQ is still open. Root cause: once() per scan consumed any ChatRoomSearchResult event - if BC's own room search UI or another addon fired one first, our once fired with the wrong data (no HQ room found) and hid the badge. Fix: single permanent on() listener registered on first scan, guarded by a 10 s timestamp window so only results from our own ServerSend are trusted.",
            "Fix: replying to a multi-line message no longer bleeds extra lines into the reply body. Root cause: setReply stored the full multi-line quoted text; the parser splits on the first newline only, so subsequent lines of the quote appeared as part of the reply's own message. Fix: setReply now only keeps the first line of the quoted text.",
            "Fix: quick-emote sidebar buttons no longer respond to clicks when hidden. Root cause: the ChatRoomClick hook called handleActionButtonClick() without checking getActionButtonsVisible() - buttons were not drawn but their hit areas were still active. Fix: added the same getActionButtonsVisible() guard to the click handler that the draw path already had.",
            "Fix: replying to an action message (*emote*) with another action no longer leaves the reply bar stuck open. Root cause: when an active BC reply state existed (reply indicator showing), EBC's handleEmoteShortcut fired, sent the emote via bare ServerSend (no replyId, no ChatRoomMessageReplyStop call), and returned early - skipping BC's native ChatRoomSendEmote which normally includes the reply context and clears the indicator. Fix: when ChatRoomMessageGetReplyId() returns a value, handleEmoteShortcut returns false and lets BC's own ChatRoomSendEmote handle the message natively.",
            "Fix: Live support badge now reliably appears when EBC HQ is open. Root cause: another addon's ChatRoomSearchResult (no HQ, arrived before ours) reset scanSentAt=0 via the 10s guard, then our actual positive result was blocked by the scanSentAt===0 early-return. Fix: positive results (HQ found) now bypass the timestamp guard entirely - any result containing HQ is always trustworthy. Added a 15 s no-response self-heal timer and three early scans (8 s / 20 s / 45 s) to survive first-load timing races.",
            "Fix: Live support badge now persists correctly while inside a chat room and refreshes promptly on return to the lobby. Root cause: BC server silently ignores ChatRoomSearch while the player is in a room - the resulting empty response was incorrectly hiding the badge. Fix: doScan now skips when CurrentScreen is ChatRoom so the badge holds its last known state. A 5 s polling loop detects room exits and triggers a fresh scan 1.5 s later so the badge updates quickly when returning to the lobby.",
            "Fix (safety): the safeword no longer strips restraints locked with an owner timer lock. Root cause: the protected-lock list had a typo 'OwnerTimedPadlock' but BC's actual asset name is 'OwnerTimerPadlock', so the exact-match protection never triggered and a safeword/grace event could remove an owner-timer-locked item meant to be protected.",
            "Fix: a failed outfit or restraint-set swap can no longer permanently disable all future swaps. Root cause: outfitApplyPending was set true before an unguarded synchronous block whose only reset lived inside a later setTimeout - any throw before that timeout was scheduled stuck the flag true forever ('An outfit swap is already in progress.'). Fix: a 5 s watchdog guarantees the flag clears regardless, cancelled on the normal success path.",
            "Fix (memory leak): the Toys tab no longer stacks a permanent 800ms sync-status timer on every re-render. Root cause: the poller was stored in a local variable and only self-cleared when no toys card was present, but each re-render (toggle, or any toy-control beep) created a fresh card so the old poller never stopped - during an active toy session these accumulated indefinitely along with detached DOM nodes. Fix: the poller is stored on the instance and cleared before each re-render, on tab switch, and on teardown.",
            "Fix (memory leak): the HQ room-exit watcher, BC-Lovense live-sync poller, and toys sync-status poller are now all cleared when the drawer is torn down, instead of running orphaned for the rest of the session.",
            "Fix: typing a second different *emote* quickly no longer gets silently dropped. Root cause: the duplicate-fire guard (which dedups the same Enter keypress arriving through three interceptors) was keyed on time alone, so any emote within 500ms of the previous one was swallowed. Fix: the guard now also compares the emote text, so only a true re-fire of the same emote is suppressed - distinct emotes always send.",
            "Perf: reduced per-frame cost of the quick-action sidebar (runs ~60x/sec in a chat room). The MainCanvas 2d context is now cached instead of re-queried from the DOM per button per frame, fitted button-label font sizes are memoized instead of re-measured every frame, the one-time legacy-button-style migration no longer re-scans every category/button each frame, and the presence-badge buffer reuses its array and skips sorting when 0-1 badges are present.",
            "Fix: the restraint log now shows who applied a lock instead of '#<lockname>'. Root cause: it read Property.LockedBy (the lock's asset name, e.g. 'MetalPadlock') as if it were a member number, so the locker lookup never matched. Fix: resolve the locker from Property.LockMemberNumber and use LockedBy only to detect that the item is locked.",
            "Fix: importing a button config no longer truncates labels to 6 characters. Root cause: the import path sliced labels to 6 chars while the editor and export use 16, so re-importing an exported config silently shortened any label longer than 6. Fix: import now matches the 16-character limit.",
            "Fix: the friends 'oldest/newest friendship' sort is now stable when two friends both have no recorded friendship date. Root cause: both fell back to the same Infinity sentinel and Infinity - Infinity is NaN, which makes the sort order undefined. Fix: fall back to a name comparison when the date difference is NaN.",
            "Fix: a saved scene with a corrupt/non-numeric step delay no longer fires all of its remaining steps at once. Root cause: a NaN delay poisoned the running offset so every later setTimeout was scheduled with NaN (treated as 0). Fix: non-finite step delays are now treated as 0.",
        ],
    },
    {
        version: "8.2.9",
        changes: [
            "Fix: text size slider no longer breaks the panel layout when scaling up (scale>1). Root cause: overflow:hidden added to #emerybc-panel in 8.2.8 created a conflicting clip context on top of the one already in .ebc-panel, breaking CSS zoom at scale>1. Fix: removed it (the inner .ebc-panel already clips correctly). Also flex-shrink:0 no longer applied at scale>1 where it is not needed.",
            "Fix: Live support badge now uses name-only matching and adds a window.ChatRoomList poll 2s after each search as a fallback, covering cases where the socket.io callback fires before the badge callback is registered.",
        ],
    },
    {
        version: "8.2.8",
        changes: [
            "Fix: text size no longer breaks the panel layout at any zoom level. Root cause: CSS zoom with inv% on the wrapper was being flex-shrunk back to 100% at scale<1, making content appear at only (scale×100)% of the panel instead of filling it. Fix: flex-shrink:0 prevents the shrink; overflow:hidden on #emerybc-panel clips the layout overflow so the panel size stays unchanged.",
            "Fix: panel drag no longer snaps when text size is not 100%. Changed drag handler to anchor from the first document-level move event instead of the mousedown position - document events are always in viewport coordinates regardless of CSS zoom on ancestors.",
            "Explain EBC message rewritten: removed 'private' claim (it is public on FUSAM), removed awkward 'I use' phrasing, now answers 'what does your addon do?' directly and mentions FUSAM.",
        ],
    },
    {
        version: "8.2.7",
        changes: [
            "Fix: dragging the panel by the header no longer snaps to the wrong position when text size is not 100%. Root cause: CSS zoom on .ebc-zoom-wrapper scales clientX/Y for mousedown events fired on elements inside it (Chromium behaviour), but document-level mousemove events are not affected - multiplying the mousedown origin by the zoom factor corrects both to viewport space.",
            "Buttons tab: Explain EBC tool is now Emery-only (was all credited users). Added a Chat button alongside Whisper - Whisper sends privately to the selected person, Chat broadcasts to the room. Message simplified to not mention private-only features.",
            "Footer: shows a flashing green [Live support] badge next to Suggestions & Bugs when the EmeryBC (EBC) HQ room is open. Badge scans every 2 minutes; clicking it offers to join the room.",
        ],
    },
    {
        version: "8.2.6",
        changes: [
            "Redesigned CURSE panel - cleaner card layout with a bordered item picker (full-row clickable, subtitles show slot name, highlighted when selected), pill-style preset duration buttons with a separate custom d/h/m/s row below, taller action buttons, and active curse cards with a left accent bar.",
            "Fix: ANIMS tab now correctly responds to the tab visibility toggle - the button had the wrong element ID (ebc-tab-poses instead of ebc-tab-anims) so hiding it in DEV settings had no effect.",
            "Fix: TOYS tab now appears in the DEV tab visibility grid so it can be hidden.",
            "Fix: Action buttons sidebar (emote side menu) now defaults to OFF on accounts where it has not been explicitly enabled - previously it defaulted to ON on every new/alt account.",
            "Renamed footer button and modal title from 'Suggestions' to 'Suggestions & Bugs'.",
            "Buttons tab: added 'Explain EBC to' whisper tool visible to all credited users (VIP_MEMBERS) - pick a room member from the dropdown and send them a one-click whisper describing the addon.",
            "Fix: text size slider no longer breaks the panel layout when scaling below 100%. Root cause: inverse sizing (100/scale %) exceeded 100% at scale < 1, making the zoom wrapper wider/taller than the panel and causing flex children to overflow. Scale-down now keeps the wrapper at 100% and lets the zoomed content be smaller.",
        ],
    },
    {
        version: "8.2.5",
        changes: [
            "Curse custom duration picker now uses separate d/h/m/s fields instead of a single minutes input - applies in both the DOM curse panel and the kitty menu.",
            "Kitty menu (Lucy view): active curses now tracked locally so each curse can be lifted individually with a per-item dismiss button (sends [EBC-CURSE:clear:Group] beep); 'Clear All' still clears everything at once.",
            "Active Curses pause picker now has d/h/m/s custom inputs alongside the preset chips - type any combination and hit the play button to send a custom pause duration.",
            "Game Toys - Control a Friend: added Direct intensity slider (0-20) below the mode buttons. Dragging it sends [EBC-TOY:LV:n:0] to the friend, which their client forwards straight to Lovense at that exact level (continuous, bypasses BC mode system). Slider shows 'off' at 0, 'n/20' otherwise; sends on mouse-release plus a 120ms debounce while dragging.",
            "Fix: BC TOY SYNC now reads Item.Property.Intensity directly from each worn vibrator item (the actual current intensity, -1 to 3) instead of ArousalSettings.VibratorLevel (a secondary derived value used by the arousal meter, weighted by zone preference factors). All modes - static (Low/Medium/High/Max) and dynamic (Escalate, Tease, Edge, etc.) - write their live intensity to Property.Intensity each scriptDraw tick; this is now correctly mirrored to Lovense at 0/5/10/15/20.",
            "Fix: cursed items no longer disappear when the curse timer expires. Two related issues fixed: (1) auto-lift now pushes the current appearance state for every cursed slot to the server before clearing curse data, preventing a race where an in-flight server removal wins after the data is cleared; (2) the ChatRoomSyncItem correction callback now skips sending if the slot is empty, avoiding accidentally broadcasting a removal for a slot that was legitimately cleared during a pause.",
            "Kitty menu: added 🍆 Penis Enlargement button at the bottom - shows a private local message to Lucy only. No further questions asked.",
            "PiShock: removed Chat Triggers section and the chat-message trigger listener - only shock collar (TriggerShock BC action) and test buttons remain.",
            "Fix: BC TOY SYNC now detects vibrating chastity belts, vibrating plugs, and other built-in-vibe items by also checking Asset.Archetype === 'vibrating', in addition to the Property.Mode check. Previously those items were skipped if Mode was undefined.",
            "Renamed 'Feedback & Bugs' button and form to 'Suggestions' - more accurately reflects what people send.",
        ],
    },
    {
        version: "8.2.4",
        changes: [
            "PiShock shock collar now triggers correctly - BC sends Content='TriggerShock0/1/2' and target is in DestinationCharacterName (not TargetCharacter); all checks were previously wrong so shock collar never fired PiShock.",
            "PiShock BC Events configuration removed entirely - shockers now always fire automatically when BC shocks you, using Allow flags to pick the operation (Shock if allowed, else Vib, else Beep). No setup or toggles needed.",
            "PiShock: Trusted Senders whitelist - add trusted people by member number; each shocker has a 'Trusted only' toggle that when on only fires that shocker if the person who triggered the BC shock is in the whitelist. Toggle off to let anyone trigger it.",
        ],
    },
    {
        version: "8.2.3",
        changes: [
            "PiShock UI redesign: collapsible connection section (auto-collapses once credentials are saved), global safety cap (hard max intensity + duration applied to every shock), pre-shock warning chain (optional beep and/or vibrate before any shock with 1s gaps), user-editable intensity levels (4 named levels - Low/Medium/High/Max - with customizable name, intensity%, and duration per level), device type selector per shocker (Collar/Chastity/Prongs/Clamps/Plug/Custom), BC events and chat triggers now reference levels by name instead of raw numbers.",
            "PiShock fix: shock collars and electro items send Type:Action (not Activity) messages - now hooked; checks Content tag for 'shock'/'electro' keywords and routes to PiShock trigger. Added Shock entry to BC event list so shockers can be configured to fire on shock collar activation.",
            "PiShock fix: shock collar Action message Content is TriggerShock0/1/2 (not a 'shock' keyword) and target is in DestinationCharacterName tag (not TargetCharacter) - both checks were wrong so the hook never matched and PiShock never fired. Now correctly detects TriggerShock prefix and reads MemberNumber from DestinationCharacterName.",
            "PiShock fix: BC shock collar now auto-fires using the shocker's Allow flags when no BC Event is explicitly configured - Beep allowed fires a beep, Vib fires a vibrate, Shock fires a shock; no need to dig into BC Events just to get a beep from the collar.",
            "PiShock: BC Events section redesigned - now a clearly bordered accent-colored panel (open by default, with lightning icon and subtitle) instead of tiny collapsed text. Reduced TOUCH_DEFS to only relevant shock/pain activities: Bite, Spank, Slap, Pinch, Shock (removed Headpat, Caress, Kiss, Lick, Tickle, Squeeze, Rub, Choke, Grab).",
            "PiShock fix: chat triggers now also fire on your own outgoing messages, not just others' - previously the sender filter blocked self-sent phrases entirely.",
            "Curses: DOM can now temporarily pause a curse from the Active Curses list - click the timer button on any curse row to pick a duration (5m/15m/30m/1h/2h); sends a pause beep to the target whose client skips enforcement until the timer expires, then the curse automatically re-engages.",
        ],
    },
    {
        version: "8.2.2",
        changes: [
            "i18n: all new UI strings are now fully translated - Tutorial mode selector and step labels, Feedback form, PiShock setup modal, Toys tab headers and controls, and the Tutorial/Feedback footer buttons. Switch language mid-session and everything updates instantly.",
            "README updated to cover the Toys tab (Game Toys, IRL/Lovense, PiShock), Tutorial (Quick Tour / Full Guide), and the Feedback & Bug Reports form.",
            "PiShock debug: always log ps_url and ps_redirected from Worker response. Added 'Direct (no proxy)' test button per shocker that sends a beep straight to PiShock bypassing the Cloudflare Worker - check F12 Network tab to see raw response and diagnose 404.",
            "PiShock fix attempt: Worker now sends Origin and Referer headers spoofed as https://pishock.com when forwarding to PiShock API - CORS analysis showed PiShock only allows their own origin, so raw server-side requests get 404.",
            "PiShock proxy: switched setup guide from Cloudflare Workers to Deno Deploy - Cloudflare datacenter IPs are blocked by PiShock's WAF (confirmed: GET:404 from Worker). Deno Deploy runs on Google Cloud infra, not Cloudflare, so PiShock won't block it. Embedded proxy code updated to Deno.serve() syntax.",
            "PiShock proxy fix: add Deno.createHttpClient({ http2: false }) to force HTTP/1.1 - PiShock's server advertises HTTP/2 via ALPN but drops the streams immediately, causing 'http2 error: unspecific protocol error'. HTTP/1.1 bypasses this.",
            "PiShock proxy diagnostic: remove trailing slash from apioperate URL, add Accept header, re-add GET diagnostic (getCheck) to tell if the route exists (405 = exists POST-only, 404 = route gone).",
            "PiShock URL fix: Swagger revealed paths use /Api/ (capital A) not /api/ - server migrated to Linux with case-sensitive routing. Updated PS_URL to https://do.pishock.com/Api/ApiOperate (PascalCase matching Swagger route pattern /Api/GetLastLogs).",
            "PiShock API migration: do.pishock.com Legacy API Swagger confirms apioperate endpoint is completely absent - removed from server. Full Swagger probe revealed new 'PiShock Public API v1' at api.pishock.com. Updated proxy code: now POSTs to api.pishock.com/Shockers/{Code} with X-PiShock-Api-Key + X-PiShock-Username headers (auth moved from body to headers), Duration converted from seconds to milliseconds (new API requirement), Op renamed to Operation.",
            "PiShock UUID bridge: new API requires UUID as ShockerId (not share code). Legacy do.pishock.com/Api/GetKeyFromShort returns base64(shareCode::UUID) - proxy now decodes this to extract the UUID, then operates via api.pishock.com/Shockers/{UUID}. UUID cached in-memory per Deno instance to avoid repeated lookups.",
            "PiShock WORKING: new API ShockerId is the integer shockerId from GetShareCodes (not a UUID). Proxy now calls GetShareCodes, finds share by linkCode match, extracts integer shockerId, calls api.pishock.com/Shockers/{shockerId} - returns HTTP 204 on success. firePiShock updated to treat ps_status 204 as ok. Beep/vibrate/shock confirmed working end-to-end.",
        ],
    },
    {
        version: "8.2.1",
        changes: [
            "Tutorial: clicking Tutorial now shows a mode selection screen — choose Quick Tour (5 steps, every feature in 2 minutes) or Full Guide (12 steps, full walkthrough with try-it prompts). Guide panel is wider with a proper welcome header.",
            "Feedback form: BC member number is now silently attached to every submission (shown in the version field as '8.x.x | #12345') so spam or misuse can be blocked by member number.",
            "PiShock (Emery-only dev): re-added to TOYS tab. Per-user Cloudflare Worker proxy - credentials never leave your own Worker. Supports multiple shockers, per-shocker allow toggles, max intensity/duration limits, test buttons, and chat phrase triggers. Worker code included in-panel with a Copy button.",
        ],
    },
    {
        version: "8.2.0",
        changes: [
            "Tutorial: redesigned from 16 text-heavy steps to 8 short interactive ones — each with a clear label, a pulsing spotlight on the relevant UI element, and a try-it nudge.",
            "Fix: panel zoom now works correctly at all scale levels — switched from CSS transform:scale to CSS zoom so content never bleeds outside or double-shrinks when zooming out.",
            "Feedback: new in-game anonymous form (footer Feedback & Bugs button) — pick a type, describe the issue, hit Send; no browser tab, no account, submitted silently from the game.",
            "IRL toys: two-remote support — when multiple Lovense toys are connected, the controller shows a separate vibrate panel per toy with independent Intensity/Duration sliders.",
            "Toy whitelist: entries now show display names beside member numbers; 'No need to ask' instant-control toggle added — OFF by default for safety.",
        ],
    },
    {
        version: "8.1.2",
        changes: [
            "Fix: panel zoom now works correctly at all scale levels — switched from CSS transform:scale to CSS zoom so content never bleeds outside the panel or gets double-shrunk when zooming out.",
            "Toy whitelist: entries now show the friend's display name beside their member number (resolved from the room or your friend nicknames), for both IRL and game toys.",
            "Feedback form: privacy line is now a highlighted callout reading 'Anonymous — No account, no email, nothing tied to you.'",
            "Feedback form: cleaner readable sans-serif font, unified rose colour scheme (no more pink/purple clash), and tighter spacing.",
            "Footer: moved the Tutorial and Feedback & Bugs buttons to the very bottom, beneath the online/room/bound timers.",
            "Feedback form redesign: cleaner layout, no emoji, segmented Type selector, focus highlights on the text fields, and polished Send/Cancel buttons.",
            "Toy whitelist: added a 'No need to ask' toggle (IRL + game toys). OFF by default for safety — whitelisted friends still send a request you approve. Turn it ON to let trusted friends take instant control with no popup.",
            "Footer redesign: 'Tutorial' and 'Feedback & Bugs' buttons now sit together at the top of the footer (above the version line) where they're easy to find. Removed the floating '?' button from the bottom corner, and moved Feedback out of the cramped header so nothing overflows when you drag the window.",
            "Feedback: header button now shows a bug icon + 'Feedback & Bugs' label, and the in-game form submits the exact option values the backend expects (fixes the Type field not registering).",
            "Feedback: 🐛 Feedback button now opens a form right inside EBC — pick a type, type your message, hit Send, and it's submitted anonymously without ever leaving the game. No browser tab, no account, no email.",
            "Feedback: 🐛 button now links to an anonymous Google Form instead of GitHub — no account needed to submit a bug report or feature request.",
            "Feedback: added 🐛 button in the EBC panel header — opens the GitHub issue tracker to report bugs or request features.",
            "Lovense: phrase triggers now have toy chips too — each chat phrase trigger can target a specific toy (or All), same as body-touch triggers.",
            "IRL toys / Game toys: added auto-accept whitelist — if a friend is on your whitelist, their control request is accepted instantly without a popup. Whitelist is managed in the existing whitelist UI.",
            "IRL toys: two-remote support — when your controller has multiple toys connected, their ACK carries toy names and your controller UI shows a separate vibrate panel per toy with independent Intensity/Duration sliders and a targeted Vibrate button. Single-toy sessions show the existing single panel.",
            "Lovense: per-action toy routing — each body-touch trigger (headpat, spank, etc.) now has toy chips showing all connected toys. Click a chip to restrict that trigger to a specific toy; 'All' resets to firing everything. Works across both BLE and HTTP toys simultaneously.",
            "Lovense HTTP: connected toys now appear as cards (matching BLE style) with a Test button and per-toy Intensity/Seconds sliders. Attempts to fetch real toy names via GetToys command; falls back to 'Lovense Connect' placeholder if unavailable.",
            "Lovense HTTP: toy sliders now labelled 'Intensity' and 'Seconds' instead of 'I:' and 'D:'. Updated setup instructions to correctly describe External Control → Allow Control. 'Connected (0 toys)' now shows a targeted hint to enable Allow Control.",
            "UI: brightened --ebc-text-sub across all themes (was too low-contrast on dark backgrounds); affects secondary labels, hints, and notes throughout the panel.",
            "Fix: Lovense HTTP /GetToys now correctly parses toy count — Lovense Connect v1 API returns data as a JSON-encoded string, not an object; count was always 0 before this fix.",
            "Settings: added 'LianChat compatibility' toggle in Chat & Notifications — OFF by default (beeps suppressed from BC chat); ON lets BC native run so LianChat/WCE get full passthrough at the cost of beeps appearing in BC's default chat.",
            "Fix: beep suppression now uses a sentinel hook so LianChat/WCE still see friend beeps through the mod chain, but BC's native chat notification is blocked as intended.",
            "Kitty menu: added 📍 Position section (Pull to Side, Get in Arms, Hold in Arms, Release from Arms) — Lucy can now reposition Emery directly from the kitty menu.",
            "Lovense BLE: increased service discovery retries (5 attempts, up to ~8s total) and added per-UUID fallback — fixes 'No services found' on Domi and other toys where GATT discovery is slow.",
            "Lovense: each connected BLE toy now has its own intensity (I:) and duration (D:) sliders in the toy list — triggers with no explicit intensity use the toy's individual setting.",
            "Lovense BLE: writeWithoutResponse now falls back to writeValue on failure — fixes 'Access is denied' error for Firefox users running the WebBT BLE polyfill extension.",
            "Emery Versioning: SAL sub-version display moved from Emery-only hardcode to a toggle in DEV → Developer Tools — anyone can enable it to show (sN) in the EBC header.",
            "Lovense: HTTP card is now a collapsible dropdown (click header to expand/collapse, state saved). Fixed all low-contrast text-muted colors in Lovense section to text-bright/text-sub.",
        ],
    },
    {
        version: "8.1.1",
        changes: [
            "Lovense: added HTTP connection path via Lovense Connect app — works on Firefox and other non-BLE browsers. Configure the local API URL (default http://127.0.0.1:20010) in the IRL Toys section.",
            "LianChat compat: EBC beep hook now always passes events through the mod chain so mods like LianChat running on the same client also see incoming friend beeps.",
            "Version jump to 8.1.1. Internal sal sub-version counter added (only visible to Emery).",
        ],
    },
    {
        version: "6.9.73",
        changes: [
            "Fix: EBC drawer tab no longer disappears when a beep notification arrives — removed erroneous tab.style.position='relative' mutation in the unread-dot code (was overriding CSS position:absolute, causing tab offset to shift); raised root z-index from 99 to 101 (above BC's toast container at 100); heartbeat guard now also removes the HTML hidden attribute; added a periodic 5-second position re-sync.",
        ],
    },
    {
        version: "6.9.72",
        changes: [
            "Fix: grace period banner in the Safewords tab now appears and stays live while the tab is open — no longer requires closing and reopening the tab to see it after a safeword triggers.",
        ],
    },
    {
        version: "6.9.71",
        changes: [
            "Safewords: owner, lover (LoversPadlock/LoversTimerPadlock), and family (FamilyPadlock) locks are now always protected — safeword release and grace period enforcement never remove them. Removed the now-redundant 'Exclude owner locks' toggle.",
            "Fix: quick-reply toggle button in beep window footer no longer shows ▶/▼ arrow characters — uses a clean lines icon instead.",
        ],
    },
    {
        version: "6.9.70",
        changes: [
            "Fix: Grace=ON without Release=ON no longer removes existing restraints — grace now only strips items added AFTER the safeword was triggered.",
            "Safewords: added 'Exclude owner locks' toggle — skips OwnerPadlock / ExclusivePadlock items during both release and grace enforcement.",
        ],
    },
    {
        version: "6.9.69",
        changes: [
            "Kitty tab: added ⛓ Curse section — group chips + Apply/Clear buttons, targets Emery only.",
            "Fix: typing in a beep window no longer triggers WASD movement in map rooms.",
            "Fix: panel height is now correctly restored in roaming mode (main menu) instead of being capped at 520 px.",
        ],
    },
    {
        version: "6.9.68",
        changes: [
            "Fix: drawer tab no longer disappears after clicking a BC side beep notification and returning to chatroom.",
        ],
    },
    {
        version: "6.9.67",
        changes: [
            "Removed emotes collapsible section from kitty tab.",
            "Fun action buttons (Boop/Cuddle/Pet all) restyled with distinct accent colors, hover scale, and pill shape.",
        ],
    },
    {
        version: "6.9.66",
        changes: [
            "Fun Actions: added 'Cuddle all friends in room' and 'Pet all friends in room' buttons below Boop All.",
        ],
    },
    {
        version: "6.9.65",
        changes: [
            "Guide '?' button placed in footer, right side, absolute positioned - text stays centered, no overlap with scrollbar.",
        ],
    },
    {
        version: "6.9.64",
        changes: [
            "Guide '?' button repositioned: now a 30x30 pink square fixed at the bottom-right corner of the panel (above resize handle). Footer text restored to centered.",
        ],
    },
    {
        version: "6.9.63",
        changes: [
            "Guide '?' button moved from header to footer (bigger, pink, always visible). Removed from header.",
            "GAME TOYS header now shows a green 'X controlling you' badge when someone has active toy access.",
            "IRL TOYS 'LET OTHERS CONTROL YOUR TOY' header lights up with accent border and green badge when someone has active access.",
        ],
    },
    {
        version: "6.9.62",
        changes: [
            "TOYS tab is now visible to all users (removed hardcoded member restriction).",
            "IRL TOYS section renamed to 'IRL TOYS (lovense)'.",
            "GAME TOYS: added same-room note, improved privacy/whitelist descriptions, fixed 'No friends' text.",
            "All em-dashes (--) replaced with hyphens (-) throughout the UI.",
            "Guide: added Toys step covering GAME TOYS and IRL TOYS.",
            "Fix: removed overflow:hidden from ebc-panel so native select dropdowns are no longer clipped.",
        ],
    },
    {
        version: "6.9.61",
        changes: [
            "TOYS tab is now visible for member #215013.",
        ],
    },
    {
        version: "6.9.60",
        changes: [
            "GAME TOYS: mode buttons now call VibratorModeSetOptionByName on the target character directly (same as BC's DOM toy controller), so chat messages appear with the controller as source. Target applies the mode silently (no double message).",
        ],
    },
    {
        version: "6.9.59",
        changes: [
            "Fix: vib check now uses three fallbacks — Asset.Archetype, VibratorModeDataLookup key, and Property.Mode being set (covers handheld wands and older typed-vibrator items).",
        ],
    },
    {
        version: "6.9.58",
        changes: [
            "CHAT PHRASES, BODY TOUCH, BC TOY SYNC are now collapsible subsections (▶/▼, state saved in localStorage).",
            "BODY TOUCH: renamed 'I:' / 'D:' labels to 'Int:' / 'Dur:' for clarity; updated hint text.",
            "CHAT PHRASES: renamed 'I:' / 'D:' to 'Intensity:' / 'Duration:'; removed confusing '(blank = default)' suffix.",
        ],
    },
    {
        version: "6.9.57",
        changes: [
            "Fix: GAME TOYS vib check now uses Asset.Archetype instead of VibratorModeDataLookup (lookup was unreliable at render time).",
        ],
    },
    {
        version: "6.9.56",
        changes: [
            "TOYS: removed emoji icons from GAME TOYS and IRL TOYS section headers.",
        ],
    },
    {
        version: "6.9.55",
        changes: [
            "BODY TOUCH: checkboxes replaced with ON/OFF toggle buttons (accent-colored when active).",
        ],
    },
    {
        version: "6.9.54",
        changes: [
            "IRL TOYS: full layout redesign — collapsible sections (Let Others Control / Control a Friend), bigger font (12-13px), pill-style grant rows, sub-collapsible whitelist.",
            "GAME TOYS: Request button disabled with warning when selected friend has no vibrators equipped.",
        ],
    },
    {
        version: "6.9.53",
        changes: [
            "Chat phrase triggers now fire on emote messages (Type 'Emote') in addition to regular chat — *roleplay actions* now trigger correctly.",
        ],
    },
    {
        version: "6.9.52",
        changes: [
            "Fix: GAME TOYS vibrator control now works — uses BC's VibratorModeSetOptionByName() instead of manual property manipulation.",
            "Fix: Whitelist room dropdown now reappears after removing an entry (rebuilt on every renderWl call).",
            "GAME TOYS: Mode buttons now color-coded (Off=grey, Low=green, Medium=gold, High=orange, Max=pink, Tease=purple, Random=blue, Escalate=burnt-orange, Deny=red, Edge=magenta).",
        ],
    },
    {
        version: "6.9.51",
        changes: [
            "Fix: BODY TOUCH triggers now actually fire — BC activity Content is 'ChatOther-Group-Activity' not just the activity name, and group was read from wrong dictionary key (FocusGroupName not AssetGroupName).",
        ],
    },
    {
        version: "6.9.50",
        changes: [
            "Fix: GTSel TDZ crash when opening Toys tab (used before declaration).",
        ],
    },
    {
        version: "6.9.49",
        changes: [
            "Toys tab now visible for Julia (#197217) in addition to Emery and Lucy.",
        ],
    },
    {
        version: "6.9.48",
        changes: [
            "IRL TOYS: added Lovense Remote Control — others can request to fire your real toy via EBC-IRL whisper protocol. Toggle to allow requests, friends-or-whitelist gating, popup accept/deny, intensity+duration control panel, sessions shown in IRL TOYS tab.",
        ],
    },
    {
        version: "6.9.47",
        changes: [
            "GAME TOYS overhaul: now controls BC in-game vibrators (not Lovense directly). Sender UI replaced with Off/Low/Medium/High/Max + Tease/Random/Escalate/Deny/Edge buttons matching BC's TOY CONTROL layout. Receiver applies the mode to worn vibrator items via ChatRoomCharacterItemUpdate. Lovense follows automatically via BC TOY SYNC.",
        ],
    },
    {
        version: "6.9.46",
        changes: [
            "Toys tab now visible for Lucy (#230466) in addition to Emery.",
            "Fix: removed auto-injection of #230466 into every user's game toy whitelist (was a mistake from v6.9.43).",
        ],
    },
    {
        version: "6.9.45",
        changes: [
            "BC TOY SYNC: Replaced one-shot fire with live polling. Now reads Player.ArousalSettings.VibratorLevel every 500ms and maps the BC 0–4 scale to Lovense 0–20 continuously. BC already updates this value in real-time for ALL vibrator modes (Constant, Escalate, Random, Tease, Deny, Edge), so edge mode bounces, escalate ramps, random flickers — all mirror to Lovense automatically.",
            "BC TOY SYNC: Added max intensity cap slider (1–20) to limit how hard the Lovense goes even when BC toy is at max.",
            "BC TOY SYNC: Live status indicator in the panel shows whether the poller is running and the current Lovense level.",
            "BC TOY SYNC: Poller also auto-starts on room join (ChatRoomSync hook).",
        ],
    },
    {
        version: "6.9.44",
        changes: [
            "Fix: All var(--ebc-text) references replaced with var(--ebc-text-bright) — that variable didn't exist so form elements (input, select) fell back to browser-default black text. Inputs/selects now show correct light text on dark background.",
            "Fix: Added color-scheme:dark to styled select dropdowns so native option list also renders dark instead of white.",
        ],
    },
    {
        version: "6.9.43",
        changes: [
            "TOYS TAB: GAME TOYS moved above IRL TOYS. GAME TOYS section no longer has an ON/OFF toggle — always accessible.",
            "TOYS TAB: Full dark-theme styling pass — all hardcoded hex colors replaced with EBC CSS variables (--ebc-accent, --ebc-text-muted, --ebc-bg-darker, etc.). Native select elements now styled with appearance:none and custom purple arrow.",
            "GAME TOYS: Whitelist now shows 'Add from room' dropdown to pick people by name; manual member# input retained below. Member 230466 always pre-added to whitelist.",
            "GAME TOYS: Friend picker dropdown fully styled with EBC dark theme (no more OS-native white/black UI).",
            "IRL TOYS: CONNECTION section now supports multiple simultaneous Lovense toys — each connected toy shown in a list with individual disconnect (✗) button. 'Connect Another Toy' adds more toys without replacing the existing one.",
            "IRL TOYS: fireLovense() now fires vibrate to ALL connected toys in parallel.",
            "Fix: _showToyReqPopup and _showToyToast now correctly resolve the mk() helper (was failing at runtime).",
        ],
    },
    {
        version: "6.9.42",
        changes: [
            "Fix: Profile button now shows characters with their outfit and bio even across sessions. Character bundles (appearance, name, bio, etc.) are now persisted to localStorage (capped at 100 entries, oldest evicted) so profiles stay viewable after reloading the page. Previously bundles were session-memory only — reloading reset them and every offline profile showed a blank character.",
            "LOVENSE UI: Full Toys tab redesign — connected toy name shown with green dot, purple-themed Connect/Disconnect buttons.",
            "LOVENSE TRIGGERS: Added BODY TOUCH — 13 predefined actions (Headpat, Caress, Kiss, Lick, Bite, Spank, Slap, Tickle, Pinch, Squeeze, Rub, Choke, Grab) each with on/off toggle and per-trigger intensity/duration override.",
            "LOVENSE TRIGGERS: Added BC TOY SYNC — mirror BC toy activations on ItemVulva/ItemVulvaPiercings/ItemButt/ItemNipples to Lovense at configurable intensity/duration.",
            "LOVENSE: Duration slider extended to 60s (was 30s).",
            "LOVENSE: Chat phrase trigger UI polished with 'blank = default' hints on I/D inputs.",
            "TOYS TAB: IRL TOYS and GAME TOYS collapsible sections added.",
            "GAME TOYS: Friends-only remote toy control — send/accept vibrate commands via hidden EBC whispers, with request popup, whitelist, accept toggle, and revoke support.",
        ],
    },
    {
        version: "6.9.39",
        changes: [
            "DOM POSITION: Pull to Side / Get in Arms / Hold in Arms now immediately apply the position on the DOM player's screen (setPositionSilent) in addition to dispatching the ECHO activity — previously only the ECHO activity was sent so nothing moved locally.",
            "DOM POSITION: Release from Arms now clears the EBC position slot and immediately re-applies remaining positions (clearPosition now calls applyPositions) — previously the released character stayed in their moved spot until the next BC room sync.",
        ],
    },
    {
        version: "6.9.38",
        changes: [
            "TOYS: Removed PiShock integration entirely.",
        ],
    },
    {
        version: "6.9.37",
        changes: [
            "Lovense BLE: Expand optionalServices list with four more Lovense proprietary UUIDs (v1–v4 variants). Add retry logic — getPrimaryServices() is retried up to 3 times with delays after connect to handle GATT discovery timing. Improved error message when no services are found.",
        ],
    },
    {
        version: "6.9.36",
        changes: [
            "PiShock: Expand debug log to show first 8 chars and length of API key — helps diagnose 404 errors caused by a missing or incorrect API key.",
        ],
    },
    {
        version: "6.9.35",
        changes: [
            "Lovense BLE: Replace static service UUID guessing with dynamic service discovery — connects to any Lovense toy by enumerating all primary services and finding the first writable characteristic. Supports writeValueWithoutResponse for characteristics that require it. Logs discovered services/characteristics to console for debugging.",
        ],
    },
    {
        version: "6.9.34",
        changes: [
            "PiShock: Add debug console log showing username, share code, op, intensity, and duration before each proxy call — makes it easy to verify credentials are loaded correctly.",
        ],
    },
    {
        version: "6.9.33",
        changes: [
            "Lovense BLE: Fix connection for Gen2+ toys (Domi 2, Lush 3, etc.) that use Nordic UART Service (6e400001) instead of the Gen1 fff0 service. Now tries fff0 first, falls back to NUS automatically. Both services declared in optionalServices so Chrome grants access to either.",
        ],
    },
    {
        version: "6.9.32",
        changes: [
            "Lovense: Replaced Lovense Connect local HTTP API with direct Web Bluetooth (BLE). Click 'Connect' to pair your toy directly in the browser — no Lovense Connect app needed. Chrome/Edge only. Service 0000fff0, write characteristic 0000fff2. Vibrate:N; command sent on trigger; Vibrate:0; stop sent after duration via setTimeout.",
        ],
    },
    {
        version: "6.9.31",
        changes: [
            "PiShock: Send Op/Duration/Intensity as strings in the API payload — the PiShock docs show these as quoted strings and sending integers was causing 404 rejections.",
        ],
    },
    {
        version: "6.9.30",
        changes: [
            "DOM: Removed emojis from toy control mode buttons (Off, Low, Medium, High, Max, Tease, Random, Escalate, Deny, Edge).",
        ],
    },
    {
        version: "6.9.29",
        changes: [
            "PiShock: Shared EBC Cloudflare Worker proxy pre-configured as default — no setup needed for FUSAM users. Proxy URL field auto-populates on first open. Requests include an abuse-prevention token. Users can still replace with their own Worker.",
            "Lovense Connect: Full integration added to TOYS tab. Connection scan (auto-detects port 20010-30010), vibrate defaults (intensity 1-20, duration 1-30s), test button, and two trigger modes: (1) mirror PiShock shock triggers, (2) own phrase list with per-trigger intensity/duration overrides.",
        ],
    },
    {
        version: "6.9.28",
        changes: [
            "PiShock: Added CORS Proxy URL field to credentials section. Set this to your own Cloudflare Worker URL to bypass the PiShock CORS wall in FUSAM/page-context mode. When set, firePiShock() routes all requests through the proxy using Content-Type: application/json and reads the real server response — no more blind fire-and-forget.",
            "PiShock: Reverted @inject-into from 'auto' back to 'page' — the auto mode broke TOYS and DOM tabs for FUSAM users by making Player.MemberNumber unavailable. Proxy URL field is the correct CORS solution for FUSAM.",
            "rollup.config.mjs: Cleaned up stale comment about @inject-into auto / GM_xmlhttpRequest content-script approach.",
        ],
    },
    {
        version: "6.9.27",
        changes: [
            "PiShock FUSAM/page-context fix: replaced useless cors-mode fetch fallbacks (which all fail because PiShock locks CORS to pishock.com) with a no-cors + text/plain fetch. no-cors bypasses all browser CORS checks and delivers the request to PiShock's server. Response is opaque (no server confirmation), but the shocker should respond. Test buttons now show 'Sent blind — did the shocker respond?' in page-context mode.",
        ],
    },
    {
        version: "6.9.26",
        changes: [
            "PiShock CORS fix (root cause): PiShock's API allows only pishock.com as CORS origin — no browser fetch from bondage-europe.com can ever succeed. Fix: changed userscript from @inject-into page to @inject-into auto + @grant GM_xmlhttpRequest. Both Tampermonkey and Violentmonkey now inject EBC in content-script context where GM_xmlhttpRequest bypasses CORS entirely. A page-bridge IIFE (added to the banner) re-exposes BC's globals (Player, ChatRoomCharacter, etc.) via unsafeWindow getters so the rest of EBC works unchanged. REQUIRES REINSTALL — update button alone won't apply new @grant/@inject-into directives.",
        ],
    },
    {
        version: "6.9.25",
        changes: [
            "PiShock CORS fix attempt 2: fetch fallback now tries Content-Type: text/plain first (avoids CORS OPTIONS preflight; PiShock's server handles simple cross-origin POST), then falls back to application/json if that fails. Both paths log to F12 Console under [EBC PiShock]. Error message now directs users to F12 Console for diagnosis.",
        ],
    },
    {
        version: "6.9.24",
        changes: [
            "TOYS / PiShock: CORS fix — firePiShock() now tries GM_xmlhttpRequest first (bypasses CORS entirely for Tampermonkey users; @grant GM_xmlhttpRequest + @connect do.pishock.com added to userscript header). Falls back to fetch with credentials:'omit'. Both paths log to DevTools console for debugging.",
            "TOYS / PiShock: Per-shocker test buttons — replaced single '📡 Test' (beep only) with three buttons: '🔔 Beep', '〜 Vib', '⚡ Shock'. Each fires independently with bypass=true. Shock test requires a confirm dialog.",
            "TOYS / PiShock: UI readability improvements — all labels and inputs bumped from 10px to 11-12px. Section headers and limit value labels now bold. Inputs have more padding. Warning banner and credential notes improved.",
            "TOYS / PiShock: Allow-toggle row now prefixed with 'ALLOW:' label; test button row prefixed with 'TEST:' label for clearer visual grouping.",
            "BEEP: Chat message font-size bumped from 10px to 13px so emoji and text in the beep window are legible.",
        ],
    },
    {
        version: "6.9.23",
        changes: [
            "Fix: Friend names now resolve correctly for offline friends and friends not yet seen in a room. Root cause: resolveName() never checked BC's own Player.FriendNames map, which is populated at login from the server's LZ-compressed friend name store and covers ALL friends (online and offline). resolveName() now checks Player.FriendNames as a final fallback before #number, and caches the name on find. handleAccountQueryResult also proactively seeds the EBC cache from Player.FriendNames so offline friends are populated the first time AccountQueryResult fires (3 s after load).",
        ],
    },
    {
        version: "6.9.23",
        changes: [
            "TOYS tab: PiShock and Lovense are now collapsible sections within the same tab (▼/▶ header). Lovense removed as a standalone tab.",
            "TOYS tab: Lovense section added with ON/OFF toggle — shows 'coming soon' placeholder when enabled, off-note when disabled. Collapse state persists in localStorage.",
            "TOYS tab: PiShock section also collapsible — shows 'enable above' note when disabled, full settings when enabled and expanded.",
        ],
    },
    {
        version: "6.9.21",
        changes: [
            "New: Lovense tab added (placeholder — integration coming soon). Emery-only while in development.",
            "PiShock: API Key field now has a show/hide toggle (👁 eye button) so you can reveal the key to verify it without re-typing.",
            "PiShock: Credentials section header and note now use plain hyphens instead of em-dashes, and the note makes clear that EmeryBC never stores credentials anywhere — only in your own browser's localStorage.",
        ],
    },
    {
        version: "6.9.20",
        changes: [
            "PiShock: Redesigned to support multiple shockers and multiple chat triggers. Each shocker has its own name, share code, and per-shocker allow toggles (Beep/Vibrate/Shock). Chat triggers each specify a phrase, which shocker to fire, and which operation. All matching triggers fire independently (previously only one phrase was supported).",
            "PiShock: Share code field now auto-strips full PiShock share URLs (e.g. https://pishock.com/#/Control?sharecode=ABC) down to just the code. Placeholder updated to make the format clear.",
            "PiShock: Added credentials: 'omit' to API fetch to fix '⚠ Network error' that appeared on some setups due to CORS preflight issues.",
            "Fix: View Profile button in the friends/beep panel now works for users who have left the room — synthesizes a minimal bundle so the info sheet opens with the cached name and member number.",
            "Fix: People Met profile button now passes ID field in minimal bundle so CharacterLoadOnline no longer throws a TypeError when the person is not in the current room.",
        ],
    },
    {
        version: "6.9.19",
        changes: [
            "Fix: Friend names no longer reset to #number after leaving a room. ChatRoomSync and ChatRoomSyncSingle hooks now cache every character's name into friendNames before BC mutates the bundle. Previously only ChatRoomSyncMemberJoin cached names, so players already present when you joined were never cached — once you left the room and ChatRoomCharacter was cleared, resolveName() fell through to #number.",
            "Fix: Locker name in the restraints section now uses resolveName() so it shows the correct cached name even when the locker has left the room (previously fell back to #number for anyone not in ChatRoomCharacter).",
        ],
    },
    {
        version: "6.9.18",
        changes: [
            "Fix: TOYS tab credentials (username, API key, share code) now persist across relogs. Were using 'change' event which only fires on blur — clicking a toggle before leaving a field would destroy the input and lose the typed value. Switched to 'input' event so every keystroke writes to localStorage immediately.",
            "Fix: 'Failed to fetch' PiShock API error now shows a clearer message (network/ad-blocker/VPN hint) instead of the raw error string.",
            "New: 'Test Connection' button in the credentials section — fires a 1s/1% beep bypassing allow-toggles and cooldown to confirm credentials are valid.",
            "New: Chat trigger Action selector — choose Beep, Vibrate, Shock, or Auto (strongest allowed) per trigger phrase instead of always auto-picking.",
            "UI: Share code field now has a descriptive placeholder explaining what it is; credentials section is cleaner overall.",
        ],
    },
    {
        version: "6.9.17",
        changes: [
            "Fix: ChatRoomKeyDown crash ('Cannot read properties of undefined (reading length)') that occurred after interacting with the TOYS tab. BC's InputKeyDown crashes when ev.key is undefined, which happens when any hook in the chain passes a synthetic or plain object instead of a real KeyboardEvent. EBC's hook now guards against this and returns false early, preventing the crash.",
        ],
    },
    {
        version: "6.9.16",
        changes: [
            "New: TOYS tab with PiShock integration. Configure your PiShock username, API key, and share code (stored only in local browser storage, never synced to BC servers). Set per-operation limits (max intensity 1-100%, max duration 1-15s, cooldown 3-120s). Toggle Beep, Vibrate, and Shock independently (Shock requires an explicit confirmation dialog). Test buttons in the tab fire operations immediately. Optional chat-command trigger: set a phrase and anyone in the room saying it fires your enabled operations. Tab is toggleable in drawer settings like all other tabs.",
        ],
    },
    {
        version: "6.9.15",
        changes: [
            "Fix: 'Release from Arms' button now works correctly. Was sending Type:'Action' with free-form text, but BC treats Action Content as a localization key and showed 'MISSING TEXT IN Interface.csv: gently sets Lucas down.' — switched to Type:'Emote' which renders free-form text directly (BC prepends the sender's name). Also fixed target name showing account name instead of nickname.",
        ],
    },
    {
        version: "6.9.14",
        changes: [
            "Fix: ECHO addon activity messages (cuddle, pull to side, hold in arms) now show nicknames instead of account names. Was reading .Name directly from ChatRoomCharacter; now uses resolveName() which correctly prefers Nickname over Name.",
        ],
    },
    {
        version: "6.9.13",
        changes: [
            "Fix: EBC button (tab) no longer disappears when a beep notification opens the FriendList screen. Root cause: BC's async CommonSetScreen() can set display:none on unknown DOM elements after EBC's updateVisibility() runs. The CRABS poller heartbeat guard (which restores display:block within 200ms) was stopped in roaming mode, leaving the rootEl permanently hidden until the next screen navigation. Fix: keep the CRABS poller running in roaming mode so the heartbeat fires continuously, and remove the this.positioned guard so it protects visibility even before anchoring to the chat log.",
        ],
    },
    {
        version: "6.9.12",
        changes: [
            "Fix: Kiss action now targets ItemMouth ('Kiss Lips') instead of ItemHead ('Kiss Forehead') — gets proper lip emotes and BC animations.",
        ],
    },
    {
        version: "6.9.11",
        changes: [
            "Fix: Friend names now correctly persist across browser restarts. Root cause: reinitFromExtensionSettings() was called inside the PreferenceInitPlayer hook (BC line 1098) but Player.ExtensionSettings is set 85 lines later (BC line 1183) — so the reinit always read stale/empty data. Fix: pass args[1].ExtensionSettings.EmeryBC (the raw server response) directly to reinitFromExtensionSettings() instead of reading the not-yet-set Player.ExtensionSettings.",
        ],
    },
    {
        version: "6.9.10",
        changes: [
            "Fix: DOM Position 'Pull to Side' now sends HoldLeash before the ECHO activity so ECHO can trigger with any leash-effect item (ChokeChain, ChainLeash, CollarLeash, etc.) — not just a 'full leash'. Release button now sends StopHoldLeash to properly unhook the BC leash state.",
        ],
    },
    {
        version: "6.9.9",
        changes: [
            "Fix: DOM action buttons (Spank, Pat, Kiss, etc.) now use BC's ActivityRun pipeline — correct sounds, arousal updates, and BCX/LSCG reactions fire as if the button was clicked in BC's own dialog. Pat maps to BC's 'Pet' activity. Falls back to room action emote if ActivityRun is unavailable.",
            "Fix: ECHO position buttons (Pull to Side, Get in Arms, Hold in Arms) no longer show 'MISSING ACTIVITY DESCRIPTION FOR KEYWORD' in chat. A ChatRoomMessage hook intercepts at priority 0, lets ECHO process the position effect via next(), then immediately replaces any BC-rendered MISSING element with a proper action description.",
            "New: 'Release from Arms' button in DOM POSITION panel — sends a room action and clears local position tracking.",
        ],
    },
    {
        version: "6.9.8",
        changes: [
            "Fix: cursed item removal by other players now correctly blocked via ChatRoomSyncItem hook (fires before the item leaves Player.Appearance). Previous CharacterRefresh re-equip approach came too late. Blocked sync is immediately corrected back to the server so all clients see the item restored.",
        ],
    },
    {
        version: "6.9.7",
        changes: [
            "Cursed items now resist removal by anyone: if a dom or other player removes a cursed item via the normal BC UI, it is immediately re-equipped on the target's client and a notification fires. Self-removal attempts also show an EBC notification.",
            "Curse beep now includes item name (group=assetName) so the target's client knows exactly which item to restore. Per-item lift now sends clear:group (precise) instead of re-applying remaining curses.",
        ],
    },
    {
        version: "6.9.6",
        changes: [
            "Curse notifications: DOM sees an EBC chat log line when they apply or lift curses; target sees a notification when they receive a curse beep. appendLocalLogLine extracted to shared notify.ts module.",
            "Position panel (Pull to Side / Get in Arms / Hold in Arms) now dispatches ECHO activity extension events instead of the broken local-array hack — requires ECHO to be installed on both sides.",
        ],
    },
    {
        version: "6.9.5",
        changes: [
            "Curse panel now shows an 'Active Curses' list: groups currently cursed on the focus target are displayed with ✕ lift buttons so individual curses can be removed from the same room. Curse records are saved to settings and persist across page refreshes.",
        ],
    },
    {
        version: "6.9.4",
        changes: [
            "Fix: Toy control now detects toys immediately on accordion open and on tab render — chips and status were only refreshing on target change, never on accordion open.",
        ],
    },
    {
        version: "6.9.3",
        changes: [
            "Fix: Pose action messages now read naturally — 'guides Angel into a kneeling position with arms raised.' instead of 'guides Angel into the Kneel+Up position.'",
        ],
    },
    {
        version: "6.9.2",
        changes: [
            "Remove: 'Fade when not hovered' feature and toggle removed entirely.",
        ],
    },
    {
        version: "6.9.1",
        changes: [
            "Fix: Position (Pull to Side / Get in Arms / Hold in Arms) now works — applyPositions() was calling c.IsPlayer?.() which throws 'true is not a function' when IsPlayer is a boolean property in BC; switched to MemberNumber comparison.",
            "Fix: Active position list now shows entries after clicking a position button and after tab re-renders — rebuildPosActive() is now called on initial render and when the POSITION accordion is opened.",
        ],
    },
    {
        version: "6.9.0",
        changes: [
            "Fix: Activity buttons (Spank, Pat, Kiss, etc.) now show correct room text — switched from Type:Activity (keys not in BC R129 ActivityDictionary.csv) to Type:Action via sendRoomAction.",
            "Fix: Stand pose now clears kneeling — setTargetPoses now runs CharacterRefresh first, then sets ActivePose, then pushes directly; prevents CharacterRefresh from overwriting the pose.",
            "Fix: Toy control now actually changes toy state — setTargetToyMode/setTargetSingleToyMode now set Intensity, Effect, and TypeRecord alongside Mode, matching BC's VibratorModeOptions.",
            "Fix: Fade when not hovered now works — replaced CSS class toggle (fought with CSS opacity transitions) with JS mouseenter/mouseleave listeners storing handlers on __ebcFade.",
            "Toy control: Added 'Deny' and 'Edge' modes; added per-toy chip selector above mode buttons — clicking a chip targets only that toy.",
            "Curse panel: Now rebuilds item list when accordion is opened (previously only rebuilt on target change while already open).",
            "Curse panel: Items now show lock icon (🔒) and crafted names when available.",
            "Release tools: Added 'Unlock Selected' button in pick panel (uses clearLocksOnMember for selected groups only).",
        ],
    },
    {
        version: "6.8.0",
        changes: [
            "Dom menu: Added POSITION accordion — 'Pull to Side', 'Get in Arms', 'Hold in Arms' buttons reorder ChatRoomCharacter[] locally so the target appears next to you. Positions re-apply after every room sync and clear automatically on room leave.",
        ],
    },
    {
        version: "6.7.9",
        changes: [
            "Fix: Friend names now persist across restarts — cacheName/cacheAccountName were accumulating names in memory but never flushing to ExtensionSettings; added sync() call to both functions.",
            "Fix: 'Fade when not hovered' now actually works — open() and close() were doing className= assignment which wiped the ebc-fade-hover class; switched to classList.add/remove to preserve it.",
            "Dom menu: Renamed 'Massage' action to 'Bap' — targets head zone with slap animation and description 'baps X on the head'.",
        ],
    },
    {
        version: "6.7.8",
        changes: [
            "Fix: Toy control now actually works on others — was using ChatRoomCharacterUpdate which BC ignores for non-player characters; switched to ChatRoomCharacterItemUpdate which sends a per-item update packet that the server correctly broadcasts to the whole room.",
        ],
    },
    {
        version: "6.7.7",
        changes: [
            "Fix: 'Fade when not hovered' now works correctly — replaced broken JS event-listener approach with a CSS :not(:hover) class toggle.",
            "Dom menu: Room Rescue section removed — use Release Tools with the target selector instead.",
            "Dom menu: Release Tools now bypasses all lock types — items are removed directly from the character's appearance array, skipping BC's lock permission checks.",
            "Dom menu: Unlock All Locks now clears combination locks and member-number list locks in addition to padlocks and password locks.",
        ],
    },
    {
        version: "6.7.6",
        changes: [
            "Fix: Friends showing as offline even when online — the AccountQueryResult dedup check was firing before the query type filter, so any non-OnlineFriends result BC sent in a burst (e.g. on login) would eat the OnlineFriends response for 50ms. Type check now runs first.",
            "Fix: Added initial OnlineFriends query 3s after load so the friends list populates immediately rather than waiting for the first 30s heartbeat poll.",
            "Fix: Reduced heartbeat interval from 60s to 30s for faster friend status updates.",
        ],
    },
    {
        version: "6.7.5",
        changes: [
            "Fix: Friend names showing as numbers on tablet now fully fixed — reinitFromExtensionSettings merges the server's full name cache instead of skipping keys already set by the tablet's smaller local cache.",
            "Dom menu: Reordered sections — Restraint Sets → Target → Actions → Release Tools → Room Rescue (Target now directly above Actions; Release Tools grouped with Room Rescue below).",
            "Dom menu: Restraint Sets 'Chat:' announce dropdown renamed from '✓ Emote / Silent' to '📢 Announce / 🤫 Silent' with tooltip — much clearer what it does.",
            "New: 'Fade when not hovered' toggle in Drawer Preferences — when on, the panel fades to 20% opacity when your mouse leaves it and fades back on hover. Default off.",
        ],
    },
    {
        version: "6.7.4",
        changes: [
            "Feature: Dom menu '↳ From Current' picker now has a Source selector — choose yourself or any character currently in the room; captures their worn restraints as a dom set.",
            "Feature: Main Saved Restraints panel '+ New Restraint Set from Current' now shows a per-item checkbox picker (with All toggle) before saving, so you can include only specific worn items instead of all of them.",
        ],
    },
    {
        version: "6.7.3",
        changes: [
            "Fix: Friend names showing as #number after using a second device (tablet) — re-seeds the name cache from server data in the PreferenceInitPlayer hook, fixing a race where initSettings() ran before ExtensionSettings arrived from the server.",
            "Fix: Curse feature now works between any two EBC users (not just Emery→Lucy); curses are accepted from anyone on your friend list, so you can curse anyone who has EBC loaded.",
            "UX: Relationship status in friends list now shows 💍 Engaged / 💒 Married based on BC's Lovership Stage, in both the friend-row badge icon and the expanded info panel with dates.",
        ],
    },
    {
        version: "6.7.2",
        changes: [
            "Feature: '↳ From Current' button in dom Restraint Sets — opens a picker showing your currently worn restraints with individual checkboxes and an All toggle; clicking 'Create Set' saves the selection as a new set.",
            "Feature: '⛓ CURSE' accordion in dom Actions — select items on the Focus Target and send a curse via beep; Lucy's EBC blocks her from self-removing cursed items until Emery sends 'Lift All' to clear them.",
        ],
    },
    {
        version: "6.7.1",
        changes: [
            "Fix: Added right padding to beep window footer so the Send button no longer overlaps the resize grip in the bottom-right corner.",
        ],
    },
    {
        version: "6.7.0",
        changes: [
            "Fix: Moved beep window resize grip to bottom-right corner (was top-right, overlapping header buttons). Drag down/right to grow, up/left to shrink. Bottom edge follows cursor naturally.",
        ],
    },
    {
        version: "6.6.9",
        changes: [
            "UX: Beep window is now resizable — drag the top-right corner to resize both dimensions, right edge for width only, top edge for height only. Size persists per-contact in localStorage.",
        ],
    },
    {
        version: "6.6.8",
        changes: [
            "UX: Beep window input is now a textarea — Shift+Enter inserts a new line, Enter sends. Input auto-grows up to 3 lines.",
        ],
    },
    {
        version: "6.6.7",
        changes: [
            "UX: Raised corner resize icon default opacity from 35% to 70% so it's always clearly visible.",
        ],
    },
    {
        version: "6.6.6",
        changes: [
            "UX: Scaled up the corner resize icon (22px SVG in a 28px hit area) for better visibility.",
        ],
    },
    {
        version: "6.6.5",
        changes: [
            "UX: Replaced corner resize grip with proper filled-wedge resize icon (4 diagonal stripes, smallest at the panel corner, largest extending toward the interior).",
        ],
    },
    {
        version: "6.6.4",
        changes: [
            "UX: Reverted corner resize grip to original orientation — long line toward the panel corner, short line toward the interior.",
        ],
    },
    {
        version: "6.6.3",
        changes: [
            "UX: Flipped the corner resize grip so the short line is closest to the panel corner (bottom-left) and the long line extends toward the panel interior — matching the expected resize-corner direction.",
        ],
    },
    {
        version: "6.6.2",
        changes: [
            "UX: Replaced corner resize arrow icon with a /// grip pattern (three parallel diagonal lines, standard resize-corner affordance). Removed visible pink backgrounds from the left and bottom edge handles — they now only change the cursor, keeping the edge areas visually clean.",
        ],
    },
    {
        version: "6.6.1",
        changes: [
            "UX: Added a visible diagonal-arrow icon (↗) in the bottom-left corner of the panel as a dedicated resize handle. Dragging it scales width and height simultaneously and is discoverable at a glance. The existing edge handles (left = width only, bottom = height only) are still present.",
            "Guide: 'Opening & Moving' step renamed to 'Opening, Moving & Resizing' and updated to explain the corner icon, edge handles, and the Reset all button. Tips & Tricks step also updated with resize and Reset all shortcuts.",
        ],
    },
    {
        version: "6.6.0",
        changes: [
            "⌖ Reset all button now also resets panel width and height back to default, in addition to position, text size, and tab position. Tooltip updated to reflect this.",
        ],
    },
    {
        version: "6.5.9",
        changes: [
            "Fix: Left resize handle scaled the panel rightward instead of leftward when the panel was in free-float mode. Root cause: in free mode the panel has position:fixed with an explicit left: value, so increasing width extends the right edge rather than moving the left edge. Now the handler tracks the right edge as the invariant and updates style.left together with style.width, and saves the new x position on mouseup.",
        ],
    },
    {
        version: "6.5.8",
        changes: [
            "Fix: Beep window chat input was capped at 300 characters (maxLength on the HTML input element). BC's server has no client-enforced limit; pasting a longer message was silently truncated by the browser before sending. Limit raised to 1000 characters to match BC's standard message length.",
        ],
    },
    {
        version: "6.5.7",
        changes: [
            "Fix: After dragging the panel header to move it (entering free-float mode), user-resized width and height were being reset to defaults. Root cause: the ebc-free-mode CSS rule applied width/height with !important, which overrides inline styles — so both the resize handles and the drag-resize stored values were silently ignored. Removed !important from those two properties and updated enterFreeMode to re-apply the user's saved dimensions after the class is added.",
        ],
    },
    {
        version: "6.5.6",
        changes: [
            "Fix: Beep messages were being cut off at 200 characters when stored in history. Root cause: the 200-char cap was added to prevent WCE/FBC JSON metadata blobs from bloating history, but stripBeepMetadata already removes those blobs before the cap applies — so real message content was getting truncated. Cap raised to 1000 characters.",
        ],
    },
    {
        version: "6.5.5",
        changes: [
            "Fix: Drag-resize handles on the left and bottom edges of the EBC panel now actually work. Root cause: mousedown handlers were not calling e.preventDefault(), causing the browser to intercept the drag as a native drag-and-drop operation and suppressing all mousemove events. Handles also made slightly wider/taller (10px) with a faint always-visible background so they are easier to find.",
        ],
    },
    {
        version: "6.5.4",
        changes: [
            "Feature: Drag the left edge of the EBC panel to resize its width, drag the bottom edge to resize its height. Both are saved to localStorage and restored on next load. 5-second tab hold reset also clears panel size.",
        ],
    },
    {
        version: "6.5.3",
        changes: [
            "Fix: Friend names no longer get wiped after using EBC on a second device (tablet/phone). Root cause: flushToExtensionSettings was a plain overwrite — a device that had only seen a few friends in its session pushed its tiny name cache over the full desktop cache. Fix: name cache dicts (friendNames, friendAccountNames) are now merged with the server copy instead of overwriting it, so the larger cache always wins.",
        ],
    },
    {
        version: "6.5.2",
        changes: [
            "Fix: Text size reset is now a dedicated ↺ icon button next to the percentage. Button is dimmed when already at 100%, pink and active when not.",
        ],
    },
    {
        version: "6.5.1",
        changes: [
            "Fix: Text size percentage label is now clickable to reset to 100% when not at default. Label brightens and shows a tooltip to indicate it's interactive.",
        ],
    },
    {
        version: "6.5.0",
        changes: [
            "Feature: UI zoom now scales beep windows and group beep windows in addition to the EBC panel. Setting the slider live-updates all open windows immediately.",
            "Feature: UI zoom range extended from 80%–140% to 70%–200%, making the addon fully usable on 2K/4K monitors at native resolution.",
        ],
    },
    {
        version: "6.4.4",
        changes: [
            "Fix: Online notification now shows the friend's actual name. Root cause: EBC's hook fired before BC's own AccountQueryResult handler populated Player.FriendNames. Fix: callback is delayed one tick (setTimeout 0) so BC's handler runs first; showOnlineToast reads Player.FriendNames directly as the authoritative source.",
            "Feature: Online notification toast now has a pulsing green dot icon.",
        ],
    },
    {
        version: "6.4.3",
        changes: [
            "Fix: Removed member number pills from character sprites (wrong feature). Fix: Online notification toast now shows the friend's actual name — name is taken directly from the AccountQueryResult entry data, bypassing the name cache entirely, so it's always correct even on first login.",
        ],
    },
    {
        version: "6.4.2",
        changes: [
            "Feature: Member number pills — a small #number label is drawn near the feet of every character in the chat room. Toggled via 'Show member #s' card in the Badge settings tab. On by default.",
            "Feature: Online notification sound — plays a soft ascending tone when a watched friend comes online. Toggled via 'Sound when friend comes online' in Beep/Chat settings.",
        ],
    },
    {
        version: "6.4.1",
        changes: [
            "Fix: Online notification toast now uses proper name resolution (resolveName — falls back to account name, not just #number). Toast redesigned with EBC pink border and high-contrast text so it's easy to spot. Watch button in friend expand panel no longer uses emoji.",
        ],
    },
    {
        version: "6.4.0",
        changes: [
            "Fix: Shift+Enter in *emote messages now inserts a newline as in vanilla BC instead of sending. Both the capture-phase keydown listener and the ChatRoomKeyDown mod hook now check for shiftKey before triggering command handlers.",
            "Feature: New 'Use BC native beep sound' setting — when enabled, skips EBC's custom beep tone and plays BC's own notification sound (also re-enables BC's beep popup). Found in the Beep/Chat settings section.",
            "Feature: Online friend notifications — click 'Notify online' in any friend's expanded row to watch them. A green toast appears when they come online. First FriendList update after load is always skipped to avoid false positives on login.",
        ],
    },
    {
        version: "6.3.2",
        changes: [
            "Fix: Quick actions no longer cause 'Failed to load — no supported source found' audio errors. Root cause: Content was set to the raw display text; BC's audio system derives the sound file path from Content, so an unknown Content key returned null and HTMLMediaElement.play() rejected. Fix: Content now uses BC's 'Player<Activity>' format (e.g. 'PlayerKiss') so BC resolves the audio path correctly. Added FocusGroup tag for R113+ zone compatibility alongside AssetGroupName. Custom descriptions kept as MISSING TEXT fallback.",
        ],
    },
    {
        version: "6.3.1",
        changes: [
            "Fix: Toy control reworked - when ExtendedItemSetValue is available it is called with publish=true so BC handles derived-state (Effect/Intensity) AND the server push itself. Fallback path now uses InventoryGet for the canonical item reference and pushes via ChatRoomCharacterUpdate directly without calling CharacterRefresh first (CharacterRefresh was resetting in-flight property changes before the server push).",
        ],
    },
    {
        version: "6.3.0",
        changes: [
            "Fix: Quick actions (Kiss, Spank, etc.) now send Type:Activity messages so BC plays the correct facial expressions and sounds on the target — previously only sent a plain text emote with no animation.",
            "Fix: Toy control mode buttons now use BC's ExtendedItemSetValue API when available so derived item fields (Effect etc.) are updated correctly, then fall back to a property-spread that preserves existing fields. Improved vibrating-item detection (exact archetype match).",
            "UX: Replaced Tickle quick action with Pat (targets ItemHead, uses Caress animation).",
        ],
    },
    {
        version: "6.2.9",
        changes: [
            "Feature: Restraint Sets card is now collapsible - click the section label to show/hide the sets list.",
            "Feature: Per-set bound target - open a set's Edit panel and set 'Always apply to' to a specific person. The Apply button and the /command for that set will always target that person regardless of the TARGET dropdown. Bound target shown as an amber badge on the set row.",
            "Fix: Restraint set Apply button and /commands now work for anyone in the room - previously required the target to be in the legacy saved-targets list.",
        ],
    },
    {
        version: "6.2.8",
        changes: [
            "UX: Removed Room Admin card from dom tab (was always showing 'not an admin' and wasting space).",
            "Feature: Auto-Escape custom room emote - type any emote text; tokens {item} and {restrainer} are replaced at escape time. Leave blank to keep the default glare emote.",
            "UX: Dom tab layout redesign - merged Targets and Focus Target into a single compact TARGET selector at the top. One dropdown controls all operations (release tools, restraint sets, quick actions, poses, toys). Reduced vertical scrolling, Actions card is now clean with no redundant target picker inside it.",
            "Fix: Pick items to remove now shows the currently selected target's items (locks included) instead of iterating all saved targets.",
        ],
    },
    {
        version: "6.2.7",
        changes: [
            "UX: Dom tab deep cleanup - removed redundant DOM TOOLS banner, folded 'Announce restraint sets' setting into the Sets card header, grouped Focus Target + Quick Actions + Poses + Toy Control into a single Actions card.",
            "Fix: Card backgrounds corrected (were darker than the panel, now properly elevated).",
        ],
    },
    {
        version: "6.2.6",
        changes: [
            "UX: Dom tab visual redesign - all main sections (Auto-Escape, Room Admin, Targets, Release Tools, Restraint Sets) now use clean card containers with consistent styling.",
            "Fix: Removed remaining scissors icon from dom tab 'Pick items to remove' toggle.",
            "Fix: Removed scissors icon and renamed 'Release / Rescue' section to 'Release Tools'.",
        ],
    },
    {
        version: "6.2.5",
        changes: [
            "UX: Removed neck exclusion toggle chip from the footer status bar.",
            "UX: Removed icon from 'Pick restraints to remove' header - cleaner look.",
            "UX: Removed Expressions accordion from dom tab.",
            "Fix: Quick Action buttons now send visible room emotes instead of broken BC activity calls (no more MISSING ACTIVITY DESCRIPTION errors).",
            "Fix: Pose setter now directly assigns ActivePose array - fixes Kneel+Up and all multi-pose combos. Also sends a room emote so others see what's happening.",
            "Fix: Toy control - correct BC mode names (Escalate replaces Auto, Tease added), better vibrator detection across BC versions, room emote on mode change.",
            "Fix: Replace em-dashes (—) with hyphens (-) in all dom tab status and description strings.",
        ],
    },
    {
        version: "6.2.4",
        changes: [
            "Fix: Room Admin 'not in a chatroom' bug fixed — detection now uses ChatRoomCharacter presence instead of CurrentScreen string check.",
            "UX: Removed redundant Escape Whitelist section from dom tab (covered by Outfits → Protected Items).",
            "Feature: Saved announce dropdowns on dom tab — 'Room emote when escaping' toggle (glare emote vs silent) under Auto-Escape, and 'Announce restraint sets' toggle (room emote vs silent) in Dom Tools header. Both persist across sessions.",
            "Fix: Focus Target picker now remembers the last selected person across dom tab re-renders.",
        ],
    },
    {
        version: "6.2.3",
        changes: ["Fix: replaced ☑ icon on 'Pick restraints to remove' header with ✂."],
    },
    {
        version: "6.2.2",
        changes: [
            "Feature: Four new dom-tab sections gated behind a shared 'Focus Target' person picker — ⚡ Quick Actions (8 one-click BC activities: Spank, Tickle, Kiss, Bite, Slap, Caress, Massage, Lick), 😵 Expressions (8 preset packages like Ahegao/Crying/Dazed/Shocked + per-group fine dropdowns for Eyes/Mouth/Blush/Fluids/Brow + clear-all), 🧎 Poses (Stand, Kneel, All Fours, Hands Up, Spread, Kneel+Up), and 🎮 Toy Control (Off/Low/Medium/High/Max/Random/Edge/Auto with live toy status display).",
        ],
    },
    {
        version: "6.2.1",
        changes: [
            "UX: Further dom tab polish — 'Pick items to remove' redesigned from a bare dashed button into a proper accordion header (icon + label + ▼/▲ arrow, matching Room Rescue style). Auto-Escape and Room Admin section labels now have colored left-border accents and icons (⚙ / 🔑). Escape Whitelist label shortened to 'Escape Whitelist' with matching left-border accent. Restraint set edit button changed from barely-visible '✎' glyph to a styled '✎ Edit' button with higher-contrast colors.",
        ],
    },
    {
        version: "6.2.0",
        changes: [
            "UX: Dom tab visual cleanup — added '⛓ DOM TOOLS' header banner at the start of the creator-only section (matching kitty tab's header style). Section labels (Targets, Release/Rescue, Restraint Sets) now have a colored left-border accent and icons. Release/Rescue action buttons are bigger (12px, 9px padding). 'Pick items to remove' replaced bare dashed toggle with a proper collapsible accordion header matching Room Rescue style.",
        ],
    },
    {
        version: "6.1.9",
        changes: [
            "Fix: bound timer now appears immediately after refresh/room join. Previously timerOnRoomEnter() reset restraintStartTime to null and the UI took up to 10 s to reflect the correct value (next poller tick). A refreshTimer() call is now scheduled 1.2 s after ChatRoomSync, after BC has populated Player.Appearance, so the ⛓ counter appears within ~1 second of loading.",
            "Feature: 'Neck' toggle in the footer timer row — excludes/includes all three neck groups (collar, accessories, restraints) at once. Highlighted pink when excluded, dim when counting. Always visible so it can be flipped without wearing neck items.",
        ],
    },
    {
        version: "6.1.8",
        changes: [
            "Fix: sidebar (quick-keys) permanently disappearing after viewing an offline player's profile. Root cause: CharacterLoadOnline leaves CurrentCharacter set to the synthetic character after the Info Sheet closes, so the sidebar thought a character menu was open forever. The 'menu open' check now only hides the sidebar when CurrentCharacter is actually present in the current room — offline synthetic characters are ignored. Same fix applied to the drag grip listener.",
        ],
    },
    {
        version: "6.1.7",
        changes: [
            "UX: Emoji picker redesign — wider panel (296px), larger emoji buttons (20px, subtle tile background), 2px gap grid, scale-on-hover animation. Tab bar icons bumped to 15px with active highlight. Text emotes (OwO tab) now 11px with a pill background instead of bare tiny text. Much easier to see and click.",
        ],
    },
    {
        version: "6.1.6",
        changes: [
            "Feature: People Met list now has a copy ID button (ID) next to each person — click to copy their member number to clipboard. Button turns green briefly to confirm the copy.",
            "UX: Bound timer exclude toggle in Active Restraints renamed from ⏱ to 'Exclude'. Styling inverted — button is now highlighted pink when exclusion IS active (item not counting) and dimmed when item counts normally. Matches intuitive 'lit up = enabled' convention.",
        ],
    },
    {
        version: "6.1.5",
        changes: [
            "Fix: bound timer no longer has hardcoded neck/collar exclusions — exclusions are now user-configurable and default to neck groups (ItemNeck, ItemNeckAccessories, ItemNeckRestraints). Previously if you were only wearing a collar the timer would never start because NECK_GROUPS was always excluded.",
            "Feature: each item in the Active Restraints list now has a ⏱ toggle button. Pink border = counts toward the ⛓ bound timer. Dimmed = excluded. Clicking toggles the slot and saves the preference. Defaults to excluded for neck slots, included for everything else.",
        ],
    },
    {
        version: "6.1.4",
        changes: [
            "Fix: friends list showing '#MemberNumber' as primary name with real name in muted secondary text. resolveName() now falls back to the cached account name (friendAccountNames) before returning '#number', so friends always show their real BC name even if the display-name cache hasn't been populated for them yet.",
        ],
    },
    {
        version: "6.1.3",
        changes: [
            "Fix: People Met profile button now always works. For people not in the current room with no session bundle, a minimal character stub is synthesized from the cached name/member number and passed to CharacterLoadOnline — BC fills in defaults so the info sheet opens with a blank model but correct identity. Previously fell through to silent clipboard copy.",
        ],
    },
    {
        version: "6.1.2",
        changes: [
            "Fix: 'View profile' button in the People Met list was silently falling through to clipboard copy for anyone not in the current session. Character bundles are session-memory only (Dexie removed), so profiles can only be opened for people currently in the room or seen this session. The button now checks availability upfront: greyed out with tooltip 'join their room to view' when a profile cannot be opened, active pink when it can.",
        ],
    },
    {
        version: "6.1.1",
        changes: [
            "Fix: player names were not reliably resolved and could show as '#MemberNumber' after a reload. Three root causes fixed: (1) cacheName() wrote to in-memory store only — flushNameCache() is now called after ChatRoomSync so the name cache is persisted to ExtensionSettings immediately; (2) ChatRoomSyncMemberJoin never cached the joining member's name, so anyone who joined mid-session was unknown to resolveName(); (3) CharacterRefresh called recordPersonMet() but not cacheName(), so the display-name lookup (friendNames) was never populated from live character data.",
        ],
    },
    {
        version: "6.1.0",
        changes: [
            "Fix: quick keys sidebar drag handle is now disabled while a character tab is open. Previously the grip zone remained active while the sidebar was invisible, allowing it to be dragged to a position behind the chat box where getSidebarMaxX() could not enforce the chat-overlap clamp.",
        ],
    },
    {
        version: "5.9.9",
        changes: [
            "Fix: quick keys sidebar now hides automatically when a character tab is open and reappears when it is closed. Previously the sidebar would draw over the character menu overlay.",
        ],
    },
    {
        version: "5.9.8",
        changes: [
            "Feature: peopleMet now uses a hybrid storage model. Server (cross-device): last 150 people met, ~4 KB. localStorage (this device): full unlimited history. getPeopleMet() merges both so the DEV panel shows everyone. On first load, existing server data is migrated into localStorage so nothing is lost.",
        ],
    },
    {
        version: "5.9.7",
        changes: [
            "Fix: peopleMet was 54 KB (2000 entries × ~27 bytes). Cap reduced from 2000 → 300 entries. With existing pruning for beepHistory/friendNames, EBC total should drop from ~131 KB to ~85 KB.",
        ],
    },
    {
        version: "5.9.6",
        changes: [
            "Fix: Release Restraints skipped slots that were in the outfit whitelist. The whitelist is meant to protect slots from outfit auto-changes, not from explicit 'release all' commands. releaseRestraints and getPlayerRestraints now only respect ownership locks (owner/lover/family/exclusive padlocks), not the whitelist.",
        ],
    },
    {
        version: "5.9.5",
        changes: [
            "Fix: EBC ExtensionSettings was 152 KB (over the 180 KB total budget). Root causes: beepHistory capped at 300 entries with raw mod-metadata-bloated messages; friendNames/friendAccountNames were unbounded. Fixes: beepHistory now capped at 100 entries and messages are stripped of mod metadata + truncated to 200 chars before saving; name caches evict oldest entries beyond 500. One-time pruning pass on first load cleans up existing bloat immediately.",
        ],
    },
    {
        version: "5.9.4",
        changes: [
            "Fix: removed Dexie/IndexedDB entirely. Eight suppression attempts across multiple versions all failed to prevent Chrome from leaking raw IDB Event objects as unhandled Promise rejections. The in-session memory cache still works for all same-session lookups. The old IDB database is cleaned up on first load.",
        ],
    },
    {
        version: "5.9.3",
        changes: [
            "Fix: EBC tag settings Export/Import was broken. Import wrote directly to Player.ExtensionSettings.EmeryBC, then syncSettings() called flushToExtensionSettings() which copied the old in-memory store (_mem) back over it, erasing the import. Fixed by writing imports into getSettings() (_mem) directly so the flush carries the new values to ExtensionSettings instead of overwriting them.",
        ],
    },
    {
        version: "5.9.2",
        changes: [
            "Fix: add Dexie.on('error') static global hook — catches errors from all Dexie instances before they escape into the Promise system. Previous fix (db.on('error')) was instance-level only. Now all four suppression layers are active: Dexie.on, db.on, db.open().catch, and window.unhandledrejection.",
        ],
    },
    {
        version: "5.9.1",
        changes: [
            "Fix: /!\\ warning triangle persisted even after 5.8.9 cleanup because PreferenceInitPlayer (BC's OnlineSettings validator) fires before initSettings() finishes. Added a PreferenceInitPlayer hook that deletes the stale 'EmeryBC' key before BC's validator sees it.",
        ],
    },
    {
        version: "5.9.0",
        changes: [
            "Fix: [object Event] unhandled rejection persisted because BC's error handler runs before EBC's window.addEventListener suppressor (BC registers first at page load). Root fix: attach db.on('error') and db.on('blocked') to Dexie before db.open() so internal IDB transaction errors are swallowed inside Dexie itself, never reaching the Promise rejection layer.",
        ],
    },
    {
        version: "5.8.9",
        changes: [
            "Fix: /!\\ warning mark above head caused by stale 'EmeryBC' key left in Player.OnlineSettings from very old EBC versions. BC's PreferenceInitPlayer warns about unknown OnlineSettings keys and shows a warning indicator. initSettings() now deletes the orphaned key and syncs on first load.",
        ],
    },
    {
        version: "5.8.8",
        changes: [
            "Fix: Release Restraints and the self-pick specific-item remover now directly filter Player.Appearance instead of calling InventoryRemove. InventoryRemove respects BC's internal lock/permission checks and silently refuses removal in certain situations (locked room, BC permissions). Direct array filtering matches how the safeword escape already works.",
        ],
    },
    {
        version: "5.8.7",
        changes: [
            "Fix: [object Event] unhandled rejection still appeared on v5.8.6 because the suppressor was registered in init() — too late, since Dexie opens the database at module-load time before init() runs. Moved the unhandledrejection suppressor to db.ts so it is registered before any IDB operation.",
        ],
    },
    {
        version: "5.8.6",
        changes: [
            "Fix: beep window Send button cut off on tablet/mobile. Window width changed to min(320px, 100vw-16px) and right position clamped so it stays fully on-screen on narrow devices. Footer gap and padding tightened; Send button gets white-space:nowrap so it never wraps.",
        ],
    },
    {
        version: "5.8.5",
        changes: [
            "Fix: unhandled promise rejection '[object Event]' on Android/mobile. Two causes fixed: (1) three async profile-view click handlers in drawer.ts lacked a top-level try-catch so any uncaught error became an unhandled rejection; (2) added a global unhandledrejection listener that suppresses raw IDB Event rejections before BC's error reporter sees them.",
        ],
    },
    {
        version: "5.8.4",
        changes: [
            "Removed panel resize handles (bottom height drag and left-side width drag). After six attempts across multiple versions the drag never worked reliably for all users. Panel returns to clean full-height behaviour.",
        ],
    },
    {
        version: "5.8.3",
        changes: [
            "Panel resize overhaul: height is now controlled via CSS variable --ebc-ph !important so nothing can fight it. Width resize added via a left-edge drag handle (--ebc-pw). Both handles use window+document capture-phase listeners for reliability, persist to localStorage, and support double-click to reset. syncToChat updated to set CSS variables instead of inline height.",
        ],
    },
    {
        version: "5.8.2",
        changes: [
            "Fix: resize direction inverted — drag DOWN to shrink the panel, drag UP to grow it (matches 'pull shade down to close' intuition). Also now resizes rootEl height alongside the panel so nothing fights the change. syncToChat guarded for both rootEl and panelEl during drag. Live '↕ Xpx' readout on the handle during drag confirms the height is changing.",
        ],
    },
    {
        version: "5.8.1",
        changes: [
            "Fix: resize handle drag events now work — rewrote using capture-phase document listeners with stopImmediatePropagation to bypass BC interference.",
        ],
    },
    {
        version: "5.7.9",
        changes: [
            "Fix: EBC version badges in the friend/room list now survive script reloads. The version cache is persisted to localStorage (48-hour TTL) so badges reappear immediately on reload without needing to re-enter a shared room.",
        ],
    },
    {
        version: "5.7.8",
        changes: [
            "Fix: outfit changes now respect BC locks. Items with an active padlock (Property.LockedBy) and items in owner/lover-blocked zones are force-restored after the new appearance is built, so they survive any outfit swap regardless of preserve flags or whitelist settings.",
        ],
    },
    {
        version: "5.7.7",
        changes: [
            "Fix: resize handle drag rewritten again — replaced Pointer Events API (setPointerCapture) with the same addPointerDown / addPointerTracking pattern used by the tab drag, which is known to work. pointercancel was firing and killing the drag before any movement registered.",
        ],
    },
    {
        version: "5.7.6",
        changes: [
            "Fix: hook TextGet to provide fallback text for 'ResponseRoomLocked' — eliminates the yellow 'MISSING TEXT IN Text_ChatRoom.csv' banner when joining a locked room. The hook intercepts at point-of-use so it works regardless of CSV load timing.",
        ],
    },
    {
        version: "5.7.5",
        changes: [
            "Fix: seed BC's TextLookup with a fallback for 'ResponseRoomLocked' — prevents the yellow 'MISSING TEXT IN Text_ChatRoom.csv' banner that appeared when trying to join a locked room in BC versions where this localization key is absent.",
        ],
    },
    {
        version: "5.7.4",
        changes: [
            "Fix: Slow Leave now calls CommonSetScreen() before ChatRoomLeave() — matching the safeword leave pattern. Doing it the other way cleared room state first, causing CRABS and other mods to crash on the next ChatRoomRun frame.",
            "Fix: Slow Leave button now checks ChatRoomCanLeave() before starting. If BC would block the leave (locked room, restraints, etc.) the button flashes red and does nothing instead of starting a timer that would fail.",
        ],
    },
    {
        version: "5.7.3",
        changes: [
            "Fix: resize handle drag rewritten with Pointer Events API (pointerdown/pointermove/pointerup + setPointerCapture). Pointer capture routes all subsequent events directly to the handle element regardless of where the pointer travels — no document-level listeners needed, immune to stopPropagation from BC global handlers and the container's touch-bubble guard.",
        ],
    },
    {
        version: "5.7.2",
        changes: [
            "Fix: Slow Leave presets (Classic, Warm, Quiet, Sleepy, Playful, Bratty, Custom) are back in the settings accordion with a dropdown to select the style and an editable intro emote field. The intro emote is sent as a * emote ~1.2s before the leave message, matching the natural feel of each style.",
            "Fix: Slow Leave no longer spams SlowLeaveAttempt/SlowLeaveCancel. Active state is now tracked with a dedicated boolean so two-stage timers can't cause double-starts. SlowLeaveCancel is only sent if SlowLeaveAttempt was actually dispatched.",
            "Fix: Slow Leave done callback now calls ChatRoomLeave() before CommonSetScreen() matching BC's own leave order so the leave is reliably processed.",
            "New: Slow Leave shows BC's crawl status icon (the visual indicator near the character) while the timer is active, cleared on cancel or done.",
        ],
    },
    {
        version: "5.7.1",
        changes: [
            "Fix: resize handle drag now works reliably. Replaced addPointerDown/addPointerTracking with direct element-level event listeners. Added isResizeDragging guard so syncToChat never overrides the panel height mid-drag. Rounded the chat-log rect comparison in syncToChat to whole pixels to prevent sub-pixel float drift from constantly re-firing the height reset.",
        ],
    },
    {
        version: "5.7.0",
        changes: [
            "Overhaul: Slow Leave now uses BC's own SlowLeaveAttempt / SlowLeaveCancel action messages instead of a custom emote sequence. Clicking the button sends '(Name slowly heads for the door.)' — the same native message BC shows for slowed players — waits the configured duration, then calls ChatRoomLeave(). Clicking again sends '(Name stops heading for the door.)' and cancels. The preset/sequence editor has been removed.",
        ],
    },
    {
        version: "5.6.9",
        changes: [
            "Fix: resize handle is now a proper flex child of the slide container instead of position:absolute — eliminates overlap with panel content (footer text no longer hidden behind it) and fixes drag resize which was blocked by hit-test ambiguity with .ebc-panel at the same Y coordinates.",
        ],
    },
    {
        version: "5.6.8",
        changes: [
            "Improvement: clicking a quick-reply button now sends the message immediately instead of just filling the input box.",
        ],
    },
    {
        version: "5.6.7",
        changes: [
            "Fix: resize handle moved outside the zoom wrapper and anchored to the slide container with position:absolute — it is no longer clipped by overflow:hidden and is unaffected by the panel zoom transform. Handle height increased to 14 px for easier grabbing.",
        ],
    },
    {
        version: "5.6.6",
        changes: [
            "Fix: quick action sidebar buttons (EAR, TAIL, etc.) now hide when BC's 'Show/hide character icons' eye toggle is active, matching the badge and WCE icon behaviour.",
        ],
    },
    {
        version: "5.6.5",
        changes: [
            "Feature: drag the handle at the bottom edge of the drawer to resize it taller or shorter. Height is saved to localStorage and restored on reload. Double-click the handle to restore full height.",
        ],
    },
    {
        version: "5.6.4",
        changes: [
            "Improvement: emoji picker redesigned with category tabs — Cats 🐱, Faces 😊, Hearts ❤️, Sparkles ✨, Floral 🌸, Animals 🐾, and a Text emotes tab (OwO) with 36 unicode emoticons like UwU, >w<, <.<, :3, (≧◡≦), (づ◕‿◕)づ and more.",
        ],
    },
    {
        version: "5.6.3",
        changes: [
            "Fix: nickname cache was being overwritten by the raw BC account name whenever a beep was received or a friend came online — nicknames (e.g. Lucy) now persist correctly across beeps and online events.",
            "Fix: copy button is now always visible beside the timestamp instead of hidden until hover.",
            "Improvement: cat face emojis moved to the top of the emoji picker.",
            "Improvement: header buttons (mute, room invite, clear) now use emoji icons (🔔/🔇 📍 🗑️).",
        ],
    },
    {
        version: "5.6.2",
        changes: [
            "Improvement: all 10 cat face emojis added to the picker (😺 😸 😹 😻 😼 😽 🙀 😿 😾 🐱) — happy, laughing, heart-eyes, wry, kissing, weary, crying, angry.",
        ],
    },
    {
        version: "5.6.1",
        changes: [
            "Improvement: emoji picker expanded from 32 to 120 emojis across 15 rows — smileys, expressions, hearts, love, gestures, florals, food, animals. Picker is now scrollable (max-height 220px) so it stays within the window.",
        ],
    },
    {
        version: "5.6.0",
        changes: [
            "Fix: BC in-game nicknames (e.g. 'Lucy' for someone named 'Lucas') now persist correctly in the friends list. AccountQueryResult only provides the raw account name, never the nickname — caching it unconditionally was silently overwriting the cached nickname every time a friend appeared online. The account name is now stored separately for the subtitle display; the display-name cache is only written if no better entry exists.",
        ],
    },
    {
        version: "5.5.9",
        changes: [
            "New: emoji picker in beep window footer — click the smiley button to insert emoji into your message. 32 curated emojis in a floating grid above the footer.",
            "Fix: character counter (300) is now a proper flex item between the input and emoji button instead of being absolutely positioned, so it no longer overlaps other elements.",
        ],
    },
    {
        version: "5.5.8",
        changes: [
            "Improvement: header buttons now use clean SVG icons (bell, arrow, trash) instead of emoji or Unicode symbols — monochrome, scale correctly, match the dark-pink aesthetic.",
            "Fix: chat history now correctly starts scrolled to the bottom — initial render was guarded so it only scrolls after the window is in the DOM; restoring a minimized window now also scrolls to bottom (history was display:none so scrollHeight was 0).",
        ],
    },
    {
        version: "5.5.7",
        changes: [
            "Fix: chat messages now correctly start scrolled to the bottom when a conversation window opens — previously the scroll happened before the window was in the DOM so scrollHeight was 0.",
            "Improvement: header icons (bell, pin, trash) replaced with plain Unicode symbols (♪/⊘, ⊕, ⌫) that render monochrome and fit the dark-pink aesthetic instead of coloured OS emoji.",
        ],
    },
    {
        version: "5.5.6",
        changes: [
            "Improvement: copy button is now overlaid in the bottom-right corner of the chat bubble itself (position: absolute inside the bubble) instead of sitting beside the name — cleaner look.",
        ],
    },
    {
        version: "5.5.5",
        changes: [
            "Fix: clear conversation confirm overlay was broken — callback was passed as the wrong argument, causing a TypeError. Cancel/Clear buttons now work correctly.",
            "Fix: copy button now shows 'Copy' text with a small border instead of the ⎘ icon.",
        ],
    },
    {
        version: "5.5.4",
        changes: [
            "Fix: room drawer no longer shows a confusing 🌐 Public chip — the Join button already implies it's public. Only the space name chip (e.g. 'Club X') is shown when applicable; 🔒 Private still appears for private rooms.",
        ],
    },
    {
        version: "5.5.3",
        changes: [
            "Fix: character counter is now clearly visible — brighter colour (#a07080) and 10px font instead of near-invisible 9px.",
            "Fix: ⚙ gear icon is now properly visible with higher-contrast colour and border.",
            "Fix: default quick-reply phrases changed to brb / busy, back soon / hello ^^ — the old ones were unhelpful.",
            "Fix: room drawer space chip no longer shows raw BC codes like 'X' — now shows the friendly name (e.g. 'Club X') merged into the 🌐 Public chip.",
            "Fix: copy button moved from a hover element below the bubble to an inline ⎘ icon beside the sender name — much cleaner.",
            "Fix: received message bubbles now show the account name in small text beside the sender nickname when the two differ, matching the header behaviour.",
        ],
    },
    {
        version: "5.5.2",
        changes: [
            "Fix: offline beep re-delivery no longer causes ErrorRateLimited disconnects — messages are now staggered 350 ms apart instead of burst-sent in a synchronous loop. A startup grace window (up to 10 s after page load) adds extra headroom so re-delivery doesn't compound with BC's own login traffic.",
        ],
    },
    {
        version: "5.5.1",
        changes: [
            "New: nickname display in beep window headers — when someone has a nickname their display name is shown prominently with their account name in smaller text beneath it.",
            "New: copy button on message bubbles — hover any message to reveal a ⎘ Copy button that copies the text to clipboard.",
            "New: room info chips in the room drawer — shows 🌐 Public / 🔒 Private indicator and room space; public rooms also get a 'Copy room name' button.",
            "New: online alert — a green ✓ banner briefly appears in the chat when the other person comes back online while the window is open.",
            "New: clear conversation button (🗑) in the beep window header — wipes the local message history for that person after confirmation.",
        ],
    },
    {
        version: "5.5.0",
        changes: [
            "Fix: character counter in beep windows is now much easier to see — resting colour changed from near-black to a visible rose tone; amber/red warning thresholds remain.",
            "New: quick-reply buttons are now hidden by default — a small ▶ toggle button in the footer reveals/hides them; state persists across sessions.",
            "Fix: ⚙ gear icon on the quick-reply bar is now visible instead of nearly invisible.",
        ],
    },
    {
        version: "5.4.9",
        changes: [
            "New: offline indicator banner in beep windows — a subtle notice appears below the message history when the recipient is offline, explaining that messages are queued and delivered when they return.",
            "New: character counter in beep windows — shows remaining characters (out of 300) overlaid on the input; turns amber below 40, red below 10.",
        ],
    },
    {
        version: "5.4.8",
        changes: [
            "Fix: ON/OFF toggle buttons now use flex centering — OFF text was visually off-centre due to browser default button padding.",
            "Fix: /ebc changelog now only prints the current version's entry instead of the full history.",
        ],
    },
    {
        version: "5.4.7",
        changes: [
            "New: quick-reply buttons in every beep window — configurable one-click phrases that insert into the input so you can review before sending. Defaults: brb / in character / busy, back soon. Click ⚙ to add, remove, or reorder. Saved to your EBC settings and synced across devices.",
        ],
    },
    {
        version: "5.4.6",
        changes: [
            "Fix: EBC friends list now stays in sync with BC's native friend list — the AccountQueryResult dedup window was 500 ms, causing rapid BC polls (e.g. while the native friend list screen is open) to be silently dropped and leaving room tags stale. Reduced to 50 ms, which is still enough to prevent the hook/socket double-fire.",
        ],
    },
    {
        version: "5.4.5",
        changes: [
            "Fix: offline beep queue is now persisted to localStorage so messages queued for offline friends survive page reloads — entries are discarded after 48 hours.",
        ],
    },
    {
        version: "5.4.4",
        changes: [
            "Fix: private room detection now reads the dedicated Private field from BC's AccountQueryResult — the server sets Private: true for friends in private/restricted rooms and omits it for lobby. Both ChatRoomName and ChatRoomSpace are null for both private rooms and lobby, so this is the only reliable signal.",
        ],
    },
    {
        version: "5.4.3",
        changes: [
            "Fix: attempted private room detection via ChatRoomSpace presence — this was also unreliable as the server sends null for both fields in private rooms and lobby (superseded by 5.4.4).",
        ],
    },
    {
        version: "5.4.2",
        changes: [
            "Fix: lobby friends no longer show 'Private room' — attempted ChatRoomName === \"\" check but this misses cases where BC omits the field entirely for private rooms (superseded by 5.4.3).",
        ],
    },
    {
        version: "5.4.1",
        changes: [
            "Fix: attempted to restore 'Private room' label by showing it for all online friends with no visible room name — this incorrectly showed 'Private room' for lobby friends too (superseded by 5.4.2).",
        ],
    },
    {
        version: "5.4.0",
        changes: [
            "Fix: attempted distinction between private room and lobby via ChatRoomName === \"\" check — this was incorrect as BC omits the field for both states (superseded by 5.4.1).",
        ],
    },
    {
        version: "5.3.9",
        changes: [
            "UX: Group chat temporarily disabled while it's being reworked — the section is hidden from the Users tab and incoming group beeps are suppressed. All data is preserved.",
        ],
    },
    {
        version: "5.3.8",
        changes: [
            "Fix: online friends with no visible room name (lobby or private room) no longer show a 'Private room' tag — BC's AccountQueryResult omits ChatRoomName for both states so the two are indistinguishable. Removed the tag to eliminate false positives; same-room friends still resolve correctly via ChatRoomCharacter.",
        ],
    },
    {
        version: "5.3.7",
        changes: [
            "Fix: expression presets now actually apply in BC R128+ — the AssetGet pre-validation was incorrectly skipping all expression groups (returning falsy for valid names). Removed the redundant pre-check; BC's own CharacterSetFacialExpression validates internally and ignores truly unknown names without corrupting appearance data.",
            "Fix: group chat window no longer looks semi-transparent and blurry — increased background opacity and fixed incorrect CSS class names on the history scroll area, message bubbles, input bar, and Send button (classes with no styles were being assigned).",
            "UX: beep window room drawer now shows only the Join room button — removed the space/count/language/privacy chips.",
        ],
    },
    {
        version: "5.3.6",
        changes: [
            "Fix: friends in the same room as you no longer show as 'Private room' — BC doesn't include a room name in query results for same-room players; now checks ChatRoomCharacter directly so they show the correct room name.",
            "Fix: receiving a group beep now automatically opens the group chat window, even if you don't have that group saved. The member list is embedded in the message tag so recipients can see everyone in the group and reply to their mutual friends.",
            "Fix: group chat toast click now opens the window even for recipients who never created or saved the group.",
            "UX: group chat window subtitle now shows member names instead of a generic count.",
        ],
    },
    {
        version: "5.3.5",
        changes: [
            "Fix: expression presets now correctly apply even when a stored expression name isn't recognised by the current BC version — previously the group was silently cleared (making it look like the preset did nothing); now unrecognised groups are skipped so the rest of the preset still applies. Re-save any affected presets to update them to current BC expression names.",
            "UX: expression preset Apply button now briefly flashes green with a checkmark to confirm the face was applied.",
        ],
    },
    {
        version: "5.3.4",
        changes: [
            "Fix: group member picker no longer shows '#114921 #114921' for friends whose name isn't cached — unknown friends display as a single dim '#114921'. Friends with known names appear first in the list; number-only entries are sorted to the bottom.",
        ],
    },
    {
        version: "5.3.3",
        changes: [
            "UX: Groups section moved above the Friends list (now appears between User Notes and Friends) in the Users tab.",
            "UX: Member picker in the Create Group form now has a live search box — type a name or member number to filter the friend list. Selections are preserved across filter changes. The previous 40-friend cap is removed.",
        ],
    },
    {
        version: "5.3.2",
        changes: [
            "Fix: private room detection no longer requires ChatRoomSpace to be non-empty — BC R128 may send an empty space for private rooms. Any online friend without a visible room name now shows 'Private room' in both the Users tab and the beep window room bar.",
            "Fix: room info chips now use a direct socket.io manager listener for ChatRoomSearchResult as an additional fallback. The modAPI hook fails in BC R128 (function is module-scoped), so this path goes through the socket.io internals (window.io.managers) to intercept the response without relying on window.ServerSocket or window.ChatRoomList.",
        ],
    },
    {
        version: "5.3.1",
        changes: [
            "Fix: friends in private rooms now show a 'Private room' tag in the Users list instead of just 'online'.",
            "Fix: the room bar in beep windows now shows '📍 Private room' (with space chip, Join button hidden) for friends in private rooms — previously the bar was hidden entirely.",
            "Fix: name labels in the beep window no longer show gradient for regular EBC users who happened to share a room at some point during the session — gradient is now reserved for self and VIP/Credits members only.",
            "Fix: room info chip enrichment now retries at 1.5 s, 3 s, and 5 s instead of a single 2 s poll, covering slower server round-trips.",
        ],
    },
    {
        version: "5.3.0",
        changes: [
            "New: Group Chats — create named groups from the Users tab (scroll to the Groups section). Select friends, name the group, and hit Create. Messages are broadcast to all members as individual beeps with an EBC routing tag; EBC users see a shared group window with sender labels. Non-EBC members receive the message with a visible '[EBC Group]' annotation — they can read it but replies go back to the sender only, not the whole group. Group definitions are saved to your extension settings across sessions.",
        ],
    },
    {
        version: "5.2.6",
        changes: [
            "Fix: room info chips (player count, language, game, privacy) now populate correctly in BC R128. ChatRoomSearchResult is a raw socket event in R128, not a patchable BC global — the v5.2.4 hook silently failed with no fallback. Now polls window.ChatRoomList 2 s after sending the search query, which BC always populates when the server responds.",
        ],
    },
    {
        version: "5.2.5",
        changes: [
            "Fix: friends list and open beep windows now update correctly when a friend goes offline or changes rooms. AccountQueryResult is now hooked via modAPI (reliable in BC R128) with the old window.ServerSocket listener kept as fallback. A 60 s heartbeat poll ensures the online list stays fresh even if neither listener fires.",
        ],
    },
    {
        version: "5.2.4",
        changes: [
            "Fix: room info drawer now correctly fetches player count, language, game type and privacy via ChatRoomSearch. The previous approach used window.ServerSocket which is module-scoped in BC R128 and not reliably accessible — replaced with a modAPI hook on ChatRoomSearchResult that relays results through bcUtils.",
        ],
    },
    {
        version: "5.2.3",
        changes: [
            "Fix: clicking 'Join →' on a room invite card when already in that room no longer triggers the 'ResponseAlreadyInRoom' BC error. The button now shows 'Already here ✓' briefly instead.",
        ],
    },
    {
        version: "5.2.2",
        changes: [
            "Beep window: declining a room invite now sends a notification beep back to the inviter. The inviter sees a '❌ Invite declined' card in their beep window; the recipient's own history shows '❌ You declined'. BC's native popup is suppressed for decline messages just like for invite messages.",
        ],
    },
    {
        version: "5.2.1",
        changes: [
            "Beep window: room info drawer now lazily fetches full room data (player count, language, game type, privacy, lock state) via ChatRoomSearch when you first hover/tap the room bar. Results are cached per room so the server is only hit once. Public rooms show all available details; private rooms silently show basic info if the search returns nothing.",
        ],
    },
    {
        version: "5.2.0",
        changes: [
            "Fix: BC R128 AccountQueryResult for OnlineFriends only sends 5 fields (Type=relationship, MemberNumber, MemberName, ChatRoomSpace, ChatRoomName). EBC now only captures what BC actually provides — privacy, lock, full, language, game and count are no longer claimed as available.",
            "Fix: Room info drawer and friends list room tag no longer show misleading 'Public' privacy chip (BC R128 removed privacy info from the friends endpoint). Drawer now shows space type only with proper display names (e.g. 'X' → 'Club X').",
            "Fix: 'Duplicate join request' error — doJoinRoom now has a 1.5 s debounce preventing rapid double-clicks or multiple simultaneous join triggers from sending duplicate server requests.",
        ],
    },
    {
        version: "5.1.9",
        changes: [
            "Fix: 📍 room invite button now reliably detects the current room name. Previously used window.ChatRoomData.Name which is unreliable in newer BC versions where ChatRoomData may be module-scoped. EBC now tracks the room name directly from the ChatRoomSync hook payload and clears it on ChatRoomLeave.",
            "Fix: clicking 📍 on a friend in your own room no longer triggers 'ResponseAlreadyInRoom' — the join-their-room path is now guarded against running when the friend is already in the same room as you.",
        ],
    },
    {
        version: "5.1.8",
        changes: [
            "Beep window: room info drawer now shows player count (👥 current/max), language (🌍), and game type (🎮) chips when BC provides them via AccountQueryResult.",
        ],
    },
    {
        version: "5.1.7",
        changes: [
            "Fix: screen no longer goes black when joining a room from the beep window. Previously called ChatRoomLeave() + delayed join, which cleared ChatRoomData and caused a blank transition. Now sends ChatRoomJoin directly — server handles the implicit leave.",
            "Fix: receiving a room invite no longer shows BC's native beep popup with the raw '📍 Room invite: …' text. EBC now always suppresses BC's notification for invite beeps and only shows the invite card in the EBC chat window.",
        ],
    },
    {
        version: "5.1.6",
        changes: [
            "Fix: EBC badge now respects character depth (z-order). Previously badges were drawn immediately after each character sprite, so a behind-character's badge could float on top of characters in front. Now all badges are collected during DrawCharacter and drawn together in DrawProcess after all sprites, sorted back-to-front by zoom.",
        ],
    },
    {
        version: "5.1.5",
        changes: [
            "Fix: joining a room from the beep window no longer crashes with 'Cannot read MapData of null'. ChatRoomLeave now sets the leavePending guard and a ChatRoomRun hook (priority 500) skips the one-frame null-data window before BC switches screens.",
            "Fix: 📍 button is now dual-purpose — if you're in a room it sends your room as an invite; if you're not in a room but the friend is, it joins their room directly.",
        ],
    },
    {
        version: "5.1.4",
        changes: [
            "Beep window: room bar expands into an info drawer on hover/tap showing space type, privacy, lock and full status with a Join button.",
        ],
    },
    {
        version: "5.1.3",
        changes: [
            "Fix: 📍 room invite button was always showing 🚫 — was checking CurrentScreen instead of ChatRoomData directly.",
        ],
    },
    {
        version: "5.1.2",
        changes: [
            "Fix: room bar 'tap to join' was crashing with ReferenceError (ebcJoinRoom not defined).",
        ],
    },
    {
        version: "5.1.1",
        changes: [
            "Beep window: room invite card now shows a Join + Decline button row for the recipient so they can't accidentally join. Sender sees an 'Invite sent ✓' note on their copy of the card.",
        ],
    },
    {
        version: "5.1.0",
        changes: [
            "Beep window: replaced the room pill badge in the header with a slim clickable room bar between the header and chat. Header is now a clean single row again.",
        ],
    },
    {
        version: "4.9.9",
        changes: [
            "Fix: room pill in beep window header is now a tappable badge instead of tiny 9px text.",
            "Fix: room invite 📍 button now works correctly. Send guard now requires CurrentScreen === 'ChatRoom' and a valid ChatRoomData.Name (flashes 🚫 if not in a room). Join flow tries ChatRoomJoin first then falls back to ChatRoomLeave() + delayed ServerSend so joining works whether or not the recipient is already in another room.",
        ],
    },
    {
        version: "4.9.4",
        changes: [
            "New: 📍 button in beep conversation windows — click it to send your current room as an invite. The recipient sees a join card with a 'Join →' button they can click to enter the room directly. If you're not in a room the button briefly shows 🚫. The room pill showing a friend's current location in the header is now also clickable — click it to join their room.",
        ],
    },
    {
        version: "4.9.3",
        changes: [
            "Fix: expression presets containing expression names that are invalid in the current BC version (e.g. 'Eyes5', 'Eyes1', 'Regular', 'Fluids' removed in R128) no longer cause ErrorRateLimited timeouts on login. Each invalid name caused BC's server to reject and sanitise the appearance bundle, triggering a ChatRoomSyncSingle loop that compounded with WCE. applyExprGroup now validates each name via AssetGet before setting it — if the asset doesn't exist in the running BC build the group is silently cleared instead, preventing any invalid data from reaching the server.",
        ],
    },
    {
        version: "4.9.1",
        changes: [
            "Friends search now also searches notes and tags — typing in the search box matches against any note you've written for a person and any tag labels you've added to them, not just their name and member number. Placeholder updated to reflect this.",
        ],
    },
    {
        version: "4.9.0",
        changes: [
            "Fix: drawer drag broken on touch/mobile devices — a capture-phase stopPropagation on the slide container was intercepting touchstart before it could reach the header's drag handler. Removed the capture-phase listener; bubble-phase stopImmediatePropagation alone is sufficient to block BC's document-level touch handlers.",
            "Fix: EBC badge now draws underneath WCE and other addon icons — DrawCharacter hook priority lowered from 3 to 1 so higher-priority addon hooks (WCE etc.) layer their icons on top of EBC's badge rather than underneath.",
            "Fix: EBC badge no longer visible when clicking a character in the chatroom — added window.CurrentCharacter guard in drawPresenceMarker so the badge is skipped during BC's character interaction portrait view (same guard WCE uses), preventing EBC tag from being the only visible element on the portrait.",
        ],
    },
    {
        version: "4.8.9",
        changes: [
            "Fix: Relaxed arms — 'BaseUpper' is BC's explicit pose name for arms-at-sides; relaxed is not the absence of an arm pose. clearArmPose() now calls PoseSetActive('BaseUpper') so BC correctly applies the relaxed visual. Also reverts the v4.8.8 Player.Pose override in applyPoses() that was incorrectly stripping BC-managed defaults and breaking all poses.",
        ],
    },
    {
        version: "4.8.8",
        changes: [
            "Fix: Relaxed arms now actually works — root cause found: CharacterRefresh calls CharacterLoadActualPose which rebuilds ActivePoseMapping/ActivePose from Player.Pose every time. Prior fixes cleared the derived fields but never touched Player.Pose, so CharacterRefresh silently restored the arm pose on every refresh. clearArmPose() now clears Player.Pose first, and applyPoses() syncs it too.",
        ],
    },
    {
        version: "4.8.7",
        changes: [
            "Fix: ErrorRateLimited disconnect at startup — EBC's AccountUpdate (presence broadcast) now fires 5–8 seconds after room entry instead of immediately. With many addons all sending server messages at the same moment on room join, BC's rate limiter was tripped. The randomised delay spreads EBC's message outside the initial burst window.",
        ],
    },
    {
        version: "4.8.6",
        changes: [
            "Fix: safeword debounced across all 3 hook points — on some BC builds the same Enter keypress reached the capture handler, ChatRoomKeyDown hook, and ChatRoomSendChat hook, causing triggerRed/Yellow to fire twice (double chat announcement, two ChatRoomLeave calls). Now silently de-duped within a 2-second window.",
            "Fix: grace period server sync rate-limited to once/2s — ChatRoomCharacterUpdate + ServerPlayerAppearanceSync were firing on every CharacterRefresh while grace was active (could be many times/second from other addons or BC's animation loop).",
            "Fix: anti-restraint server sync rate-limited to once/2s — same issue; 200ms re-entry window wasn't enough to prevent syncs at 5×/s when restraints were being re-applied rapidly.",
        ],
    },
    {
        version: "4.8.5",
        changes: [
            "Fix: Relaxed arms now works correctly while kneeling or sitting — replaced the nuke+re-add approach with surgical removal that directly patches ActivePoseMapping/ActivePose to drop arm entries without ever touching the body pose.",
            "Triggers: triggers can now be edited inline — click the pencil icon on any trigger row to expand a form pre-filled with its current match text, face preset, and hold duration.",
        ],
    },
    {
        version: "4.8.4",
        changes: [
            "Fix: Relaxed arms while kneeling now reliably clears the arm pose — previously BC's internal arm slot was not always flushed when only the body category was updated; arm poses are now fully purged (clear-all + re-add body) and Player.ActivePose is kept in sync so CharacterRefresh always reads the correct state.",
        ],
    },
    {
        version: "4.8.3",
        changes: [
            "Fix: pose buttons (Relaxed arms, body poses) now read the live current pose at click time instead of the snapshot captured when the tab was last rendered — clicking Relaxed while kneeling no longer clears the kneel.",
        ],
    },
    {
        version: "4.8.2",
        changes: [
            "Poses: added Legs Closed standing pose to the body pose grid.",
            "Fix: clicking Relaxed arms while kneeling was clearing the kneel — getCurrentPoses now also reads ActivePoseMapping so the body pose is preserved when BC stores it there instead of ActivePose.",
        ],
    },
    {
        version: "4.8.1",
        changes: [
            "Fix: sent messages in the beep window showed the wrong name when other addons modify the player's nickname — now reads directly from Player.Name/Nickname instead of going through the room character lookup.",
            "Fix: minimize and mute buttons in the beep window didn't respond to taps on mobile — the header drag handler was consuming touchstart on those buttons and preventing click from firing.",
        ],
    },
    {
        version: "4.8.0",
        changes: [
            "Fix: beep window could not be reopened after leaving and re-entering a chatroom — clicking 💬 a second time found the hidden window entry but never restored display, so it stayed invisible. Now always shown on re-open.",
            "UI: secondary account name beside a nickname in room/friend rows no longer uses parentheses — shown as plain dimmed text so the layout reads 'Nickname  username' more naturally.",
        ],
    },
    {
        version: "4.7.9",
        changes: [
            "Fix: golden paw now draws directly from live DrawArousalMeter args every frame — zero caching, zero buffering. BC's draw args are stable during idle animation so the paw locks on without any smoothing machinery.",
        ],
    },
    {
        version: "4.7.1",
        changes: [
            "Fix: golden paw is now completely static — position is captured once per room-sync event (with a 500ms delay so BC finishes repositioning first) and frozen until the next sync. BC's idle animation never touches the stored value, so there is nothing left to shake.",
        ],
    },
    {
        version: "4.7.0",
        changes: [
            "Fix: golden paw now snaps left, top, and zoom together — BC's breathing animation nudges all three each frame, and multiplying a jittery zoom by 940 was enough to visibly shake the paw even when position was held. All three values must exceed their thresholds before any update fires.",
        ],
    },
    {
        version: "4.6.9",
        changes: [
            "Fix: golden paw jitter filter restored — BC's idle-animation nudges left/top by ±1-2 units per frame which was visible on a large glowing icon. Movements under 4 units are now held; anything larger (join/leave repositioning, zoom) updates immediately with no lag.",
        ],
    },
    {
        version: "4.6.8",
        changes: [
            "Fix: golden paw is now anchored directly to the name-tag position BC reports each frame — no snap, no settle counter, no lag. The paw moves perfectly in sync with the name label and never dances or floats away when players join or leave.",
        ],
    },
    {
        version: "4.6.7",
        changes: [
            "Fix: golden paw no longer shakes when players join or leave — replaced the timer-based freeze with a settle-counter: the paw only moves to a new canvas position after the character has been stable there for 10 consecutive draw frames, so BC's repositioning animation plays out completely before the paw follows.",
        ],
    },
    {
        version: "4.6.6",
        changes: [
            "Reverted: LZ-string compression removed entirely — settings are stored as plain keys in ExtensionSettings again. Drops any leftover _d blob on load. Fixes all data-loss issues introduced in v4.6.2–v4.6.5.",
        ],
    },
    {
        version: "4.6.5",
        changes: [
            "Fix: settings storage reverted to plain keys (no compression) — removes the data-loss risk introduced in v4.6.2–v4.6.4. One-time recovery migration: if v4.6.4 corrupted the compressed blob with an empty sync, the pre-v4.6.2 raw keys (which were never overwritten) are used to restore your outfits, scenes, and other saved data automatically on first load.",
        ],
    },
    {
        version: "4.6.4",
        changes: [
            "Fix: initSettings no longer crashes with 'Cannot read properties of undefined (reading EmeryBC)' when BC hasn't finished building the Player object yet — Player.ExtensionSettings is now safely guarded in both initSettings and flushToExtensionSettings.",
        ],
    },
    {
        version: "4.6.3",
        changes: [
            "Fix: golden paw no longer shakes when a member joins or leaves the room — snap position is now frozen for 600 ms after any ChatRoomSyncMemberJoin/Leave so the paw holds still while BC repositions characters, then snaps once to the new stable position.",
            "Fix: EBC version badge now always broadcasts the actual running version to room members (was hardcoded to 4.6.0).",
        ],
    },
    {
        version: "4.6.2",
        changes: [
            "Storage: all ExtensionSettings data is now LZ-string compressed before syncing to BC's servers — effective capacity is ~4× larger, so power users with many outfits/scenes/presets no longer risk hitting the server limit. Kitty menu data also moved from browser-local localStorage into the compressed blob, making it cross-device for the first time.",
        ],
    },
    {
        version: "4.6.1",
        changes: [
            "Internal: all modules now use the shared getSettings() accessor from bcUtils instead of per-file getAddon()/getStore() helpers — no behaviour change.",
        ],
    },
    {
        version: "4.6.0",
        changes: [
            "i18n: Expressions section fully translated — section title, presets header, save/reset/override/default buttons, auto-apply toggle, chat triggers header/hint, new-trigger form labels, and how-to info box all now respect the selected language.",
        ],
    },
    {
        version: "4.5.9",
        changes: [
            "Fix: EBC overhead badges (paw mark, text/cat badge) now hide correctly when BC's 'Show/hide character icons' button is toggled — they previously stayed visible and overlapped character images.",
        ],
    },
    {
        version: "4.5.8",
        changes: [
            "Dev tab: Addons Loaded header now shows the count — e.g. 'ADDONS LOADED (10)'.",
        ],
    },
    {
        version: "4.5.7",
        changes: [
            "UI: touch mode status label changed from '(auto: on/off)' to '(auto — phone detected)' / '(auto — desktop)' so it's clear what the auto-detection means.",
        ],
    },
    {
        version: "4.5.6",
        changes: [
            "UI: removed 📍 pin emoji from the Text and Cat badge drag buttons.",
        ],
    },
    {
        version: "4.5.5",
        changes: [
            "Friends list & People in Room: account name now shown in muted text next to the nickname when they differ — e.g. 'Lucy (Lucas)' — so you can always identify who someone is by their BC account name.",
        ],
    },
    {
        version: "4.5.4",
        changes: [
            "Creator paw: fixed shaking — position now snaps (5-unit threshold) so BC's idle-animation jitter no longer moves the paw each frame. Added dark backing disc so the paw is legible on bright/busy room backgrounds.",
        ],
    },
    {
        version: "4.5.3",
        changes: [
            "Friends list: room name chip max-width increased from 90px to 160px so names no longer clip after 5–6 characters. Text colours brightened slightly for better readability.",
        ],
    },
    {
        version: "4.5.2",
        changes: [
            "Docs: in-app guide updated — new steps for Expression Presets and Chat Triggers, Action Buttons step updated to mention 16-char labels and expression linking. README fully rewritten to cover all current features.",
        ],
    },
    {
        version: "4.5.1",
        changes: [
            "UX: expression presets and chat triggers now show a confirm dialog before deleting.",
        ],
    },
    {
        version: "4.5.0",
        changes: [
            "Action buttons: fixed hover effect — BC's hover highlight was missing because HoverText was being passed as empty string. Now passes btn.emote as the tooltip/hover trigger to DrawButton, restoring the highlight on mouseover.",
        ],
    },
    {
        version: "4.4.9",
        changes: [
            "Action buttons: fixed v4.4.8 regression — button colours and hover effect are restored. Custom centring now overlays text on top of BC's own DrawButton (empty label) so hover highlight and colour both work correctly.",
        ],
    },
    {
        version: "4.4.8",
        changes: [
            "Action buttons: replaced BC's DrawButton with a custom canvas draw that always centres the label text precisely — fixes off-centre rendering with short labels, symbols, and mixed-character strings like ':3', '=W=', '>:/'.",
        ],
    },
    {
        version: "4.4.7",
        changes: [
            "Beep windows: replaced the global 'suppress BC chat' button in the header with a per-person 🔔/🔇 mute toggle. Clicking it silences beep sounds from that specific person for the session without affecting anyone else.",
        ],
    },
    {
        version: "4.4.6",
        changes: [
            "Buttons tab: fixed capitalization mismatch — the label input was styled with CSS text-transform:uppercase so it appeared all-caps in the panel while the sidebar showed the real stored value. Removed the forced uppercase; labels now display exactly as typed in both places. Also widened the label input field slightly and fixed a missed slice(0,6) cap in the save-flush path.",
        ],
    },
    {
        version: "4.4.5",
        changes: [
            "Buttons tab: increased action button label max length from 6 to 16 characters so names like 'Default', 'Release' etc. fit.",
        ],
    },
    {
        version: "4.4.4",
        changes: [
            "Anims tab: removed the '📌 Reset all panel positions' button.",
        ],
    },
    {
        version: "4.4.3",
        changes: [
            "Expressions: replaced the ★ symbol on presets with a proper 'Default' button styled to match the other row buttons (gold-tinted when active, muted when inactive).",
        ],
    },
    {
        version: "4.4.2",
        changes: [
            "Outfits: added Face preset field to both the new-outfit form and the edit panel. Pick an expression preset and it will be applied automatically whenever that outfit is worn (via button or /command).",
            "Expressions: added '★ Auto-apply default face on room join' toggle. When ON, your default ★ preset is applied each time you enter a room.",
        ],
    },
    {
        version: "4.4.1",
        changes: [
            "Expression Sequences: added ↺ Reset step type. Inserting a reset step into a sequence applies your default face preset (★) at playback, or clears all expression groups if no default is set. Shown in the step list as '↺ Reset face' in italic pink.",
        ],
    },
    {
        version: "4.4.0",
        changes: [
            "Android phone fixes: broadened touch detection to also check navigator.maxTouchPoints so builds that misreport pointer:fine still get touch mode. Upgraded touch event guards to stopImmediatePropagation in both capture and bubble phases so BC's canvas handlers cannot override panel scroll. Moved -webkit-overflow-scrolling:touch and overflow-y:scroll to the base body style (not just touch mode). Added touch-action:pan-y to the panel container itself.",
        ],
    },
    {
        version: "4.3.9",
        changes: [
            "Phone/touch mode: language pills now wrap to a second row instead of squishing into one — also slightly reduced their touch-mode size so they sit neatly.",
        ],
    },
    {
        version: "4.3.8",
        changes: [
            "Expression Sequences: removed the redundant top 'Save Changes' bar — only the bottom one remains.",
            "Default badge settings: on first load, if no badge settings have been configured yet, EBC now seeds the preferred defaults (cat style, correct offsets, show own badge, hide version labels).",
        ],
    },
    {
        version: "4.3.7",
        changes: [
            "Replaced all ↑↓ arrow text on reorder/move buttons with clean SVG chevrons across the whole panel (expression sequences, pose combos, action button steps, outfit reorder, restraint reorder, action slot reorder).",
            "Added − and + step buttons next to every hold/delay ms input for easy ±100 ms adjustment without typing.",
            "Removed native browser number-input spinners from all inputs inside the EBC panel.",
        ],
    },
    {
        version: "4.3.6",
        changes: [
            "Expression Presets: renamed ↺ button label to 'Override'.",
        ],
    },
    {
        version: "4.3.5",
        changes: [
            "Expression Sequences: fixed ▶ and ✎ buttons — they were using undefined CSS classes and rendered unstyled. Now use the same styled button classes as pose combos (ebc-wear-btn / ebc-edit-btn).",
            "Expression Presets: added ↺ button on each preset row to overwrite the preset with your current live face expression (with confirm dialog).",
        ],
    },
    {
        version: "4.3.4",
        changes: [
            "EBC Tag Settings strip: Export and Import buttons now match the visual style of the Pin Text / Pin Cat position buttons (dark background, muted pink, bright hover).",
        ],
    },
    {
        version: "4.3.3",
        changes: [
            "EBC Tag Settings strip: fixed Export/Import — it now exports and imports your actual overhead badge display settings (style, scale, position offsets, opacity, visibility toggles), not friend labels. Code format changed to EBC-BADGE-v1. Removed the incorrectly seeded friend tags from v4.3.1.",
        ],
    },
    {
        version: "4.3.2",
        changes: [
            "Expressions → Chat Triggers: new section at the bottom of the Expressions panel. Add a trigger with a match phrase (e.g. >:3) and a face preset — whenever your outgoing chat message contains that text the preset fires automatically. Each trigger has an independent hold time (ms) before reverting to your default face, or 0 for permanent. The logic was already wired up but had no UI to configure it.",
        ],
    },
    {
        version: "4.3.1",
        changes: [
            "Default friend tags: seeded on first run if no tags exist yet (BC Asset Dev, Horny boi, BC DEV, Owner with their colours).",
            "Expressions tab: renamed 'Clear all expressions' button to 'Reset face expression'. Now applies the default face preset (★) if one is set, and only falls back to clearing all groups if no default is saved.",
        ],
    },
    {
        version: "4.3.0",
        changes: [
            "Animations tab: new 'Expression Sequences' section. Build a named sequence of saved face presets — each step shows for a configurable hold time (ms) before advancing to the next. Play manually with ▶, or assign an optional /command to trigger from chat. Steps are reorderable with ↑/↓ and each hold time is independently adjustable. Sequences are self-contained snapshots so they survive preset renames/deletions.",
        ],
    },
    {
        version: "4.2.9",
        changes: [
            "Expressions tab: removed stale help text claiming presets can be triggered by a matching chat message — that feature doesn't exist. Info box now correctly states presets can be applied manually or fired from action buttons / scenes.",
        ],
    },
    {
        version: "4.2.8",
        changes: [
            "Confirm dialogs: all destructive overwrites now require confirmation before applying. Restraint set Update button now shows the same confirm overlay as Outfit Update. Pose combo Save Changes and Scene Save Changes also prompt before overwriting.",
        ],
    },
    {
        version: "4.2.7",
        changes: [
            "EBC Tag Settings strip: moved the Tag settings Export/Import section here from the Notes tab, where it belongs alongside the other tag options.",
        ],
    },
    {
        version: "4.2.6",
        changes: [
            "EBC panel: fixed disappearing when the browser window is scaled down (split-screen, snap, etc.). BC repositions TextAreaChatLog via CSS left/top changes which ResizeObserver never fires for — added a window 'resize' listener (with a requestAnimationFrame delay to let BC reposition first) so the panel re-anchors correctly after any browser window resize.",
        ],
    },
    {
        version: "4.2.5",
        changes: [
            "Scenes — item search: fixed 'No items found' for props/hands items (Laptop, etc.). Newer BC versions store Group.Family as an array instead of a string, causing every family check to silently fail. Both getAllGroups and getGroupAssets now handle string and array family values.",
            "Notes tab: new 'Tag settings' section above the friends list with ⬆ Export and ⬇ Import buttons. Export generates a shareable EBC-TAGS-v1:… code containing all your tag assignments. Import pastes the code and merges the tags into your own settings — useful for sharing a tagging setup with someone else.",
        ],
    },
    {
        version: "4.2.4",
        changes: [
            "Beep windows: removed the 🔔 mute and 👤 profile buttons from the chat window header — mute is now in the Chat and notifications section of the Notes tab, and profiles are accessible from the People in Room / Friends lists there.",
        ],
    },
    {
        version: "4.2.3",
        changes: [
            "Scenes — Equip steps: unified into a single 'Equip Item' type that searches ALL item groups at once. No more split between 'Equip Restraint' and 'Equip Item (clothes, props…)' — one search box finds anything. Legacy steps saved with the old types still load and display correctly.",
        ],
    },
    {
        version: "4.2.2",
        changes: [
            "Scenes — Equip steps: added a 🔍 item search box above the slot/item dropdowns. Type any part of an item's name and a live dropdown shows up to 20 matches with the item name and its slot. Clicking a result auto-selects both the slot and the item — no need to browse categories manually.",
        ],
    },
    {
        version: "4.2.1",
        changes: [
            "Scenes: renamed 'Equip Clothes' step type to 'Equip Item (clothes, props…)' to make it clear this step covers ALL non-restraint items — clothing, accessories, props, laptops, and any other new BC items. Slot dropdown now shows a tooltip describing what each equip type includes.",
        ],
    },
    {
        version: "4.2.0",
        changes: [
            "Chat windows: clicking the 💬 button beside a friend now snaps the beep window to the centre of the screen and restores it if minimised. New windows also open centred instead of anchored to the bottom-right corner. Session-restored windows still reload at their last saved position.",
        ],
    },
    {
        version: "4.1.9",
        changes: [
            "Expressions (Anims tab): removed the Triggers section entirely.",
        ],
    },
    {
        version: "4.1.8",
        changes: [
            "Readability pass: all inline font sizes below 11px (8px, 9px, 10px) in the drawer panel are now 11px. Dim muted label colours (#5a3a5a, #5a3a6e, #9a6a98, #9a6ac8, #9a7aaa, and others) are brightened to readable pink/lavender values throughout all tabs.",
        ],
    },
    {
        version: "4.1.7",
        changes: [
            "Buttons tab: 'Face:' label now bright pink (#cf6f98) and bold at 10px instead of dim muted 8px. Face preset and duration dropdowns also bumped to 10px with lighter text (#e8c8e8) for readability.",
        ],
    },
    {
        version: "4.1.6",
        changes: [
            "Buttons tab: face revert duration dropdown — replaced unreadable ♾ symbol with plain 'keep' text, bumped font from 8px to 9px, widened selector from 44px to 52px.",
        ],
    },
    {
        version: "4.1.5",
        changes: [
            "Anims tab — Expressions: removed the live face-builder button grid. Replaced with a clear how-to explanation: set your face using BC's own expression controls in-game, then use '💾 Save face' to capture it as a preset. Save, presets, triggers, and scene/button integration all remain.",
            "Anims tab — top of tab: added '📌 Reset all panel positions' button that snaps both the action buttons sidebar and the EBC drawer back to their default on-screen positions in one click.",
        ],
    },
    {
        version: "4.1.4",
        changes: [
            "Buttons tab: added '📌 Reset pos' button (in the Export/Import row) to snap the action buttons sidebar back to its default on-screen position when it has been dragged off-screen.",
        ],
    },
    {
        version: "4.1.3",
        changes: [
            "Expressions: expanded Emoticon fallback list to 36 entries (added Brb, SOS, Work, Shopping, Coffee, Fork, Music, Car, Hanger, Call, Lightbulb, Warning, BrokenHeart, Drawing, Coding, TV, Bathing).",
            "Scenes: added 'Expression' step type — drop in a face preset during a scene with optional auto-revert duration.",
            "Action buttons: optional face preset trigger on button click with configurable revert duration (or keep forever).",
            "Drawer: Scene editor now shows an Expression step UI (preset picker + revert duration). Button slots now show a Face row for selecting an expression preset to fire when the button is clicked.",
        ],
    },
    {
        version: "4.1.2",
        changes: [
            "Expressions face builder: preset name input moved above the Save face button so it takes the full panel width.",
        ],
    },
    {
        version: "4.1.1",
        changes: [
            "Expressions (Anims tab): completely reworked the UI. Replaced the dropdown-based picker with a live face-builder — each expression group (Blush, Eyes, Eyes R, Mouth, Eyebrows, Fluids, Emoticon, Tears) now shows a row of clickable buttons. Clicking a button applies the expression immediately and highlights the active choice in pink. A '—' button at the start of each row clears that group. Save current face as a named preset with the name input + Save button. Presets section (shown when presets exist) lists saved faces with ✓ Apply, inline rename, ★ default, × delete. Triggers section is unchanged.",
        ],
    },
    {
        version: "3.9.1",
        changes: [
            "Fix: Release Restraints and Remove Locks no longer fight with the DOGS mod (Devious Obligate Great Stuff). DOGS uses ExclusivePadlock as its base lock type — EBC was trying to remove those items, DOGS would instantly restore them via server hooks, leaving the UI in a broken/oscillating state. ExclusivePadlock is now treated as a protected lock (same as owner/lover/family), so EBC skips DOGS-padlocked items entirely. A chat notice explains what was skipped and why when DOGS is active.",
            "Fix: InventoryRemove calls in Release Restraints are now individually try-caught so a throwing mod hook can no longer crash the whole operation.",
        ],
    },
    {
        version: "3.9.0",
        changes: [
            "Friends list: removed the 🔍 emoji from the search input placeholder — plain text only.",
        ],
    },
    {
        version: "3.8.9",
        changes: [
            "Beep/chat windows: removed the 😊 emoji picker button from the message input bar.",
            "Scene editor chat step: restored the '* *' emote format toggle (was incorrectly removed in v3.8.7). Both '* *' and '( )' toggles are now proper toggles — clicking the active one deactivates it back to plain text.",
        ],
    },
    {
        version: "3.8.8",
        changes: [
            "Fix: beep/chat windows could get stuck off the top of the screen after being dragged. The drag clamp was using the header height (~38 px) as the upper bound instead of the full window height (~380 px), allowing the window to be dragged until only its bottom edge was visible. Both the drag clamp and the saved-position restore now clamp to keep the entire window within the viewport.",
        ],
    },
    {
        version: "3.8.7",
        changes: [
            "Scene editor: removed the 'emote' (★) chat format option from chat steps — emotes caused confusion with how BC sends them. The OOC toggle remains; plain text is the default.",
            "Scene editor: typing in step text fields no longer loses focus due to BC's keyboard handler intercepting keystrokes. All step inputs now stop keydown propagation so BC cannot steal focus mid-type.",
            "Scene editor: the OOC ( ) format toggle is now a proper toggle — clicking it again deactivates it (back to plain), matching expected button behaviour.",
        ],
    },
    {
        version: "3.8.6",
        changes: [
            "Friends list: search input added — filters by name or member number in real time, auto-expands the offline section when a query is active.",
            "Friends list: offline friends with a real cached name now sort above number-only entries (friends you've never seen whose name is just '#123456').",
        ],
    },
    {
        version: "3.8.5",
        changes: [
            "DEV tab → Current Room: profile button added to every entry in both the 'On entry' and 'Joined after you' lists.",
        ],
    },
    {
        version: "3.8.4",
        changes: [
            "Fix: unhandled promise rejection '[object Event]' on Android/mobile. Dexie rejects its internal IndexedDB open promise with a raw IDB error Event on some Android Chrome builds. Added db.open().catch() at startup to always catch this before any table operation creates its own chain.",
        ],
    },
    {
        version: "3.8.3",
        changes: [
            "Fix: panel drag now works on tablet/touch. The stopPropagation guard on the panel container (which prevents BC from killing scroll events) was also swallowing touchmove before it reached the drag tracker. Drag tracking now uses capture-phase listeners which fire before any stopPropagation in the bubble phase.",
        ],
    },
    {
        version: "3.8.2",
        changes: [
            "Fix: Phone mode toggle now actually works on real touch devices. Previously isTouchModeActive() always returned true on tablets (device detection won), so toggling it OFF had no effect. An explicit force-off ('0') now beats device detection.",
        ],
    },
    {
        version: "3.8.1",
        changes: [
            "Tablet/phone: panel now automatically opens in free-float mode centered on screen instead of trying to anchor to BC's desktop chat-log layout (which is completely wrong on mobile).",
            "Free-float panel width is now responsive — uses up to calc(100vw - 16px) on narrow screens.",
            "Panel position clamping updated to always keep the panel reachable on any screen size.",
        ],
    },
    {
        version: "3.8.0",
        changes: [
            "Anims tab: Body and Arms pose grids are now inside a collapsible 'Poses' section. The NOW status bar has been removed.",
        ],
    },
    {
        version: "3.7.9",
        changes: [
            "Credits tab: Emery card now appears above the Special Thanks section under its own 'Made By' heading.",
            "Header ? button is now clearly visible (brighter pink colour).",
            "German reset-position button text shortened to prevent header clipping; all languages now have a max-width safety truncation.",
        ],
    },
    {
        version: "3.7.8",
        changes: [
            "Scenes step editor: each step card now shows its step number (1, 2, 3…) so reordering with ↑/↓ is visually obvious. After a move the newly positioned card scrolls into view.",
        ],
    },
    {
        version: "3.7.7",
        changes: [
            "Scenes: pose step Arms dropdown first option renamed from 'None' to 'Relaxed' to match pose combo vocabulary.",
        ],
    },
    {
        version: "3.7.6",
        changes: [
            "Fix: pose combos with a Relaxed step now work correctly. Root cause: applyPosesSequential was stripping all arm poses from every step whenever any '' entry appeared in the list, so a combo like [Kneel, BackBoxTie, ''] would end up applying only Kneel. Rewrote the function to track a cumulative body+arm state per step so '' just clears the arm slot at that point without affecting other steps.",
        ],
    },
    {
        version: "3.7.5",
        changes: [
            "Action buttons: first 3 rapid presses all fire freely; a 4th press within 2 seconds triggers the 5s cooldown lockout. Waiting 2s+ between presses resets the streak.",
        ],
    },
    {
        version: "3.7.3",
        changes: [
            "Fix: pose combos/buttons now correctly maintain the set pose. Root cause: PoseSetActive can silently return early (no throw) if the pose lookup fails, leaving ActivePoseMapping unchanged. Every CharacterRefresh then recomputes ActivePose from that empty mapping and wipes the pose. Fix: also set ActivePoseMapping directly via AssetPoseFindName so all subsequent refreshes see the correct categories.",
            "Action button cooldown display: replaced '12s' plain text with a custom canvas button — dimmed label at top, large pink countdown number in centre, fill-bar progress indicator along the bottom edge.",
        ],
    },
    {
        version: "3.7.2",
        changes: [
            "Fix: pose application now pushes to room via direct ServerSend instead of CharacterRefresh(Push=true).",
        ],
    },
    {
        version: "3.7.1",
        changes: [
            "Action buttons: reduced cooldown from 15s to 5s.",
        ],
    },
    {
        version: "3.7.0",
        changes: [
            "Action buttons: 5-second per-button cooldown — after firing, the button face shows a live countdown and clicks are ignored until the timer expires. Prevents spam-clicking action emotes.",
        ],
    },
    {
        version: "3.6.9",
        changes: [
            "Canvas paw: gap above name now equals paw size (min 8 px) instead of half paw size — keeps a full paw-height of clearance at all zoom levels so the paw no longer sinks into the name with 5+ players.",
            "Dev tab: removed Quick Preset and per-colour picker section (was unreliable).",
        ],
    },
    {
        version: "3.6.5",
        changes: [
            "Friends list: added sort dropdown — Status (default), ★ Starred first, A→Z, Z→A, Friends longest, Friends newest. Choice persists across sessions.",
        ],
    },
    {
        version: "3.6.3",
        changes: [
            "Removed /lock and /unlock commands — they no longer work reliably with current BC.",
            "Canvas paw: stabilised draw position with a 4 px snap threshold so the 1-2 px jitter from BC's join-event CharacterRefresh cascade no longer causes visible shaking.",
        ],
    },
    {
        version: "3.6.2",
        changes: [
            "Fix: pose combos now use BC's PoseSetActive API (the modern approach that writes ActivePoseMapping) instead of directly setting the legacy ActivePose array, which BC no longer reliably picks up for visual/sync updates.",
        ],
    },
    {
        version: "3.6.1",
        changes: [
            "Canvas paw: removed pulse animation and shadow blur — both were amplifying BC's character idle-animation position drift causing the paw to visibly shake. Now renders as a clean static image.",
        ],
    },
    {
        version: "3.6.0",
        changes: [
            "Fix: Relaxed arms pose now saves correctly in pose combos — createCombo and updateCombo were using filter(Boolean) which stripped the empty-string Relaxed marker; changed to filter(p => p != null).",
        ],
    },
    {
        version: "3.5.9",
        changes: [
            "Canvas paw: increased size (20*zoom) and moved higher above character name (8*zoom gap) for better visibility.",
        ],
    },
    {
        version: "3.5.8",
        changes: [
            "Users tab: favourited (★) friend cards now show a gold left-side tab stripe instead of a full gradient background and border — cleaner and less visually noisy.",
        ],
    },
    {
        version: "3.5.7",
        changes: [
            "Guide: spotlight elements now cycle one at a time as the user clicks Next — each highlighted element is shown individually before advancing to the next step.",
            "Guide: steps with multiple spotlights show a row of dots indicating which element is currently highlighted and how many are left.",
            "Guide: Back button now steps back through spotlight sub-steps before returning to the previous guide step.",
            "Guide: clicking Done at the end (or ✕) closes the main panel automatically.",
        ],
    },
    {
        version: "3.5.6",
        changes: [
            "Credits: creator card now uses standard layout (same size as other cards) — gold paw PNG fills the avatar circle, CREATOR badge removed, member chip and heart decoration now match other cards.",
            "Canvas paw: repositioned to centered above the character name (nameX - sz/2, nameY - sz - 3*zoom) instead of inline to the right.",
        ],
    },
    {
        version: "3.5.5",
        changes: [
            "Credits: creator paw moved above the name row and centered — no longer inline with the name chips.",
            "Credits: removed the pulsing glow animation from the creator paw; now a subtle static drop-shadow (28px, opacity 0.88).",
        ],
    },
    {
        version: "3.5.4",
        changes: [
            "Guide: removed 'Create sample outfit' action button; replaced with auto-expansion — sections spotlighted by the guide now open automatically so users can see and interact with the content immediately.",
            "Guide: fixed new-outfit form toggle (first click now opens the form instead of being silently swallowed by an initial-state mismatch).",
            "Theme system: repaintTheme() DOM walk replaces hardcoded default hex/rgba values in inline styles after every tab render, so panel backgrounds, cards, and borders now reflect the active theme.",
            "Theme system: applyPanelOpacity() now derives the panel background from getCoreColors().bg instead of the hardcoded rose default, so the panel bg changes with the theme.",
            "Theme system: live colour-picker changes now also trigger repaintTheme() + applyPanelOpacity() for immediate visual feedback without needing a tab switch.",
        ],
    },
    {
        version: "3.5.3",
        changes: [
            "Creator paw: corrected y to top+975*zoom (BC draws character names at CharTop+975*Zoom); reduced x gap from 76 to 54 units so the paw sits tightly inline with the name.",
        ],
    },
    {
        version: "3.5.2",
        changes: [
            "Scene sequencer: fixed Relaxed arms pose being stripped on save — the empty-string Relaxed marker is now preserved in step.poses.",
            "Guide: outfits step now names the real button label, removes emoji chips, and adds a one-click 'Create sample outfit' button so users can practise apply/rename/delete immediately.",
            "Guide: removed emoji from tags, buttons, EBC-tags, and tips steps; replaced with plain text equivalents.",
            "Touch mode: added overscroll-behavior:contain to the panel body so scroll momentum stays inside the panel and doesn't chain to the page (fixes rubber-banding on modern iOS/Android).",
        ],
    },
    {
        version: "3.5.1",
        changes: [
            "Theme system: corrected DEFAULT_COLORS hex values to match the actual CSS constants (panel bg, card, card-muted, soft text were all mismatched and doing nothing).",
            "Theme system: overhauled buildCSS() replacement table — added missing card/cardMuted/textSub mappings, removed dead entries, fixed bg slot that was hitting the wrong target.",
            "Theme presets: updated all non-rose presets with corrected bg/card/cardMuted/textSub values so color changes now visibly apply.",
        ],
    },
    {
        version: "3.5.0",
        changes: [
            "Credits: creator card now shows the animated gold paw PNG instead of a plain emoji.",
            "Phone mode: panel width capped to screen width so it never clips on narrow devices.",
            "Phone mode: tab row scrolls horizontally when tabs don't fit instead of clipping.",
            "Phone mode: body uses overflow-y:scroll + -webkit-overflow-scrolling:touch for reliable iOS momentum scroll.",
        ],
    },
    {
        version: "3.4.9",
        changes: [
            "Creator paw: tightened position (76*zoom gap) and raised minimum opacity to 0.72 so it never fades to near-invisible.",
        ],
    },
    {
        version: "3.4.8",
        changes: [
            "Guide: removed all emoji from step labels.",
        ],
    },
    {
        version: "3.4.7",
        changes: [
            "Creator mark: recolored paw PNG to gold, repositioned it to the right of the name so it no longer overlaps.",
            "Credits: restored member number chip and added paw mark emoji to the creator card.",
        ],
    },
    {
        version: "3.4.6",
        changes: [
            "Credits: replaced em dashes with plain hyphens in all English credit entries (Sin, Lucy, Sybil).",
        ],
    },
    {
        version: "3.4.5",
        changes: [
            "Creator mark: replaced the gold Font Awesome paw SVG with a custom 64x64 PNG (transparent background) embedded as a data URI — crisper at all zoom levels with no blob-URL async loading.",
        ],
    },
    {
        version: "3.4.4",
        changes: [
            "Guide: every step now spotlights the relevant UI element with a pulsing pink outline. New button, Tags section, Schedules, Add Category, Room People, DEV Preferences, DEV Logs, EBC Tags strip, and Safewords strip all have guide targets wired up.",
        ],
    },
    {
        version: "3.4.3",
        changes: [
            "Credits: removed the avatar circle from Emery's card entirely — no more SVG blob issues. Card now has a 4px solid gold left border, and 'Creator' is a proper gold pill badge (gold background, dark text). Clean and intentional.",
        ],
    },
    {
        version: "3.4.2",
        changes: [
            "Credits: fixed golden glow bleeding outside the paw avatar circle — added overflow:hidden so the drop-shadow stays clipped to the circle boundary.",
            "Poses: fixed Relaxed step being silently dropped when reopening a combo editor. filter(Boolean) was stripping the empty string key used for Relaxed; changed to filter(p => p != null) so it's preserved.",
        ],
    },
    {
        version: "3.4.1",
        changes: [
            "Theme presets: removed emojis from preset names — they looked inconsistent in the native select dropdown.",
            "Theme presets: the dropdown now remembers and shows the last applied preset instead of resetting to '-- choose preset --' after every selection. Reset button correctly resets back to Rose.",
            "Theme presets: manually tweaking a colour slot now clears the active preset indicator (since the colours are no longer a pure preset).",
            "Theme UI: preset row, colour picker labels, and tab visibility chips now use CSS variables so they update immediately when any theme is applied, without needing a tab switch.",
        ],
    },
    {
        version: "3.4.0",
        changes: [
            "Guide: replaced the 13-dot progress indicator with a clean progress bar. Next is now a filled pink primary button; Back is a small ghost button — clear visual hierarchy so the action you want is obvious.",
        ],
    },
    {
        version: "3.3.9",
        changes: [
            "Credits: fixed paw SVG rendering on Emery's card — avatar circle enlarged to 44px and paw drawn at 28px so the toe pads are actually legible instead of a blob. Removed the redundant right-side 🐾 emoji.",
        ],
    },
    {
        version: "3.3.8",
        changes: [
            "DEV tab: removed 'EBC Users in Room' section.",
        ],
    },
    {
        version: "3.3.7",
        changes: [
            "Creator mark: golden paw is now drawn just above Emery's character name on the BC canvas, visible to all EBC users in the room. Previously only visible to dev-build users and positioned near the badge — now anchored to the name position and always shown regardless of badge settings.",
        ],
    },
    {
        version: "3.3.6",
        changes: [
            "Guide: detached from the main panel — now opens as a floating side panel beside the EBC panel so the full menu stays visible while reading. Closes automatically when the panel closes.",
            "DEV tab: added 'EBC Users in Room' collapsible section — lists every room member who has been detected running EBC this session, with their name, member number, and version badge. Includes a ↻ Refresh button.",
        ],
    },
    {
        version: "3.3.5",
        changes: [
            "Guide overlay: text area now has max-height 110px with a thin scrollbar, so the card never covers more than a fixed strip at the bottom — the menu behind it stays visible.",
            "Guide spotlight: whenever the guide is on a step for a specific tab, that tab button pulses with a glowing pink outline so you know exactly where to look. Slow Leave step also spotlights the Useful Buttons header and the Slow Leave button; Poses step spotlights the + New combo button.",
        ],
    },
    {
        version: "3.3.4",
        changes: [
            "Credits: simplified Emery's card — golden paw SVG stays in the avatar circle (with animated golden ring), right side uses the plain 🐾 emoji like other cards use their heart emoji (SVG blob at 18px looked bad). Replaced the member ID chip with a small gold 'Creator' label. Card gets a golden left-border accent.",
        ],
    },
    {
        version: "3.3.3",
        changes: [
            "Credits: removed the redundant small paw above Emery's name (the avatar circle already shows the golden paw — three paws was too cluttered). Emery's card gets a subtle golden-tinted background to mark her as creator instead. Member ID chip is now plain muted text instead of a pink bordered badge.",
        ],
    },
    {
        version: "3.3.2",
        changes: [
            "Guide: keyword highlight chips are now clearly visible — background raised from near-black #4a1535 to a vivid #b84878, brighter border, stronger glow. They now pop against the dark guide card instead of blending in.",
        ],
    },
    {
        version: "3.3.1",
        changes: [
            "Theme presets: replaced the 6 loosely-coloured presets with 8 fully cohesive themes — Rose (default), Sakura, Lavender, Ocean, Forest, Crimson, Amber, Obsidian. Each has backgrounds, borders, text and accent all tinted consistently around the same hue.",
            "Colour slots: reorganised the 9 colour pickers into three labelled groups (Backgrounds / Accents / Text) with 3 slots each displayed in a 3-column grid. Each slot is renamed to describe what it visually affects ('Panel BG', 'Card BG', 'Input BG', 'Buttons/Tabs', 'Borders', 'Gold Details', 'Main Text', 'Label Text', 'Dim Text').",
            "Beep chat: emoji picker expanded from 30 to 60 emojis, covering happy/sad faces, gestures, hearts, sparkle/celebration, and cute animals/nature.",
        ],
    },
    {
        version: "3.3.0",
        changes: [
            "Guide: highlight chips are now much more prominent — bright pink border, darker background, glow, larger font. Tab title is bigger with an underline divider. Note lines have a left-accent bar. Card has a bold left-border accent and stronger shadow.",
            "Fix: adding a Relaxed arms step now labels it 'Relaxed' instead of 'Stand' (both share key '' internally, but Stand is never added to sequences so '' always means Relaxed in that context).",
            "Fix: Tags accordion in the Outfits tab now matches the standard section-label style (no more dashed box border making it look like a text input).",
            "Credits: Lucy moved above Lara.",
        ],
    },
    {
        version: "3.2.9",
        changes: [
            "Credits: Emery's paw icons now use the real FA paw SVG (same gold path as the in-game creator badge) instead of the 🐾 emoji. All three instances — avatar circle, above-name decoration, and right side — are the proper vector paw with the gold glow pulse.",
        ],
    },
    {
        version: "3.2.8",
        changes: [
            "Credits: Emery's card now shows a small golden flashing paw directly above the name, always visible.",
        ],
    },
    {
        version: "3.2.7",
        changes: [
            "Credits: Emery's card now shows golden paw icons on both the avatar circle (left) and the decoration (right). Both pulse with an animated gold glow/flash. Heart changed from 🎀 to 🐾 to match.",
        ],
    },
    {
        version: "3.2.6",
        changes: [
            "Guide (? button): expanded to 13 steps with richer detail; key terms are now pink highlighted chips ([[text]] markup); added italic note lines for extra context; new steps cover outfit tags, Slow Leave editor, safewords, and tips.",
            "EBC Tag Settings strip now correctly re-translates when the language is changed — previously all labels stayed in the language they were first built in.",
            "Credits: Emery's avatar emoji changed from 🌺 to 🐾 to better reflect the connection.",
        ],
    },
    {
        version: "3.2.5",
        changes: [
            "Slow Leave moved out of the quick-actions bar (no longer shown on every tab). It now lives as a plain button inside Useful Buttons. Below it is a collapsible accordion editor (same style as button category cards) for the preset dropdown, sequence textarea, and duration slider. The 🚶 emote has been removed from the button label.",
        ],
    },
    {
        version: "3.2.4",
        changes: [
            "EBC Tag Settings: position row now has two separate buttons — '📍 Text' and '📍 Cat' — so each badge style can be dragged to its own position without needing to switch styles first. Clicking a button activates drag mode for that style only; clicking again (or completing a drag) exits it.",
        ],
    },
    {
        version: "3.2.3",
        changes: [
            "Cat badge position is now independent from the text badge position. Enabling drag mode and dragging the cat icon only moves the cat offset; switching to text style drags only the text badge. The ⟳ reset button resets all three positions (text badge, cat badge, version text).",
        ],
    },
    {
        version: "3.2.2",
        changes: [
            "EBC Tag Settings: Text and Cat badge styles now each have their own independent scale slider. Existing scale value migrates automatically — both start at whatever you had set before.",
        ],
    },
    {
        version: "3.2.1",
        changes: [
            "EBC Tag Settings: fixed all untranslated strings — section header, ON/OFF status chips, and Text/Cat style-picker buttons now all use t() with full 7-language coverage.",
            "Slow Leave moved from the persistent quick-actions bar (visible on all tabs) into the BUTTONS tab under the Useful Buttons section. It no longer appears everywhere.",
            "Badge Y-axis offset maximum raised from 900 to 1500, giving enough range to drag the badge all the way down to the character name line.",
        ],
    },
    {
        version: "3.2.0",
        changes: [
            "Interactive guide: added a ? button in the panel header that opens a step-through tour overlay. It walks through all 8 major features/tabs with descriptions, auto-switches to the relevant tab on each step, and has Prev / Next / Done navigation with dot indicators.",
            "DEV tab: added missing 'Logs' translation key for all 7 supported languages (the renamed section previously fell back to the English key).",
        ],
    },
    {
        version: "3.1.9",
        changes: [
            "DEV tab restructure: Whisper Log and People Met sections moved inside the Logs collapsible section as nested sub-sections. The Logs section header is renamed from 'Dev Log' to 'Logs'. The standalone Whisper Log and People Met top-level sections are removed.",
        ],
    },
    {
        version: "3.1.8",
        changes: [
            "Special friends golden highlight fixed: added border to the friend-wrap container so the colored border actually shows, and raised gradient + border opacity so the gold tint is clearly visible.",
            "Theme system: buildCSS() now emits CSS custom properties (--ebc-bg, --ebc-card, --ebc-accent, etc.) on #emerybc-panel so any inline style using var(--ebc-xxx) auto-updates when the theme changes. Key button and badge styles in the user list now use these vars. Applying a preset or resetting the theme also triggers a full re-render so the whole panel reflects the new colors.",
            "Translations: special friend star button now uses t() for its tooltip text in all supported languages.",
        ],
    },
    {
        version: "3.1.7",
        changes: [
            "Moved pinned strip tab visibility controls from inside the Safewords and EBC Tag Settings panels to DEV → Drawer Prefs. The section is clearly labeled, includes a description, and uses larger toggle chips.",
        ],
    },
    {
        version: "3.1.6",
        changes: [
            "Creator paw: replaced hand-drawn canvas paw with a proper SVG paw icon (Font Awesome fa-paw paths, MIT licensed) loaded as a Blob image — same quality as the cat badge.",
            "Badge drag: removed Icon X/Y and Ver. X/Y numeric input rows from the EBC Tag Settings panel. The drag button and combined reset button (⟳) remain.",
        ],
    },
    {
        version: "3.1.5",
        changes: [
            "Pinned strip tab visibility: each strip (Safewords, EBC Tag Settings) now has a compact 'Visible on tabs' chip row in its settings panel. Toggle individual tab chips (OUT / BTN / ANM / USR / CRD / DEV / DOM) to hide the strip on tabs where you don't need it. Settings are per-device (localStorage) and persist across sessions.",
        ],
    },
    {
        version: "3.1.4",
        changes: [
            "Creator mark: replaced gold crown text character with a canvas-drawn paw print (palm pad + four toe circles) — subtler and more on-brand.",
            "Badge drag: both the cat icon and version text labels now have independent drag handles (pink ring = icon, amber ring = version text) when drag mode is active.",
            "Badge drag: all clicks are now blocked from passing through to BC while drag mode is active — no more accidental character tab opens.",
            "Fix: orange dev outline on cat badge simplified to a single-pass glow — cleaner, less visually noisy.",
            "Fix: version text in cat mode now has a dark pill background with a matching border so it's readable on any background.",
        ],
    },
    {
        version: "3.1.3",
        changes: [
            "Fix: Relaxed arm pose now works in pose combos and scenes. Three bugs fixed: (1) Relaxed button was hidden in the combo step quick-add grid; (2) getPoses() was stripping the empty-string Relaxed marker before saving; (3) the scene step Arms dropdown onChange was also filtering it out with filter(Boolean).",
        ],
    },
    {
        version: "3.1.2",
        changes: [
            "Remove cat SVG icon from the Badge Appearance section header — now shows a clean text label.",
            "Creator mark: a pulsing gold crown (♛) is drawn above the creator's badge position in the chatroom canvas, visible only to EBC addon users.",
            "Special friends: star (☆/★) button on every People in Room and Friends row — toggling marks that person with a golden gradient card highlight.",
            "Fix: Relaxed arm pose (empty key) now works correctly in pose combos and scenes — it explicitly clears active arm poses instead of being silently dropped by filter(Boolean).",
        ],
    },
    {
        version: "3.1.1",
        changes: [
            "Remove emoji icons from badge toggle cards (My tag, Others, My version, Others' ver.).",
            "Cat style: version text now renders as a separate floating label when version display is enabled, independent of the cat icon.",
            "New position controls: Icon X/Y and Ver. X/Y number inputs in the badge settings strip for precise positioning of both elements independently.",
        ],
    },
    {
        version: "3.1.0",
        changes: [
            "Dev cat badge outline: replaced flat solid orange stroke with a two-pass glow effect — wide soft amber halo (shadowBlur) plus a crisp bright highlight line on top.",
        ],
    },
    {
        version: "2.10.9",
        changes: [
            "Remove small cat SVG icon from the EBC Tag Settings strip header — text label only.",
        ],
    },
    {
        version: "2.10.8",
        changes: [
            "Style picker buttons (Text / Cat) now show plain text only — removed the label icon and EBC SVG icon from those buttons.",
            "EBC tag strip header renamed from 'EBC' to 'EBC Tag Settings'.",
            "Cat badge: draws an orange rounded-rect outline around the cat icon when the player is on a dev build; no outline for normal users.",
        ],
    },
    {
        version: "2.10.7",
        changes: [
            "Fix: Root cause of broken scroll and missing footer identified and fixed. applyPanelZoom() was clearing the zoom-wrapper's height to '' at scale=1, removing its 100% height entirely. This caused the wrapper to collapse to content height with no flex constraint, so the body never scrolled (it just expanded) and the footer was pushed past the panel clip boundary. Fix: always keep width/height at 100% at scale=1 instead of clearing them. Reverted middleArea back to the clean flat flex layout — it is no longer needed.",
        ],
    },
    {
        version: "2.10.6",
        changes: [
            "Fix: Removed overflow:hidden from the middleArea container. Chrome has a known bug where overflow:hidden on a flex parent silently breaks overflow-y:auto scrolling on nested flex children — the body appeared correct in layout but its scroll context was never established. Removing overflow lets the body scroll normally. Footer visibility is guaranteed by the flex:1 layout, not by clipping.",
        ],
    },
    {
        version: "2.10.5",
        changes: [
            "Fix: Footer is now always visible on every page. Chrome elements (quick-actions, safewords, EBC strip) and the body are wrapped in a shared flex column (middleArea: flex:1; min-height:0; overflow:hidden). The footer lives outside that container so it can never be pushed off-screen regardless of chrome height or body content. This also eliminates scroll-event stealing — only the body scrolls, and only when the cursor is over it.",
        ],
    },
    {
        version: "2.10.4",
        changes: [
            "Fix: EBC tag strip body now has a max-height (210px, scrollable) so the footer is always visible regardless of how much badge-appearance content is expanded.",
            "Feature: Added 'Others\\' style' picker in the EBC tag strip — independently choose Text or Cat style for other players' overhead badges on your screen.",
        ],
    },
    {
        version: "2.10.3",
        changes: [
            "Fix: Removed the chromeWrap container introduced in v2.10.0 — its overflow-y:auto was stealing scroll wheel events from the main tab body, making all pages non-scrollable. Chrome elements (quick actions, safeword, EBC tags) are now direct flex children again, restoring correct body scrolling.",
        ],
    },
    {
        version: "2.10.2",
        changes: [
            "Fix: Cat badge style now draws the EBC cat-face SVG icon overhead instead of the 🐱 emoji. The SVG is loaded once via a Blob URL and cached as an HTMLImageElement so it renders identically on all browsers.",
        ],
    },
    {
        version: "2.10.1",
        changes: [
            "UX: Removed the 'Custom pose key' free-text input from the pose combo step editor. The preset pose buttons cover all known poses — the freeform field was not propagated correctly and has been removed until a proper implementation is ready.",
        ],
    },
    {
        version: "2.10.0",
        changes: [
            "Fix: Text badge now renders using direct canvas text so the font size scales correctly at any badge scale value — previously DrawTextFit had an internal size cap that made large badges look broken.",
            "Fix: The always-visible chrome area (quick actions, safeword section, EBC tag strip) now has a scrollable max-height cap so its contents never push the main tab body off-screen. All tabs now reliably display their scrollable content area.",
        ],
    },
    {
        version: "2.9.9",
        changes: [
            "Feature: Badge BG and Text opacity are now two independent sliders. 'BG' controls the background rectangle transparency (0 = invisible background, text floats freely); 'Text' controls the label / emoji opacity. Both are available in the badge appearance section.",
            "Fix: Drawer body could not scroll — flex child lacked min-height:0 which prevented it from shrinking past its content height when fixed elements above it were too tall.",
            "Fix: Language row reverted to single-line (nowrap) using short abbreviations (EN/DE/etc.) with full name shown on hover, so it no longer wraps and steals vertical space from the scrollable body.",
        ],
    },
    {
        version: "2.9.8",
        changes: [
            "UX: Cat badge style button now shows the EBC cat-face SVG icon instead of the 🐱 emoji.",
        ],
    },
    {
        version: "2.9.7",
        changes: [
            "Fix: Japanese language pill was hidden — the language row used flex-wrap:nowrap so the 7th pill overflowed off-screen with no visible scrollbar. Row now wraps to a second line when all pills don't fit.",
        ],
    },
    {
        version: "2.9.6",
        changes: [
            "Feature: Separate version-badge controls for self and others. 'My version' toggles whether your own badge shows your EBC version; 'Others\\' ver.' toggles whether other players' badges show their version. Both are now in the EBC tag strip alongside the existing visibility cards.",
            "UX: EBC tag strip section header now shows the EBC cat-face logo and the addon name instead of the generic 🏷 label.",
        ],
    },
    {
        version: "2.9.5",
        changes: [
            "Fix: drawer icon could vanish entirely (requiring opening wardrobe/profile to recover). Root cause: the chatroom branch of updateVisibility() only set display:block when syncToChat() succeeded — if BC temporarily zeroed or removed TextAreaChatLog during a screen transition the root stayed hidden indefinitely. Fix: visibility is now always restored immediately; syncToChat() is used for positioning only. A 200 ms heartbeat in the CRABS poller additionally restores the root within one tick if any external code hides it again.",
        ],
    },
    {
        version: "2.9.4",
        changes: [
            "Feature: Badge opacity slider — control how transparent the overhead EBC badge is (10%–100%), stored per-character alongside scale.",
            "UX: 'BADGE APPEARANCE' section header replaced with the EBC cat-face logo icon for a cleaner look.",
            "UX: Drag-to-position hint text is now a more readable pink-rose colour (#c09098) instead of the hard-to-read dark muted shade it was before.",
        ],
    },
    {
        version: "2.9.3",
        changes: [
            "i18n: Full translation pass — DEV → Drawer Preferences (phone/touch mode, panel opacity, text size, quick preset, colour slots, visible tabs, menu hotkey), EBC tag strip (SAFEWORDS label, tag toggles, badge appearance, scale, drag-to-position), AFK section (reply message, hints), and Users/Notes tab (tags, note, self-note). All new strings translated into all 7 languages (EN/DE/ZH/FR/ES/RU/JA).",
        ],
    },
    {
        version: "2.9.2",
        changes: [
            "Fix: Text size slider no longer glitches. Zoom is now applied via transform:scale() on an inner wrapper div instead of CSS zoom on the slide container — transform doesn't affect the container's layout so the slide transition never misfires and the panel never resizes during slider drag.",
            "Feature: Japanese (日本語) language support added.",
        ],
    },
    {
        version: "2.9.1",
        changes: [
            "UX: Text size slider capped at 80%–150% (was 60%–200%) to prevent UI breakage at extreme values. Stored values outside this range are automatically clamped on load.",
            "Feature: Emergency drawer reset — hold the EBC tab icon for 5 seconds and release to get a confirmation dialog that resets text size, panel opacity, and position all at once. Useful if the panel gets into an unusable state.",
        ],
    },
    {
        version: "2.9.0",
        changes: [
            "UX: '⌖ Reset all' button now also resets text size back to 100% in addition to snapping the panel back to its default anchored position. Button label and tooltip updated to reflect this.",
        ],
    },
    {
        version: "2.8.9",
        changes: [
            "Fix: Text size slider no longer clips content or shows background bleed. Zoom is applied to the slide container (correct target for full-panel scaling) with the CSS transition temporarily suppressed for the single frame of the zoom change, preventing the slide animation from firing.",
        ],
    },
    {
        version: "2.8.8",
        changes: [
            "Fix: Text size slider no longer causes the panel to glitch/slide. Zoom is now applied to the inner visual panel instead of the slide container, avoiding a CSS transition conflict where changing zoom re-evaluated 100% in the translateX animation.",
        ],
    },
    {
        version: "2.8.7",
        changes: [
            "Feature: Panel zoom — a 'Text size' slider in DEV → Drawer Prefs scales the entire EBC panel (text, buttons, spacing) from 60% to 200%. Setting is persisted across sessions. Solves readability on high-DPI / large-monitor setups.",
        ],
    },
    {
        version: "2.8.6",
        changes: [
            "UX: Missed Messages section — removed emoji from header, renamed to 'MISSED MESSAGES', section now completely hidden when there are no unread beeps, and each entry disappears individually as you open it (section vanishes when the last one is cleared).",
        ],
    },
    {
        version: "2.8.5",
        changes: [
            "Fix: EBC badge no longer appears on players who used EBC in a past session but are not running it now. Presence broadcasts now include a timestamp; presences without a timestamp (old EBC versions) or older than 8 hours are rejected as stale server data. Presence ts is also refreshed whenever a new member joins the room, keeping it current for long sessions.",
        ],
    },
    {
        version: "2.8.4",
        changes: [
            "Feature: Messages dropdown — collapsible 📬 Messages section at the top of the USERS tab. Unread conversations float to the top with a pink badge; read conversations listed below. Clicking a row opens the chat window. USERS tab button shows a live unread count. The EBC sidebar dot navigates to USERS on click.",
        ],
    },
    {
        version: "2.8.2",
        changes: [
            "Feature: Custom EBC badge — toggle between classic text tag and cat-face emoji. Scale the badge with a slider (0.3×–3×). Drag to reposition the badge anywhere on your character; the same offset is applied consistently to every player's badge.",
        ],
    },
    {
        version: "2.8.1",
        changes: [
            "Fix: Language buttons now stay on a single line (no-wrap, hidden horizontal scroll) instead of wrapping to a second row.",
        ],
    },
    {
        version: "2.8.0",
        changes: [
            "UX: Phone/touch mode — automatically detected on coarse-pointer devices (phones, tablets). Enlarges all tap targets: tab buttons grow to 48px, quick-action buttons to 44px, header icons/inputs to 38px+, lang pills to 38px. Font sizes raised to 12–14px throughout. Suppresses iOS tap highlight flash. DEV → Drawer Prefs gains a 'Force touch mode' toggle for desktop preview.",
        ],
    },
    {
        version: "2.7.9",
        changes: [
            "i18n: Added Russian (RU) translation for all UI strings.",
        ],
    },
    {
        version: "2.7.8",
        changes: [
            "Fix: touch scroll now works inside the panel while in-game. BC's in-game touch handlers were calling preventDefault() at the document level, killing native scroll in HTML overlays. Panel now stops touch event propagation before BC can intercept it, and the scrollable body has touch-action:pan-y + overscroll-behavior:contain.",
        ],
    },
    {
        version: "2.7.7",
        changes: ["UX: Added top padding to EBC tag toggles description text for more breathing room."],
    },
    {
        version: "2.7.6",
        changes: [
            "UX: EBC Tag Toggles strip background changed from near-black to #1a0d16 to match the panel colour scheme; Show/Hide button made larger and brighter (bold, pink-toned, more padding).",
        ],
    },
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
            "Changed /ebc changelog to only show the latest version entry.",
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

function showOnlineToast(memberNumber: number, fallbackName: string): void {
    try {
        // Player.FriendNames is BC's authoritative name map, populated after our hook calls next().
        // The callback fires on next tick so this is already up-to-date.
        const friendNames = (Player as unknown as { FriendNames?: Map<number, string> }).FriendNames;
        const name = friendNames?.get(memberNumber) ?? fallbackName;

        const existing = document.querySelectorAll(".ebc-online-toast");
        const topOffset = 20 + existing.length * 52;
        const toast = document.createElement("div");
        toast.className = "ebc-online-toast";
        toast.style.cssText = [
            "position:fixed", `bottom:${topOffset}px`, "right:24px",
            "background:#1a0820", "border:2px solid #cf6f98",
            "border-radius:8px", "padding:10px 16px",
            "z-index:999999", "font-family:'Trebuchet MS',serif",
            "font-size:13px", "color:#f0c0d8",
            "box-shadow:0 4px 24px rgba(0,0,0,0.9),0 0 8px rgba(207,111,152,0.4)",
            "transition:opacity 0.4s ease",
            "cursor:pointer", "user-select:none",
            "white-space:nowrap", "min-width:160px",
            "display:flex", "align-items:center", "gap:9px",
        ].join(";");

        // Pulsing green dot
        const dot = document.createElement("span");
        dot.style.cssText = [
            "width:10px", "height:10px", "border-radius:50%",
            "background:#44d477", "flex-shrink:0",
            "box-shadow:0 0 0 0 rgba(68,212,119,0.7)",
            "animation:ebc-pulse 1.6s ease-out infinite",
        ].join(";");

        // Inject keyframes once
        if (!document.getElementById("ebc-pulse-style")) {
            const style = document.createElement("style");
            style.id = "ebc-pulse-style";
            style.textContent = "@keyframes ebc-pulse{0%{box-shadow:0 0 0 0 rgba(68,212,119,0.7)}70%{box-shadow:0 0 0 7px rgba(68,212,119,0)}100%{box-shadow:0 0 0 0 rgba(68,212,119,0)}}";
            document.head.appendChild(style);
        }

        const label = document.createElement("span");
        label.innerHTML = `<span style="color:#cf6f98;font-weight:bold;">${name.replace(/</g,"&lt;")}</span> is now online`;

        toast.appendChild(dot);
        toast.appendChild(label);
        toast.title = "Click to dismiss";
        document.body.appendChild(toast);

        const remove = () => {
            toast.style.opacity = "0";
            window.setTimeout(() => { try { toast.remove(); } catch { /* ignore */ } }, 450);
        };
        toast.addEventListener("click", remove);
        window.setTimeout(remove, 8000);
        if (getOnlineSoundEnabled()) playOnlineSound();
    } catch { /* ignore */ }
}

function playOnlineSound(): void {
    try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.13, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.32);
        osc.onended = () => ctx.close();
    } catch { /* ignore */ }
}

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
    const salStr = getShowSalVersion() ? ` (${SAL_VERSION})` : "";
    appendLocalLogLine(`[EBC] Version ${MOD_VERSION}${salStr}`, UI.gold);
}

function showChangelog(): void {
    const latest = CHANGELOG[0];
    if (!latest) {
        appendLocalLogLine(`[EBC] v${MOD_VERSION} — no changelog.`, UI.gold);
        return;
    }
    appendLocalLogLine(`[EBC] v${latest.version} — what's new:`, UI.gold);
    for (const change of latest.changes) {
        appendLocalLogLine(`  - ${change}`, UI.accent);
    }
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

function parseEBCToyMsg(content: string): { type: string; intensity?: number; duration?: number } | null {
    const m = content.match(/^\[EBC-TOY:([A-Za-z]+)(?::(\d+):(\d+))?\]$/);
    if (!m) return null;
    const type = m[1];
    const intensity = m[2] !== undefined ? parseInt(m[2], 10) : undefined;
    const duration  = m[3] !== undefined ? parseInt(m[3], 10) : undefined;
    return { type, intensity, duration };
}
function parseEBCIrlMsg(content: string): { type: string; intensity?: number; duration?: number; toys?: string[] } | null {
    // Flexible parser: [EBC-IRL:TYPE] or [EBC-IRL:TYPE:extra]
    const m = content.match(/^\[EBC-IRL:([A-Za-z]+)(?::([^\]]*))?\]$/);
    if (!m) return null;
    const type = m[1];
    const extra = m[2] ?? "";
    if (type === "VIB") {
        const nm = extra.match(/^(\d+):(\d+)$/);
        if (nm) return { type, intensity: parseInt(nm[1], 10), duration: parseInt(nm[2], 10) };
    } else if (type === "ACK") {
        // ACK optionally carries comma-separated toy names: [EBC-IRL:ACK:ToyA,ToyB]
        const toys = extra ? extra.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
        return { type, toys: toys.length > 0 ? toys : undefined };
    } else if (type === "TOY") {
        // Targeted vibrate: [EBC-IRL:TOY:toyName:intensity:duration]
        const lastColon = extra.lastIndexOf(":");
        const prevColon = lastColon > 0 ? extra.lastIndexOf(":", lastColon - 1) : -1;
        if (prevColon >= 0) {
            const toyName = extra.slice(0, prevColon);
            const i = parseInt(extra.slice(prevColon + 1, lastColon), 10);
            const d = parseInt(extra.slice(lastColon + 1), 10);
            if (toyName && !isNaN(i) && !isNaN(d)) return { type, intensity: i, duration: d, toys: [toyName] };
        }
    }
    return { type };
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
    /** Unix timestamp (seconds) when this presence was last broadcast.
     *  Absent on old EBC versions (pre-2.8.5).  Presences without a ts are
     *  rejected so stale OnlineSharedSettings from previous EBC sessions no
     *  longer cause the badge to appear for users who are not running EBC. */
    ts?: number;
}

interface EmeryAddonSettings {
    presence?: EmeryPresence;
    [key: string]: unknown;
}

// Maximum age (seconds) we trust a presence that arrived via ChatRoomSync.
// Presences older than this are treated as stale server-side data left over
// from a previous EBC session.  Active EBC users refresh their ts on every
// room join and whenever a new member enters, so 8 hours is very generous.
const PRESENCE_MAX_AGE_S = 8 * 3600; // 8 hours

function getSharedPresence(character: Character | null | undefined): EmeryPresence | null {
    if (!character) return null;

    // OnlineSharedSettings are broadcast to all room members via ChatRoomSync
    // and CharacterRefresh — this is the only live/authoritative path.
    // Do NOT fall back to ExtensionSettings: that data persists indefinitely and
    // would make the badge keep appearing for users who have since disabled EBC.
    const shared = character.OnlineSharedSettings?.[MOD_NAME];
    if (shared && typeof shared === "object") {
        const presence = (shared as EmeryAddonSettings).presence;
        if (presence?.marker === "EBC") {
            // Require a fresh timestamp.  Presences from old EBC versions (pre-2.8.5)
            // have no ts field and are rejected — they are indistinguishable from
            // stale data left on the BC server from a long-ago session.
            if (typeof presence.ts !== "number") return null;
            const ageSeconds = Date.now() / 1000 - presence.ts;
            if (ageSeconds > PRESENCE_MAX_AGE_S) return null; // stale — not running EBC
            return presence;
        }
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

    const presence: EmeryPresence = {
        version: MOD_VERSION,
        marker:  "EBC",
        ts:      Math.floor(Date.now() / 1000), // seconds — refreshed every broadcast
        ...(IS_DEV_BUILD ? { isDev: true } : {}),
    };

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

// Tracks the player character's last-drawn canvas position so the drag
// listener can convert mouse coordinates into character-relative offsets.
let _playerCharLeft = 0;
let _playerCharTop  = 0;
let _playerCharZoom = 1;
let _dragTarget: "icon" | "version" | null = null;

// Paw position — read directly from DrawArousalMeter args every frame.
// No caching, no buffering — BC's draw args are stable during idle animation.

// ── EBC cat-face SVG image cache ──────────────────────────────────────────────
// Loaded once from a Blob URL; after the onload fires _ebcCatImgReady is true
// and subsequent calls to getEbcCatImg() return the cached HTMLImageElement.
const EBC_CAT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90"><rect x="8" y="8" width="74" height="74" rx="18" fill="#2a1421" stroke="#cf6f98" stroke-width="4"/><path d="M28 30 L37 18 L45 31 L53 18 L62 30" fill="#cf6f98"/><circle cx="34" cy="43" r="4" fill="#f7e6ee"/><circle cx="56" cy="43" r="4" fill="#f7e6ee"/><path d="M38 56 Q45 63 52 56" stroke="#f7e6ee" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
let _ebcCatImg: HTMLImageElement | null = null;
let _ebcCatImgReady = false;
function getEbcCatImg(): HTMLImageElement | null {
    if (_ebcCatImgReady) return _ebcCatImg;
    if (!_ebcCatImg) {
        try {
            const blob = new Blob([EBC_CAT_SVG], { type: "image/svg+xml" });
            const url  = URL.createObjectURL(blob);
            _ebcCatImg = new Image();
            _ebcCatImg.onload = () => { _ebcCatImgReady = true; };
            _ebcCatImg.src = url;
        } catch { /* ignore — fallback: image stays null until retry */ }
    }
    return null; // not ready yet on first call; ready on subsequent frames
}
// Trigger early load so the image is ready by the time any character renders.
getEbcCatImg();

// ── EBC paw image cache (creator mark) ────────────────────────────────────────
// Custom paw PNG — 64x64, transparent background, embedded as data URI.
const EBC_PAW_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAOfUlEQVR42tWbf3Bc1XXHP+fe9/aHJEu2AWN+xA6urF+WLRuT2CFhBIWETJtOyhQ7ZKaTtjNppwltaDPT6TQMNdAmQ5tMkzZk2pQkZNphkti0pQnppNAZ44ZQSPAvSV4s2+AGTMHY2JYlrVa7797TP97btSS82pW8/pGneWNLWt13z497zvd8z3lwni5VpMHrGX5RrkYL/wt1lYXXA+1X6Ivrmxq1pu7tuv58KNY0WngRVHd3r6IQ/AutI83n4hGVv9vX04zoPzHQ+RsAuhV7ySlASSy/vT/A6JeAtWQuH2vI4qVSG8gSkHsA2IReeh6wJbY+l7+xgUBuR/UkheNhQ45UGGZRigjv0Zc6rxbBN+o4NE4B9ydWUfNh2owAo2QKJd3eH8DcN6tbsWzDiKBMuoWgbWRMmojO5CMNUUDQ0LN/oD1NQdciAiJ5WXZkAo5M+8wc1nMA+mrPYk65fqw0YwDl8ktOAZUYcNpnCIJljDsQenVf109Bt/JW4WGRnxfqVYIIqns7PkrKfprTfi2wEEXIuyLocOL+eukcgfsRAcWEd5ORHgrqgSyheQ8Lgy+yJPu0DvUsFkGrnV0F0S0YVUT3dP01zcETpORDGFmCSAqPJ2MElQ4RlG2N8YBzXkS3YOQBvA50/zop/pVIBYciCIoHjVgYpBhxz7Fw4W286/lJQGd6gipGBK+7Ox9gcfDnjDiHKiCmslZGDEV9E1fso++VY2VvuWgeoIrEwq9ehNcHMQgOhySKFQwiKU5FJRbbGzlx6gERPNumP1e3JMIPdH2QtNzLqHMoBhE7ba2Cj2izS5Hw7ljwTeaiekDF+oPdHyPku0yqR86qVMXiAYfzfbLmwP6KxTUR8dnOFhbwNM12A+PeIWcFO56UCEU9zMKxXll2ZGIuwbXxMaCS+vxthKKzBCYhUqXFpsD8fvyjTTItfrTxIVJmA3nvqwgf73dSIZAVjDRd3wgjmnNOfS+uaENl7RTHrxbaDRNeUf2IPndtVmSbU0W4H9WtWJRNpAS0hjVFHVkDmG4Anuk3FzcLZDJtwCK8wuzozFBUwcoK0s2rEi+Igc6KnmuAjRSVGmqcYnO9FoCbl5zfIKi1XMz4DEIGrcsZHRkjhFwHwM5X4uentAO4hqimEqdEA1kc/2fbOZXmpg5lz65hbzxQqm/bqlgBz1UzFnkXoQnwaF0eECv7WF1RvkaArO0B2j87WnS2gFKYEzYzEsw411cQCPWtIIJXQF+v5QA61JPSoZ6ls3mCqZbeAHSg64MMvPmns9bg2YnToK9hBOpORzp9M2rmksgsE96DvFStNK4IG0XvxfnHdOsmW80TzKzpTfgEyOapaO0dmnzs0BgwmLim1HmgYp5gfUvyHDlOpLVTmuJJieL0FUIdmnIgzjBHWzAVoGXt+8iaX6Z9aEU1XjGomt6GelrwrgeRDn2h6zLZsP/tM5/ZZMtpTASvd8hPKPg/xBAkaUyqCGCZ9KB6KE5hZb241ylJESOpWeOAqpI2hiJPSvfw6DQwBSapIBVAX1wf4sduJgyUtC6eezWosghYQKvNIO59OtD7M7LRNYynhkW2jScPjU++hD/FFXfSZDdS8A6qoLhQhEl/FDKxx9y8w8fPCg8i7jChdDCpZ1egooQi5H0e8d9OPHVqme30xfUhrSNX8pYdITXegchNTHgois49CHqjKBGRgtevoaUcJdlJpjSgQ113i6AV7a8ZfB0jj1L0Pilc9CzW82RFsPJvsnbgrcQdkyOgryE8iZVZQqk6mq0h4huy+uDeBETFpfOLVzVprus+mvO7KAb7aJUc8BgpWUDJnyDtX5t5XGoroJQaRXgNBQKzjNAspqQAK2i1D+tQ93d0qCdVYW2Y/HcifZysMQge8FOs50iZgDH3NpYvl61XLo+lN1dE+Q4T/jBZsWhMhpyxvUYssAEj0W5c9JeqSPJcrwPXXUm27UkW2Acx9AKthHItVjoJRIH/pnv/m9VqhtnSYKlymp1GlBKnn1TPqajEInsXkf+6bMbpVqysOXyU0DxI3v+IrLFYMSiKR0mLRfAofyI9+w+Uq8hpSN6YQUQ+T0lPkxELuLicRmi1AXkdBn5Lrj90DBDZjNPDfQuR1PdotrdwIipRUI9DKakn8kXiWvJ/E/7A1HcE7k+2lB5dhXAjBR8Hr6llKRJyolSizfy2DnbdVVYCPS/lwP8xE+5rqL5FKEJKBNVXmdBPyZrhR2daopwXpDdXROR7RP7PKOkR0saSNQZLiXH/AyK9U/qGB5MUrbq9P+D05FdpDfoZiSJEwrj8jgMiIgETCiof06GexbIZdzYsUD0IensLzdLCmPeYsyjKi6WoitO/0qGeJ1mVGweQNQf264H2zzFuHyeQbpRJIvO8XJ/LTRV+6mbKP5Pe3Ji+eu2jnFwwiLqbEAlxuptRtssHhkfL+CTOUkc3kTK/yYhziARVKkel2VxNwd8APJUY3FVVgBJXZzyQwFOx1cFNTFA4Wu0yxtxHRXgsZoB3RNJx6HSS5J55R3rdgmHVGdKz8vvt/QHP7PAxkcqPk3smuFERVLcvz+D5JGbWpAtGHYFYkF9KKkeBHTU8QCr/Ss1qW9A45ssdwGMc26HVYGcS8IzEARLds6aZxbKQUy6SNUNH5ZYdUQVxbsLP5A+nfX9ZugNlPZMqdcB5wfmmapVjcG5skcQlruhqPdCelo5Dk9WibYX22tNxHaF8Fin+Cqe5HIPTXNdBRLZxUr4lN+ZOJLDbvWOd+xPc4c1aMtLGpNZXPIn4eeAAinVUZUIEqCxlgiumBdGZhOcDeN3VeSdp+zwtwR8gsgJoRWQRoXkvTeaLXOZ36a7u25KAZatCdKt9hMK0VHt2MGeIFETj5sS2bbMrYBofI3KIokKtvrwqiAaIpKr19WPLd91Fk/kusIRTUUQpSVmRKnnvGYlKiCynSX+ou7t+VSTJLDNjiG6yqCyvwziKxTDhxjB2NwD7mMMR8O5nlOwxQrmcSH1Vb4njaoHIFKq6/d6ujQTyj3gsJT0TtWWq7sUw4R2hSZFhm+5eeaOsO7hnatyokChBjeCXEJVkrWXMP8uq3MvluqX+I5AxL6E8FefxqsWqEhhF5HXS9vhUN63wfbvar0D0kRiWqpuF8AQRS9E7Qslizbf0QHu6slZZ2PU7I4y+gtaoPkUgUjA8ksSS+vgAkdippXt4FORR8v44odgElb1TyykE9MfSmysm1tIK2ysoxm5hQdDLuJtd+DNkiWXcRbQF6xg39yRWM0ICmwXFyfMUfAlThYZRjWi1lgn9PpPNP9Bym6buIFj+6KLR51D9Chq3KaYpQfFYMYz7CJV/Pmu/YG/HraTk9xhzHpE5ELBiGfee0HxOh1deA/gyCAIgNP+D6g6ajABR4qGafEW02IAxN4yNPis37CzNRu2Zqs1JRWTZkQk0/QiR+ypGIJ0IoSiBGFqswfGQ9O1/vsINlF3/QHsrmIcITZgg+vr5e0GIvKfFtlGw94mgCXiKhViVO4rq35D3R2g2YeIJQiBx3VDwOSL5uKw+9HKtxomZtUMLImsH3kJSX6Ck9xL5gwieQATRo4z4v2Bs7Avv+FNByZs/osXcQN65Kt2i2l4w6jwpfkcHV/YlqbEChTkxuR2nnybvdiBMYIhAjzHmHqXEHbL2pd31dI3qtooeXp7hZEsnoV+DeEvJ7mFtbu/UB1Rcf8/KDaTsf6E0ESFzsv70s+xYYC2j7inpG75dt/cHZcRYobj2dC5DWE06SJGPfs7LdkA254p1t+Lr7f3XoscrMPWF9gU02f8kazcyXqWQmo8STvnflev3f0OVQGL4VbNr1bDOUDkCz7xnNE/ih2btQ7TYjeS9O2fhy3B7wnuy8re6p3uDxF3GaQBp5j2XZmndG0wosGl35Zdby2iv8zM02U/N0t2dT/86trfQREq/r7u6V4pMjwdV93UheoOqGNmM012dd5KRLzHpPb7BY62CYdI7QrOEjP5QX+hZKjIjNV6UAYky1N3V1U/GfBMvIW6OKa9+F7TkXUTWrCTrH9cD7WlWTT+KF3RAYkr/YBnqd5A27ybfgKBX+8klFgUhx93fybr99+hWrGyeTq5cyBEZQ+Q+T4t5N3nnzr/wABJyykU0m8/ovu5bK3zkhVRA4vrKYPuthPLxmDeUCzfOXi6OSvpl1Z4Um2rwAo1UQJk3VMWg9pNkjcXXOR3QuMuSd44FZjV7/UcS6G4vjAdoAkX39awA+ino+Ql6taNXzEcaPlGt63N+FFCmvLxfjZUrKak2euy+boA0qYLqRh1YvWi+A9TnsvHrSBsaNbI6L+OVFAK5Ei3Ne4DazH80TrNc7EvxpA0oV184BVyKl1Fbx7xUwxWgl4DoQknB6NvzfZPkHMbl5VjSLpeL5P5xYVz0J/A6XG65XzgFBDJAyZ8gNItmpc3PnwY8WWMZk5/IuoOvV6O9z98RMD4H8kQN2vzslgOfEKyOM3MAvu51FMUIyTzAw+dS15i5F2VTaPNAHibvB2kyFmZhaWLBYkEtQkoMWWPIGhvfYgjFVJhnnUUZiiLqaLWWov8H1u1/er7Wn/cRqNBj+3oH6Nx7HwX9e7L2qmTSW2ds2CSDEhanMKkTlPQNVN8ARlG1IIsQrgRdSsaEiEDRg2P6egpYsTSbgNPuCbRwryTNuQtfDic8oW5fnuGyzK9h5F6s9CUTn2dWLylE+n8oOxF5FnQP6l/FZ06gUiQsGQq0kPJXINKO6g2IfgCll7RpwciZtRQo+hEcX2ckfEhuGjxZD195Xl+ZqczkMdZFyIcJWIfKYlQjkCMouxD3AhK+LL25mi9S6n+0p1keLiXyfYi8H6ELIY0ygZDDuR8xfPC58sjLub4yIw1/b3jn+iycDCmEnvcP56dOgtTE6jK9g6Pb+wOWvpklVTIcaonk9oHx+TC/F0QBVQcjzjILVO94e9X1pI4p9jqv/weC/0eBctvNNQAAAABJRU5ErkJggg==";
let _ebcPawImg: HTMLImageElement | null = null;
let _ebcPawImgReady = false;

// Badge draw buffer — each entry is the DrawCharacter args for one character.
// Filled by the DrawCharacter hook, flushed in DrawProcess after all characters
// have been rendered so badges are always drawn on top of every character sprite
// and sorted back-to-front by zoom for correct depth ordering.
let _badgeBuffer: unknown[][] = [];
// Hoisted so the per-frame badge sort below doesn't allocate a fresh closure each frame.
const _badgeZSort = (a: unknown[], b: unknown[]): number => {
    const za = typeof a[3] === "number" ? (a[3] as number) : 1;
    const zb = typeof b[3] === "number" ? (b[3] as number) : 1;
    return za - zb;
};
// Paw image cache — loaded once, drawn from DrawCharacter args each frame.
function getEbcPawImg(): HTMLImageElement | null {
    if (_ebcPawImgReady) return _ebcPawImg;
    if (!_ebcPawImg) {
        try {
            _ebcPawImg = new Image();
            _ebcPawImg.onload = () => { _ebcPawImgReady = true; };
            _ebcPawImg.src = EBC_PAW_DATA;
        } catch { /* ignore */ }
    }
    return null;
}
getEbcPawImg();

/** Returns the BC main canvas element, checking both the window global and DOM. */
function getBCCanvas(): HTMLCanvasElement | null {
    try {
        const wc = (window as unknown as Record<string, unknown>).MainCanvas;
        if (wc instanceof HTMLCanvasElement) return wc;
        return document.getElementById("MainCanvas") as HTMLCanvasElement | null;
    } catch { return null; }
}

/** Convert a screen-space mouse/touch event position to BC canvas coordinates. */
function toCanvasPos(canvas: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvas.width  / rect.width),
        y: (clientY - rect.top)  * (canvas.height / rect.height),
    };
}

/**
 * Attach mouse + touch listeners to the BC canvas so the user can click-drag
 * the EBC badge to a new position when drag mode is active.
 * Called once during mod init; safe to call if the canvas isn't ready yet
 * (it retries via setTimeout).
 */
function initBadgeDragListeners(): void {
    const canvas = getBCCanvas();
    if (!canvas) { window.setTimeout(initBadgeDragListeners, 1000); return; }

    const HIT = 35; // px radius that counts as a target "hit"

    const onDown = (clientX: number, clientY: number, consume: () => void): void => {
        if (!getBadgeDragMode()) return;
        // Always consume in drag mode — prevents BC canvas click-through.
        consume();
        const pos = toCanvasPos(canvas, clientX, clientY);
        // Check icon hit — use the drag target style's offset, independent of display style
        const dragTargetIsCat = getBadgeDragStyleTarget() === "cat";
        const bx = _playerCharLeft + (dragTargetIsCat ? getCatBadgeOffsetX() : getBadgeOffsetX()) * _playerCharZoom;
        const by = _playerCharTop  + (dragTargetIsCat ? getCatBadgeOffsetY() : getBadgeOffsetY()) * _playerCharZoom;
        if (Math.abs(pos.x - bx) < HIT && Math.abs(pos.y - by) < HIT) {
            _dragTarget = "icon";
            return;
        }
        // Check version text hit (cat mode + version visible)
        if (dragTargetIsCat && getShowVersionBadge()) {
            const vx = _playerCharLeft + getVersionTextOffsetX() * _playerCharZoom;
            const vy = _playerCharTop  + getVersionTextOffsetY() * _playerCharZoom;
            if (Math.abs(pos.x - vx) < HIT && Math.abs(pos.y - vy) < HIT) {
                _dragTarget = "version";
                return;
            }
        }
        // Clicked empty space in drag mode — consume but no drag starts
        _dragTarget = null;
    };

    const onMove = (clientX: number, clientY: number, consume: () => void): void => {
        if (!_dragTarget) return;
        const pos = toCanvasPos(canvas, clientX, clientY);
        if (_playerCharZoom > 0) {
            if (_dragTarget === "icon") {
                if (getBadgeDragStyleTarget() === "cat") {
                    setCatBadgeOffsetX((pos.x - _playerCharLeft) / _playerCharZoom);
                    setCatBadgeOffsetY((pos.y - _playerCharTop)  / _playerCharZoom);
                } else {
                    setBadgeOffsetX((pos.x - _playerCharLeft) / _playerCharZoom);
                    setBadgeOffsetY((pos.y - _playerCharTop)  / _playerCharZoom);
                }
            } else {
                setVersionTextOffsetX((pos.x - _playerCharLeft) / _playerCharZoom);
                setVersionTextOffsetY((pos.y - _playerCharTop)  / _playerCharZoom);
            }
        }
        consume();
    };

    const onUp = (): void => {
        if (_dragTarget !== null) {
            _dragTarget = null;
            setBadgeDragMode(false); // auto-exit drag mode after completing a drag
        }
    };

    // Mouse
    canvas.addEventListener("mousedown",  (e) => onDown(e.clientX, e.clientY, () => { e.stopPropagation(); e.preventDefault(); }));
    canvas.addEventListener("mousemove",  (e) => onMove(e.clientX, e.clientY, () => { e.stopPropagation(); }));
    canvas.addEventListener("mouseup",    ()  => onUp());

    // Touch (for phone users)
    canvas.addEventListener("touchstart", (e) => {
        const t = e.touches[0]; if (!t) return;
        onDown(t.clientX, t.clientY, () => { e.stopPropagation(); e.preventDefault(); });
    }, { passive: false });
    canvas.addEventListener("touchmove",  (e) => {
        const t = e.touches[0]; if (!t) return;
        onMove(t.clientX, t.clientY, () => { e.stopPropagation(); e.preventDefault(); });
    }, { passive: false });
    canvas.addEventListener("touchend",   ()  => onUp());
}

function drawPresenceMarker(args: unknown[]): void {
    if (CurrentScreen !== "ChatRoom") return;

    // Skip badge drawing when BC has a character interaction menu open.
    // Clicking a character in the chatroom sets window.CurrentCharacter but keeps
    // CurrentScreen as "ChatRoom", so BC renders a full-screen portrait via DrawCharacter.
    // Other addons (WCE) guard against this the same way — without this guard EBC is the
    // only badge visible on the portrait, making it look like EBC is the whole overlay.
    const currentChar = (window as unknown as Record<string, unknown>).CurrentCharacter as
        Character | null | undefined;
    if (currentChar != null) return;

    const character = args[0] as Character | undefined;
    const left = typeof args[1] === "number" ? args[1] : null;
    const top  = typeof args[2] === "number" ? args[2] : null;
    const zoom = typeof args[3] === "number" ? args[3] : 1;
    if (!character || left == null || top == null) return;

    const isSelf = character.MemberNumber === Player.MemberNumber;

    // Track player draw position every frame — used by the drag listener.
    if (isSelf) {
        _playerCharLeft = left;
        _playerCharTop  = top;
        _playerCharZoom = zoom;
    }

    // Skip map / bird's-eye view
    if (zoom < 0.3) return;

    // Respect BC's "Show/hide character icons" toggle (0 = show, 1/2 = hide)
    if (((window as unknown as { ChatRoomHideIconState?: number }).ChatRoomHideIconState) ?? 0) return;

    // Visibility toggles for the EBC badge
    if (isSelf && !getBadgeEnabled()) return;
    if (!isSelf && !getShowOthersBadge()) return;
    if (!isSelf && !hasEmeryBC(character)) return;

    const presence   = getSharedPresence(character);
    const showVer    = isSelf ? getShowVersionBadge() : getShowOthersVersionBadge();
    const verStr     = isSelf ? MOD_VERSION : (presence?.version ?? "?");
    const isDevUser  = isSelf ? IS_DEV_BUILD : (presence?.isDev === true);
    const label      = isDevUser
        ? (showVer ? "dev | v" + verStr : "dev | EBC")
        : (showVer ? "v" + verStr : "EBC");

    // User-configured position offset + scale — both are per-style
    const badgeStyle    = isSelf ? getBadgeStyle() : getOthersBadgeStyle();
    const offsetX   = badgeStyle === "cat" ? getCatBadgeOffsetX() : getBadgeOffsetX();
    const offsetY   = badgeStyle === "cat" ? getCatBadgeOffsetY() : getBadgeOffsetY();
    const userScale     = badgeStyle === "cat" ? getCatBadgeScale() : getTextBadgeScale();
    const badgeBgOp     = getBadgeBgOpacity();  // default 1.0
    const badgeTextOp   = getBadgeTextOpacity();// default 1.0

    const x = left + offsetX * zoom;
    const y = top  + offsetY * zoom;

    if (badgeStyle === "cat") {
        // ── EBC cat-face SVG badge ────────────────────────────────────────────
        const canvas = getBCCanvas();
        const ctx = canvas?.getContext("2d");
        const img = getEbcCatImg();
        if (ctx && img && badgeTextOp > 0) {
            const size = Math.max(12, Math.round(22 * zoom * userScale));
            ctx.save();
            ctx.globalAlpha = badgeTextOp;
            ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
            if (isDevUser) {
                const bx = x - size / 2;
                const by = y - size / 2;
                const r  = size * 0.22;
                const roundRect = (): void => {
                    ctx.beginPath();
                    ctx.moveTo(bx + r, by);
                    ctx.lineTo(bx + size - r, by);
                    ctx.arcTo(bx + size, by, bx + size, by + r, r);
                    ctx.lineTo(bx + size, by + size - r);
                    ctx.arcTo(bx + size, by + size, bx + size - r, by + size, r);
                    ctx.lineTo(bx + r, by + size);
                    ctx.arcTo(bx, by + size, bx, by + size - r, r);
                    ctx.lineTo(bx, by + r);
                    ctx.arcTo(bx, by, bx + r, by, r);
                    ctx.closePath();
                };
                const lw = Math.max(1, size * 0.065);
                ctx.shadowColor  = "#ff8833";
                ctx.shadowBlur   = size * 0.45;
                ctx.strokeStyle  = "rgba(255,155,55,0.92)";
                ctx.lineWidth    = lw;
                roundRect(); ctx.stroke();
                ctx.shadowBlur   = 0;
                ctx.shadowColor  = "transparent";
            }
            // ── Version text label (cat mode + version enabled) ───────────────
            if (showVer) {
                const vx       = left + getVersionTextOffsetX() * zoom;
                const vy       = top  + getVersionTextOffsetY() * zoom;
                const fontSize = Math.max(7, Math.round(9 * zoom * userScale));
                const verLabel = isDevUser ? "dev | v" + verStr : "v" + verStr;
                ctx.font         = `bold ${fontSize}px "Trebuchet MS",serif`;
                ctx.textAlign    = "center";
                ctx.textBaseline = "middle";
                // Background pill
                const tw  = ctx.measureText(verLabel).width;
                const ph  = fontSize * 1.55;
                const pw  = tw + Math.max(4, fontSize * 0.9);
                const pr  = ph / 2;
                const plx = vx - pw / 2;
                const ply = vy - ph / 2;
                ctx.save();
                ctx.globalAlpha = badgeTextOp * 0.85;
                ctx.fillStyle   = "rgba(20,8,15,0.80)";
                ctx.beginPath();
                ctx.moveTo(plx + pr, ply);
                ctx.lineTo(plx + pw - pr, ply);
                ctx.arcTo(plx + pw, ply, plx + pw, ply + pr, pr);
                ctx.lineTo(plx + pw, ply + ph - pr);
                ctx.arcTo(plx + pw, ply + ph, plx + pw - pr, ply + ph, pr);
                ctx.lineTo(plx + pr, ply + ph);
                ctx.arcTo(plx, ply + ph, plx, ply + ph - pr, pr);
                ctx.lineTo(plx, ply + pr);
                ctx.arcTo(plx, ply, plx + pr, ply, pr);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = isDevUser ? "rgba(255,160,80,0.75)" : "rgba(207,111,152,0.75)";
                ctx.lineWidth   = Math.max(0.8, 0.9 * zoom);
                ctx.stroke();
                ctx.restore();
                // Text on top (outer globalAlpha = badgeTextOp)
                ctx.fillStyle = isDevUser ? "#ffb060" : "#cf6f98";
                ctx.fillText(verLabel, vx, vy);
            }
            ctx.restore();
        }
    } else {
        // ── Text badge (original style) ───────────────────────────────────────
        const canvas = getBCCanvas();
        const ctx = canvas?.getContext("2d");
        const baseW = isDevUser
            ? (showVer ? 78 : 58)
            : (showVer ? 50 : 34);
        const baseH = 14;
        const width  = Math.max(baseW * 0.6, baseW * zoom * userScale);
        const height = Math.max(baseH * 0.6, baseH * zoom * userScale);

        const badgeLeft = x - width  / 2;
        const badgeTop  = y - height / 2;

        // Background rect — independent opacity
        if (badgeBgOp > 0) {
            if (ctx) { ctx.save(); ctx.globalAlpha = badgeBgOp; }
            DrawRect(badgeLeft, badgeTop, width, height, "rgba(25,11,19,0.72)");
            DrawEmptyRect(badgeLeft, badgeTop, width, height, "rgba(76,37,55,0.85)", 1);
            if (ctx) ctx.restore();
        }

        // Label text — direct canvas rendering so font size scales with badge height.
        // DrawTextFit has an internal pixel cap that makes large badges look broken.
        if (badgeTextOp > 0 && ctx) {
            ctx.save();
            ctx.globalAlpha  = badgeTextOp;
            ctx.font         = `bold ${Math.max(8, Math.round(height * 0.66))}px "Trebuchet MS",sans-serif`;
            ctx.fillStyle    = UI.accent;
            ctx.textAlign    = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, badgeLeft + width / 2, badgeTop + height / 2 + 1, width - 4);
            ctx.restore();
        }
    }



    // ── Drag-mode handles (own character only) ────────────────────────────────
    if (isSelf && getBadgeDragMode()) {
        const canvas = getBCCanvas();
        const ctx = canvas?.getContext("2d");
        if (ctx) {
            ctx.save();
            const labelFont = `bold ${Math.max(9, Math.round(11 * zoom))}px "Trebuchet MS",serif`;
            ctx.font      = labelFont;
            ctx.textAlign = "center";
            // Icon ring (pink)
            const r = Math.max(16, 22 * zoom * userScale);
            ctx.strokeStyle  = "rgba(207,111,152,0.9)";
            ctx.lineWidth    = 2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle    = "rgba(207,111,152,0.9)";
            ctx.textBaseline = "bottom";
            ctx.fillText("drag", x, y - r - 2);
            // Version text ring (amber) — only in cat mode with version visible
            if (badgeStyle === "cat" && showVer) {
                const vx = left + getVersionTextOffsetX() * zoom;
                const vy = top  + getVersionTextOffsetY() * zoom;
                const vr = Math.max(12, 16 * zoom * userScale);
                ctx.strokeStyle  = "rgba(255,185,70,0.88)";
                ctx.lineWidth    = 2;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                ctx.arc(vx, vy, vr, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle    = "rgba(255,185,70,0.88)";
                ctx.textBaseline = "bottom";
                ctx.fillText("drag", vx, vy - vr - 2);
            }
            ctx.restore();
        }
    }
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

// Seed default badge display settings on first run.
// Only applied if the player has never configured badge settings (badgeEnabled key absent).
function seedDefaultBadgeSettings(): void {
    try {
        if (!Player?.ExtensionSettings?.EmeryBC) return;
        const store = Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
        if ("badgeEnabled" in store) return; // already configured — do not overwrite
        Object.assign(store, {
            badgeEnabled: true,
            showOthersBadge: true,
            showVersionBadge: false,
            showOthersVersionBadge: false,
            badgeStyle: "cat",
            othersBadgeStyle: "cat",
            badgeScale: 1,
            textBadgeScale: 0.95,
            catBadgeScale: 1.45,
            badgeBgOpacity: 1,
            badgeTextOpacity: 1,
            badgeOffsetX: 257,
            badgeOffsetY: 953,
            catBadgeOffsetX: 353,
            catBadgeOffsetY: 21,
            versionTextOffsetX: 353,
            versionTextOffsetY: 55,
        });
        syncSettings();
    } catch { /* ignore */ }
}

function init(): void {
    // Note: the unhandledrejection suppressor for IDB/Dexie [object Event] errors
    // is registered in db.ts at module-load time, before any IDB operations.

    // Initialise compressed ExtensionSettings first — all modules read from here
    initSettings();

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

    // Seed BC's localisation map with fallback strings for keys absent in some BC versions.
    // This is a best-effort early seed; the TextGet hook below is the definitive fix.
    try {
        const lk = (window as unknown as Record<string, unknown>).TextLookup as Map<string, string> | undefined;
        if (lk instanceof Map) {
            if (!lk.has("ResponseRoomLocked")) lk.set("ResponseRoomLocked", "This room is locked.");
        }
    } catch { /* ignore */ }

    // Remove stale "EmeryBC" key from Player.OnlineSettings BEFORE PreferenceInitPlayer
    // runs its unknown-key validation.  Old EBC versions wrote settings there; BC now
    // warns about extra OnlineSettings keys and shows a /!\ indicator.  We hook the
    // function so the key is gone before BC ever checks — the initSettings() cleanup
    // alone is too late because PreferenceInitPlayer can fire before initSettings
    // finishes (or it was already called before init() runs).
    tryHookFunction(modAPI, "PreferenceInitPlayer", 1, (args, next) => {
        try {
            const onlineSettings = (Player as unknown as Record<string, unknown>).OnlineSettings as
                Record<string, unknown> | undefined;
            if (onlineSettings && "EmeryBC" in onlineSettings) {
                delete onlineSettings["EmeryBC"];
                // Persist the removal — best-effort, errors ignored
                try {
                    const syncFn = (window as unknown as Record<string, unknown>).ServerPlayerSettingsSync;
                    if (typeof syncFn === "function") (syncFn as () => void)();
                } catch { /* ignore */ }
            }
        } catch { /* ignore */ }
        const result = next(args);
        // Re-seed _mem from the server's raw response data.
        // CRITICAL: Player.ExtensionSettings is set at line 1183 of LoginSetupPlayer,
        // but PreferenceInitPlayer is called at line 1098 — reading Player.ExtensionSettings
        // here would get stale/empty data. Read from args[1].ExtensionSettings.EmeryBC
        // (the raw ServerAccountData) instead, which always has the correct server values.
        try {
            const serverData = args[1] as Record<string, unknown>;
            const serverES = serverData?.ExtensionSettings as Record<string, unknown> | undefined;
            const ebcData = (serverES?.["EmeryBC"] ?? {}) as Record<string, unknown>;
            reinitFromExtensionSettings(ebcData);
            // Refresh the header title now that persisted settings are loaded —
            // the drawer was built before server settings arrived, so the SAL
            // version suffix would be missing if it was saved as enabled.
            try { drawer?._updateVersionTitle(); } catch { /* ignore */ }
        } catch { /* ignore */ }
        return result;
    });

    // Guard against the one-frame crash window between ChatRoomLeave() clearing
    // ChatRoomData and the screen transitioning away from "ChatRoom".  BC's own
    // ChatRoomRun accesses ChatRoomData.MapData unconditionally, so that frame
    // crashes unless we swallow it.  Priority 500 runs before all other mod hooks
    // so the entire hook chain (BCX, CRABS, etc.) is also skipped for that frame.
    modAPI.hookFunction("ChatRoomRun", 500, (args, next) => {
        if (isLeavePending()) {
            const w = window as unknown as Record<string, unknown>;
            if (!w.ChatRoomData) return; // skip the null-data frame
            clearLeavePending();         // new room data arrived — stop guarding
        }
        return next(args);
    });

    // Provide fallback text for localisation keys that are absent in some BC versions.
    // TextGet returns "MISSING TEXT IN '...': key" when a key is not in TextLookup —
    // intercepting here is timing-independent and catches cases where the seed above
    // ran before TextLookup was initialised or before BC's CSV loading completed.
    tryHookFunction(modAPI, "TextGet", 1, (args, next) => {
        const result = next(args) as string;
        if (typeof result === "string" && result.startsWith("MISSING TEXT IN")) {
            const key = args[0] as string;
            const FALLBACKS: Record<string, string> = {
                ResponseRoomLocked: "This room is locked.",
            };
            if (Object.prototype.hasOwnProperty.call(FALLBACKS, key)) return FALLBACKS[key];
        }
        return result;
    });

    // Returns true only when CurrentCharacter is an actual character present in the
    // current chat room. Synthetic characters loaded via CharacterLoadOnline (for offline
    // profile viewing) leave CurrentCharacter set after the Info Sheet closes, which would
    // permanently hide the sidebar. Checking room membership avoids that stale-state bug.
    const isCurrentCharacterInRoom = (): boolean => {
        try {
            const w = window as unknown as Record<string, unknown>;
            const cc = w.CurrentCharacter as Record<string, unknown> | null | undefined;
            if (!cc) return false;
            const memberNum = cc.MemberNumber as number | undefined;
            if (!memberNum) return false;
            const roomChars = w.ChatRoomCharacter as Array<{ MemberNumber?: number }> | undefined;
            if (!Array.isArray(roomChars)) return true; // can't tell — assume open
            return roomChars.some(c => c.MemberNumber === memberNum);
        } catch { return false; }
    };

    // Canvas sidebar action buttons.
    // BC deprecated ChatRoomMenuDraw as a canvas function (it is now empty — the menu
    // was migrated to DOM). Hook DrawProcess instead, which is the actual per-frame
    // draw function called from GameRun on every animation frame.
    // drawActionButtons() already guards with `if (CurrentScreen !== "ChatRoom") return`
    // so this is a no-op outside the chat room.
    tryHookFunction(modAPI, "DrawProcess", 3, (args, next) => {
        // Clear buffer at frame start so stale entries from the previous frame don't
        // bleed in. Reuse the array (length = 0) instead of allocating a new one each frame.
        _badgeBuffer.length = 0;
        const result = next(args);
        // All DrawCharacter calls have now completed for this frame.
        // Draw badges in z-order (smallest zoom first = furthest back → drawn underneath closer badges).
        // Sort in place; skip the sort entirely for the common 0-1 badge case.
        try {
            if (_badgeBuffer.length > 1) _badgeBuffer.sort(_badgeZSort);
            for (const badgeArgs of _badgeBuffer) {
                try { drawPresenceMarker(badgeArgs as unknown[]); } catch { /* ignore */ }
            }
        } catch { /* ignore */ }
        try {
            const iconsHidden = !!((window as unknown as { ChatRoomHideIconState?: number }).ChatRoomHideIconState);
            // Only treat CurrentCharacter as "menu open" when the character is actually
            // present in the current room. Synthetic characters created by CharacterLoadOnline
            // (for offline profile viewing) leave CurrentCharacter set when you return to
            // ChatRoom, which would permanently hide the sidebar.
            const charMenuOpen = isCurrentCharacterInRoom();
            if (getActionButtonsVisible() && !iconsHidden && !charMenuOpen) drawActionButtons();
        } catch { /* ignore */ }
        return result;
    });

    modAPI.hookFunction("ChatRoomClick", 3, (args, next) => {
        // Block all BC click handling while drag mode is active to prevent
        // click-through to character tabs and other BC canvas interactions.
        if (getBadgeDragMode()) return;
        const iconsHidden = !!((window as unknown as { ChatRoomHideIconState?: number }).ChatRoomHideIconState);
        const charMenuOpen = isCurrentCharacterInRoom();
        try { if (!iconsHidden && !charMenuOpen && getActionButtonsVisible() && handleActionButtonClick()) return; } catch { /* ignore */ }
        return next(args);
    });

    // Attach hold-to-drag for the grip handle (mousedown/touchstart on canvas)
    try { initDragListener(); } catch { /* ignore */ }

    // Canvas listeners for badge repositioning drag mode
    try { initBadgeDragListeners(); } catch { /* ignore */ }

    // DOM drawer - outfit switcher panel beside the chat log
    let drawer: EBCDrawer | null = null;
    try {
        EBCDrawer.pawDataUri = EBC_PAW_DATA;
        drawer = new EBCDrawer(MOD_VERSION, IS_DEV_BUILD, SAL_VERSION);
        // Fire an initial visibility check in case the addon loads while the
        // player is already in a chat room (ChatRoomSync won't fire again).
        window.setTimeout(() => { try { drawer?.updateVisibility(); } catch { /* ignore */ } }, 400);
        // Bootstrap room history in case the addon loaded while already in a room
        // (ChatRoomSync won't fire again so we seed the current visit manually).
        window.setTimeout(() => { try { onRoomSync(); detectNewJoins(); } catch { /* ignore */ } }, 600);
        // Migrate any existing localStorage bundles into IndexedDB, then evict old entries.
        migrateLocalStorageBundles().then(() => evictOldBundles()).catch(() => {});
        // One-time migration: copy existing server peopleMet into localStorage
        // so the user's history isn't lost on the first run of the hybrid model.
        try { migratePeopleMetToLocal(); } catch { /* ignore */ }
        // Seed default badge settings for first-time users.
        window.setTimeout(() => { try { seedDefaultBadgeSettings(); } catch { /* ignore */ } }, 1500);
        // Register online-notification callback so friends.ts can trigger toasts.
        setOnFriendCameOnlineCallback(showOnlineToast);
    } catch (err) {
        console.warn("[EBC] Drawer failed to initialise:", err);
    }

    // Collect badge args during DrawCharacter; the actual drawing is deferred to
    // DrawProcess so all badges are rendered AFTER all character sprites.
    // This fixes z-order: badges are drawn back-to-front over the fully composited
    // scene rather than being interleaved with character sprites.
    tryHookFunction(modAPI, "DrawCharacter", 1, (args, next) => {
        const result = next(args);
        try {
            const zoom = typeof args[3] === "number" ? args[3] : 1;
            if (zoom >= 0.3) _badgeBuffer.push(args as unknown[]);
        } catch { /* ignore */ }
        return result;
    });

    // ── Creator paw mark — drawn directly from live DrawArousalMeter args ──
    // DrawArousalMeter fires after DrawCharacter with the same x/y/zoom, which are
    // perfectly stable during idle animation — no caching or smoothing needed.
    tryHookFunction(modAPI, "DrawArousalMeter", 1, (args, next) => {
        const result = next(args);
        try {
            if (CurrentScreen !== "ChatRoom") return result;
            const character = args[0] as Character | undefined;
            if (character?.MemberNumber !== 130267) return result;
            const left = typeof args[1] === "number" ? args[1] : null;
            const top  = typeof args[2] === "number" ? args[2] : null;
            const zoom = typeof args[3] === "number" ? (args[3] as number) : 1;
            if (left === null || top === null || zoom < 0.3) return result;
            const pawCanvas = getBCCanvas();
            const pawCtx    = pawCanvas?.getContext("2d");
            const pawImg    = getEbcPawImg();
            if (!pawCtx || !pawImg) return result;

            // BC bottom-aligns characters on a 500×1000 unit canvas; name is at ~top+975*zoom.
            const sz = Math.max(16, Math.round(28 * zoom));
            const px = Math.floor(left + 250 * zoom - sz / 2);
            const py = Math.floor(top  + 940 * zoom - sz);

            // Dark backing disc so the paw is legible on any room background
            const cr = sz / 2 + Math.max(3, Math.round(sz * 0.18));
            pawCtx.save();
            pawCtx.globalAlpha = 0.62;
            pawCtx.fillStyle   = "rgba(0, 0, 0, 0.82)";
            pawCtx.beginPath();
            pawCtx.arc(px + sz / 2, py + sz / 2, cr, 0, Math.PI * 2);
            pawCtx.fill();
            pawCtx.restore();

            // Gold glow + paw image on top
            pawCtx.save();
            pawCtx.globalAlpha = 0.95;
            pawCtx.shadowColor = "rgba(255, 195, 0, 0.9)";
            pawCtx.shadowBlur  = Math.round(sz * 0.5);
            pawCtx.drawImage(pawImg, px, py, sz, sz);
            pawCtx.restore();
        } catch { /* ignore */ }
        return result;
    });

    modAPI.hookFunction("ChatRoomSync", 3, (args, next) => {
        const result = next(args);
        // Delay presence broadcast by 5–8 s (randomised) so EBC's AccountUpdate
        // fires well after the initial burst of all ~10+ addons syncing at once.
        // The 6 s per-send cooldown inside syncPresenceMarker still applies, so
        // a rapid re-sync won't double-send even if the timer fires unexpectedly.
        window.setTimeout(() => {
            try { syncPresenceMarker(); } catch { /* ignore */ }
        }, 5000 + Math.floor(Math.random() * 3000));
        try { showRoomLoadNotice();         } catch { /* ignore */ }
        try { timerOnRoomEnter();           } catch { /* ignore */ }
        try { drawer?.updateVisibility();   } catch { /* ignore */ }
        // Refresh the bound timer once Appearance has been populated by BC.
        // timerOnRoomEnter() resets restraintStartTime to null; we need to
        // re-run timerCheckRestraints() after the draw loop has had a frame
        // to populate Player.Appearance, then push the result to the UI.
        window.setTimeout(() => { try { drawer?.refreshTimer(); } catch { /* ignore */ } }, 1200);
        try { snapshotPlayerRestraints();   } catch { /* ignore */ }
        try { snapshotForLog();             } catch { /* ignore */ }
        try { onRoomSync(args[0] as Record<string, unknown>); } catch { /* ignore */ }
        try { detectNewJoins();             } catch { /* ignore */ }
        try { drawer?.refreshFriendList();  } catch { /* ignore */ }
        // Auto-apply default ★ face preset on room join if the toggle is enabled
        try {
            if (getAutoApplyDefaultFace()) {
                const defId = getDefaultExprPresetId();
                if (defId) {
                    const defPreset = getExpressionPresets().find(p => p.id === defId);
                    if (defPreset) window.setTimeout(() => {
                        try { applyExpressionPreset(defPreset); } catch { /* ignore */ }
                    }, 300);
                }
            }
        } catch { /* ignore */ }
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
            // Flush name cache to ExtensionSettings so it persists across reloads.
            // cacheName() only writes to _mem; without this flush the entries are lost
            // if nothing else triggers syncSettings() before the session ends.
            flushNameCache();
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
            // Track current room name — more reliable than window.ChatRoomData?.Name
            // because ChatRoomSync passes data directly to hooks (no window lookup).
            const rName = typeof data?.Name === "string" ? data.Name.trim() : "";
            if (rName) setCurrentRoomName(rName);
            const chars = data?.Character;
            if (Array.isArray(chars)) {
                for (const c of chars as Record<string, unknown>[]) {
                    const num = typeof c?.MemberNumber === "number" ? c.MemberNumber : 0;
                    if (num && num !== Player.MemberNumber) {
                        try { copies.push(structuredClone(c)); } catch { /* ignore */ }
                        // Cache name before next() mutates the bundle — ensures resolveName()
                        // works after leaving the room (ChatRoomCharacter is cleared on leave).
                        const nick = typeof c?.Nickname === "string" ? (c.Nickname as string).trim() : "";
                        const acct = typeof c?.Name === "string" ? (c.Name as string) : "";
                        cacheName(num, nick || acct || String(num));
                        if (acct) cacheAccountName(num, acct);
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
        try { applyPositions(); } catch { /* ignore */ }
        try { drawer?.startBCLiveSync(); } catch { /* ignore */ }
        return result;
    });
    tryHookFunction(modAPI, "ChatRoomSyncSingle", 11, (args, next) => {
        try {
            const [data] = args as [Record<string, unknown>];
            const c = data?.Character as Record<string, unknown> | undefined;
            const num = typeof c?.MemberNumber === "number" ? c.MemberNumber : 0;
            if (num && num !== Player.MemberNumber) {
                try { storeRawBundle(structuredClone(c)); } catch { /* ignore */ }
                // Keep name cache up-to-date when a character's appearance refreshes.
                const nick = typeof c?.Nickname === "string" ? (c.Nickname as string).trim() : "";
                const acct = typeof c?.Name === "string" ? (c.Name as string) : "";
                cacheName(num, nick || acct || String(num));
                if (acct) cacheAccountName(num, acct);
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
                // Cache the joining member's display name so resolveName() works
                // even after they leave. The raw server bundle has Nickname and Name.
                const nick = typeof c?.Nickname === "string" ? c.Nickname.trim() : "";
                const acct = typeof c?.Name === "string" ? c.Name : "";
                const displayName = nick || acct || String(num);
                cacheName(num, displayName);
                if (acct) cacheAccountName(num, acct);
            }
        } catch { /* ignore */ }
        // Refresh our own presence ts so the new joiner sees a fresh timestamp.
        // This keeps the ts current for long-running sessions where ChatRoomSync
        // (which also calls syncPresenceMarker) was fired hours ago.
        try { syncPresenceMarker(); } catch { /* ignore */ }
        const joinResult = next(args);
        try { applyPositions(); } catch { /* ignore */ }
        return joinResult;
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
                        // Also populate friendNames so resolveName() can find this person
                        // even when they're no longer in the room. recordPersonMet writes
                        // to peopleMet but resolveName() reads from friendNames only.
                        cacheName(C.MemberNumber, name);
                        if (C.Name) cacheAccountName(C.MemberNumber, C.Name);
                    } catch { /* ignore */ }
                }
            }
        } catch { /* ignore */ }
        return result;
    });

    // Keep drawer visibility in sync whenever the BC screen changes.
    // Do NOT reset room timers here — transient screens (wardrobe, preferences, etc.)
    // temporarily leave ChatRoom but the player hasn't actually left the room.
    //
    // BC's CommonSetScreen is async (R127+): CurrentScreen is set synchronously, but
    // ElementToggleGeneratedElements and Load() run after the first internal await.
    // We call updateVisibility() twice:
    //   1. Immediately (sync part) — so the tab transitions out of roaming mode right away.
    //   2. After the Promise resolves (async part) — so syncToChat() runs AFTER BC has
    //      made #chat-room-div visible and called ChatRoomResize().  Without this second
    //      call, the FriendList→ChatRoom path left the tab invisible because syncToChat()
    //      failed (TextAreaChatLog still had 0×0 dimensions at the first call).
    tryHookFunction(modAPI, "CommonSetScreen", 3, (args, next) => {
        const result = next(args);
        try { drawer?.updateVisibility(); } catch { /* ignore */ }
        if (result instanceof Promise) {
            result.then(() => { try { drawer?.updateVisibility(); } catch { /* ignore */ } }).catch(() => {});
        }
        return result;
    });

    // Only reset room timers when the player actually leaves the chatroom.
    tryHookFunction(modAPI, "ChatRoomLeave", 3, (args, next) => {
        const result = next(args);
        try { clearCurrentRoomName(); } catch { /* ignore */ }
        try { timerOnRoomLeave(); } catch { /* ignore */ }
        try { onRoomLeave();           } catch { /* ignore */ }
        try { setBadgeDragMode(false); _dragTarget = null; } catch { /* ignore */ }
        try { clearAllPositions(); } catch { /* ignore */ }
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
            if (char.MemberNumber) {
                onMemberJoin(char);
            }
            try { detectNewJoins(); } catch { /* ignore */ }
        } catch { /* ignore */ }
        return result;
    });

    // Keep restraint timer up to date on every draw tick (lightweight check)
    tryHookFunction(modAPI, "DrawCharacter", 1, (args, next) => {
        try { timerCheckRestraints(); } catch { /* ignore */ }
        return next(args);
    });

    // ── Curse storage (runs on Lucy's client when she receives curse beeps from Emery) ──
    const getCurseKey = (): string => `EBC_curses_${Player.MemberNumber ?? ""}`;
    const getCurseItemKey = (): string => `EBC_curseItems_${Player.MemberNumber ?? ""}`;
    const getCursePauseKey = (): string => `EBC_curse_pauses_${Player.MemberNumber ?? ""}`;
    const getCursePauses = (): Record<string, number> => {
        try { const r = localStorage.getItem(getCursePauseKey()); return r ? JSON.parse(r) as Record<string, number> : {}; } catch { return {}; }
    };
    const saveCursePauses = (p: Record<string, number>): void => {
        try { localStorage.setItem(getCursePauseKey(), JSON.stringify(p)); } catch {}
    };
    const isCursePaused = (group: string): boolean => { const p = getCursePauses(); return !!(p[group] && Date.now() < p[group]); };
    const getCurseExpiryKey = (): string => `EBC_curse_expiry_${Player.MemberNumber ?? ""}`;
    const getCurseExpiry = (): number | null => {
        try { const r = localStorage.getItem(getCurseExpiryKey()); return r ? parseInt(r) : null; } catch { return null; }
    };
    const saveCurseExpiry = (ts: number | null): void => {
        try { if (ts == null) localStorage.removeItem(getCurseExpiryKey()); else localStorage.setItem(getCurseExpiryKey(), String(ts)); } catch {}
    };
    const getCursedGroups = (): Set<string> => {
        try {
            const raw = localStorage.getItem(getCurseKey());
            if (!raw) return new Set();
            const parsed = JSON.parse(raw) as unknown;
            if (Array.isArray(parsed)) return new Set(parsed.filter((v): v is string => typeof v === "string"));
        } catch { /* ignore */ }
        return new Set();
    };
    const saveCursedGroups = (groups: Set<string>): void => {
        try { localStorage.setItem(getCurseKey(), JSON.stringify([...groups])); } catch { /* ignore */ }
    };
    const getCurseItemMap = (): Record<string, string> => {
        try {
            const raw = localStorage.getItem(getCurseItemKey());
            return raw ? (JSON.parse(raw) as Record<string, string>) : {};
        } catch { return {}; }
    };
    const saveCurseItemMap = (map: Record<string, string>): void => {
        try { localStorage.setItem(getCurseItemKey(), JSON.stringify(map)); } catch { /* ignore */ }
    };
    const handleCurseCommand = (msg: string): void => {
        const inner = msg.slice("[EBC-CURSE:".length).replace(/\]$/, "");
        const current = getCursedGroups();
        if (inner.startsWith("apply:")) {
            const itemMap = getCurseItemMap();
            for (const entry of inner.slice("apply:".length).split(",").filter(Boolean)) {
                const eqIdx = entry.indexOf("=");
                const g = eqIdx >= 0 ? entry.slice(0, eqIdx) : entry;
                const val = eqIdx >= 0 ? entry.slice(eqIdx + 1) : "";
                if (g === "expiry") { saveCurseExpiry(parseInt(val) || null); continue; }
                if (g) { current.add(g); if (val) itemMap[g] = val; }
            }
            saveCursedGroups(current);
            saveCurseItemMap(itemMap);
        } else if (inner.startsWith("pause:")) {
            const pauses = getCursePauses();
            for (const entry of inner.slice("pause:".length).split(",").filter(Boolean)) {
                const eqIdx = entry.indexOf("=");
                const g = eqIdx >= 0 ? entry.slice(0, eqIdx) : entry;
                const ms = eqIdx >= 0 ? parseInt(entry.slice(eqIdx + 1)) : 0;
                if (g && ms > 0) pauses[g] = Date.now() + ms;
            }
            saveCursePauses(pauses);
        } else if (inner === "clear") {
            saveCursedGroups(new Set());
            saveCurseItemMap({});
            saveCursePauses({});
            saveCurseExpiry(null);
        } else if (inner.startsWith("clear:")) {
            const itemMap = getCurseItemMap();
            for (const g of inner.slice("clear:".length).split(",").filter(Boolean)) {
                current.delete(g);
                delete itemMap[g];
            }
            saveCursedGroups(current);
            saveCurseItemMap(itemMap);
        }
    };

    // Auto-lift timed curses when expiry is reached (checked every 30s)
    window.setInterval(() => {
        try {
            const expiry = getCurseExpiry();
            if (expiry !== null && Date.now() >= expiry && getCursedGroups().size > 0) {
                // Push current appearance for every cursed slot BEFORE clearing the curse data.
                // This ensures any in-flight server removal that arrives after the clear cannot
                // win a race against a stale empty-slot state; the server gets our latest truth first.
                const w = window as unknown as Record<string, unknown>;
                const itemUpdateFn = w.ChatRoomCharacterItemUpdate as ((c: Character, g: string) => void) | undefined;
                if (itemUpdateFn) {
                    for (const g of getCursedGroups()) {
                        const slotItem = (Player.Appearance ?? []).find(
                            (a) => a.Asset?.Group?.Name === g
                        );
                        if (slotItem) {
                            try { itemUpdateFn(Player, g); } catch { /* ignore */ }
                        }
                    }
                }
                handleCurseCommand("[EBC-CURSE:clear]");
                appendLocalLogLine("[EBC] ⏰ Timed curse expired - curses lifted automatically.", UI.textMuted);
            }
        } catch { /* ignore */ }
    }, 30_000);

    // Hook InventoryRemove: block LOCAL removal of cursed item groups (self-removal via BC menu).
    tryHookFunction(modAPI, "InventoryRemove", 1, (args, next) => {
        try {
            const [char, group] = args as [Character, string, boolean?];
            if (char === Player && typeof group === "string") {
                const cursed = getCursedGroups();
                if (cursed.has(group) && !isCursePaused(group)) {
                    appendLocalLogLine(`[EBC] ⛓ ${group.replace("Item", "")} is cursed — it cannot be removed.`, UI.accent);
                    return; // block self-removal of cursed item
                }
            }
        } catch { /* ignore */ }
        return next(args);
    });

    // Hook ChatRoomSyncItem: block EXTERNAL removal of cursed items (another player removing via BC UI).
    // This fires BEFORE InventoryRemove, so returning early keeps the item in Player.Appearance.
    // We then immediately send a correction sync so the server and other clients restore the item.
    tryHookFunction(modAPI, "ChatRoomSyncItem", 1, (args, next) => {
        try {
            const [data] = args as [Record<string, unknown>];
            const item = data.Item as Record<string, unknown> | undefined;
            if (!item) return next(args);
            const targetNum = typeof item.Target === "number" ? item.Target : 0;
            const group = typeof item.Group === "string" ? item.Group : "";
            const nameVal = item.Name; // undefined = removal
            if (targetNum === Player.MemberNumber && group && nameVal === undefined) {
                const cursed = getCursedGroups();
                if (cursed.has(group) && !isCursePaused(group)) {
                    appendLocalLogLine(`[EBC] ⛓ ${group.replace("Item", "")} is cursed — removal blocked.`, UI.accent);
                    // Send correction only if the item is actually present in our appearance;
                    // calling ChatRoomCharacterItemUpdate on an empty slot sends Name:undefined
                    // which would itself become a removal broadcast.
                    const slotItem = (Player.Appearance ?? []).find(a => a.Asset?.Group?.Name === group);
                    if (slotItem) {
                        const itemUpdateFn = (window as unknown as Record<string, unknown>).ChatRoomCharacterItemUpdate as
                            ((c: Character, g: string) => void) | undefined;
                        window.setTimeout(() => {
                            try { if (itemUpdateFn) itemUpdateFn(Player, group); } catch { /* ignore */ }
                        }, 0);
                    }
                    return; // block the removal sync
                }
            }
        } catch { /* ignore */ }
        return next(args);
    });

    // Hook ChatRoomMessage: intercept ECHO addon activity messages and replace BC's
    // "MISSING ACTIVITY DESCRIPTION FOR KEYWORD" rendering with proper descriptions.
    // ECHO (echo-activity-ext) uses Chinese keywords as Type:"Activity" content that BC's
    // activity dictionary doesn't know about. We fire at priority 0 (before ECHO's own hook),
    // call next(args) so ECHO still processes the position/arms effect, then immediately
    // replace any "MISSING ACTIVITY DESCRIPTION" element BC added with our own action text.
    const ECHO_ACTIVITY_DESCS: Readonly<Record<string, (src: string, tgt: string) => string>> = {
        "拉到身边": (s, t) => `${s} pulls ${t} to their side.`,
        "钻进怀里": (s, t) => `${t} cuddles into ${s}'s arms.`,
        "抱入怀中": (s, t) => `${s} holds ${t} tightly in their arms.`,
    };
    tryHookFunction(modAPI, "ChatRoomMessage", 0, (args, next) => {
        try {
            const [data] = args as [Record<string, unknown>];
            if (data.Type === "Activity" && typeof data.Content === "string" &&
                data.Content in ECHO_ACTIVITY_DESCS) {
                const log = document.getElementById("TextAreaChatLog");
                const prevCount = log?.childElementCount ?? 0;
                const result = next(args); // let ECHO process movement, let BC try to render
                if (log && log.childElementCount > prevCount) {
                    // Scan newly added elements for BC's "MISSING" text and replace
                    const dict = Array.isArray(data.Dictionary)
                        ? (data.Dictionary as Record<string, unknown>[])
                        : [];
                    const srcNum = dict.find(e => "SourceCharacter" in e)?.SourceCharacter as number | undefined;
                    const tgtNum = dict.find(e => "TargetCharacter" in e)?.TargetCharacter as number | undefined;
                    const srcName = srcNum ? resolveName(srcNum) : `#?`;
                    const tgtName = tgtNum ? resolveName(tgtNum) : `#?`;
                    const desc = `(${ECHO_ACTIVITY_DESCS[data.Content]!(srcName, tgtName)})`;
                    for (let i = prevCount; i < log.childElementCount; i++) {
                        const el = log.children[i] as HTMLElement;
                        if (el.textContent?.includes("MISSING ACTIVITY DESCRIPTION")) {
                            el.textContent = desc;
                        }
                    }
                }
                return result;
            }
        } catch { /* ignore */ }
        return next(args);
    });

    // Lovense triggers: chat phrases + body touch activities + BC toy sync
    tryHookFunction(modAPI, "ChatRoomMessage", 1, (args, next) => {
        try {
            const [data] = args as [Record<string, unknown>];
            // EBC-TOY whisper intercept — suppress from BC chat display
            if (data.Type === "Whisper" && typeof data.Content === "string" &&
                (data.Content as string).startsWith("[EBC-TOY:")) {
                const parsed = parseEBCToyMsg(data.Content as string);
                if (parsed) {
                    const senderNum = typeof data.Sender === "number" ? data.Sender : 0;
                    if (senderNum && senderNum !== Player.MemberNumber) {
                        const roomChars = (window as unknown as { ChatRoomCharacter?: Array<{ MemberNumber?: number; Name?: string; Nickname?: string }> }).ChatRoomCharacter;
                        const found = roomChars?.find(c => c.MemberNumber === senderNum);
                        const senderName = found ? ((found.Nickname ?? "").trim() || found.Name || String(senderNum)) : String(senderNum);
                        drawer?.handleGameToyMsg(senderNum, senderName, parsed.type, parsed.intensity, parsed.duration);
                    }
                    return; // suppress — do not call next(args)
                }
            }
            // EBC-IRL whisper intercept — IRL Lovense remote control
            if (data.Type === "Whisper" && typeof data.Content === "string" &&
                (data.Content as string).startsWith("[EBC-IRL:")) {
                const parsed = parseEBCIrlMsg(data.Content as string);
                if (parsed) {
                    const senderNum = typeof data.Sender === "number" ? data.Sender : 0;
                    if (senderNum && senderNum !== Player.MemberNumber) {
                        const roomChars = (window as unknown as { ChatRoomCharacter?: Array<{ MemberNumber?: number; Name?: string; Nickname?: string }> }).ChatRoomCharacter;
                        const found = roomChars?.find(c => c.MemberNumber === senderNum);
                        const senderName = found ? ((found.Nickname ?? "").trim() || found.Name || String(senderNum)) : String(senderNum);
                        drawer?.handleIrlToyMsg(senderNum, senderName, parsed.type, parsed.intensity, parsed.duration, parsed.toys);
                    }
                    return; // suppress — do not call next(args)
                }
            }
            if ((data.Type === "Chat" || data.Type === "Emote") && typeof data.Content === "string" &&
                typeof data.Sender === "number") {
                if (data.Sender !== Player.MemberNumber) drawer?.checkLovenseTriggers(data.Content as string);
            }
            if (data.Type === "Activity" && typeof data.Content === "string" &&
                typeof data.Sender === "number" && data.Sender !== Player.MemberNumber) {
                const dict = data.Dictionary as Array<Record<string, unknown>> | undefined;
                const targetEntry = dict?.find(e => "TargetCharacter" in e);
                const targetNum = targetEntry?.["TargetCharacter"] as number | undefined;
                if (targetNum === Player.MemberNumber) {
                    // Content is "ChatOther-GroupName-ActivityName" — extract the activity name
                    const actEntry = dict?.find(e => "ActivityName" in e);
                    const activityName = (actEntry?.["ActivityName"] as string | undefined)
                        ?? (data.Content as string).split("-").pop() ?? "";
                    // BC uses FocusGroupName (not AssetGroupName) in the FocusAssetGroup entry
                    const groupEntry = dict?.find(e => e["Tag"] === "FocusAssetGroup" || "FocusGroupName" in e);
                    const assetGroup = (groupEntry?.["FocusGroupName"] as string | undefined);
                    if (activityName) {
                        drawer?.checkLovenseActivityTrigger(activityName, assetGroup);
                    }
                }
            }
            // Shock collar and other shock items - PropertyShockPublishAction sends TriggerShock0/1/2
            if (data.Type === "Action" && typeof data.Content === "string") {
                const dict = data.Dictionary as Array<Record<string, unknown>> | undefined;
                const content = data.Content as string;
                const contentLow = content.toLowerCase();
                // TriggerShock0/1/2 = petsuit shock collar / forbidden chastity bra / other items using PropertyShockPublishAction
                const isShockAction = content.startsWith("TriggerShock") || contentLow.includes("electro");
                if (isShockAction) {
                    // PropertyShockPublishAction uses DestinationCharacterName (Tag) with MemberNumber
                    const destEntry = dict?.find(e =>
                        e["Tag"] === "DestinationCharacterName" || e["Tag"] === "DestinationCharacter" ||
                        e["Tag"] === "TargetCharacter" || "TargetCharacter" in e
                    );
                    const targetNum = (destEntry?.["MemberNumber"] ?? destEntry?.["TargetCharacter"]) as number | undefined;
                    if (targetNum === Player.MemberNumber) {
                        drawer?.checkPiShockActivityTrigger(data.Sender as number | undefined);
                    }
                }
            }
        } catch { /* ignore */ }
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
            // EBC protocol messages are always silent - never shown in IM or BC notification.
            // Curse commands only processed if sender is a friend (to prevent abuse).
            if (typeof beep.Message === "string" &&
                beep.Message.startsWith("[EBC-CURSE:")) {
                const senderNum = typeof beep.MemberNumber === "number"
                    ? beep.MemberNumber
                    : (parseInt(String(beep.MemberNumber), 10) || 0);
                const friendList2 = (Player.FriendList as number[] | undefined) ?? [];
                if (senderNum && friendList2.includes(senderNum)) {
                    handleCurseCommand(beep.Message);
                    const senderName = typeof beep.MemberName === "string" && beep.MemberName ? beep.MemberName : `#${senderNum}`;
                    const inner = beep.Message.slice("[EBC-CURSE:".length).replace(/\]$/, "");
                    if (inner.startsWith("apply:")) {
                        const parts = inner.slice("apply:".length).split(",").filter(Boolean);
                        const groups = parts.filter(p => !p.startsWith("expiry=")).map(g => g.split("=")[0].replace("Item", ""));
                        const expiryPart = parts.find(p => p.startsWith("expiry="));
                        const expiryMs = expiryPart ? parseInt(expiryPart.slice("expiry=".length)) : 0;
                        let durStr = "";
                        if (expiryMs > Date.now()) {
                            const rem = expiryMs - Date.now();
                            const h = Math.floor(rem / 3600000);
                            const m = Math.floor((rem % 3600000) / 60000);
                            durStr = h > 0 ? ` for ${h}h${m > 0 ? ` ${m}m` : ""}` : ` for ${m}m`;
                        }
                        appendLocalLogLine(`[EBC] ⛓ ${senderName} cursed you${durStr}: ${groups.join(", ")}`, UI.accent);
                    } else if (inner === "clear") {
                        appendLocalLogLine(`[EBC] ✓ ${senderName} lifted all your curses.`, UI.textMuted);
                    }
                    return; // suppress notification
                }
                return; // sender not a friend - still suppress, just don't process
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
            if (name) {
                // MemberName is always the raw BC account name — never overwrite a cached nickname with it.
                cacheAccountName(fromNum, name);
                const existingName = getCachedNames()[String(fromNum)];
                if (!existingName || existingName === `#${fromNum}`) cacheName(fromNum, name);
            }

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
                const rawMsg = typeof beep.Message === "string" ? beep.Message : "";
                // Check for EBC group tag BEFORE stripping metadata so the tag is still intact.
                const grpTag = extractGroupTag(rawMsg);
                if (grpTag) {
                    addGroupBeepEntry(grpTag.id, { from: fromNum, message: grpTag.body, ts: Date.now() });
                    if (!getUseNativeBeepSound() && !getBeepMuted() && !isBeepMemberMuted(fromNum)) { try { playBeepSound(); } catch { /* ignore */ } }
                    try { drawer?.onIncomingGroupBeep(grpTag.id, grpTag.name, fromNum, grpTag.members); } catch { /* ignore */ }
                    return; // suppress BC native popup for group messages
                }
                const msg = stripBeepMetadata(rawMsg);
                if (msg) {
                    addBeepEntry({ from: fromNum, to: Player.MemberNumber ?? 0, message: msg, ts: Date.now() });
                    if (!getUseNativeBeepSound() && !getBeepMuted() && !isBeepMemberMuted(fromNum)) { try { playBeepSound(); } catch { /* ignore */ } }
                    try { drawer?.onIncomingBeep(fromNum); } catch { /* ignore */ }
                    // Room invite messages are handled entirely by EBC's invite card in the
                    // IM window — always suppress BC's native beep popup for these so the
                    // raw "📍 Room invite: …" text never appears in the chat notification area.
                    if (msg.startsWith("📍 Room invite: ")) return;
                    if (msg.startsWith("❌ Room invite declined: ")) return;
                }
            } catch { /* ignore */ }

            // Suppress EBC's own sound already ran above. Call next() so other mods in
            // the chain (LianChat, WCE, etc.) still see this beep, but set a flag first
            // so the low-priority sentinel hook below can block BC's native notification
            // from running at the end of the chain.
            if (!getUseNativeBeepSound() && getSuppressNativeBeep()) {
                _ebcBlockBeepNative = true;
                try { return next(args); } finally { _ebcBlockBeepNative = false; }
            }
        } catch { /* ignore */ }
        return next(args);
    });

    // Sentinel hook at priority 0 (runs just before BC native). When _ebcBlockBeepNative
    // is set by the priority-3 hook above, we swallow the call here so BC's native
    // notification never fires — while LianChat/WCE hooks at intermediate priorities
    // have already seen the beep normally. If LianChat compat is ON the user has opted
    // in to BC's native handling (which shows beeps in chat), so we skip the block.
    tryHookFunction(modAPI, "ServerAccountBeep", 0, (args, next) => {
        if (_ebcBlockBeepNative && !getLianChatCompat()) { _ebcBlockBeepNative = false; return; }
        _ebcBlockBeepNative = false;
        return next(args);
    });


    // Relay ChatRoomSearchResult to the bcUtils callback so drawer.ts can
    // use it for room info chips.
    // Primary: modAPI hook (works if BC exposes ChatRoomSearchResult as a global;
    // silently no-ops in BC R128 where the function is module-scoped).
    tryHookFunction(modAPI, "ChatRoomSearchResult", 3, (args, next) => {
        try {
            const list = args[0] as Array<Record<string, unknown>>;
            if (Array.isArray(list)) fireRoomSearchResult(list);
        } catch { /* ignore */ }
        return next(args);
    });
    // Fallback: ServerSocket.on(). ServerSocket is a top-level var in BC's classic
    // Server.js (window.ServerSocket), but is null until ServerInit() runs on
    // window.load - which fires AFTER EBC's initAddon(). Retry every 2 s until set.
    const attachChatRoomSearchRelay = (): void => {
        try {
            const sock = (window as unknown as Record<string, unknown>).ServerSocket as
                { on?(e: string, h: (d: unknown) => void): void } | undefined;
            if (sock?.on) {
                sock.on("ChatRoomSearchResult", (list: unknown) => {
                    try {
                        if (Array.isArray(list)) fireRoomSearchResult(list as Array<Record<string, unknown>>);
                    } catch { /* ignore */ }
                });
            } else {
                window.setTimeout(attachChatRoomSearchRelay, 2000);
            }
        } catch { /* ignore */ }
    };
    window.setTimeout(attachChatRoomSearchRelay, 2000);

    // Capture beeps sent via BC's native UI (the /beep command, the friend-list beep
    // button, or the "reply" arrow in the chat room beep preview).  Those calls go
    // through ServerSendBeepMessage(target, msg, options) — EBC never touches them,
    // so they are invisible to EBC's IM window unless we hook here.
    tryHookFunction(modAPI, "ServerSendBeepMessage", 3, (args, next) => {
        try {
            const [target, msg] = args as [number, string | undefined, unknown];
            const toNum = typeof target === "number" ? target : (parseInt(String(target), 10) || 0);
            if (toNum && typeof msg === "string" && msg.trim() && !msg.startsWith("[EBC-")) {
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
            if (num && name) {
                // MemberName is always the raw BC account name — never overwrite a cached nickname with it.
                cacheAccountName(num, name);
                const existingName = getCachedNames()[String(num)];
                if (!existingName || existingName === `#${num}`) cacheName(num, name);
            }
            try { syncFriendsSince(); } catch { /* ignore */ }
        } catch { /* ignore */ }
        return next(args);
    });

    // Track which friends BC considers online (not just in our room).
    // In BC R128 AccountQueryResult is a named global function AND a socket event.
    // We hook both paths and deduplicate so only one update fires per result batch.
    let _lastQueryResultTs = 0;
    const handleAccountQueryResult = (raw: unknown): void => {
        try {
            const data = raw as Record<string, unknown>;
            // IMPORTANT: type-check BEFORE the dedup timestamp check.
            // If we stamp _lastQueryResultTs for every AccountQueryResult (including
            // non-OnlineFriends queries that BC fires on login), a rapid burst drops
            // the OnlineFriends response because the dedup eats it.
            if (data.Query !== "OnlineFriends") return;
            const now = Date.now();
            if (now - _lastQueryResultTs < 50) return; // dedup only OnlineFriends (hook + socket fire ~1 ms apart)
            _lastQueryResultTs = now;
            const results = data.Result as Array<Record<string, unknown>> | undefined;
            if (!Array.isArray(results)) return;
            for (const r of results) {
                const n = typeof r.MemberNumber === "number" ? r.MemberNumber : 0;
                const name = typeof r.MemberName === "string" ? r.MemberName : null;
                if (n && name) {
                    // MemberName is always the raw BC account name — cache it for the
                    // "show account name alongside nickname" subtitle feature.
                    cacheAccountName(n, name);
                    // Only write the display-name cache if we have no better entry yet.
                    // AccountQueryResult never includes in-game nicknames, so blindly
                    // caching MemberName here would overwrite a nickname ("Lucy") with
                    // the account name ("Lucas") every time the friend goes online.
                    const existing = getCachedNames()[String(n)];
                    if (!existing || existing === `#${n}`) cacheName(n, name);
                }
            }
            updateOnlineFriends(results);
            // Proactively seed EBC name cache from BC's own FriendNames map.
            // Player.FriendNames is populated at login from the server's LZ-compressed
            // store and includes ALL friends (online and offline). Seeding here ensures
            // offline friends show real names without needing to share a room first.
            try {
                const bcNames = (Player as unknown as { FriendNames?: Map<number, string> }).FriendNames;
                if (bcNames instanceof Map && bcNames.size > 0) {
                    const cached = getCachedNames();
                    for (const [num, name] of bcNames) {
                        if (num && name && !cached[String(num)]) {
                            cacheName(num, name);
                            cacheAccountName(num, name);
                        }
                    }
                }
            } catch { /* ignore */ }
            try { syncFriendsSince(); } catch { /* ignore */ }
            try { drawer?.updateAllBeepWindowStatuses(); } catch { /* ignore */ }
            try { drawer?.refreshFriendList(); } catch { /* ignore */ }
        } catch { /* ignore */ }
    };

    // Primary: hook the BC global (reliable in R128 where it is a patchable function)
    tryHookFunction(modAPI, "AccountQueryResult", 3, (args, next) => {
        handleAccountQueryResult(args[0]);
        return next(args);
    });

    // Fallback: socket listener for BC versions where AccountQueryResult is not hookable
    try {
        const sock = (window as unknown as Record<string, unknown>).ServerSocket as
            { on(event: string, cb: (data: unknown) => void): void } | undefined;
        sock?.on("AccountQueryResult", handleAccountQueryResult);
    } catch { /* ignore */ }

    // Initial query — fire 3 s after load so the connection is settled, then every
    // 30 s to stay current. (Previously was 60 s with no initial query, so the list
    // could stay stale for a full minute if BC's own query burst got deduplicated.)
    window.setTimeout(() => {
        try { ServerSend("AccountQuery", { Query: "OnlineFriends" }); } catch { /* ignore */ }
    }, 3000);
    setInterval(() => {
        try { ServerSend("AccountQuery", { Query: "OnlineFriends" }); } catch { /* ignore */ }
    }, 30 * 1000);

    // ── Emote shortcut (*text → Type:Emote "*Name text*") ────────────────────
    // Typing *text (or * text) in the chat box sends a BC Emote message so it
    // renders as *Name text* in chat without going through gag processing.
    // Prevent double-fire: EBC handles emote shortcuts from three code paths
    // (document capture, ChatRoomKeyDown hook, ChatRoomSendChat hook) as a belt-
    // and-suspenders strategy. The capture path calls stopImmediatePropagation()
    // which should prevent the hook paths from seeing the same keypress, but
    // certain BC builds or other addons can reorder event handling. This timestamp
    // guard ensures the ServerSend fires at most once per 500 ms regardless.

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
            if (e.shiftKey) return; // Shift+Enter inserts a newline — don't trigger our handlers
            const el = (e.target ?? document.activeElement) as HTMLElement | null;
            if (!el || (el as HTMLInputElement).id !== "InputChat") return;
            const raw = (el as HTMLInputElement).value;
            if (!raw.trim()) return;
            if (checkSafeword(raw)
                || handleMetaCommand(raw)
                || handleRestraintCommand(raw, (msg, cb) => showConfirmOverlay(msg, "Cancel", "Apply", cb))
                || handleOutfitCommand(raw, (msg, cb) => showConfirmOverlay(msg, "Cancel", "Apply", cb))
                || handlePoseComboCommand(raw)
                || handleExprSequenceCommand(raw)
                || handleSceneCommand(raw)
                || handleDomCommand(raw)) {
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
            const ev = args[0] as KeyboardEvent | undefined;
            // BC's InputKeyDown crashes at ev.key.length when ev.key is undefined.
            // This can happen when a hook in the chain passes a synthetic/plain object
            // instead of a real KeyboardEvent.  Guard here to prevent the crash.
            if (!ev || typeof ev.key !== "string") return false;
            // Don't let BC process movement keys (WASD / arrows) while the user is
            // typing inside an EBC beep window — stopPropagation() on the textarea
            // handles DOM-level listeners; this hook handles BC's function-call path.
            const activeEl = document.activeElement;
            if (activeEl && (activeEl as HTMLElement).closest?.(".ebc-beep-win")) return false;
            if (ev.shiftKey) return next(args);
            if (typeof KeyPress !== "undefined" && KeyPress === 13) {
                const input = getChatInput();
                if (input?.value.trim() && (
                    checkSafeword(input.value)
                    || handleMetaCommand(input.value)
                    || handleRestraintCommand(input.value, (msg, cb) => showConfirmOverlay(msg, "Cancel", "Apply", cb))
                    || handleOutfitCommand(input.value, (msg, cb) => showConfirmOverlay(msg, "Cancel", "Apply", cb))
                    || handlePoseComboCommand(input.value)
                    || handleExprSequenceCommand(input.value)
                    || handleSceneCommand(input.value)
                    || handleDomCommand(input.value)
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
                || handleExprSequenceCommand(raw)
                || handleSceneCommand(raw)
                || handleDomCommand(raw)
            )) {
                if (input) { input.value = ""; input.style.height = ""; }
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
        const _r = next(args);
        // BC skips the textarea height reset for emote sends (*message) — clear it explicitly.
        try { const inp = getChatInput(); if (inp) inp.style.height = ""; } catch { /* ignore */ }
        return _r;
    });

    // Delay the init-time presence broadcast the same way as the ChatRoomSync
    // hook — prevents a double spike when the addon loads while already in a room.
    window.setTimeout(() => {
        try { syncPresenceMarker(); } catch { /* ignore */ }
    }, 5000 + Math.floor(Math.random() * 3000));

    startUpdateChecker();
    console.log(`[${MOD_NAME}] v${MOD_VERSION} loaded`);
}

const readyInterval = setInterval(() => {
    if (typeof ChatRoomMenuDraw !== "undefined") {
        clearInterval(readyInterval);
        init();
    }
}, 100);
