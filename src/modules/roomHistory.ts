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

// Called from the ChatRoomSync hook. Detects new-room entry by name change.
export function onRoomSync(): void {
    try {
        const data = (window as unknown as Record<string, unknown>).ChatRoomData as Record<string, unknown> | undefined;
        const name  = typeof data?.Name  === "string" ? data.Name  : null;
        if (!name || name === lastRecordedRoomName) return;
        lastRecordedRoomName = name;

        // Flush previous visit before starting new one
        if (currentVisit) flushCurrent();

        const chars = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
            Array<{ MemberNumber?: number; Nickname?: string; Name?: string }> | undefined;

        const members = (chars ?? [])
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
    } catch { /* ignore */ }
}

// Called from the ChatRoomLeave hook.
export function onRoomLeave(): void {
    try {
        lastRecordedRoomName = null;
        if (!currentVisit) return;
        flushCurrent();
        currentVisit = null;
    } catch { /* ignore */ }
}

// Called from the ChatRoomSyncMemberJoin hook.
export function onMemberJoin(char: { MemberNumber?: number; Nickname?: string; Name?: string }): void {
    try {
        if (!currentVisit || !char.MemberNumber || char.MemberNumber === Player.MemberNumber) return;
        const name = char.Nickname?.trim() || char.Name || `#${char.MemberNumber}`;
        currentVisit.joins.push({ memberNumber: char.MemberNumber, name, at: Date.now() });
    } catch { /* ignore */ }
}

export function getCurrentVisit(): RoomVisit | null { return currentVisit; }
export function getRoomHistory():  RoomVisit[]     { return loadHistory(); }
export function clearRoomHistory(): void {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    currentVisit = null;
}
