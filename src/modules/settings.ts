// General EmeryBC settings — lightweight key/value flags stored in ExtensionSettings.

import { callBC, syncSettings } from "./bcUtils";

function getStore(): Record<string, unknown> | null {
    try {
        if (!Player?.ExtensionSettings) return null;
        if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
    } catch {
        return null;
    }
}

// -- Badge visibility (local/client-side only) --------------------------------
// Controls whether YOUR OWN EBC tag is drawn above your head on YOUR screen.
// Purely a local display toggle — does NOT affect broadcasting. Others always
// see your EBC tag regardless of this setting. Defaults to true (tag shown).

export function getBadgeEnabled(): boolean {
    try {
        return getStore()?.badgeEnabled !== false;
    } catch {
        return true; // safe default
    }
}

export function setBadgeEnabled(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.badgeEnabled = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Others' badge visibility --------------------------------------------------
// Client-side only: when off, other players' EBC overhead tags are not drawn.
// Does NOT affect broadcasting your own tag. Defaults to true (show all tags).

export function getShowOthersBadge(): boolean {
    try { return getStore()?.showOthersBadge !== false; } catch { return true; }
}

export function setShowOthersBadge(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.showOthersBadge = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Version badge visibility --------------------------------------------------
// When enabled, the overhead EBC badge shows the player's EBC version number.
// Defaults to false (badge shows just "EBC").

export function getShowVersionBadge(): boolean {
    try { return getStore()?.showVersionBadge === true; } catch { return false; }
}

export function setShowVersionBadge(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.showVersionBadge = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Others' version badge visibility -----------------------------------------
// When enabled, other players' EBC overhead badges show their version number.
// Defaults to false (badge shows just "EBC" for others).

export function getShowOthersVersionBadge(): boolean {
    try { return getStore()?.showOthersVersionBadge === true; } catch { return false; }
}

export function setShowOthersVersionBadge(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.showOthersVersionBadge = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Anti-restraint -----------------------------------------------------------
// When enabled, any restraint applied to the player by someone else is
// immediately removed and a playful emote is sent to the room.

export function getAntiRestraintEnabled(): boolean {
    try { return getStore()?.antiRestraint === true; } catch { return false; }
}

export function setAntiRestraintEnabled(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.antiRestraint = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Anti-restraint whitelist --------------------------------------------------
// Group names that auto-escape will never touch, even when applied by others.
// Populated by the user from the Settings UI while wearing the items.

export function getAntiRestraintWhitelist(): string[] {
    try {
        const list = getStore()?.antiRestraintWhitelist;
        return Array.isArray(list) ? (list as string[]) : [];
    } catch { return []; }
}

export function setAntiRestraintWhitelist(groups: string[]): void {
    try {
        const store = getStore();
        if (!store) return;
        store.antiRestraintWhitelist = groups;
        syncSettings();
    } catch { /* ignore */ }
}

export function addToAntiRestraintWhitelist(group: string): void {
    const list = getAntiRestraintWhitelist();
    if (!list.includes(group)) setAntiRestraintWhitelist([...list, group]);
}

export function removeFromAntiRestraintWhitelist(group: string): void {
    setAntiRestraintWhitelist(getAntiRestraintWhitelist().filter(g => g !== group));
}

// -- Special friends ----------------------------------------------------------
// Member numbers displayed with a golden gradient highlight in the People in
// Room and Friends lists. Stored server-side so it persists across devices.

export function getSpecialFriends(): number[] {
    try {
        const list = getStore()?.specialFriends;
        return Array.isArray(list) ? (list as number[]) : [];
    } catch { return []; }
}

export function isSpecialFriend(memberNumber: number): boolean {
    return getSpecialFriends().includes(memberNumber);
}

export function addSpecialFriend(memberNumber: number): void {
    try {
        const store = getStore();
        if (!store) return;
        const list = getSpecialFriends();
        if (!list.includes(memberNumber)) {
            store.specialFriends = [...list, memberNumber];
            syncSettings();
        }
    } catch { /* ignore */ }
}

export function removeSpecialFriend(memberNumber: number): void {
    try {
        const store = getStore();
        if (!store) return;
        store.specialFriends = getSpecialFriends().filter(n => n !== memberNumber);
        syncSettings();
    } catch { /* ignore */ }
}

// -- Anti-restraint confirm dialog ---------------------------------------------
// When enabled, shows a confirm() prompt before auto-escaping so the user
// can choose to accept the restraint instead. Off by default.

export function getAntiRestraintConfirm(): boolean {
    try { return getStore()?.antiRestraintConfirm === true; } catch { return false; }
}

export function setAntiRestraintConfirm(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.antiRestraintConfirm = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Suppress native beep notification ----------------------------------------
// When on (default), plain beeps handled by our IM don't also show in BC's
// main chat log. Game beeps (friend requests etc.) always pass through.

export function getSuppressNativeBeep(): boolean {
    try { return getStore()?.suppressNativeBeep !== false; } catch { return true; }
}

export function setSuppressNativeBeep(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.suppressNativeBeep = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Update notifications ------------------------------------------------------
// When enabled (default), a local chat notice appears if a room member is
// running a newer version of EBC, prompting the user to relog. The user can
// silence it permanently with /ebc updates off.

export function getUpdateNotify(): boolean {
    try { return getStore()?.updateNotify !== false; } catch { return true; }
}

export function setUpdateNotify(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.updateNotify = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- AFK auto-reply ------------------------------------------------------------
// When enabled, EBC sends a configurable auto-reply beep if a message arrives
// while the player has been inactive for more than the threshold.

export function getAfkEnabled(): boolean {
    try { return getStore()?.afkEnabled === true; } catch { return false; }
}
export function setAfkEnabled(v: boolean): void {
    try { const s = getStore(); if (s) { s.afkEnabled = v; syncSettings(); } } catch { /* ignore */ }
}

// Threshold stored in SECONDS (key afkThresholdSec). Default 600 s = 10 min.
export function getAfkThreshold(): number {
    try { const v = getStore()?.afkThresholdSec; return typeof v === "number" && v >= 1 ? v : 300; } catch { return 300; }
}
export function setAfkThreshold(n: number): void {
    try { const s = getStore(); if (s) { s.afkThresholdSec = Math.max(1, Math.min(86400, Math.round(n))); syncSettings(); } } catch { /* ignore */ }
}

export function getAfkMessage(): string {
    try {
        const v = getStore()?.afkMessage;
        return typeof v === "string" && v.trim() ? v : "I'm currently AFK — I'll reply when I'm back!";
    } catch { return "I'm currently AFK — I'll reply when I'm back!"; }
}
export function setAfkMessage(msg: string): void {
    try { const s = getStore(); if (s) { s.afkMessage = msg.slice(0, 200).trim(); syncSettings(); } } catch { /* ignore */ }
}

// When enabled, EBC also whispers the AFK message to anyone who mentions the
// player's name in room chat while AFK (same cooldown as beep replies).
export function getAfkMentionReply(): boolean {
    try { return getStore()?.afkMentionReply !== false; } catch { return true; }
}
export function setAfkMentionReply(v: boolean): void {
    try { const s = getStore(); if (s) { s.afkMentionReply = v; syncSettings(); } } catch { /* ignore */ }
}

// -- OOC mode ------------------------------------------------------------------
// When enabled, every normal chat message is prefixed with "(" so it reads
// as out-of-character speech. Commands (/), emotes (*), and already-OOC
// messages (() are never modified.

export function getOocEnabled(): boolean {
    try { return getStore()?.oocEnabled === true; } catch { return false; }
}

export function setOocEnabled(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.oocEnabled = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Room history enabled ------------------------------------------------------
// When off (default), no room visits are recorded. User must opt in.

export function getRoomHistoryEnabled(): boolean {
    try { return getStore()?.roomHistoryEnabled === true; } catch { return false; }
}

export function setRoomHistoryEnabled(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.roomHistoryEnabled = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Restraint log enabled -----------------------------------------------------
// When off (default), no restraint changes are recorded. User must opt in.

export function getRestraintLogEnabled(): boolean {
    try { return getStore()?.restraintLogEnabled === true; } catch { return false; }
}

export function setRestraintLogEnabled(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.restraintLogEnabled = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Beep mute -----------------------------------------------------------------

export function getBeepMuted(): boolean {
    try { return getStore()?.beepMuted === true; } catch { return false; }
}

export function setBeepMuted(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.beepMuted = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Action buttons sidebar visibility ----------------------------------------

export function getActionButtonsVisible(): boolean {
    try { return getStore()?.actionButtonsVisible !== false; } catch { return true; }
}

export function setActionButtonsVisible(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.actionButtonsVisible = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- People Met ----------------------------------------------------------------
// Everyone the player has ever shared a room with. Saved server-side so it
// syncs across devices. Capped at 2000 entries (oldest evicted first).

export interface PersonMet {
    n: number;   // member number
    name: string;
}

const PEOPLE_MET_CAP = 2000;

// Debounce handle for batching multiple recordPersonMet calls into one server sync.
let peopleMetSyncTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePeopleMetSync(): void {
    if (peopleMetSyncTimer !== null) return; // already queued
    peopleMetSyncTimer = setTimeout(() => {
        peopleMetSyncTimer = null;
        syncSettings();
    }, 3000); // wait 3 s then send one sync for all changes
}

export function getPeopleMet(): PersonMet[] {
    try {
        const raw = getStore()?.peopleMet;
        return Array.isArray(raw) ? (raw as PersonMet[]) : [];
    } catch { return []; }
}

export function recordPersonMet(memberNumber: number, name: string): void {
    try {
        const store = getStore();
        if (!store) return;
        const list = getPeopleMet();
        const existing = list.find(p => p.n === memberNumber);
        if (existing) {
            if (existing.name === name) return; // nothing changed — skip sync entirely
            existing.name = name;
        } else {
            if (list.length >= PEOPLE_MET_CAP) list.splice(0, list.length - PEOPLE_MET_CAP + 1);
            list.push({ n: memberNumber, name });
        }
        store.peopleMet = list;
        schedulePeopleMetSync(); // batch — one server sync covers all changes in a 3 s window
    } catch { /* ignore */ }
}

export function clearPeopleMet(): void {
    try {
        const store = getStore();
        if (!store) return;
        store.peopleMet = [];
        syncSettings();
    } catch { /* ignore */ }
}

// -- Badge style ---------------------------------------------------------------
// "text": the classic EBC rectangle badge
// "cat":  a cat-face SVG icon drawn on the canvas at the badge position

export type BadgeStyle = "text" | "cat";

export function getBadgeStyle(): BadgeStyle {
    try { return getStore()?.badgeStyle === "cat" ? "cat" : "text"; } catch { return "text"; }
}
export function setBadgeStyle(v: BadgeStyle): void {
    try { const s = getStore(); if (s) { s.badgeStyle = v; syncSettings(); } } catch { /* ignore */ }
}

// -- Others' badge style -------------------------------------------------------
// Client-side only: controls which badge style is drawn for OTHER players' badges
// on your screen. Independent from your own badge style. Defaults to "text".

export function getOthersBadgeStyle(): BadgeStyle {
    try { return getStore()?.othersBadgeStyle === "cat" ? "cat" : "text"; } catch { return "text"; }
}
export function setOthersBadgeStyle(v: BadgeStyle): void {
    try { const s = getStore(); if (s) { s.othersBadgeStyle = v; syncSettings(); } } catch { /* ignore */ }
}

// -- Badge scale ---------------------------------------------------------------
// Multiplier applied on top of the room zoom. 1.0 = default size.
// Range: 0.3 – 4.0

export function getBadgeScale(): number {
    try {
        const v = getStore()?.badgeScale;
        return typeof v === "number" && v >= 0.3 && v <= 4 ? v : 1.0;
    } catch { return 1.0; }
}
export function setBadgeScale(v: number): void {
    try { const s = getStore(); if (s) { s.badgeScale = Math.max(0.3, Math.min(4, v)); syncSettings(); } } catch { /* ignore */ }
}

// -- Badge background opacity --------------------------------------------------
// Controls how opaque the background rectangle of the text badge is.
// 0.0 = fully transparent (text only), 1.0 = fully opaque. Default: 1.0.

export function getBadgeBgOpacity(): number {
    try {
        const v = getStore()?.badgeBgOpacity;
        return typeof v === "number" && v >= 0 && v <= 1 ? v : 1.0;
    } catch { return 1.0; }
}
export function setBadgeBgOpacity(v: number): void {
    try { const s = getStore(); if (s) { s.badgeBgOpacity = Math.max(0, Math.min(1, v)); syncSettings(); } } catch { /* ignore */ }
}

// -- Badge text opacity --------------------------------------------------------
// Controls how opaque the label text (or cat emoji) of the badge is.
// 0.0 = invisible, 1.0 = fully opaque. Default: 1.0.

export function getBadgeTextOpacity(): number {
    try {
        const v = getStore()?.badgeTextOpacity;
        return typeof v === "number" && v >= 0 && v <= 1 ? v : 1.0;
    } catch { return 1.0; }
}
export function setBadgeTextOpacity(v: number): void {
    try { const s = getStore(); if (s) { s.badgeTextOpacity = Math.max(0, Math.min(1, v)); syncSettings(); } } catch { /* ignore */ }
}

// -- Badge position offset (character-relative) --------------------------------
// Stored as offsets from the character's draw origin (left, top), in
// character-local canvas pixels — multiplied by zoom when drawing.
// X=250 = horizontal centre of the 500 px character slot.
// Y=72  = just below the WCE name line.

export function getBadgeOffsetX(): number {
    try { const v = getStore()?.badgeOffsetX; return typeof v === "number" ? Math.max(-500, Math.min(1000, v)) : 250; } catch { return 250; }
}
export function setBadgeOffsetX(v: number): void {
    try { const s = getStore(); if (s) { s.badgeOffsetX = Math.round(v); syncSettings(); } } catch { /* ignore */ }
}

export function getBadgeOffsetY(): number {
    try { const v = getStore()?.badgeOffsetY; return typeof v === "number" ? Math.max(-200, Math.min(900, v)) : 72; } catch { return 72; }
}
export function setBadgeOffsetY(v: number): void {
    try { const s = getStore(); if (s) { s.badgeOffsetY = Math.round(v); syncSettings(); } } catch { /* ignore */ }
}

export function resetBadgePosition(): void {
    setBadgeOffsetX(250);
    setBadgeOffsetY(72);
}

// -- Version text offset (cat mode — drawn separately from cat icon) -----------
// Independent X/Y position for the floating version label when badge style is
// "cat" and version display is enabled. Defaults: X=250, Y=95 (just below cat).

export function getVersionTextOffsetX(): number {
    try { const v = getStore()?.versionTextOffsetX; return typeof v === "number" ? Math.max(-500, Math.min(1000, v)) : 250; } catch { return 250; }
}
export function setVersionTextOffsetX(v: number): void {
    try { const s = getStore(); if (s) { s.versionTextOffsetX = Math.round(v); syncSettings(); } } catch { /* ignore */ }
}
export function getVersionTextOffsetY(): number {
    try { const v = getStore()?.versionTextOffsetY; return typeof v === "number" ? Math.max(-200, Math.min(900, v)) : 95; } catch { return 95; }
}
export function setVersionTextOffsetY(v: number): void {
    try { const s = getStore(); if (s) { s.versionTextOffsetY = Math.round(v); syncSettings(); } } catch { /* ignore */ }
}
export function resetVersionTextPosition(): void {
    setVersionTextOffsetX(250);
    setVersionTextOffsetY(95);
}

// -- Badge drag mode (in-memory only, never persisted) -------------------------
// When true: a dashed ring appears on your own badge in the chatroom canvas,
// and canvas mouse/touch events allow click-dragging the badge to reposition.
// Automatically cleared when the drag completes or the user leaves a room.

let _badgeDragMode = false;
export function getBadgeDragMode(): boolean { return _badgeDragMode; }
export function setBadgeDragMode(v: boolean): void { _badgeDragMode = v; }
