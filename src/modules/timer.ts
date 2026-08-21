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
    _recentlyRemoved.clear();
    roomEnterTime = null;
    restraintStartTime = null;
}

// Called from DrawCharacter hook. Keeps per-item and overall timers in sync.
// Throttled — only runs once per 500 ms regardless of how many characters are drawn per frame.
/**
 * How long a slot may sit empty before the timer really is finished.
 *
 * Long enough to cover a curse or a devious padlock swapping an item out and
 * back, short enough that taking something off and choosing a different one
 * still starts a fresh count.
 */
const REAPPLY_GRACE_MS = 8_000;

/** Slots that are empty but might only be mid-swap: group -> when it went. */
const _recentlyRemoved = new Map<string, number>();

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
            if (currentGroups.has(group)) {
                // Back on - forget it was ever missing.
                if (_recentlyRemoved.delete(group)) changed = true;
                continue;
            }
            // Empty now. Held for a few seconds first: if the same slot fills
            // again inside that window it was a re-lock, not a release, and the
            // timer carries on from where it was.
            const since = _recentlyRemoved.get(group);
            if (since === undefined) {
                _recentlyRemoved.set(group, now);
                continue;
            }
            if (now - since < REAPPLY_GRACE_MS) continue;
            _recentlyRemoved.delete(group);
            delete timers[group];
            changed = true;
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

/** Raw milliseconds of the current continuous bound streak (0 = not bound). */
export function getRestraintMs(): number {
    return restraintStartTime !== null ? Date.now() - restraintStartTime : 0;
}

// Groups that make each state true. Read from the persisted per-item timers, so
// these survive reloads, room changes and being offline - the same reason the
// overall bound streak reads from them rather than from session state.
const GAG_GROUPS     = ["ItemMouth", "ItemMouth2", "ItemMouth3"];
const CHASTITY_GROUPS = ["ItemPelvis", "ItemVulva"];

function longestWornMs(groups: string[]): number {
    const timers = loadRestraintTimers();
    let oldest: number | null = null;
    for (const g of groups) {
        const start = timers[g];
        if (start === undefined) continue;
        if (oldest === null || start < oldest) oldest = start;
    }
    return oldest === null ? 0 : Date.now() - oldest;
}

/**
 * The three achievement clocks, each gated on BC actually agreeing you are in
 * that state.
 *
 * Wearing something in a restraint slot is not the same as being restrained by
 * it. The slot list includes ears, nose, piercings and handhelds, so a pair of
 * earrings counted towards "stay bound" just as much as a hogtie - which made
 * the achievement close to free. Excluding collars, which is what the timer
 * settings already did, only trimmed the most obvious case of a much wider one.
 *
 * BC answers the real question directly: IsRestrained, IsGagged and IsChaste
 * come from item effects, so only something that actually restricts you counts.
 * Duration still comes from the persisted per-item timers, so offline time is
 * included - the predicate decides whether the clock counts, the timers say for
 * how long.
 *
 * The visible bound timer is deliberately left alone. It has its own exclusion
 * list that people have set up, and this stricter rule is about the achievement.
 */
function bcSays(fn: "IsRestrained" | "IsGagged" | "IsChaste"): boolean | null {
    try {
        const f = (Player as unknown as Record<string, unknown>)[fn];
        return typeof f === "function" ? !!(f as () => boolean).call(Player) : null;
    } catch { return null; }
}

/** Bound time that counts only while BC agrees you are restrained. */
export function getRestrainedMs(): number {
    // null means the predicate is unavailable - fall back rather than award zero.
    return bcSays("IsRestrained") === false ? 0 : getRestraintMs();
}

/** How long you have been gagged, continuously. */
export function getGaggedMs(): number {
    if (bcSays("IsGagged") === false) return 0;
    return longestWornMs(GAG_GROUPS);
}

/** How long you have been in chastity, continuously. */
export function getChastityMs(): number {
    if (bcSays("IsChaste") === false) return 0;
    return longestWornMs(CHASTITY_GROUPS);
}

// How long a specific restraint group has been worn (survives offline).
export function getRestraintItemDuration(group: string): string | null {
    const start = loadRestraintTimers()[group];
    return start !== undefined ? fmt(Date.now() - start) : null;
}
