// Friends system — tags, beep history, name cache.
// All data stored in Player.ExtensionSettings.EmeryBC and synced to server
// so it's available across devices on next login.

export interface BeepEntry {
    from: number;       // sender member number
    to: number;         // recipient member number
    message: string;
    ts: number;         // unix ms timestamp
}

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

function sync(): void {
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

// -- Name cache ----------------------------------------------------------------

export function getCachedNames(): Record<string, string> {
    const v = getStore().friendNames;
    return (v && typeof v === "object" && !Array.isArray(v)) ? v as Record<string, string> : {};
}

export function cacheName(memberNumber: number, name: string): void {
    const store = getStore();
    if (!store.friendNames || typeof store.friendNames !== "object") store.friendNames = {};
    (store.friendNames as Record<string, string>)[String(memberNumber)] = name;
    // Sync is deferred — name cache is saved alongside the next real operation
}

export function flushNameCache(): void { sync(); }

export function resolveName(memberNumber: number): string {
    try {
        const room = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
            Array<{ MemberNumber?: number; Nickname?: string; Name?: string }> | undefined;
        const char = room?.find(c => c.MemberNumber === memberNumber);
        if (char) {
            const name = char.Nickname?.trim() || char.Name || String(memberNumber);
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

export interface FriendOnlineInfo {
    roomName?: string;
    roomPrivate?: boolean;
    roomFull?: boolean;
    roomLocked?: boolean;
    roomSpace?: string;
}

// Set of member numbers BC reports as online (updated via AccountQueryResult hook)
const onlineSet = new Set<number>();
const onlineInfo = new Map<number, FriendOnlineInfo>();

// Session cache: EBC version for members we've shared a room with this session
const ebcVersionCache = new Map<number, string>();

export function cacheEBCVersion(memberNumber: number, version: string): void {
    ebcVersionCache.set(memberNumber, version);
}

export function getEBCVersion(memberNumber: number): string | null {
    return ebcVersionCache.get(memberNumber) ?? null;
}

export function updateOnlineFriends(entries: Array<Record<string, unknown>>): void {
    onlineSet.clear();
    onlineInfo.clear();
    for (const r of entries) {
        const n = typeof r.MemberNumber === "number" ? r.MemberNumber : 0;
        if (!n) continue;
        onlineSet.add(n);
        onlineInfo.set(n, {
            roomName:    typeof r.ChatRoomName    === "string"  ? r.ChatRoomName    : undefined,
            roomSpace:   typeof r.ChatRoomSpace   === "string"  ? r.ChatRoomSpace   : undefined,
            roomPrivate: typeof r.Private         === "boolean" ? r.Private         :
                         typeof r.Type            === "string"  ? r.Type === "Private" : undefined,
            roomFull:    typeof r.ChatRoomFull    === "boolean" ? r.ChatRoomFull    : undefined,
            roomLocked:  typeof r.Locked          === "boolean" ? r.Locked          : undefined,
        });
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

// -- Pinned friends ------------------------------------------------------------

export function getPinnedFriends(): number[] {
    const v = getStore().pinnedFriends;
    return Array.isArray(v) ? (v as number[]) : [];
}

export function isFriendPinned(memberNumber: number): boolean {
    return getPinnedFriends().includes(memberNumber);
}

export function togglePinFriend(memberNumber: number): boolean {
    const store = getStore();
    const list = getPinnedFriends();
    const idx = list.indexOf(memberNumber);
    if (idx >= 0) list.splice(idx, 1);
    else list.unshift(memberNumber);
    store.pinnedFriends = list;
    sync();
    return idx < 0; // true = now pinned
}

// -- Tags ----------------------------------------------------------------------

export function getFriendTags(): Record<string, string> {
    const v = getStore().friendTags;
    return (v && typeof v === "object" && !Array.isArray(v)) ? v as Record<string, string> : {};
}

export function setFriendTag(memberNumber: number, tag: string): void {
    const store = getStore();
    if (!store.friendTags || typeof store.friendTags !== "object") store.friendTags = {};
    const tags = store.friendTags as Record<string, string>;
    if (tag.trim()) tags[String(memberNumber)] = tag.trim();
    else delete tags[String(memberNumber)];
    sync();
}

// -- Beep history --------------------------------------------------------------

const MAX_ENTRIES = 300;

export function getBeepHistory(): BeepEntry[] {
    const v = getStore().beepHistory;
    return Array.isArray(v) ? (v as BeepEntry[]) : [];
}

export function addBeepEntry(entry: BeepEntry): void {
    const store = getStore();
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

// -- Sending -------------------------------------------------------------------

export function sendBeep(memberNumber: number, message: string): void {
    try {
        ServerSend("AccountBeep", { MemberNumber: memberNumber, Message: message });
    } catch { /* ignore */ }
    addBeepEntry({
        from: Player.MemberNumber ?? 0,
        to: memberNumber,
        message,
        ts: Date.now(),
    });
}
