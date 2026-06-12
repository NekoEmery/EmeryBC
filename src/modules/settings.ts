// General EmeryBC settings — lightweight key/value flags stored in ExtensionSettings.

import { callBC, getSettings, syncSettings } from "./bcUtils";


// -- Badge visibility (local/client-side only) --------------------------------
// Controls whether YOUR OWN EBC tag is drawn above your head on YOUR screen.
// Purely a local display toggle — does NOT affect broadcasting. Others always
// see your EBC tag regardless of this setting. Defaults to true (tag shown).

export function getBadgeEnabled(): boolean {
    try {
        return getSettings()?.badgeEnabled !== false;
    } catch {
        return true; // safe default
    }
}

export function setBadgeEnabled(value: boolean): void {
    try {
        const store = getSettings();
        store.badgeEnabled = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Others' badge visibility --------------------------------------------------
// Client-side only: when off, other players' EBC overhead tags are not drawn.
// Does NOT affect broadcasting your own tag. Defaults to true (show all tags).

export function getShowOthersBadge(): boolean {
    try { return getSettings()?.showOthersBadge !== false; } catch { return true; }
}

export function setShowOthersBadge(value: boolean): void {
    try {
        const store = getSettings();
        store.showOthersBadge = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Version badge visibility --------------------------------------------------
// When enabled, the overhead EBC badge shows the player's EBC version number.
// Defaults to false (badge shows just "EBC").

export function getShowVersionBadge(): boolean {
    try { return getSettings()?.showVersionBadge === true; } catch { return false; }
}

export function setShowVersionBadge(value: boolean): void {
    try {
        const store = getSettings();
        store.showVersionBadge = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Others' version badge visibility -----------------------------------------
// When enabled, other players' EBC overhead badges show their version number.
// Defaults to false (badge shows just "EBC" for others).

export function getShowOthersVersionBadge(): boolean {
    try { return getSettings()?.showOthersVersionBadge === true; } catch { return false; }
}

export function setShowOthersVersionBadge(value: boolean): void {
    try {
        const store = getSettings();
        store.showOthersVersionBadge = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Anti-restraint -----------------------------------------------------------
// When enabled, any restraint applied to the player by someone else is
// immediately removed and a playful emote is sent to the room.

export function getAntiRestraintEnabled(): boolean {
    try { return getSettings()?.antiRestraint === true; } catch { return false; }
}

export function setAntiRestraintEnabled(value: boolean): void {
    try {
        const store = getSettings();
        store.antiRestraint = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Auto-escape emote (announce) -----------------------------------------------
// When false, auto-escape removes restraints silently (no room emote).

export function getAntiRestraintAnnounce(): boolean {
    try { return getSettings()?.antiRestraintAnnounce !== false; } catch { return true; }
}

export function setAntiRestraintAnnounce(value: boolean): void {
    try { const s = getSettings(); s.antiRestraintAnnounce = value; syncSettings(); } catch { /* ignore */ }
}

// -- Escape emote custom text ---------------------------------------------------
// Optional custom text for the auto-escape room emote.
// Tokens: {item} = item name, {restrainer} = who applied it.
// When empty, falls back to the default glare emote text.

export function getEscapeEmoteText(): string {
    try {
        const v = (getSettings() as Record<string, unknown>)?.escapeEmoteText;
        return typeof v === "string" ? v : "";
    } catch { return ""; }
}

export function setEscapeEmoteText(text: string): void {
    try { const s = getSettings() as Record<string, unknown>; s.escapeEmoteText = text; syncSettings(); } catch { /* ignore */ }
}

// -- Dom set announce -----------------------------------------------------------
// When false, applying a restraint set sends no room emote.

export function getDomSetAnnounce(): boolean {
    try { return getSettings()?.domSetAnnounce !== false; } catch { return true; }
}

export function setDomSetAnnounce(value: boolean): void {
    try { const s = getSettings(); s.domSetAnnounce = value; syncSettings(); } catch { /* ignore */ }
}

// -- Anti-restraint whitelist --------------------------------------------------
// Group names that auto-escape will never touch, even when applied by others.
// Populated by the user from the Settings UI while wearing the items.

export function getAntiRestraintWhitelist(): string[] {
    try {
        const list = getSettings()?.antiRestraintWhitelist;
        return Array.isArray(list) ? (list as string[]) : [];
    } catch { return []; }
}

export function setAntiRestraintWhitelist(groups: string[]): void {
    try {
        const store = getSettings();
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
        const list = getSettings()?.specialFriends;
        return Array.isArray(list) ? (list as number[]) : [];
    } catch { return []; }
}

export function isSpecialFriend(memberNumber: number): boolean {
    return getSpecialFriends().includes(memberNumber);
}

export function addSpecialFriend(memberNumber: number): void {
    try {
        const store = getSettings();
        const list = getSpecialFriends();
        if (!list.includes(memberNumber)) {
            store.specialFriends = [...list, memberNumber];
            syncSettings();
        }
    } catch { /* ignore */ }
}

export function removeSpecialFriend(memberNumber: number): void {
    try {
        const store = getSettings();
        store.specialFriends = getSpecialFriends().filter(n => n !== memberNumber);
        syncSettings();
    } catch { /* ignore */ }
}

// -- Anti-restraint confirm dialog ---------------------------------------------
// When enabled, shows a confirm() prompt before auto-escaping so the user
// can choose to accept the restraint instead. Off by default.

export function getAntiRestraintConfirm(): boolean {
    try { return getSettings()?.antiRestraintConfirm === true; } catch { return false; }
}

export function setAntiRestraintConfirm(value: boolean): void {
    try {
        const store = getSettings();
        store.antiRestraintConfirm = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Suppress native beep notification ----------------------------------------
// When on (default), plain beeps handled by our IM don't also show in BC's
// main chat log. Game beeps (friend requests etc.) always pass through.

export function getSuppressNativeBeep(): boolean {
    try { return getSettings()?.suppressNativeBeep !== false; } catch { return true; }
}

export function setSuppressNativeBeep(value: boolean): void {
    try {
        const store = getSettings();
        store.suppressNativeBeep = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Use native BC beep sound --------------------------------------------------
// When on, skip the addon's custom beep sound and let BC's native beep play.

export function getUseNativeBeepSound(): boolean {
    try { return getSettings()?.useNativeBeepSound === true; } catch { return false; }
}

export function setUseNativeBeepSound(value: boolean): void {
    try {
        const store = getSettings();
        store.useNativeBeepSound = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Update notifications ------------------------------------------------------
// When enabled (default), a local chat notice appears if a room member is
// running a newer version of EBC, prompting the user to relog. The user can
// silence it permanently with /ebc updates off.

export function getUpdateNotify(): boolean {
    try { return getSettings()?.updateNotify !== false; } catch { return true; }
}

export function setUpdateNotify(value: boolean): void {
    try {
        const store = getSettings();
        store.updateNotify = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- AFK auto-reply ------------------------------------------------------------
// When enabled, EBC sends a configurable auto-reply beep if a message arrives
// while the player has been inactive for more than the threshold.

export function getAfkEnabled(): boolean {
    try { return getSettings()?.afkEnabled === true; } catch { return false; }
}
export function setAfkEnabled(v: boolean): void {
    try { const s = getSettings(); s.afkEnabled = v; syncSettings(); } catch { /* ignore */ }
}

// Threshold stored in SECONDS (key afkThresholdSec). Default 600 s = 10 min.
export function getAfkThreshold(): number {
    try { const v = getSettings()?.afkThresholdSec; return typeof v === "number" && v >= 1 ? v : 300; } catch { return 300; }
}
export function setAfkThreshold(n: number): void {
    try { const s = getSettings(); s.afkThresholdSec = Math.max(1, Math.min(86400, Math.round(n))); syncSettings(); } catch { /* ignore */ }
}

export function getAfkMessage(): string {
    try {
        const v = getSettings()?.afkMessage;
        return typeof v === "string" && v.trim() ? v : "I'm currently AFK — I'll reply when I'm back!";
    } catch { return "I'm currently AFK — I'll reply when I'm back!"; }
}
export function setAfkMessage(msg: string): void {
    try { const s = getSettings(); s.afkMessage = msg.slice(0, 200).trim(); syncSettings(); } catch { /* ignore */ }
}

// When enabled, EBC also whispers the AFK message to anyone who mentions the
// player's name in room chat while AFK (same cooldown as beep replies).
export function getAfkMentionReply(): boolean {
    try { return getSettings()?.afkMentionReply !== false; } catch { return true; }
}
export function setAfkMentionReply(v: boolean): void {
    try { const s = getSettings(); s.afkMentionReply = v; syncSettings(); } catch { /* ignore */ }
}

// -- OOC mode ------------------------------------------------------------------
// When enabled, every normal chat message is prefixed with "(" so it reads
// as out-of-character speech. Commands (/), emotes (*), and already-OOC
// messages (() are never modified.

export function getOocEnabled(): boolean {
    try { return getSettings()?.oocEnabled === true; } catch { return false; }
}

export function setOocEnabled(value: boolean): void {
    try {
        const store = getSettings();
        store.oocEnabled = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Room history enabled ------------------------------------------------------
// When off (default), no room visits are recorded. User must opt in.

export function getRoomHistoryEnabled(): boolean {
    try { return getSettings()?.roomHistoryEnabled === true; } catch { return false; }
}

export function setRoomHistoryEnabled(value: boolean): void {
    try {
        const store = getSettings();
        store.roomHistoryEnabled = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Restraint log enabled -----------------------------------------------------
// When off (default), no restraint changes are recorded. User must opt in.

export function getRestraintLogEnabled(): boolean {
    try { return getSettings()?.restraintLogEnabled === true; } catch { return false; }
}

export function setRestraintLogEnabled(value: boolean): void {
    try {
        const store = getSettings();
        store.restraintLogEnabled = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Beep mute -----------------------------------------------------------------

export function getBeepMuted(): boolean {
    try { return getSettings()?.beepMuted === true; } catch { return false; }
}

export function setBeepMuted(value: boolean): void {
    try {
        const store = getSettings();
        store.beepMuted = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Quick replies -------------------------------------------------------------
// Configurable one-click phrases shown as buttons inside beep windows.
// Clicking inserts the text into the input so the user can review/edit before sending.

const DEFAULT_QUICK_REPLIES = ["brb", "busy, back soon", "hello ^^"];

export function getQuickReplies(): string[] {
    try {
        const v = getSettings()?.quickReplies;
        if (Array.isArray(v)) return v as string[];
    } catch { /* ignore */ }
    return [...DEFAULT_QUICK_REPLIES];
}

export function saveQuickReplies(replies: string[]): void {
    try {
        const store = getSettings();
        store.quickReplies = replies;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Action buttons sidebar visibility ----------------------------------------

export function getActionButtonsVisible(): boolean {
    try { return getSettings()?.actionButtonsVisible !== false; } catch { return true; }
}

export function setActionButtonsVisible(value: boolean): void {
    try {
        const store = getSettings();
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

// Server (cross-device via ExtensionSettings): last 150 entries only.
// localStorage (this device): full unbounded history.
// getPeopleMet() merges both so the DEV panel shows everything available.
const PEOPLE_MET_SERVER_CAP = 150;
const PEOPLE_MET_LOCAL_KEY  = "EBC_peopleMet_local";

// Debounce handle for batching multiple recordPersonMet calls into one server sync.
let peopleMetSyncTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePeopleMetSync(): void {
    if (peopleMetSyncTimer !== null) return;
    peopleMetSyncTimer = setTimeout(() => { peopleMetSyncTimer = null; syncSettings(); }, 3000);
}

// -- localStorage helpers (no size limit, device-only) -------------------------
function _pmLocalLoad(): PersonMet[] {
    try {
        const raw = localStorage.getItem(PEOPLE_MET_LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as PersonMet[]) : [];
    } catch { return []; }
}

function _pmLocalSave(list: PersonMet[]): void {
    try { localStorage.setItem(PEOPLE_MET_LOCAL_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

// -- Server helpers (capped, cross-device) ------------------------------------
function _pmServerLoad(): PersonMet[] {
    try {
        const raw = getSettings()?.peopleMet;
        return Array.isArray(raw) ? (raw as PersonMet[]) : [];
    } catch { return []; }
}

// On first load: migrate any existing server peopleMet into localStorage so
// the user doesn't lose their history when upgrading to the hybrid model.
let _pmMigrated = false;
export function migratePeopleMetToLocal(): void {
    if (_pmMigrated) return;
    _pmMigrated = true;
    try {
        const server = _pmServerLoad();
        if (server.length === 0) return;
        const local = _pmLocalLoad();
        const localNums = new Set(local.map(p => p.n));
        let changed = false;
        for (const p of server) {
            if (!localNums.has(p.n)) { local.push(p); localNums.add(p.n); changed = true; }
        }
        if (changed) _pmLocalSave(local);
    } catch { /* ignore */ }
}

/** Returns the full merged list (local ∪ server). Prefer local copy when both have the same member. */
export function getPeopleMet(): PersonMet[] {
    const local  = _pmLocalLoad();
    const server = _pmServerLoad();
    const localNums = new Set(local.map(p => p.n));
    const merged = [...local];
    for (const p of server) {
        if (!localNums.has(p.n)) merged.push(p); // add cross-device entries missing locally
    }
    return merged;
}

export function recordPersonMet(memberNumber: number, name: string): void {
    try {
        // 1. Update localStorage (full device history, no cap)
        const local = _pmLocalLoad();
        const localIdx = local.findIndex(p => p.n === memberNumber);
        if (localIdx >= 0) {
            if (local[localIdx].name === name) {
                // No change at all — skip everything including server sync
                return;
            }
            local[localIdx].name = name;
        } else {
            local.push({ n: memberNumber, name });
        }
        _pmLocalSave(local);

        // 2. Update server list (most recent PEOPLE_MET_SERVER_CAP entries only)
        const store = getSettings();
        const server = _pmServerLoad();
        const sIdx = server.findIndex(p => p.n === memberNumber);
        if (sIdx >= 0) {
            server[sIdx].name = name;
            // Move to end so it stays in the "most recent" window
            const [entry] = server.splice(sIdx, 1);
            server.push(entry);
        } else {
            server.push({ n: memberNumber, name });
        }
        if (server.length > PEOPLE_MET_SERVER_CAP) {
            server.splice(0, server.length - PEOPLE_MET_SERVER_CAP);
        }
        store.peopleMet = server;
        schedulePeopleMetSync();
    } catch { /* ignore */ }
}

export function clearPeopleMet(): void {
    try {
        const store = getSettings();
        store.peopleMet = [];
        try { localStorage.removeItem(PEOPLE_MET_LOCAL_KEY); } catch { /* ignore */ }
        syncSettings();
    } catch { /* ignore */ }
}

// -- Badge style ---------------------------------------------------------------
// "text": the classic EBC rectangle badge
// "cat":  a cat-face SVG icon drawn on the canvas at the badge position

export type BadgeStyle = "text" | "cat";

export function getBadgeStyle(): BadgeStyle {
    try { return getSettings()?.badgeStyle === "cat" ? "cat" : "text"; } catch { return "text"; }
}
export function setBadgeStyle(v: BadgeStyle): void {
    try { const s = getSettings(); s.badgeStyle = v; syncSettings(); } catch { /* ignore */ }
}

// -- Others' badge style -------------------------------------------------------
// Client-side only: controls which badge style is drawn for OTHER players' badges
// on your screen. Independent from your own badge style. Defaults to "text".

export function getOthersBadgeStyle(): BadgeStyle {
    try { return getSettings()?.othersBadgeStyle === "cat" ? "cat" : "text"; } catch { return "text"; }
}
export function setOthersBadgeStyle(v: BadgeStyle): void {
    try { const s = getSettings(); s.othersBadgeStyle = v; syncSettings(); } catch { /* ignore */ }
}

// -- Badge scale ---------------------------------------------------------------
// Multiplier applied on top of the room zoom. 1.0 = default size.
// Range: 0.3 – 4.0
// Legacy single scale kept for migration; new code uses style-specific getters below.

export function getBadgeScale(): number {
    try {
        const v = getSettings()?.badgeScale;
        return typeof v === "number" && v >= 0.3 && v <= 4 ? v : 1.0;
    } catch { return 1.0; }
}
export function setBadgeScale(v: number): void {
    try { const s = getSettings(); s.badgeScale = Math.max(0.3, Math.min(4, v)); syncSettings(); } catch { /* ignore */ }
}

// Per-style scales — Text and Cat can be sized independently.
// Both fall back to the legacy `badgeScale` value on first use (migration).
export function getTextBadgeScale(): number {
    try {
        const s = getSettings();
        const v = (s as Record<string, unknown>)?.textBadgeScale;
        return typeof v === "number" && v >= 0.3 && v <= 4 ? v : getBadgeScale();
    } catch { return 1.0; }
}
export function setTextBadgeScale(v: number): void {
    try { const s = getSettings(); (s as Record<string, unknown>).textBadgeScale = Math.max(0.3, Math.min(4, Math.round(v * 100) / 100)); syncSettings(); } catch { /* ignore */ }
}

export function getCatBadgeScale(): number {
    try {
        const s = getSettings();
        const v = (s as Record<string, unknown>)?.catBadgeScale;
        return typeof v === "number" && v >= 0.3 && v <= 4 ? v : getBadgeScale();
    } catch { return 1.0; }
}
export function setCatBadgeScale(v: number): void {
    try { const s = getSettings(); (s as Record<string, unknown>).catBadgeScale = Math.max(0.3, Math.min(4, Math.round(v * 100) / 100)); syncSettings(); } catch { /* ignore */ }
}

// -- Badge background opacity --------------------------------------------------
// Controls how opaque the background rectangle of the text badge is.
// 0.0 = fully transparent (text only), 1.0 = fully opaque. Default: 1.0.

export function getBadgeBgOpacity(): number {
    try {
        const v = getSettings()?.badgeBgOpacity;
        return typeof v === "number" && v >= 0 && v <= 1 ? v : 1.0;
    } catch { return 1.0; }
}
export function setBadgeBgOpacity(v: number): void {
    try { const s = getSettings(); s.badgeBgOpacity = Math.max(0, Math.min(1, v)); syncSettings(); } catch { /* ignore */ }
}

// -- Badge text opacity --------------------------------------------------------
// Controls how opaque the label text (or cat emoji) of the badge is.
// 0.0 = invisible, 1.0 = fully opaque. Default: 1.0.

export function getBadgeTextOpacity(): number {
    try {
        const v = getSettings()?.badgeTextOpacity;
        return typeof v === "number" && v >= 0 && v <= 1 ? v : 1.0;
    } catch { return 1.0; }
}
export function setBadgeTextOpacity(v: number): void {
    try { const s = getSettings(); s.badgeTextOpacity = Math.max(0, Math.min(1, v)); syncSettings(); } catch { /* ignore */ }
}

// -- Badge position offset (character-relative) --------------------------------
// Stored as offsets from the character's draw origin (left, top), in
// character-local canvas pixels — multiplied by zoom when drawing.
// X=250 = horizontal centre of the 500 px character slot.
// Y=72  = just below the WCE name line.

export function getBadgeOffsetX(): number {
    try { const v = getSettings()?.badgeOffsetX; return typeof v === "number" ? Math.max(-500, Math.min(1000, v)) : 250; } catch { return 250; }
}
export function setBadgeOffsetX(v: number): void {
    try { const s = getSettings(); s.badgeOffsetX = Math.round(v); syncSettings(); } catch { /* ignore */ }
}

export function getBadgeOffsetY(): number {
    try { const v = getSettings()?.badgeOffsetY; return typeof v === "number" ? Math.max(-200, Math.min(1500, v)) : 72; } catch { return 72; }
}
export function setBadgeOffsetY(v: number): void {
    try { const s = getSettings(); s.badgeOffsetY = Math.max(-200, Math.min(1500, Math.round(v))); syncSettings(); } catch { /* ignore */ }
}

export function resetBadgePosition(): void {
    setBadgeOffsetX(250);
    setBadgeOffsetY(72);
}

// -- Cat badge position offset -------------------------------------------------
// Separate X/Y for the cat icon so it can be placed independently of the text badge.
// Falls back to the shared badgeOffsetX/Y on first use (migration).

export function getCatBadgeOffsetX(): number {
    try {
        const s = getSettings();
        const v = (s as Record<string, unknown>)?.catBadgeOffsetX;
        return typeof v === "number" ? Math.max(-500, Math.min(1000, v)) : getBadgeOffsetX();
    } catch { return 250; }
}
export function setCatBadgeOffsetX(v: number): void {
    try { const s = getSettings(); (s as Record<string, unknown>).catBadgeOffsetX = Math.round(v); syncSettings(); } catch { /* ignore */ }
}
export function getCatBadgeOffsetY(): number {
    try {
        const s = getSettings();
        const v = (s as Record<string, unknown>)?.catBadgeOffsetY;
        return typeof v === "number" ? Math.max(-200, Math.min(1500, v)) : getBadgeOffsetY();
    } catch { return 72; }
}
export function setCatBadgeOffsetY(v: number): void {
    try { const s = getSettings(); (s as Record<string, unknown>).catBadgeOffsetY = Math.max(-200, Math.min(1500, Math.round(v))); syncSettings(); } catch { /* ignore */ }
}
export function resetCatBadgePosition(): void {
    setCatBadgeOffsetX(250);
    setCatBadgeOffsetY(72);
}

// -- Version text offset (cat mode — drawn separately from cat icon) -----------
// Independent X/Y position for the floating version label when badge style is
// "cat" and version display is enabled. Defaults: X=250, Y=95 (just below cat).

export function getVersionTextOffsetX(): number {
    try { const v = getSettings()?.versionTextOffsetX; return typeof v === "number" ? Math.max(-500, Math.min(1000, v)) : 250; } catch { return 250; }
}
export function setVersionTextOffsetX(v: number): void {
    try { const s = getSettings(); s.versionTextOffsetX = Math.round(v); syncSettings(); } catch { /* ignore */ }
}
export function getVersionTextOffsetY(): number {
    try { const v = getSettings()?.versionTextOffsetY; return typeof v === "number" ? Math.max(-200, Math.min(900, v)) : 95; } catch { return 95; }
}
export function setVersionTextOffsetY(v: number): void {
    try { const s = getSettings(); s.versionTextOffsetY = Math.round(v); syncSettings(); } catch { /* ignore */ }
}
export function resetVersionTextPosition(): void {
    setVersionTextOffsetX(250);
    setVersionTextOffsetY(95);
}

// -- Badge drag mode (in-memory only, never persisted) -------------------------
// When true: a dashed ring appears on your own badge in the chatroom canvas,
// and canvas mouse/touch events allow click-dragging the badge to reposition.
// Automatically cleared when the drag completes or the user leaves a room.
// _badgeDragStyleTarget controls WHICH badge style is being repositioned —
// 'text' moves the text badge offset, 'cat' moves the cat badge offset.

let _badgeDragMode = false;
let _badgeDragStyleTarget: "text" | "cat" = "text";
export function getBadgeDragMode(): boolean { return _badgeDragMode; }
export function setBadgeDragMode(v: boolean): void { _badgeDragMode = v; }
export function getBadgeDragStyleTarget(): "text" | "cat" { return _badgeDragStyleTarget; }
export function setBadgeDragStyleTarget(v: "text" | "cat"): void { _badgeDragStyleTarget = v; }

// -- Per-person beep mute (in-memory, session-only) ----------------------------
// Members whose beep sounds and notifications are silenced for this session.
// Does NOT affect BC's native beep handling — only suppresses EBC's IM sound.

const _mutedBeepMembers = new Set<number>();
export function isBeepMemberMuted(num: number): boolean { return _mutedBeepMembers.has(num); }
export function toggleMutedBeepMember(num: number): boolean {
    if (_mutedBeepMembers.has(num)) { _mutedBeepMembers.delete(num); return false; }
    _mutedBeepMembers.add(num); return true;
}

