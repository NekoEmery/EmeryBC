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

export type FriendStatus = "room" | "away";

export function getFriendStatus(memberNumber: number): FriendStatus {
    try {
        const room = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
            Array<{ MemberNumber?: number }> | undefined;
        if (room?.some(c => c.MemberNumber === memberNumber)) return "room";
    } catch { /* ignore */ }
    return "away";
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
        ServerSend("Beep", { MemberNumber: memberNumber, Message: message });
    } catch { /* ignore */ }
    addBeepEntry({
        from: Player.MemberNumber ?? 0,
        to: memberNumber,
        message,
        ts: Date.now(),
    });
}
