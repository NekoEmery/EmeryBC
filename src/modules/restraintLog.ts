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

// ── Deferred applier resolution ───────────────────────────────────────────────
// CharacterRefresh fires before the ChatRoomMessage (Action) that carries the
// applier's name. We queue detected additions and flush them once the name
// arrives (or after a 400 ms timeout if it never does).

interface PendingEntry { id: string; itemName: string; group: string; appliedAt: number; }
const pendingEntries: PendingEntry[] = [];
let pendingApplier: string | null = null;
let pendingTimer: ReturnType<typeof window.setTimeout> | null = null;

// Called from the ChatRoomMessage hook when an Action targeting the player
// arrives — this fires after CharacterRefresh, so we store the name here and
// immediately flush any queued entries.
export function setPendingLogApplier(name: string): void {
    pendingApplier = name;
    if (pendingTimer !== null) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
    }
    flushPending(name);
    pendingApplier = null;
}

function flushPending(applierName: string): void {
    if (pendingEntries.length === 0) return;
    const log = loadLog();
    for (const p of pendingEntries.splice(0)) {
        log.unshift({
            id:        p.id,
            itemName:  p.itemName,
            group:     p.group,
            applier:   applierName || "Unknown",
            appliedAt: p.appliedAt,
            removedAt: null,
        });
    }
    saveLog(log);
}

// ─────────────────────────────────────────────────────────────────────────────

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
// Removals are written immediately. Additions are queued and flushed once the
// applier name arrives via setPendingLogApplier (or after 400 ms timeout).
export function checkRestraintChanges(): void {
    try {
        const current   = Player.Appearance.filter((i: Item) => i.Asset.Group.IsRestraint);
        const curGroups = new Set(current.map((i: Item) => i.Asset.Group.Name));

        // ── Removed (immediate) ───────────────────────────────────────────────
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

        // ── Added (deferred — wait for Action message with applier name) ──────
        let hasNew = false;
        for (const item of current) {
            const group = item.Asset.Group.Name;
            if (!knownGroups.has(group)) {
                knownGroups.add(group);
                const itemName = (item.Asset as unknown as Record<string, unknown>).Description as string
                    || item.Asset.Name;
                const id = uid();
                activeIds.set(group, id);
                pendingEntries.push({
                    id,
                    itemName,
                    group: group.replace(/^Item/, ""),
                    appliedAt: Date.now(),
                });
                hasNew = true;
            }
        }

        if (hasNew) {
            if (pendingApplier !== null) {
                // Name already arrived (Action fired before CharacterRefresh — rare)
                flushPending(pendingApplier);
                pendingApplier = null;
            } else {
                // Schedule a fallback flush in case no Action message ever arrives
                if (pendingTimer !== null) clearTimeout(pendingTimer);
                pendingTimer = window.setTimeout(() => {
                    pendingTimer = null;
                    flushPending(pendingApplier ?? "Unknown");
                    pendingApplier = null;
                }, 400);
            }
        }
    } catch { /* ignore */ }
}

export function getRestraintLog():  RestraintLogEntry[] { return loadLog(); }
export function clearRestraintLog(): void {
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
    activeIds.clear();
    knownGroups.clear();
    pendingEntries.splice(0);
    if (pendingTimer !== null) { clearTimeout(pendingTimer); pendingTimer = null; }
    pendingApplier = null;
}
