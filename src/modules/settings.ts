// General EmeryBC settings — lightweight key/value flags stored in ExtensionSettings.

import { callBC, getSettings, syncSettings, getDeviceKeys, setDeviceKeys, readDeviceValue, writeDeviceValue, LOCAL_OUTFITS_KEY, LOCAL_RESTRAINTS_KEY, PER_ITEM_SETTINGS_KEYS, registerStorageLabels } from "./bcUtils";


// -- Emery Versioning (SAL sub-version display) --------------------------------
// When on, shows the internal build counter "(s3)" next to the EBC version in
// the panel header and startup log. Off by default; toggled in the DEV tab.

export function getShowSalVersion(): boolean {
    try { return getSettings()?.showSalVersion === true; } catch { return false; }
}

export function setShowSalVersion(value: boolean): void {
    try {
        const store = getSettings();
        store.showSalVersion = value;
        syncSettings();
    } catch { /* ignore */ }
}

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

// -- Auto-escape allow list ----------------------------------------------------
// People auto-escape ignores. The item whitelist answers "what may stay on me";
// this answers "who may put it there", which is the axis that was missing -
// auto-escape was all-or-nothing, so protecting your owner's collar did not
// help because they could not put it on you in the first place.

export function getAntiRestraintAllowList(): number[] {
    try {
        const list = getSettings()?.antiRestraintAllowList;
        return Array.isArray(list) ? (list as number[]) : [];
    } catch { return []; }
}

export function setAntiRestraintAllowList(members: number[]): void {
    try {
        getSettings().antiRestraintAllowList = members;
        syncSettings();
    } catch { /* ignore */ }
}

export function toggleAntiRestraintAllowed(memberNumber: number): void {
    const list = getAntiRestraintAllowList();
    setAntiRestraintAllowList(
        list.includes(memberNumber) ? list.filter(n => n !== memberNumber) : [...list, memberNumber]);
}

// -- Starred people -----------------------------------------------------------
// Member numbers highlighted with a golden star in the People in Room and
// Friends lists. This is EBC's own marker and is deliberately independent of
// BC's friend list - you can star anyone you meet, friend or not. Stored
// server-side so it persists across devices. (Storage key stays "specialFriends"
// for backward compatibility with existing saves.)

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

// -- LianChat compatibility ----------------------------------------------------
// When ON, lets BC's native beep handler run after EBC so mods like LianChat
// can piggyback on it — but this also shows beeps in BC's default chat window.

export function getLianChatCompat(): boolean {
    try { return getSettings()?.lianChatCompat === true; } catch { return false; }
}

export function setLianChatCompat(value: boolean): void {
    try {
        const store = getSettings();
        store.lianChatCompat = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Show member numbers -------------------------------------------------------
// Draws a small #number pill on every character in the chat room.

export function getShowMemberNumbers(): boolean {
    try { return getSettings()?.showMemberNumbers !== false; } catch { return true; }
}

export function setShowMemberNumbers(value: boolean): void {
    try {
        const store = getSettings();
        store.showMemberNumbers = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Last changelog version read -----------------------------------------------
// Which version's notes have already been shown, so "/ebc changelog" can show
// everything since then rather than only the newest release. Empty means it has
// never been opened, in which case the newest release alone is the honest answer.

export function getLastChangelogSeen(): string {
    try {
        const v = getSettings()?.lastChangelogSeen;
        return typeof v === "string" ? v : "";
    } catch { return ""; }
}

export function setLastChangelogSeen(version: string): void {
    try {
        getSettings().lastChangelogSeen = version;
        syncSettings();
    } catch { /* ignore */ }
}

// -- EBC button in the chat room top bar ---------------------------------------
// Puts a paw next to BC's own Exit / Kneel / Icons buttons and hides the side
// tab while you are in a room. Only while you are in a room - the top bar does
// not exist anywhere else, and hiding the tab everywhere would leave no way to
// open EBC at all. Off by default; the side tab is what people already know.

export function getTopBarButton(): boolean {
    try { return getSettings()?.topBarButton === true; } catch { return false; }
}

export function setTopBarButton(value: boolean): void {
    try {
        const store = getSettings();
        store.topBarButton = value;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Full message inbox -------------------------------------------------------
// MISSED MESSAGES only lists conversations with something unread, and vanishes
// once everything is read - so there is no way to reach an older conversation
// from the social tab at all. With this on it lists every conversation, unread
// first, and stays put. Off by default: for most people the short list that
// disappears when it is empty is the better one.

export function getInboxShowAll(): boolean {
    try { return getSettings()?.inboxShowAll === true; } catch { return false; }
}

export function setInboxShowAll(value: boolean): void {
    try { getSettings().inboxShowAll = value; syncSettings(); } catch { /* ignore */ }
}

// -- Online friend notification sound -----------------------------------------

export function getOnlineSoundEnabled(): boolean {
    try { return getSettings()?.onlineSoundEnabled !== false; } catch { return true; }
}

export function setOnlineSoundEnabled(value: boolean): void {
    try {
        const store = getSettings();
        store.onlineSoundEnabled = value;
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

// -- Beep toast duration / sticky ---------------------------------------------

export function getToastSticky(): boolean {
    try { return getSettings()?.toastSticky === true; } catch { return false; }
}

export function setToastSticky(value: boolean): void {
    try { getSettings().toastSticky = value; syncSettings(); } catch { /* ignore */ }
}

/** Returns the auto-dismiss duration in seconds (1-60). Default: 5. */
export function getToastDurationSec(): number {
    try {
        const v = getSettings()?.toastDurationSec;
        if (typeof v === "number" && v >= 1 && v <= 60) return v;
    } catch { /* ignore */ }
    return 5;
}

export function setToastDurationSec(value: number): void {
    try {
        getSettings().toastDurationSec = Math.max(1, Math.min(60, Math.round(value)));
        syncSettings();
    } catch { /* ignore */ }
}

// -- Beep sound volume ----------------------------------------------------------
// EBC's beep is a generated tone rather than a sound file, and it was noticeably
// quieter than BC's own. Stored as a percentage so the slider reads plainly.

export function getBeepVolume(): number {
    try {
        const v = getSettings().beepVolume;
        return typeof v === "number" && v >= 0 && v <= 300 ? v : 100;
    } catch { return 100; }
}

export function setBeepVolume(pct: number): void {
    try {
        getSettings().beepVolume = Math.max(0, Math.min(300, Math.round(pct)));
        syncSettings();
    } catch { /* ignore */ }
}

// -- Stored-data manager -------------------------------------------------------
// Every category of data EBC keeps on the account, so the Storage panel can show
// what is taking up space and let the user clear any of it.

export interface DataCategory {
    /** Plain-English explanation shown behind the ? in the storage list. */
    help?: string;
    label: string;
    keys: string[];
    /**
     * localStorage keys holding this category's device-stored half, for the
     * categories that can be split item by item rather than all or nothing.
     */
    localKeys?: string[];
}

export const EBC_DATA_CATEGORIES: DataCategory[] = [
    { label: "Outfits",              keys: ["outfits"], localKeys: [LOCAL_OUTFITS_KEY], help: "Every outfit you have saved, including the items, colours and settings in each one. This is usually the biggest thing EBC stores." },
    { label: "Restraint sets",       keys: ["restraints", "restraintPresets"], localKeys: [LOCAL_RESTRAINTS_KEY], help: "Saved restraint sets and their presets - the groups of items you can apply in one go." },
    { label: "Action buttons",       keys: ["buttonCategories", "actionSlotCount", "activeCategoryIndex"], help: "Your custom chat buttons, their categories, and how many slots you show." },
    { label: "Pose combos",          keys: ["poseCombos"], help: "Saved pose sequences you can play back." },
    { label: "Scenes",               keys: ["scenes"], help: "Saved scenes - scripted sequences of poses, expressions and messages." },
    { label: "Expression presets",   keys: ["expressionPresets", "defaultExprPresetId"], help: "Saved faces you can apply, plus which one is your default." },
    { label: "Expression sequences", keys: ["expressionSequences"], help: "Saved expression animations that play over time." },
    { label: "Expression triggers",  keys: ["expressionTriggers"], help: "Rules that change your face automatically when something happens." },
    { label: "Outfit tags",          keys: ["outfitTags"], help: "The coloured labels you use to sort outfits, and their colours." },
    { label: "Outfit schedules",     keys: ["outfitSchedules"], help: "Outfits set to apply automatically at a time of day." },
    { label: "Colour palettes",      keys: ["palettes", "customColors"], help: "Saved colour sets and any custom colours you mixed." },
    { label: "User notes",           keys: ["characterNotes"], help: "Private notes you have written about other people. Only you can ever see these." },
    { label: "Friend tags",          keys: ["friendTags"], help: "The labels you have put on people in your friends list." },
    { label: "Name cache",           keys: ["friendNames", "friendAccountNames"], help: "Remembered names for member numbers, so people show as names instead of numbers. Rebuilds itself as you play - safe to clear." },
    { label: "Beep history",         keys: ["beepHistory"], help: "Your saved conversations in EBC's messenger. Clearing this deletes those chats." },
    { label: "Beep groups",          keys: ["groups"], help: "Group chats you have set up in the messenger." },
    { label: "Quick replies",        keys: ["quickReplies"], help: "The canned replies that sit above the message box." },
    { label: "People met",           keys: ["peopleMet"], help: "A log of everyone you have shared a room with, and when." },
    { label: "Last seen / since",    keys: ["lastSeen", "friendSince", "lastSeenMigrated"], help: "When you last saw each friend online, and how long you have been friends." },
    { label: "Stars & watchlist",    keys: ["specialFriends", "pinnedFriends", "onlineWatchList"], help: "Who you have starred, pinned, or asked to be told about when they come online." },
    { label: "Achievements",         keys: ["achievements"], help: "Your achievement progress and which ones you have already been told about." },
    { label: "Barks",                keys: ["barks"], help: "Saved bark phrases." },
    { label: "Favorite rooms",       keys: ["favoriteRooms"], help: "Rooms you saved, including their full settings so they can be rebuilt." },
    { label: "Restraint timers",     keys: ["restraintTimers"], help: "How long each item you are wearing has been on. Feeds the bound timer." },
    { label: "Dom config",           keys: ["domConfig"], help: "Your dom tool setup - targets and saved restraint sets for them." },
];

// The storage warning lives in bcUtils, which cannot import this module without
// a cycle, so the labels are handed over instead. Built from the categories
// above so the warning names things exactly as the Storage panel does.
registerStorageLabels((() => {
    const out: Record<string, string> = {};
    for (const cat of EBC_DATA_CATEGORIES) for (const k of cat.keys) out[k] = cat.label;
    return out;
})());

// ── Backup: export / import ──────────────────────────────────────────────────
// Storage-agnostic on purpose. Export reads the in-memory store, which already
// holds per-key device-stored data (pulled in at login), so a backup covers
// cache and account data alike. Import writes back into the same store and lets
// the normal flush decide where each key belongs on THIS device - so a backup
// taken with everything in cache restores correctly on a machine that keeps the
// same categories on the account, and the other way round.
//
// Outfits and restraint sets are the exception: they are moved to the device one
// item at a time, so their device half is a separate list in localStorage that
// never passes through the settings store. It has to be read and written
// directly, which is what `local` below is for. Leaving it out meant anyone who
// followed the "switch outfits to This device storage" advice - given by EBC
// itself when the account fills up - then took a backup got a file with those
// outfits missing, and lost them the moment they cleared their cache.

export interface EBCBackup {
    ebcBackup: 1;
    ts: number;
    categories: string[];
    data: Record<string, unknown>;
    /** Device-stored lists, by localStorage key. Absent in older backups. */
    local?: Record<string, unknown>;
}

/** Every localStorage key any category declares - the import whitelist. */
function knownLocalKeys(): Set<string> {
    const out = new Set<string>();
    for (const cat of EBC_DATA_CATEGORIES) for (const k of cat.localKeys ?? []) out.add(k);
    return out;
}

function readLocalRaw(key: string): unknown {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const v = JSON.parse(raw) as unknown;
        return Array.isArray(v) && v.length === 0 ? null : v;
    } catch { return null; }
}

/** Serialises the given categories. Keys holding nothing are skipped. */
export function exportDataCategories(cats: DataCategory[]): string {
    const store = getSettings() as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    const local: Record<string, unknown> = {};
    const labels: string[] = [];
    for (const cat of cats) {
        let any = false;
        for (const k of cat.keys) {
            const v = store[k];
            if (v === undefined || v === null) continue;
            data[k] = v;
            any = true;
        }
        // The device half, straight from localStorage. A category can be
        // entirely device-stored, so this alone is enough to count as present.
        for (const k of cat.localKeys ?? []) {
            const v = readLocalRaw(k);
            if (v === null) continue;
            local[k] = v;
            any = true;
        }
        if (any) labels.push(cat.label);
    }
    const backup: EBCBackup = { ebcBackup: 1, ts: Date.now(), categories: labels, data };
    if (Object.keys(local).length > 0) backup.local = local;
    return JSON.stringify(backup);
}

export function exportAllData(): string {
    return exportDataCategories(EBC_DATA_CATEGORIES);
}

/**
 * Restores a backup. Only keys belonging to a known category are written - a
 * pasted file can never introduce settings EBC does not already define.
 * Returns what was restored, and which keys were ignored, so the UI can be
 * honest about a partial import rather than claiming success.
 */
export function importDataBackup(json: string): { categories: string[]; keys: number; skipped: string[] } {
    const parsed = JSON.parse(json) as Partial<EBCBackup>;
    if (!parsed || parsed.ebcBackup !== 1 || typeof parsed.data !== "object" || parsed.data === null) {
        throw new Error("Not an EBC backup file.");
    }
    const known = new Map<string, DataCategory>();
    for (const cat of EBC_DATA_CATEGORIES) for (const k of cat.keys) known.set(k, cat);

    const store = getSettings() as Record<string, unknown>;
    const touched = new Set<string>();
    const skipped: string[] = [];
    let keys = 0;
    for (const [k, v] of Object.entries(parsed.data as Record<string, unknown>)) {
        const cat = known.get(k);
        if (!cat) { skipped.push(k); continue; }
        if (v === undefined) continue;
        store[k] = v;
        touched.add(cat.label);
        keys++;
    }

    // Device-stored lists go back to localStorage, not to the account - restoring
    // them into account storage is what the user moved them out of to begin with,
    // and on a full account it would simply be refused.
    if (parsed.local && typeof parsed.local === "object") {
        const allowed = knownLocalKeys();
        const byLocalKey = new Map<string, DataCategory>();
        for (const cat of EBC_DATA_CATEGORIES) for (const lk of cat.localKeys ?? []) byLocalKey.set(lk, cat);
        for (const [k, v] of Object.entries(parsed.local as Record<string, unknown>)) {
            if (!allowed.has(k)) { skipped.push(k); continue; }
            if (v === undefined || v === null) continue;
            try { localStorage.setItem(k, JSON.stringify(v)); } catch { skipped.push(k); continue; }
            const cat = byLocalKey.get(k);
            if (cat) touched.add(cat.label);
            keys++;
        }
    }

    if (keys > 0) syncSettings();
    return { categories: [...touched], keys, skipped };
}

/** Serialized size (chars ~ bytes) of one category's data. */
export function getDataCategorySize(cat: DataCategory): number {
    try {
        const store = getSettings() as Record<string, unknown>;
        let n = 0;
        for (const k of cat.keys) {
            const v = store[k];
            if (v === undefined || v === null) continue;
            n += JSON.stringify(v).length + k.length + 4;
        }
        // Plus the device-stored half. Outfits moved to this device leave the
        // account key empty, so counting only that would report a full library
        // as 0 KB - the one number most likely to be checked after moving it.
        for (const k of cat.localKeys ?? []) {
            try { n += localStorage.getItem(k)?.length ?? 0; } catch { /* ignore */ }
        }
        return n;
    } catch { return 0; }
}

/** Categories that usually make more sense kept on this device only - big,
 *  browser-local value with little benefit from syncing. Purely a suggestion
 *  shown in the UI; nothing is moved automatically. */
export const DEVICE_SUGGESTED = new Set([
    "Beep history", "Name cache", "People met", "Last seen / since", "Barks",
]);

/** "account" when every key of the category syncs, "device" when they are all
 *  local, "mixed" if the category was split by hand. */
export function getDataCategoryLocation(cat: DataCategory): "account" | "device" | "mixed" {
    const dev = getDeviceKeys();
    const on = cat.keys.filter(k => dev.has(k)).length;
    if (on === 0) return "account";
    if (on === cat.keys.length) return "device";
    return "mixed";
}

/** Size of this category's data as currently held in memory. */
export function getDataCategoryDeviceSize(cat: DataCategory): number {
    let n = 0;
    for (const k of cat.keys) {
        const v = readDeviceValue(k);
        if (v === null || v === undefined) continue;
        try { n += JSON.stringify(v).length + k.length + 4; } catch { /* ignore */ }
    }
    // Per-item device lists count too - they are device storage by any measure,
    // and this figure is quoted back to the user before they move a category.
    for (const k of cat.localKeys ?? []) {
        try { n += localStorage.getItem(k)?.length ?? 0; } catch { /* ignore */ }
    }
    return n;
}

/** Moves a whole category between the BC account and this browser.
 *  The in-memory values are kept, so whichever device performs the switch is the
 *  copy that becomes authoritative - the UI warns about this before calling. */
export function setDataCategoryLocation(cat: DataCategory, loc: "account" | "device"): void {
    try {
        const dev = getDeviceKeys();
        const store = getSettings() as Record<string, unknown>;
        for (const k of cat.keys) {
            // Outfits and restraint sets are moved per item, not per key. Doing
            // both leaves two mechanisms disagreeing, and the flush nulls the
            // account copy of any device key - which is how a library ended up
            // stranded on one browser while the button said it was on the
            // account. Refused here as well as routed around in the UI, so a
            // future caller cannot reopen it.
            if (PER_ITEM_SETTINGS_KEYS.includes(k)) continue;
            if (loc === "device") {
                dev.add(k);
                writeDeviceValue(k, store[k] ?? null);
            } else {
                dev.delete(k);
                // Pull the device copy into memory so it is what gets uploaded,
                // then drop the local copy.
                const local = readDeviceValue(k);
                if (local !== null) store[k] = local;
                writeDeviceValue(k, null);
            }
        }
        setDeviceKeys(dev);
        syncSettings();
    } catch { /* ignore */ }
}

/** Clears a category. Values are set to null rather than deleted: the settings
 *  flush only COPIES keys to the server and never removes them, so a deleted key
 *  would keep its old (large) server value. */
export function clearDataCategory(cat: DataCategory): void {
    try {
        const store = getSettings() as Record<string, unknown>;
        const dev = getDeviceKeys();
        for (const k of cat.keys) {
            store[k] = null;
            if (dev.has(k)) writeDeviceValue(k, null);
        }
        // And the device half. Clearing Outfits used to leave every outfit you
        // had moved to this device sitting there, so the list came straight back
        // and the button looked broken.
        for (const k of cat.localKeys ?? []) {
            try { localStorage.removeItem(k); } catch { /* ignore */ }
        }
        syncSettings();
    } catch { /* ignore */ }
}

// -- Quick actions placement ---------------------------------------------------
// false (default) = Release Restraints / Remove Locks / restraint picker stay
// pinned above every tab. true = they move into the Buttons tab as their own
// pill, freeing that vertical space everywhere else.

export function getQuickActionsInButtons(): boolean {
    try { return getSettings()?.quickActionsInButtons === true; } catch { return false; }
}

export function setQuickActionsInButtons(v: boolean): void {
    try { getSettings().quickActionsInButtons = v; syncSettings(); } catch { /* ignore */ }
}

// -- Users tab layout ----------------------------------------------------------
// "tabs"    = sections split behind pill sub-navigation (less clutter)
// "classic" = every section stacked on one long page (the original layout)

export function getUsersLayout(): "tabs" | "classic" {
    try { return getSettings()?.usersLayout === "classic" ? "classic" : "tabs"; } catch { return "tabs"; }
}

export function setUsersLayout(v: "tabs" | "classic"): void {
    try { getSettings().usersLayout = v; syncSettings(); } catch { /* ignore */ }
}

// -- Favorite rooms ------------------------------------------------------------
// Rooms the user saved for one-click joining from the Users tab. Each entry is a
// full snapshot of the room's settings (description, admins, background, limits,
// visibility, custom data...) so the room can be RECREATED when it is closed.
// Old saves were plain name strings - normalized to { name } on read.

export interface FavoriteRoomData {
    name: string;
    description?: string;
    background?: string;
    limit?: number;
    admin?: number[];
    ban?: number[];
    whitelist?: number[];
    blockCategory?: string[];
    game?: string;
    language?: string;
    space?: string;
    visibility?: unknown;   // stored verbatim - shape differs across BC versions
    access?: unknown;
    custom?: unknown;       // custom background / theme data
    mapData?: unknown;      // map-room tiles (only stored when reasonably small)
    savedAt?: number;
}

export function getFavoriteRooms(): FavoriteRoomData[] {
    try {
        const v = getSettings()?.favoriteRooms;
        if (!Array.isArray(v)) return [];
        return (v as unknown[]).map((e): FavoriteRoomData | null => {
            if (typeof e === "string") return e.trim() ? { name: e.trim() } : null;
            if (e && typeof e === "object" && typeof (e as { name?: unknown }).name === "string" && ((e as { name: string }).name).trim()) {
                return e as FavoriteRoomData;
            }
            return null;
        }).filter((x): x is FavoriteRoomData => x !== null);
    } catch { return []; }
}

export function setFavoriteRooms(rooms: FavoriteRoomData[]): void {
    try {
        getSettings().favoriteRooms = rooms.slice(0, 30);
        syncSettings();
    } catch { /* ignore */ }
}

// Auto-refresh: while the player is inside a favorited room, its saved snapshot
// silently keeps itself up to date (description edits, admin changes, new
// background...). Throttled, and only writes when something actually changed so
// the server sync isn't spammed.
let _lastFavSnapshotCheck = 0;

export function autoUpdateFavoriteSnapshot(force = false): void {
    try {
        const now = Date.now();
        if (!force && now - _lastFavSnapshotCheck < 30_000) return;
        _lastFavSnapshotCheck = now;
        const snap = captureCurrentRoomSnapshot();
        if (!snap) {
            if (force) try { console.info("[EBC] Snapshot check: no room data (not in a room?)"); } catch { /* ignore */ }
            return;
        }
        const favs = getFavoriteRooms();
        const idx = favs.findIndex(r => r.name.toLowerCase() === snap.name.toLowerCase());
        if (idx === -1) {
            if (force) try { console.info(`[EBC] Snapshot check: room "${snap.name}" is not in favorites`); } catch { /* ignore */ }
            return;
        }
        // Compare without the volatile savedAt stamp - identical rooms mean no write.
        const stored = JSON.stringify({ ...favs[idx], savedAt: 0 });
        const fresh  = JSON.stringify({ ...snap,      savedAt: 0 });
        if (stored === fresh) {
            if (force) try { console.info(`[EBC] Snapshot check: "${snap.name}" unchanged`); } catch { /* ignore */ }
            return;
        }
        favs[idx] = snap;
        setFavoriteRooms(favs);
        try { console.info("[EBC] Favorite snapshot updated:", snap.name, JSON.parse(JSON.stringify(snap))); } catch { /* ignore */ }
    } catch (err) {
        try { console.warn("[EBC] Snapshot check failed:", err); } catch { /* ignore */ }
    }
}

/** Snapshots the current room's full settings for later rebuild.
 *  Returns null when not in a room (no ChatRoomData). */
export function captureCurrentRoomSnapshot(): FavoriteRoomData | null {
    try {
        const w = window as unknown as Record<string, unknown>;
        const d = w.ChatRoomData as Record<string, unknown> | null | undefined;
        if (!d || typeof d.Name !== "string" || !d.Name.trim()) return null;
        const str    = (x: unknown): string | undefined => typeof x === "string" ? x : undefined;
        const num    = (x: unknown): number | undefined => typeof x === "number" ? x : undefined;
        const numArr = (x: unknown): number[] | undefined => Array.isArray(x) ? x.filter((n): n is number => typeof n === "number") : undefined;
        const strArr = (x: unknown): string[] | undefined => Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : undefined;

        const out: FavoriteRoomData = { name: d.Name.trim() };
        const desc = str(d.Description);  if (desc !== undefined) out.description = desc.slice(0, 300);
        const bg   = str(d.Background);   if (bg   !== undefined) out.background = bg;
        const lim  = num(d.Limit);        if (lim  !== undefined) out.limit = lim;
        const adm  = numArr(d.Admin);     if (adm)                out.admin = adm.slice(0, 50);
        const ban  = numArr(d.Ban);       if (ban)                out.ban = ban.slice(0, 100);
        const wl   = numArr(d.Whitelist); if (wl)                 out.whitelist = wl.slice(0, 100);
        const bc   = strArr(d.BlockCategory); if (bc)             out.blockCategory = bc;
        const game = str(d.Game);         if (game !== undefined) out.game = game;
        const lang = str(d.Language);     if (lang !== undefined) out.language = lang;
        const spc  = str(d.Space);        if (spc  !== undefined) out.space = spc;
        if (d.Visibility !== undefined) out.visibility = d.Visibility;
        if (d.Access     !== undefined) out.access = d.Access;
        if (d.Custom     !== undefined) out.custom = d.Custom;
        // Map tile data can be huge - only keep it when it stays well under the
        // ExtensionSettings size budget.
        if (d.MapData !== undefined) {
            try { if (JSON.stringify(d.MapData).length <= 20000) out.mapData = d.MapData; } catch { /* skip */ }
        }
        out.savedAt = Date.now();
        return out;
    } catch { return null; }
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
    try { return getSettings()?.actionButtonsVisible === true; } catch { return false; }
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

