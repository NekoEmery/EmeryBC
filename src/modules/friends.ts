// Friends system — tags, beep history, name cache.
// All data stored in Player.ExtensionSettings.EmeryBC and synced to server
// so it's available across devices on next login.

import { db } from "./db";
import { getSettings, syncSettings } from "./bcUtils";

/**
 * Some BC mods (WCE, FBC, etc.) append metadata to beep messages in two forms:
 *   1. A JSON blob:  "hiya {"messageType":"Message","messageColor":"#EFB0E2"}"
 *   2. A private-use Unicode separator (U+E000–U+F8FF, e.g. U+E001) followed by
 *      the JSON, leaving a □ box character when only partially stripped.
 * Strip both so we display only the plain text.
 */
export function stripBeepMetadata(msg: string): string {
    // Pass 1 — strip trailing JSON metadata object appended by WCE/FBC/etc.
    // e.g. "hey {"messageType":"Message","messageColor":"#EFB0E2"}"
    const idx = msg.lastIndexOf("{");
    if (idx > 0) {
        try {
            const tail = msg.slice(idx).trim();
            const parsed = JSON.parse(tail);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                msg = msg.slice(0, idx).trim();
            }
        } catch { /* not valid JSON */ }
    }
    // Pass 2 — strip private-use area Unicode separators (U+E000..U+F8FF and
    // supplementary PUA as surrogate pairs) that mods insert before their metadata.
    // These render as hollow squares (□) in most fonts.
    msg = msg.replace(/[-][\s\S]*$/, "").trim();
    msg = msg.replace(/[\uDB80-\uDBFF][\uDC00-\uDFFF][\s\S]*$/, "").trim();
    // Pass 3 — strip EBC group routing tags.
    msg = msg.replace(/\n\[EBC Group "[^"]*" #[a-z0-9]{6}\]$/, "").trim();
    return msg;
}

export interface BeepEntry {
    from: number;       // sender member number
    to: number;         // recipient member number
    message: string;
    ts: number;         // unix ms timestamp
}


let syncTimer: ReturnType<typeof setTimeout> | null = null;
function sync(): void {
    if (syncTimer !== null) return; // already queued
    syncTimer = setTimeout(() => {
        syncTimer = null;
        syncSettings();
    }, 2000);
}

// -- Name cache ----------------------------------------------------------------

export function getCachedNames(): Record<string, string> {
    const v = getSettings().friendNames;
    return (v && typeof v === "object" && !Array.isArray(v)) ? v as Record<string, string> : {};
}

export function cacheName(memberNumber: number, name: string): void {
    const store = getSettings();
    if (!store.friendNames || typeof store.friendNames !== "object") store.friendNames = {};
    (store.friendNames as Record<string, string>)[String(memberNumber)] = name;
    // Sync is deferred — name cache is saved alongside the next real operation
}

// -- Account name cache --------------------------------------------------------
// Stores the raw BC account name (.Name) separately from the display name
// (.Nickname). When a person uses a nickname, both are preserved so the
// friends list can show "Nickname (AccountName)" for easy identification.

export function getCachedAccountNames(): Record<string, string> {
    const v = getSettings().friendAccountNames;
    return (v && typeof v === "object" && !Array.isArray(v)) ? v as Record<string, string> : {};
}

export function cacheAccountName(memberNumber: number, accountName: string): void {
    const store = getSettings();
    if (!store.friendAccountNames || typeof store.friendAccountNames !== "object") store.friendAccountNames = {};
    (store.friendAccountNames as Record<string, string>)[String(memberNumber)] = accountName;
}

/** Returns the cached BC account name for this member, or null if unknown. */
export function getAccountName(memberNumber: number): string | null {
    return getCachedAccountNames()[String(memberNumber)] ?? null;
}

export function flushNameCache(): void { sync(); }

export function resolveName(memberNumber: number): string {
    try {
        const room = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
            Array<{ MemberNumber?: number; Nickname?: string; Name?: string }> | undefined;
        const char = room?.find(c => c.MemberNumber === memberNumber);
        if (char) {
            const accountName = char.Name ?? "";
            const nickname    = char.Nickname?.trim() ?? "";
            // Always cache the raw account name so we can show it alongside nicknames
            if (accountName) cacheAccountName(memberNumber, accountName);
            const name = nickname || accountName || String(memberNumber);
            cacheName(memberNumber, name);
            return name;
        }
    } catch { /* ignore */ }
    return getCachedNames()[String(memberNumber)] ?? `#${memberNumber}`;
}

// -- Friend list ---------------------------------------------------------------

export function getFriendList(): number[] {
    try {
        const fl = Player.FriendList;
        return Array.isArray(fl) ? [...(fl as number[])] : [];
    } catch { return []; }
}

// BC R128 AccountQueryResult (Query: "OnlineFriends") only sends:
//   Type (relationship type = "Friend"), MemberNumber, MemberName,
//   ChatRoomSpace, ChatRoomName
// Privacy, lock state, full state, language, game and count are NOT provided.
export interface FriendOnlineInfo {
    roomName?: string;
    roomSpace?: string;
}

// Set of member numbers BC reports as online (updated via AccountQueryResult hook)
const onlineSet = new Set<number>();
const onlineInfo = new Map<number, FriendOnlineInfo>();

// Messages sent while recipient was offline — re-delivered when they come online.
// BC's server drops beeps to offline players, so we queue them here and resend
// once we detect the recipient came online via AccountQueryResult.
const pendingOfflineMessages = new Map<number, string[]>();

function markPendingMessage(memberNumber: number, message: string): void {
    if (onlineSet.has(memberNumber)) return;
    const queue = pendingOfflineMessages.get(memberNumber) ?? [];
    queue.push(message);
    pendingOfflineMessages.set(memberNumber, queue);
}

// Session cache: EBC version for members we've shared a room with this session
const ebcVersionCache = new Map<number, string>();

export function cacheEBCVersion(memberNumber: number, version: string): void {
    ebcVersionCache.set(memberNumber, version);
}

export function getEBCVersion(memberNumber: number): string | null {
    return ebcVersionCache.get(memberNumber) ?? null;
}

export function updateOnlineFriends(entries: Array<Record<string, unknown>>): void {
    const prevOnline = new Set(onlineSet);
    onlineSet.clear();
    onlineInfo.clear();
    for (const r of entries) {
        const n = typeof r.MemberNumber === "number" ? r.MemberNumber : 0;
        if (!n) continue;
        onlineSet.add(n);
        onlineInfo.set(n, {
            roomName:  typeof r.ChatRoomName  === "string" ? r.ChatRoomName  : undefined,
            roomSpace: typeof r.ChatRoomSpace === "string" ? r.ChatRoomSpace : undefined,
        });
    }
    // Record last-seen for anyone who just went offline — batched into a single
    // ServerPlayerExtensionSettingsSync call to avoid rate-limiting on large rooms.
    const nowOffline = [...prevOnline].filter(num => !onlineSet.has(num));
    if (nowOffline.length > 0) {
        try {
            const store = getSettings();
            const data = getLastSeenMap();
            const now = Date.now();
            for (const num of nowOffline) data[String(num)] = now;
            evictLastSeen(data);
            store.lastSeen = data;
            sync();
        } catch { /* ignore */ }
    }

    // Re-deliver any messages that were sent while the recipient was offline.
    // BC drops beeps to offline players, so we resend the originals now that they're back.
    for (const [num, msgs] of pendingOfflineMessages) {
        if (onlineSet.has(num) && !prevOnline.has(num)) {
            pendingOfflineMessages.delete(num);
            try {
                for (const msg of msgs) {
                    ServerSend("AccountBeep", { MemberNumber: num, BeepType: "", IsSecret: true, Message: msg });
                }
            } catch { /* ignore */ }
        }
    }
}

export function getFriendOnlineInfo(memberNumber: number): FriendOnlineInfo | undefined {
    return onlineInfo.get(memberNumber);
}

export type FriendStatus = "room" | "online" | "away";

export function getFriendStatus(memberNumber: number): FriendStatus {
    try {
        const room = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
            Array<{ MemberNumber?: number }> | undefined;
        if (room?.some(c => c.MemberNumber === memberNumber)) return "room";
    } catch { /* ignore */ }
    if (onlineSet.has(memberNumber)) return "online";
    return "away";
}

// -- Last seen -----------------------------------------------------------------
// Stored in Player.ExtensionSettings.EmeryBC.lastSeen (server-synced, cross-device).
// On first load, existing localStorage data is merged in so no history is lost
// (localStorage values only fill gaps; server data always wins for conflicts).
// Capped at 300 entries — oldest timestamps are evicted when over cap.

const EBC_LAST_SEEN_LEGACY_KEY = "EBC_lastSeen"; // legacy localStorage key (migration only)
const LAST_SEEN_CAP = 300;

function getLastSeenMap(): Record<string, number> {
    try {
        const store = getSettings();
        // One-time migration from localStorage → ExtensionSettings
        if (!store.lastSeenMigrated) {
            try {
                const raw = localStorage.getItem(EBC_LAST_SEEN_LEGACY_KEY);
                if (raw) {
                    const p = JSON.parse(raw) as unknown;
                    if (p && typeof p === "object" && !Array.isArray(p)) {
                        const existing: Record<string, number> =
                            (store.lastSeen && typeof store.lastSeen === "object" && !Array.isArray(store.lastSeen))
                            ? (store.lastSeen as Record<string, number>)
                            : {};
                        for (const [k, v] of Object.entries(p as Record<string, unknown>)) {
                            if (typeof v === "number" && !(k in existing)) existing[k] = v;
                        }
                        store.lastSeen = existing;
                    }
                }
            } catch { /* ignore */ }
            store.lastSeenMigrated = true;
            // Sync will happen on the next recordLastSeen() call
        }
        const v = store.lastSeen;
        if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, number>;
        if (!store.lastSeen) store.lastSeen = {};
        return store.lastSeen as Record<string, number>;
    } catch { /* ignore */ }
    return {};
}

function evictLastSeen(data: Record<string, number>): void {
    const entries = Object.entries(data);
    if (entries.length <= LAST_SEEN_CAP) return;
    entries.sort((a, b) => a[1] - b[1]); // oldest first
    const toEvict = entries.length - LAST_SEEN_CAP;
    for (let i = 0; i < toEvict; i++) delete data[entries[i][0]];
}

export function recordLastSeen(memberNumber: number): void {
    try {
        const store = getSettings();
        const data = getLastSeenMap();
        data[String(memberNumber)] = Date.now();
        evictLastSeen(data);
        store.lastSeen = data;
        sync();
    } catch { /* ignore */ }
}

export function getLastSeen(memberNumber: number): number | null {
    try {
        const data = getLastSeenMap();
        const ts = data[String(memberNumber)];
        return typeof ts === "number" ? ts : null;
    } catch { return null; }
}

// -- Friend since --------------------------------------------------------------
// Records the first time EBC observed each member number in Player.FriendList.
// Stored in ExtensionSettings.EmeryBC.friendSince (server-synced, cross-device).
// Call syncFriendsSince() each time the friend list is freshly available
// (e.g. on AccountQueryResult) so newly added friends are recorded promptly.

export function syncFriendsSince(): void {
    try {
        const store = getSettings();
        if (!store.friendSince || typeof store.friendSince !== "object" || Array.isArray(store.friendSince)) {
            store.friendSince = {};
        }
        const map = store.friendSince as Record<string, number>;
        const fl = getFriendList();
        let changed = false;
        const now = Date.now();
        for (const num of fl) {
            const key = String(num);
            if (!map[key]) {
                map[key] = now;
                changed = true;
            }
        }
        if (changed) sync();
    } catch { /* ignore */ }
}

export function getFriendSince(memberNumber: number): number | null {
    try {
        const store = getSettings();
        if (!store.friendSince || typeof store.friendSince !== "object" || Array.isArray(store.friendSince)) {
            store.friendSince = {};
        }
        const map = store.friendSince as Record<string, number>;
        const key = String(memberNumber);
        if (typeof map[key] === "number") return map[key];
        // No record yet — stamp right now if they're actually in our friend list
        // (covers friends added before this EBC version and any timing gaps)
        if (getFriendList().includes(memberNumber)) {
            map[key] = Date.now();
            sync();
            return map[key];
        }
        return null;
    } catch { return null; }
}

export function formatLastSeen(ts: number): string {
    const diff = Date.now() - ts;
    const sec  = Math.floor(diff / 1000);
    const min  = Math.floor(sec  / 60);
    const hr   = Math.floor(min  / 60);
    const day  = Math.floor(hr   / 24);
    if (sec < 60)  return "just now";
    if (min < 60)  return `${min}m ago`;
    if (hr  < 24)  return `${hr}h ago`;
    if (day === 1) return "yesterday";
    const d = new Date(ts);
    if (day < 7)   return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

// -- Pinned friends ------------------------------------------------------------

export function getPinnedFriends(): number[] {
    const v = getSettings().pinnedFriends;
    return Array.isArray(v) ? (v as number[]) : [];
}

export function isFriendPinned(memberNumber: number): boolean {
    return getPinnedFriends().includes(memberNumber);
}

export function togglePinFriend(memberNumber: number): boolean {
    const store = getSettings();
    const list = getPinnedFriends();
    const idx = list.indexOf(memberNumber);
    if (idx >= 0) list.splice(idx, 1);
    else list.unshift(memberNumber);
    store.pinnedFriends = list;
    sync();
    return idx < 0; // true = now pinned
}

// -- Tags ----------------------------------------------------------------------

export interface FriendTag {
    text: string;
    color: string; // hex e.g. "#cf6f98"
    locked?: true;  // hardcoded system tag — never stored, never removable
}

// Hardcoded entries that are permanently shown for specific members regardless of
// whether they are in Player.FriendList. Tags cannot be removed or stored.
//
// viewerOnly: if set, the entry is only active when Player.MemberNumber equals
// this value — so each side of a relationship sees only the tag meant for them.
interface LockedEntry {
    tag: FriendTag;
    displayName: string; // fallback display name when not in room / name cache
    viewerOnly?: number; // restrict to a specific player's client (optional)
}

const LOCKED_ENTRIES = new Map<number, LockedEntry>([
    // On Lucy's client (#230466) only: Emery (#130267) shows ♛ Mistress
    [130267, {
        tag:         { text: "♛ Mistress", color: "#FFD700", locked: true },
        displayName: "Emery",
        viewerOnly:  230466,
    }],
]);

/** Whether a locked entry is active for the currently logged-in player. */
function lockedEntryActive(entry: LockedEntry): boolean {
    try {
        if (entry.viewerOnly === undefined) return true;
        return Player?.MemberNumber === entry.viewerOnly;
    } catch { return false; }
}

/**
 * Returns the locked (permanent, non-removable) tag for a member, or null if none.
 */
export function getLockedTag(memberNumber: number): FriendTag | null {
    const entry = LOCKED_ENTRIES.get(memberNumber);
    if (!entry || !lockedEntryActive(entry)) return null;
    return entry.tag;
}

/**
 * Returns every member number that has a locked tag entry visible to the
 * current player, mapped to their hardcoded fallback display name.
 */
export function getLockedTagMembers(): Map<number, string> {
    const out = new Map<number, string>();
    for (const [num, entry] of LOCKED_ENTRIES) {
        if (lockedEntryActive(entry)) out.set(num, entry.displayName);
    }
    return out;
}

function migrateTagValue(v: unknown): FriendTag[] {
    if (Array.isArray(v)) return v as FriendTag[];
    if (typeof v === "string" && v.trim()) return [{ text: v.trim(), color: "#cf6f98" }];
    return [];
}

export function getFriendTagList(memberNumber: number): FriendTag[] {
    const store = getSettings();
    const raw = store.friendTags;
    const userTags: FriendTag[] = (!raw || typeof raw !== "object" || Array.isArray(raw))
        ? []
        : migrateTagValue((raw as Record<string, unknown>)[String(memberNumber)]);
    // Locked tag always comes first and is never stored — prepend it at read time.
    // getLockedTag() already checks viewerOnly, so no extra filter needed here.
    const lockedTag = getLockedTag(memberNumber);
    return lockedTag ? [lockedTag, ...userTags] : userTags;
}

export function setFriendTagList(memberNumber: number, tagList: FriendTag[]): void {
    // Strip any locked tags before saving — they must never enter storage
    const toSave = tagList.filter(t => !t.locked);
    const store = getSettings();
    if (!store.friendTags || typeof store.friendTags !== "object") store.friendTags = {};
    const tags = store.friendTags as Record<string, unknown>;
    if (toSave.length > 0) tags[String(memberNumber)] = toSave;
    else delete tags[String(memberNumber)];
    sync();
}

// -- Beep history --------------------------------------------------------------

const MAX_ENTRIES = 300;

export function getBeepHistory(): BeepEntry[] {
    const v = getSettings().beepHistory;
    return Array.isArray(v) ? (v as BeepEntry[]) : [];
}

export function addBeepEntry(entry: BeepEntry): void {
    const store = getSettings();
    const history = getBeepHistory();
    history.push(entry);
    if (history.length > MAX_ENTRIES) history.splice(0, history.length - MAX_ENTRIES);
    store.beepHistory = history;
    sync();
}

export function getConversation(memberNumber: number): BeepEntry[] {
    const self = Player.MemberNumber ?? 0;
    return getBeepHistory().filter(e =>
        (e.from === memberNumber && e.to === self) ||
        (e.from === self && e.to === memberNumber),
    );
}

// -- Character bundle store ----------------------------------------------------
// Stores stripped raw server bundles so profiles can be opened via CharacterLoadOnline.
//
// Two tiers:
//   1. sessionCharacterBundles (Map) — fast in-memory, current session only.
//   2. localStorage (EBC_bundle_<num>) — persists across reloads so People Met
//      entries from previous sessions can also open their profile.
//
// We hook ChatRoomSync/SyncSingle/MemberJoin (matching WCE) rather than
// CharacterRefresh because only those fire with the raw server-format bundle
// (string `ID` field, raw Appearance array) that CharacterLoadOnline expects.
//
// Large / privacy-sensitive fields are stripped before storage.

const BUNDLE_STRIP_FIELDS = [
    "Inventory", "BlockItems", "LimitedItems", "FavoriteItems",
    "ActivePose", "ArousalSettings", "OnlineSharedSettings",
    "WhiteList", "BlackList", "Crafting",
];

// Tier 1: fast in-memory cache for the current session.
const sessionCharacterBundles = new Map<number, unknown>();

/**
 * Store the raw server bundle for an online character.
 * Input must already be a plain deep-copied object (caller used structuredClone).
 * Session cache is updated synchronously; IndexedDB write is fire-and-forget async.
 */
export function storeRawBundle(data: unknown): void {
    try {
        const d = data as Record<string, unknown>;
        const num = typeof d.MemberNumber === "number" ? d.MemberNumber : 0;
        if (!num) return;
        // Shallow-clone and strip large/sensitive fields before storing
        const bundle: Record<string, unknown> = { ...d };
        for (const f of BUNDLE_STRIP_FIELDS) delete bundle[f];
        // Tier 1: session memory (sync — always available immediately)
        sessionCharacterBundles.set(num, bundle);
        // Tier 2: IndexedDB via Dexie (async, fire-and-forget — no localStorage quota risk)
        db.bundles.put({ num, data: bundle, ts: Date.now() }).catch(() => {});
    } catch { /* ignore */ }
}

/**
 * Retrieve a stored bundle. Checks the session cache first (sync-fast path),
 * then falls back to IndexedDB for bundles from previous sessions.
 */
export async function getCharacterBundle(memberNumber: number): Promise<unknown | null> {
    // Tier 1: session memory
    const mem = sessionCharacterBundles.get(memberNumber);
    if (mem != null) return mem;
    // Tier 2: IndexedDB (previous sessions)
    try {
        const row = await db.bundles.get(memberNumber);
        if (row) {
            sessionCharacterBundles.set(memberNumber, row.data); // promote to session cache
            return row.data;
        }
    } catch { /* ignore */ }
    return null;
}

// -- Sending -------------------------------------------------------------------

export function sendBeep(memberNumber: number, message: string): void {
    // Queue the message for re-delivery if the recipient is currently offline.
    // BC drops beeps to offline players, so we resend when they come online.
    markPendingMessage(memberNumber, message);
    try {
        // IsSecret: false tells the BC server to include the sender's current room
        // in the beep it delivers to the recipient, so they see "in room X" with a
        // join button.  The server derives the room name itself — sending ChatRoomName
        // from the client has no effect; only IsSecret matters.
        ServerSend("AccountBeep", { MemberNumber: memberNumber, Message: message, BeepType: "", IsSecret: false });
    } catch { /* ignore */ }
    addBeepEntry({
        from: Player.MemberNumber ?? 0,
        to: memberNumber,
        message,
        ts: Date.now(),
    });
}


// =============================================================================
// Group chats
// Group messages are broadcast to all members as individual beeps, with an EBC
// routing tag appended so EBC users can route them to the group window.
// Non-EBC users see: "message text\n[EBC Group "Name" #id]" — readable enough.
// =============================================================================

export interface EBCGroup {
    id: string;        // 6-char random alphanumeric routing ID
    name: string;      // display name chosen by creator
    members: number[]; // member numbers (does not include self)
}

export interface GroupBeepEntry {
    from: number;   // sender's member number; 0 means sent by self this session
    message: string;
    ts: number;
}

// In-session group message history (not persisted — groups definitions are)
const _groupHistory = new Map<string, GroupBeepEntry[]>();

const GROUP_TAG_RE = /\n\[EBC Group "([^"]*)" #([a-z0-9]{6})\]$/;

export function makeGroupId(): string {
    return Math.random().toString(36).slice(2, 8).padEnd(6, "0");
}

export function encodeGroupTag(id: string, name: string): string {
    const safe = name.replace(/"/g, "'").slice(0, 24);
    return `\n[EBC Group "${safe}" #${id}]`;
}

/** Returns null if the message contains no group tag.
 *  Otherwise returns the parsed group id/name and the clean message body. */
export function extractGroupTag(raw: string): { id: string; name: string; body: string } | null {
    const m = GROUP_TAG_RE.exec(raw);
    if (!m) return null;
    return { name: m[1], id: m[2], body: raw.slice(0, m.index).trim() };
}

export function getGroups(): EBCGroup[] {
    try {
        const d = getSettings().groups;
        if (Array.isArray(d)) return d as EBCGroup[];
    } catch { /* ignore */ }
    return [];
}

export function saveGroups(groups: EBCGroup[]): void {
    getSettings().groups = groups;
    syncSettings();
}

export function addGroupBeepEntry(groupId: string, entry: GroupBeepEntry): void {
    let arr = _groupHistory.get(groupId);
    if (!arr) { arr = []; _groupHistory.set(groupId, arr); }
    arr.push(entry);
    if (arr.length > 200) arr.splice(0, arr.length - 200);
}

export function getGroupHistory(groupId: string): GroupBeepEntry[] {
    return _groupHistory.get(groupId) ?? [];
}
