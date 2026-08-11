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
    // Drop the kept copies too, or the keeper would put back an item the
    // safeword just released.
    heldItems.clear();
    try { localStorage.removeItem(bundleKey()); } catch { /* ignore */ }
    return n;
}

// -- Keeping the cursed item on ------------------------------------------------
//
// A curse used to be a claim on a SLOT: the hooks refused removals for a cursed
// group and never looked at what was in it. Two things went wrong with that.
//
// A curse could be escaped. The hooks only see per-item traffic, and an outfit
// change does not send per-item traffic - it replaces the whole appearance in
// one go, so the cursed item simply vanished, owner lock and all.
//
// And a curse could latch onto the wrong thing. Once the slot was empty, the
// next item anyone put there inherited the curse and could not be taken off -
// so losing a cursed collar meant being stuck in whatever replaced it.
//
// A curse is now a claim on an ITEM. We keep a copy of it, check every couple
// of seconds that it is still on, and put it back if it is not. Nothing else in
// that slot is protected, so a replacement is always removable.

const bundleKey = (): string => `EBC_curseBundles_${Player.MemberNumber ?? ""}`;

interface CurseBundle {
    Name: string;
    Color?: unknown;
    Craft?: unknown;
    Property?: unknown;
    Difficulty?: number;
}

/** Exact items, kept live so a restore is the real thing and not a lookalike. */
const heldItems = new Map<string, Item>();

function getCurseBundles(): Record<string, CurseBundle> {
    try {
        const raw = localStorage.getItem(bundleKey());
        return raw ? (JSON.parse(raw) as Record<string, CurseBundle>) : {};
    } catch { return {}; }
}

function saveCurseBundles(b: Record<string, CurseBundle>): void {
    try { localStorage.setItem(bundleKey(), JSON.stringify(b)); } catch { /* ignore */ }
}

/** Stores the item so it can be rebuilt after a refresh, colour and lock included. */
function snapshot(group: string, item: Item): void {
    heldItems.set(group, item);
    try {
        const raw = item as unknown as Record<string, unknown>;
        const b: CurseBundle = { Name: item.Asset.Name };
        if (raw.Color      !== undefined) b.Color = raw.Color;
        if (raw.Craft      !== undefined) b.Craft = raw.Craft;
        if (raw.Property   !== undefined) b.Property = raw.Property;
        if (typeof raw.Difficulty === "number") b.Difficulty = raw.Difficulty;
        const all = getCurseBundles();
        all[group] = b;
        saveCurseBundles(all);
    } catch { /* a missing snapshot only costs us the restore, not the curse */ }
}

/** The exact item if we still hold it, otherwise one rebuilt from the bundle. */
function rebuild(group: string): Item | null {
    const held = heldItems.get(group);
    if (held) return held;
    try {
        const b = getCurseBundles()[group];
        if (!b || typeof b.Name !== "string") return null;
        const w = window as unknown as Record<string, unknown>;
        const assetGet = w.AssetGet as ((family: string, group: string, name: string) => Asset | null) | undefined;
        const asset = assetGet?.(Player.AssetFamily, group, b.Name);
        if (!asset) return null;
        const item = { Asset: asset } as unknown as Record<string, unknown>;
        if (b.Color      !== undefined) item.Color = b.Color;
        if (b.Craft      !== undefined) item.Craft = b.Craft;
        if (b.Property   !== undefined) item.Property = b.Property;
        if (b.Difficulty !== undefined) item.Difficulty = b.Difficulty;
        return item as unknown as Item;
    } catch { return null; }
}

/** The asset name a curse is holding, or null when it is not holding anything. */
export function cursedItemName(group: string): string | null {
    const map = getCurseItemMap();
    const v = map[group];
    return typeof v === "string" && v ? v : null;
}

/**
 * True when this exact item is the one the curse is on.
 *
 * Everything that blocks a removal asks this first, so a curse can only ever
 * refuse to release the item it was placed on - never the slot, and never
 * whatever happens to be sitting there instead.
 */
export function isCursedItem(group: string, assetName: string | undefined): boolean {
    if (!getCursedGroups().has(group) || isCursePaused(group)) return false;
    const want = cursedItemName(group);
    if (!want) return true;   // pre-item-binding curse; bound on the next sweep
    return !!assetName && assetName === want;
}

/**
 * Checks every curse and puts back anything that got taken off.
 *
 * Run on a timer rather than from the item hooks, because the ways a cursed
 * item goes missing are exactly the ways that produce no item hook - an outfit
 * change, a wardrobe load, a full appearance sync. Polling the result catches
 * all of them without having to guess which BC function did it.
 *
 * Returns the groups it had to repair, so the caller can say so.
 */
export function enforceCurses(): string[] {
    const cursed = getCursedGroups();
    if (cursed.size === 0) return [];
    const map = getCurseItemMap();
    const repaired: string[] = [];
    let mapDirty = false;

    for (const group of cursed) {
        if (isCursePaused(group)) continue;
        const worn = (Player.Appearance ?? []).find(a => a.Asset?.Group?.Name === group);

        // A curse from before items were tracked binds to what is on right now,
        // so it stops being a claim on the slot from here on.
        if (!map[group]) {
            if (worn?.Asset?.Name) { map[group] = worn.Asset.Name; mapDirty = true; snapshot(group, worn); }
            continue;
        }

        if (worn && worn.Asset?.Name === map[group]) { snapshot(group, worn); continue; }

        // The cursed item is gone, or something else is in its place.
        const original = rebuild(group);
        if (!original) {
            // Nothing to put back. Holding the slot from here would only trap
            // whatever lands in it next, which is the trap this is meant to stop.
            cursed.delete(group);
            delete map[group];
            mapDirty = true;
            repaired.push(`${group}:lost`);
            continue;
        }
        try {
            const app = Player.Appearance as Item[];
            for (let i = app.length - 1; i >= 0; i--) {
                if (app[i]?.Asset?.Group?.Name === group) app.splice(i, 1);
            }
            app.push(original);
            repaired.push(group);
        } catch { /* ignore */ }
    }

    if (mapDirty) { saveCursedGroups(cursed); saveCurseItemMap(map); }
    return repaired;
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
        const bundles = getCurseBundles();
        for (const g of inner.slice("clear:".length).split(",").filter(Boolean)) {
            current.delete(g);
            delete itemMap[g];
            // Forget the copy as well, or the keeper would put it straight back.
            delete bundles[g];
            heldItems.delete(g);
        }
        saveCursedGroups(current);
        saveCurseItemMap(itemMap);
        saveCurseBundles(bundles);
    }
}
