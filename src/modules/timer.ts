// Room and restraint timer — tracks how long you have been in the current
// room and how long active restraints have been present.
// Per-item timestamps are persisted in ExtensionSettings so they survive
// offline sessions and page reloads.

import { RESTRAINT_GROUPS } from "./outfitManager";
import { getSettings, syncSettings } from "./bcUtils";

// Default groups excluded from the bound timer (collar/neck worn alone ≠ "bound").
// Users can override this per group via setTimerGroupExcluded().
export const NECK_TIMER_GROUPS = ["ItemNeck", "ItemNeckAccessories", "ItemNeckRestraints"] as const;
const DEFAULT_EXCLUDED = new Set<string>(NECK_TIMER_GROUPS);

// Session start: fixed at module load time — "how long have I been online"
const SESSION_START = Date.now();

let roomEnterTime: number | null = null;
let restraintStartTime: number | null = null; // overall "am I restrained" timer

let savePending = false;
let lastTimerCheckTs = 0; // throttle — only run once per 500 ms


// Per-restraint-group timestamps (ms since epoch), keyed by group name (e.g. "ItemArms").
function loadRestraintTimers(): Record<string, number> {
    try {
        const v = getSettings().restraintTimers;
        return (v && typeof v === "object" && !Array.isArray(v)) ? { ...(v as Record<string, number>) } : {};
    } catch { return {}; }
}

function saveRestraintTimers(timers: Record<string, number>): void {
    try {
        getSettings().restraintTimers = timers;
    } catch { /* ignore */ }
    if (!savePending) {
        savePending = true;
        window.setTimeout(() => {
            savePending = false;
            syncSettings();
        }, 3000); // debounce — sync to server 3 s after last change
    }
}

// ---------------------------------------------------------------------------
// User-configurable per-group timer exclusions
// ---------------------------------------------------------------------------

export function getTimerExcludedGroups(): Set<string> {
    try {
        const v = getSettings().timerExcludedGroups;
        if (Array.isArray(v)) return new Set(v as string[]);
    } catch { /* ignore */ }
    // Default: neck groups excluded, everything else counts
    return new Set(DEFAULT_EXCLUDED);
}

export function isTimerGroupExcluded(group: string): boolean {
    return getTimerExcludedGroups().has(group);
}

export function setTimerGroupExcluded(group: string, excluded: boolean): void {
    const current = getTimerExcludedGroups();
    if (excluded) current.add(group); else current.delete(group);
    getSettings().timerExcludedGroups = [...current];
    syncSettings();
}

// ---------------------------------------------------------------------------

export function timerOnRoomEnter(): void {
    roomEnterTime = Date.now();
    restraintStartTime = null; // overall "continuously restrained" timer resets on room change
    // Per-item timers are NOT reset — they persist across rooms and offline
}

export function timerOnRoomLeave(): void {
    roomEnterTime = null;
    restraintStartTime = null;
}

// Called from DrawCharacter hook. Keeps per-item and overall timers in sync.
// Throttled — only runs once per 500 ms regardless of how many characters are drawn per frame.
export function timerCheckRestraints(): void {
    const now = Date.now();
    if (now - lastTimerCheckTs < 500) return;
    lastTimerCheckTs = now;
    try {
        if (!Player?.Appearance) return;

        const currentGroups = new Set(
            Player.Appearance
                .filter(i => RESTRAINT_GROUPS.has(i.Asset.Group.Name))
                .map(i => i.Asset.Group.Name),
        );

        // Sync per-item timers — load once, used both for start-time recovery and below
        const timers = loadRestraintTimers();

        // Overall bound timer — user-excluded groups (defaults: neck/collar) are ignored.
        // When already bound on load, recover the start from persisted per-item
        // timers so offline time is included rather than starting fresh.
        const excluded = getTimerExcludedGroups();
        const isBound = [...currentGroups].some(g => !excluded.has(g));
        if (isBound) {
            if (restraintStartTime === null) {
                // Find the oldest non-excluded per-item timer already in storage
                const countedGroups = [...currentGroups].filter(g => !excluded.has(g));
                const oldest = countedGroups
                    .map(g => timers[g])
                    .filter((t): t is number => typeof t === "number")
                    .reduce((min, t) => Math.min(min, t), now);
                restraintStartTime = oldest; // equals `now` if no persisted timer yet
            }
        } else {
            restraintStartTime = null;
        }

        let changed = false;

        for (const group of currentGroups) {
            if (!(group in timers)) {
                timers[group] = Date.now();
                changed = true;
            }
        }
        for (const group of Object.keys(timers)) {
            if (!currentGroups.has(group)) {
                delete timers[group];
                changed = true;
            }
        }

        if (changed) saveRestraintTimers(timers);
    } catch { /* ignore */ }
}

function fmt(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
}

// How long the addon has been loaded (session / "time online").
export function getOnlineTime(): string {
    return fmt(Date.now() - SESSION_START);
}

export function getRoomTime(): string | null {
    return roomEnterTime !== null ? fmt(Date.now() - roomEnterTime) : null;
}

export function getRestraintTime(): string | null {
    return restraintStartTime !== null ? fmt(Date.now() - restraintStartTime) : null;
}

// How long a specific restraint group has been worn (survives offline).
export function getRestraintItemDuration(group: string): string | null {
    const start = loadRestraintTimers()[group];
    return start !== undefined ? fmt(Date.now() - start) : null;
}
