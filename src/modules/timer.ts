// Room and restraint timer — tracks how long you have been in the current
// room and how long active restraints have been present.

import { RESTRAINT_GROUPS } from "./outfitManager";

let roomEnterTime: number | null = null;
let restraintStartTime: number | null = null;

export function timerOnRoomEnter(): void {
    roomEnterTime = Date.now();
    restraintStartTime = null;
}

export function timerOnRoomLeave(): void {
    roomEnterTime = null;
    restraintStartTime = null;
}

// Call periodically to keep the restraint clock in sync.
export function timerCheckRestraints(): void {
    try {
        if (!Player?.Appearance) return;
        const isBound = Player.Appearance.some(i => RESTRAINT_GROUPS.has(i.Asset.Group.Name));
        if (isBound) {
            if (restraintStartTime === null) restraintStartTime = Date.now();
        } else {
            restraintStartTime = null;
        }
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
