// Room visit history — records the last MAX_HISTORY rooms the player entered,
// who was in the room at entry, and who joined while they were there.
// Stored in localStorage (device-local; persists across sessions).

export interface RoomJoinEvent {
    memberNumber: number;
    name: string;
    at: number; // unix ms
}

export interface RoomVisit {
    id:        string;
    name:      string;
    space:     string;
    enteredAt: number;
    leftAt:    number | null; // null = still in room
    members:   Array<{ memberNumber: number; name: string }>; // at entry
    joins:     RoomJoinEvent[]; // people who joined after you arrived
}

const MAX_HISTORY = 15;
const LS_KEY      = "EBC_roomHistory";

let currentVisit:         RoomVisit | null = null;
let lastRecordedRoomName: string   | null = null;

// Track member numbers already accounted for (entry list + joins) so we never
// double-count someone when detectNewJoins runs on every render tick.
let knownMemberNums = new Set<number>();

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function loadHistory(): RoomVisit[] {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
            const p = JSON.parse(raw) as unknown;
            if (Array.isArray(p)) return p as RoomVisit[];
        }
    } catch { /* ignore */ }
    return [];
}

function saveHistory(visits: RoomVisit[]): void {
    try { localStorage.setItem(LS_KEY, JSON.stringify(visits.slice(0, MAX_HISTORY))); } catch { /* ignore */ }
}

function flushCurrent(): void {
    if (!currentVisit) return;
    if (!currentVisit.leftAt) currentVisit.leftAt = Date.now();
    const history = loadHistory();
    const idx = history.findIndex(v => v.id === currentVisit!.id);
    if (idx >= 0) history[idx] = currentVisit;
    else history.unshift(currentVisit);
    saveHistory(history);
}

function getRoomChars(): Array<{ MemberNumber?: number; Nickname?: string; Name?: string }> {
    return ((window as unknown as Record<string, unknown>).ChatRoomCharacter as
        Array<{ MemberNumber?: number; Nickname?: string; Name?: string }> | undefined) ?? [];
}

// Called from the ChatRoomSync hook. Detects new-room entry by name change.
export function onRoomSync(): void {
    try {
        const data = (window as unknown as Record<string, unknown>).ChatRoomData as Record<string, unknown> | undefined;
        const name  = typeof data?.Name  === "string" ? data.Name  : null;
        if (!name) return;

        const chars = getRoomChars();

        if (name !== lastRecordedRoomName) {
            // ── New room entered ────────────────────────────────────────────────
            lastRecordedRoomName = name;
            if (currentVisit) flushCurrent();

            const members = chars
                .filter(c => c.MemberNumber && c.MemberNumber !== Player.MemberNumber)
                .map(c => ({
                    memberNumber: c.MemberNumber!,
                    name: c.Nickname?.trim() || c.Name || `#${c.MemberNumber}`,
                }));

            const space = typeof data?.Space === "string" ? data.Space : "";

            currentVisit = {
                id: uid(), name, space,
                enteredAt: Date.now(), leftAt: null,
                members, joins: [],
            };

            // Seed knownMemberNums from the entry snapshot so we don't
            // immediately re-log them as joins on the next detectNewJoins call.
            knownMemberNums = new Set(members.map(m => m.memberNumber));
        }
        // When still in the same room we rely on detectNewJoins() (called from
        // the render poller) rather than re-diffing here, since ChatRoomSync may
        // not fire for every individual member join in all BC versions.
    } catch { /* ignore */ }
}

// Called from the ChatRoomLeave hook.
export function onRoomLeave(): void {
    try {
        lastRecordedRoomName = null;
        if (!currentVisit) return;
        flushCurrent();
        currentVisit = null;
        knownMemberNums.clear();
    } catch { /* ignore */ }
}

// Called from the ChatRoomSyncMemberJoin hook (supplementary — BC may also
// broadcast full ChatRoomSync packets; detectNewJoins handles those cases).
export function onMemberJoin(char: { MemberNumber?: number; Nickname?: string; Name?: string }): void {
    try {
        if (!currentVisit || !char.MemberNumber || char.MemberNumber === Player.MemberNumber) return;
        if (knownMemberNums.has(char.MemberNumber)) return; // already recorded
        knownMemberNums.add(char.MemberNumber);
        const name = char.Nickname?.trim() || char.Name || `#${char.MemberNumber}`;
        currentVisit.joins.push({ memberNumber: char.MemberNumber, name, at: Date.now() });
    } catch { /* ignore */ }
}

// Called every render tick (1.5 s) to catch joins that slipped through because
// ChatRoomSyncMemberJoin didn't fire or had an unexpected data shape.
export function detectNewJoins(): void {
    try {
        if (!currentVisit) {
            // EBC loaded while already in a room — bootstrap currentVisit now.
            onRoomSync();
            return;
        }
        const chars = getRoomChars();
        for (const c of chars) {
            if (!c.MemberNumber || c.MemberNumber === Player.MemberNumber) continue;
            if (knownMemberNums.has(c.MemberNumber)) continue;
            knownMemberNums.add(c.MemberNumber);
            // Only count as a "join" if they weren't in the original entry list.
            const wasOnEntry = currentVisit.members.some(m => m.memberNumber === c.MemberNumber);
            if (!wasOnEntry) {
                const name = c.Nickname?.trim() || c.Name || `#${c.MemberNumber}`;
                currentVisit.joins.push({ memberNumber: c.MemberNumber, name, at: Date.now() });
            }
        }
    } catch { /* ignore */ }
}

export function getCurrentVisit(): RoomVisit | null { return currentVisit; }

// Always includes the live in-memory currentVisit so joins show immediately
// without waiting for the room to be left (which is when it flushes to storage).
export function getRoomHistory(): RoomVisit[] {
    const history = loadHistory();
    if (!currentVisit) return history;
    const idx = history.findIndex(v => v.id === currentVisit!.id);
    if (idx >= 0) {
        const merged = [...history];
        merged[idx] = currentVisit;
        return merged;
    }
    return [currentVisit, ...history];
}

export function clearRoomHistory(): void {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    currentVisit = null;
    knownMemberNums.clear();
}
