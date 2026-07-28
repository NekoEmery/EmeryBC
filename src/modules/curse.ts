// Curse storage - runs on the TARGET's client.
//
// A curse marks an appearance GROUP as un-removable. Both InventoryRemove and
// ChatRoomSyncItem are hooked in main.ts to refuse removals for a cursed group,
// so neither the wearer nor anyone else can take the item off through the normal
// BC menus. State lives in localStorage keyed by member number, so it survives a
// refresh and is not shared between accounts on the same browser.
//
// This used to be a set of closures inside main.ts. It is a module now because
// the safeword and the drawer both have to be able to release a curse - a
// restriction the wearer cannot lift themselves is a trap, not a scene. A player
// reported being stuck in a leg restraint for two days with no way out except
// disabling the addon entirely.

const key      = (): string => `EBC_curses_${Player.MemberNumber ?? ""}`;
const itemKey  = (): string => `EBC_curseItems_${Player.MemberNumber ?? ""}`;
const pauseKey = (): string => `EBC_curse_pauses_${Player.MemberNumber ?? ""}`;
const expiryKey = (): string => `EBC_curse_expiry_${Player.MemberNumber ?? ""}`;

export function getCursePauses(): Record<string, number> {
    try { const r = localStorage.getItem(pauseKey()); return r ? JSON.parse(r) as Record<string, number> : {}; } catch { return {}; }
}

export function saveCursePauses(p: Record<string, number>): void {
    try { localStorage.setItem(pauseKey(), JSON.stringify(p)); } catch { /* ignore */ }
}

export function isCursePaused(group: string): boolean {
    const p = getCursePauses();
    return !!(p[group] && Date.now() < p[group]);
}

export function getCurseExpiry(): number | null {
    try { const r = localStorage.getItem(expiryKey()); return r ? parseInt(r) : null; } catch { return null; }
}

export function saveCurseExpiry(ts: number | null): void {
    try {
        if (ts == null) localStorage.removeItem(expiryKey());
        else localStorage.setItem(expiryKey(), String(ts));
    } catch { /* ignore */ }
}

export function getCursedGroups(): Set<string> {
    try {
        const raw = localStorage.getItem(key());
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) return new Set(parsed.filter((v): v is string => typeof v === "string"));
    } catch { /* ignore */ }
    return new Set();
}

export function saveCursedGroups(groups: Set<string>): void {
    try { localStorage.setItem(key(), JSON.stringify([...groups])); } catch { /* ignore */ }
}

export function getCurseItemMap(): Record<string, string> {
    try {
        const raw = localStorage.getItem(itemKey());
        return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch { return {}; }
}

export function saveCurseItemMap(map: Record<string, string>): void {
    try { localStorage.setItem(itemKey(), JSON.stringify(map)); } catch { /* ignore */ }
}

/**
 * Wipes every curse on this account. This is the safety release - it is what the
 * safeword calls and what the "lift" control in the panel calls. It must never
 * depend on the person who applied the curse still being around, still being a
 * friend, or still running EBC.
 *
 * Returns the number of groups that were released, so callers can stay quiet
 * when there was nothing to lift.
 */
export function releaseAllCurses(): number {
    const n = getCursedGroups().size;
    saveCursedGroups(new Set());
    saveCurseItemMap({});
    saveCursePauses({});
    saveCurseExpiry(null);
    return n;
}

/** Human-readable slot names for the release notice, e.g. "Legs, ArmsLeft". */
export function describeCursedGroups(): string {
    return [...getCursedGroups()].map(g => g.replace(/^Item/, "")).join(", ");
}

/** Applies an [EBC-CURSE:...] payload received from another player. */
export function handleCurseCommand(msg: string): void {
    const inner = msg.slice("[EBC-CURSE:".length).replace(/\]$/, "");
    const current = getCursedGroups();
    if (inner.startsWith("apply:")) {
        const itemMap = getCurseItemMap();
        for (const entry of inner.slice("apply:".length).split(",").filter(Boolean)) {
            const eqIdx = entry.indexOf("=");
            const g = eqIdx >= 0 ? entry.slice(0, eqIdx) : entry;
            const val = eqIdx >= 0 ? entry.slice(eqIdx + 1) : "";
            if (g === "expiry") { saveCurseExpiry(parseInt(val) || null); continue; }
            if (g) { current.add(g); if (val) itemMap[g] = val; }
        }
        saveCursedGroups(current);
        saveCurseItemMap(itemMap);
    } else if (inner.startsWith("pause:")) {
        const pauses = getCursePauses();
        for (const entry of inner.slice("pause:".length).split(",").filter(Boolean)) {
            const eqIdx = entry.indexOf("=");
            const g = eqIdx >= 0 ? entry.slice(0, eqIdx) : entry;
            const ms = eqIdx >= 0 ? parseInt(entry.slice(eqIdx + 1)) : 0;
            if (g && ms > 0) pauses[g] = Date.now() + ms;
        }
        saveCursePauses(pauses);
    } else if (inner === "clear") {
        releaseAllCurses();
    } else if (inner.startsWith("clear:")) {
        const itemMap = getCurseItemMap();
        for (const g of inner.slice("clear:".length).split(",").filter(Boolean)) {
            current.delete(g);
            delete itemMap[g];
        }
        saveCursedGroups(current);
        saveCurseItemMap(itemMap);
    }
}
