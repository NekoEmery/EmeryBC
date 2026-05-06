// Room and restraint timer — tracks how long you have been in the current
// room and how long active restraints have been present.
// Per-item timestamps are persisted in ExtensionSettings so they survive
// offline sessions and page reloads.

import { RESTRAINT_GROUPS } from "./outfitManager";

let roomEnterTime: number | null = null;
let restraintStartTime: number | null = null; // overall "am I restrained" timer

let savePending = false;

function getAddon(): Record<string, unknown> {
    try {
        if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
    } catch { return {}; }
}

// Per-restraint-group timestamps (ms since epoch), keyed by group name (e.g. "ItemArms").
function loadRestraintTimers(): Record<string, number> {
    try {
        const v = getAddon().restraintTimers;
        return (v && typeof v === "object" && !Array.isArray(v)) ? { ...(v as Record<string, number>) } : {};
    } catch { return {}; }
}

function saveRestraintTimers(timers: Record<string, number>): void {
    try {
        getAddon().restraintTimers = timers;
    } catch { /* ignore */ }
    if (!savePending) {
        savePending = true;
        window.setTimeout(() => {
            savePending = false;
            try { ServerPlayerExtensionSettingsSync("EmeryBC"); } catch { /* ignore */ }
        }, 3000); // debounce — sync to server 3 s after last change
    }
}

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
export function timerCheckRestraints(): void {
    try {
        if (!Player?.Appearance) return;

        const currentGroups = new Set(
            Player.Appearance
                .filter(i => RESTRAINT_GROUPS.has(i.Asset.Group.Name))
                .map(i => i.Asset.Group.Name),
        );

        // Overall restrained timer
        const isBound = currentGroups.size > 0;
        if (isBound) {
            if (restraintStartTime === null) restraintStartTime = Date.now();
        } else {
            restraintStartTime = null;
        }

        // Sync per-item timers
        const timers = loadRestraintTimers();
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
