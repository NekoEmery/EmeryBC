// Restraint log — records every restraint applied to / removed from the player.
// Detects changes by comparing Player.Appearance against an internal snapshot
// (independent of the anti-restraint module's own snapshot).
// Stored in localStorage (last MAX_ENTRIES entries; device-local).

export interface RestraintLogEntry {
    id:        string;
    itemName:  string;
    group:     string;  // asset group with "Item" prefix stripped
    applier:   string;  // display name or "#number"
    appliedAt: number;  // unix ms
    removedAt: number | null;
}

const MAX_ENTRIES = 50;
const LS_KEY      = "EBC_restraintLog";

// group name → log entry id (for marking removedAt)
const activeIds = new Map<string, string>();
// Known groups right now (for diff)
let knownGroups = new Set<string>();

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function loadLog(): RestraintLogEntry[] {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
            const p = JSON.parse(raw) as unknown;
            if (Array.isArray(p)) return p as RestraintLogEntry[];
        }
    } catch { /* ignore */ }
    return [];
}

function saveLog(entries: RestraintLogEntry[]): void {
    try { localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES))); } catch { /* ignore */ }
}

// Call once on room entry to baseline existing restraints without logging them.
export function snapshotForLog(): void {
    try {
        const groups = Player.Appearance
            .filter((i: Item) => i.Asset.Group.IsRestraint)
            .map((i: Item) => i.Asset.Group.Name);
        knownGroups = new Set(groups);

        // Restore active IDs from persisted log so page-reloads within a session
        // can still mark items removed.
        activeIds.clear();
        const log = loadLog();
        for (const entry of log) {
            if (entry.removedAt === null && groups.includes(entry.group)) {
                activeIds.set(entry.group, entry.id);
            }
        }
    } catch { /* ignore */ }
}

// Call from CharacterRefresh when C === Player.
// applierName = whoever last used an item on the player (pass "" / "Unknown" if unset).
export function checkRestraintChanges(applierName: string): void {
    try {
        const current  = Player.Appearance.filter((i: Item) => i.Asset.Group.IsRestraint);
        const curGroups = new Set(current.map((i: Item) => i.Asset.Group.Name));

        // ── Removed ──────────────────────────────────────────────────────────
        for (const group of [...knownGroups]) {
            if (!curGroups.has(group)) {
                knownGroups.delete(group);
                const id = activeIds.get(group);
                if (id) {
                    activeIds.delete(group);
                    const log = loadLog();
                    const entry = log.find(e => e.id === id);
                    if (entry) { entry.removedAt = Date.now(); saveLog(log); }
                }
            }
        }

        // ── Added ─────────────────────────────────────────────────────────────
        for (const item of current) {
            const group = item.Asset.Group.Name;
            if (!knownGroups.has(group)) {
                knownGroups.add(group);
                const itemName = (item.Asset as unknown as Record<string, unknown>).Description as string
                    || item.Asset.Name;
                const id = uid();
                activeIds.set(group, id);
                const log = loadLog();
                log.unshift({
                    id,
                    itemName,
                    group: group.replace(/^Item/, ""),
                    applier:   applierName || "Unknown",
                    appliedAt: Date.now(),
                    removedAt: null,
                });
                saveLog(log);
            }
        }
    } catch { /* ignore */ }
}

export function getRestraintLog():  RestraintLogEntry[] { return loadLog(); }
export function clearRestraintLog(): void {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    activeIds.clear();
    knownGroups.clear();
}
