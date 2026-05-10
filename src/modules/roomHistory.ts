// Room history — two independent features:
//
// 1. Current Room  (always active, in-memory only)
//    Tracks who is in the room right now and who joined after you arrived.
//    Lives in `currentVisit`; no localStorage; always works regardless of settings.
//
// 2. Rooms Visited  (opt-in, persisted)
//    Saves a record of each room you enter to localStorage when
//    getRoomHistoryEnabled() is true. Flushed on room-leave.

import { getRoomHistoryEnabled } from "./settings";

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
    leftAt:    number | null;
    members:   Array<{ memberNumber: number; name: string }>; // present on entry
    joins:     RoomJoinEvent[];                               // arrived after you
}

const MAX_HISTORY = 15;
const LS_KEY      = "EBC_roomHistory";

let currentVisit:         RoomVisit | null = null;
let lastRecordedRoomName: string   | null = null;

// Member numbers already accounted for so we never double-count on each poll.
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

// Persist the current visit to localStorage — only if the user opted in.
function flushCurrent(): void {
    if (!currentVisit) return;
    if (!getRoomHistoryEnabled()) return; // opt-out → don't save history
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

// ── Called from ChatRoomSync hook ────────────────────────────────────────────
// Always tracks the current room in memory. Flushes previous visit to storage
// only if Rooms Visited logging is enabled.
export function onRoomSync(): void {
    try {
        const data = (window as unknown as Record<string, unknown>).ChatRoomData as Record<string, unknown> | undefined;
        const name  = typeof data?.Name  === "string" ? data.Name  : null;
        if (!name) return;

        const chars = getRoomChars();

        if (name !== lastRecordedRoomName) {
            lastRecordedRoomName = name;
            if (currentVisit) flushCurrent(); // save previous room if enabled

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

            knownMemberNums = new Set(members.map(m => m.memberNumber));
        }
    } catch { /* ignore */ }
}

// ── Called from ChatRoomLeave hook ───────────────────────────────────────────
export function onRoomLeave(): void {
    try {
        lastRecordedRoomName = null;
        if (!currentVisit) return;
        flushCurrent();
        currentVisit = null;
        knownMemberNums.clear();
    } catch { /* ignore */ }
}

// ── Called from ChatRoomSyncMemberJoin hook ──────────────────────────────────
export function onMemberJoin(char: { MemberNumber?: number; Nickname?: string; Name?: string }): void {
    try {
        if (!currentVisit || !char.MemberNumber || char.MemberNumber === Player.MemberNumber) return;
        if (knownMemberNums.has(char.MemberNumber)) return;
        knownMemberNums.add(char.MemberNumber);
        const name = char.Nickname?.trim() || char.Name || `#${char.MemberNumber}`;
        currentVisit.joins.push({ memberNumber: char.MemberNumber, name, at: Date.now() });
    } catch { /* ignore */ }
}

// ── Called every render tick and directly from BC hooks ──────────────────────
// Diffs ChatRoomCharacter against knownMemberNums to catch any joins that
// slipped through the hook or arrived before the addon initialised.
export function detectNewJoins(): void {
    try {
        if (!currentVisit) {
            onRoomSync(); // bootstrap if we loaded mid-room
            return;
        }
        const chars = getRoomChars();
        for (const c of chars) {
            if (!c.MemberNumber || c.MemberNumber === Player.MemberNumber) continue;
            if (knownMemberNums.has(c.MemberNumber)) continue;
            knownMemberNums.add(c.MemberNumber);
            const wasOnEntry = currentVisit.members.some(m => m.memberNumber === c.MemberNumber);
            if (!wasOnEntry) {
                const name = c.Nickname?.trim() || c.Name || `#${c.MemberNumber}`;
                currentVisit.joins.push({ memberNumber: c.MemberNumber, name, at: Date.now() });
            }
        }
    } catch { /* ignore */ }
}

// ── Accessors ────────────────────────────────────────────────────────────────

// Live in-memory current room — always available, no logging required.
export function getCurrentVisit(): RoomVisit | null { return currentVisit; }

// Past rooms from localStorage — only populated when Rooms Visited logging is on.
export function getVisitedHistory(): RoomVisit[] { return loadHistory(); }

/** @deprecated use getCurrentVisit / getVisitedHistory */
export function getRoomHistory(): RoomVisit[] { return loadHistory(); }

export function clearRoomHistory(): void {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

export function clearCurrentVisit(): void {
    currentVisit = null;
    knownMemberNums.clear();
    lastRecordedRoomName = null;
}
