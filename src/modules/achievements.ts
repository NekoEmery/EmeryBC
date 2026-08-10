// Achievement system - currently limited to the credits crew (devs & friends).
// Tiered: most achievements level up through thresholds (e.g. 5 → 25 → 100) and
// their card upgrades bronze → silver → gold. Counts things done TO the player
// (pats, hugs, kisses, being tied...), things the player DOES (boops, pats,
// hugs), plus rare Emery-targeted ones. Progress lives in EBC settings (synced,
// tiny); tier-ups pop a toast. Fed from main.ts's ChatRoomMessage hook.

import { getSettings, syncSettings } from "./bcUtils";
import { getRestrainedMs, getGaggedMs, getChastityMs } from "./timer";
import { CREDITED, ACHIEVEMENT_MEMBERS, isCredited, hasCreatorAccess } from "./crew";

// Crew whitelist - only these members track or see achievements.
// The roster lives in crew.ts so the credits cards, the VIP gradients, the
// crew-only tools and these achievements can never disagree about who counts.
// Re-exported because drawer.ts already imports the whitelist from here.
export { ACHIEVEMENT_MEMBERS } from "./crew";
const EMERY = 130267;

/** Raw crew membership - ignores the opt-out (used to gate the opt-out toggle
 *  itself, so someone who opted out can find their way back). */
export function isAchievementCrewMember(memberNumber: number | null | undefined): boolean {
    return typeof memberNumber === "number" && ACHIEVEMENT_MEMBERS.includes(memberNumber);
}

export function isAchievementsOptedOut(): boolean {
    try { return (getSettings() as Record<string, unknown>).achievementsOff === true; } catch { return false; }
}

export function setAchievementsOptedOut(off: boolean): void {
    try {
        const s = getSettings() as Record<string, unknown>;
        // Write false rather than deleting: the settings flush only COPIES keys
        // to the server object, it never removes them - so a deleted key keeps
        // its old server value and comes back as "opted out" on the next login.
        s.achievementsOff = off;
        syncSettings();
    } catch { /* ignore */ }
}

/** Whether shared achievement plaques from others are rendered. Anyone who opted
 *  out of achievements never sees them; everyone else can toggle it. */
export function getShowSharedPlaques(): boolean {
    try {
        if (isAchievementsOptedOut()) return false;
        return (getSettings() as Record<string, unknown>).hideAchPlaques !== true;
    } catch { return true; }
}

export function setShowSharedPlaques(show: boolean): void {
    try {
        const s = getSettings() as Record<string, unknown>;
        s.hideAchPlaques = !show;
        syncSettings();
    } catch { /* ignore */ }
}

/**
 * Anyone who has not opted out - gates tracking, the trophy and the popup.
 *
 * This was limited to the crew list while achievements were being built. They
 * are finished, so the gate is just the opt-out now. isAchievementCrewMember is
 * still used for the crew-only rare ones, which is a different question from
 * whether you get achievements at all.
 */
export function isAchievementUser(memberNumber: number | null | undefined): boolean {
    return typeof memberNumber === "number" && !isAchievementsOptedOut();
}

export interface AchievementDef {
    id: string;
    icon: string;
    name: string;
    /** Description template - {n} is replaced with the tier threshold. */
    desc: string;
    counter: string;
    /** Ascending thresholds. One entry = single unlock; three = bronze/silver/gold. */
    tiers: number[];
    /** Achievement class - groups the list (see ACHIEVEMENT_CLASSES). */
    cls: string;
    rare?: boolean;
    /** Optional pretty-printer for {n}, e.g. minutes -> "20 min" / "1 day". */
    fmtN?: (n: number) => string;
}

/**
 * Completionist means everything except two.
 *
 * Met the Crew needs five specific people online and in the same room at once,
 * which is not a thing you can go and do - it is luck and other people's
 * schedules. Met the Kitty replaces it as the required one: still meeting
 * someone, but one person rather than five.
 *
 * Completionist itself is excluded because it is derived from the others and
 * would otherwise be waiting on itself.
 */
const COMPLETION_EXCLUDES = new Set(["completionist", "crew_met"]);

function countsTowardCompletion(a: AchievementDef): boolean {
    return !COMPLETION_EXCLUDES.has(a.id);
}

/** How far along the 100% reward is: [done, total]. */
export function completionProgress(): [number, number] {
    const list = ACHIEVEMENTS.filter(countsTowardCompletion);
    let done = 0;
    for (const a of list) {
        const value = getState().c[a.counter] ?? 0;
        if (tiersReached(a, value) >= a.tiers.length) done++;
    }
    return [done, list.length];
}

/** True once every counting achievement is at its highest tier. */
export function hasCompletedEverything(): boolean {
    const [done, total] = completionProgress();
    return total > 0 && done >= total;
}

/**
 * Fills {n} in a description, honouring the def's formatter.
 *
 * For Emery herself the word "Emery" is swapped for a crew member, because the
 * achievements retarget to the credited crew when she is the player - see
 * specialNums(). Showing her "Spank Emery 5 times" while actually counting
 * spanks aimed at Sin or Julia would just be a lie on the card.
 */
export function achievementDesc(a: AchievementDef, n: number): string {
    const text = a.desc.replace("{n}", a.fmtN ? a.fmtN(n) : String(n));
    if ((Player?.MemberNumber ?? 0) !== EMERY || !text.includes("Emery")) return text;
    // Plain splitting rather than a regex with word boundaries. The escapes in
    // the previous version were mangled into control characters on their way
    // into the file, so it silently matched nothing - this cannot happen to a
    // string with no escapes in it. "Emery" only ever appears as a whole word
    // in these descriptions, so nothing is lost by not asserting that.
    const swapped = text.split("Emery").join("a crew member");
    return swapped.startsWith("a crew member")
        ? "A crew member" + swapped.slice("a crew member".length)
        : swapped;
}

export const ACHIEVEMENT_CLASSES: Array<{ id: string; label: string; icon: string }> = [
    { id: "received", label: "Received", icon: "💝" },
    { id: "given",    label: "Given",    icon: "🖐" },
    { id: "bondage",  label: "Bondage",  icon: "⛓" },
    { id: "emery",    label: "Emery",    icon: "⭐" },
];

export const ACHIEVEMENTS: AchievementDef[] = [
    // 💝 Received - things done TO you
    { id: "pats",    icon: "🐾", name: "Pat Magnet",    desc: "Get headpatted {n} times",              counter: "pet_recv",  tiers: [5, 25, 250], cls: "received" },
    { id: "hugs",    icon: "🤗", name: "Hug Collector", desc: "Receive {n} hugs",                      counter: "hug_recv",  tiers: [5, 25, 100], cls: "received" },
    { id: "kisses",  icon: "💋", name: "Cherished",     desc: "Receive {n} kisses",                    counter: "kiss_recv", tiers: [5, 25, 100], cls: "received" },
    { id: "booped",  icon: "👃", name: "Boop Target",   desc: "Get your nose booped {n} times",        counter: "boop_recv", tiers: [5, 25, 100], cls: "received" },
    { id: "popular", icon: "🌟", name: "Popular",       desc: "{n} different people do things to you", counter: "people",    tiers: [5, 25, 100], cls: "received" },
    // 🖐 Given - things YOU do to others
    { id: "boops",     icon: "👉", name: "Boop!",          desc: "Boop someone {n} times",    counter: "boop_give",   tiers: [10, 50, 250], cls: "given" },
    { id: "patgiver",  icon: "🖐", name: "Pat Dispenser",  desc: "Headpat others {n} times",  counter: "pet_give",    tiers: [10, 50, 250], cls: "given" },
    { id: "huggiver",  icon: "💞", name: "Hug Dealer",     desc: "Give {n} hugs",             counter: "hug_give",    tiers: [10, 50, 250], cls: "given" },
    { id: "kissgiver", icon: "😘", name: "Kiss Bandit",    desc: "Kiss others {n} times",     counter: "kiss_give",   tiers: [10, 50, 250], cls: "given" },
    { id: "bughunter", icon: "🐛", name: "Bug Hunter",     desc: "Send {n} bug reports or suggestions", counter: "feedback_sent", tiers: [1, 5, 15], cls: "given" },
    { id: "spanker",   icon: "🍑", name: "Heavy Hand",     desc: "Spank others {n} times",    counter: "spank_give",  tiers: [10, 50, 250], cls: "given" },
    { id: "tickler",   icon: "🪶", name: "Tickle Monster", desc: "Tickle others {n} times",   counter: "tickle_give", tiers: [10, 50, 250], cls: "given" },
    // ⛓ Bondage
    { id: "tied",   icon: "⛓",  name: "Tied Down",      desc: "Have restraints put on you {n} times", counter: "tied_recv", tiers: [5, 25, 100],  cls: "bondage" },
    { id: "streak", icon: "⏳", name: "Living in Rope", desc: "Stay properly restrained {n} hours straight",        counter: "bound_h",   tiers: [24, 100, 500], cls: "bondage" },
    { id: "rigger", icon: "🪢", name: "Rigger",         desc: "Put restraints on others {n} times",   counter: "tie_give",  tiers: [10, 50, 250], cls: "bondage" },
    // Suggested by Sally. Measured from the per-item timers, so they carry across
    // rooms and offline time the same way the bound streak does. A collar does
    // not count toward "bound" - neck groups are excluded by default, and the
    // exclusion list is editable if you want it to.
    { id: "gagged", icon: "🤐", name: "Quiet Sub",    desc: "Stay gagged {n} hours straight",        counter: "gag_h",    tiers: [6, 24, 100], cls: "bondage" },
    { id: "chaste", icon: "🔐", name: "Locked Away",  desc: "Stay in chastity {n} hours straight",   counter: "chaste_h", tiers: [24, 168, 720], cls: "bondage" },
    // ⭐ Emery - rare single golden unlocks
    { id: "pat_the_dev",   icon: "⭐", name: "Pat the Kitty",   desc: "Headpat Emery {n} times",      counter: "pet_emery",   tiers: [5],  cls: "emery", rare: true },
    { id: "boop_the_dev",  icon: "⭐", name: "Boop the Kitty",  desc: "Boop Emery {n} times",         counter: "boop_emery",  tiers: [10], cls: "emery", rare: true },
    { id: "hug_the_dev",   icon: "⭐", name: "Kitty Cuddler",   desc: "Hug Emery {n} times",          counter: "hug_emery",   tiers: [10], cls: "emery", rare: true },
    { id: "spank_the_dev", icon: "⭐", name: "Brave Soul",      desc: "Spank Emery {n} times",        counter: "spank_emery", tiers: [5],  cls: "emery", rare: true },
    { id: "dev_wrangler",  icon: "⭐", name: "Kitty Rigger",    desc: "Tie Emery up",                 counter: "bind_emery",  tiers: [1],  cls: "emery", rare: true },
    { id: "devs_favorite", icon: "⭐", name: "Kitty's Favorite", desc: "Emery does {n} things to you", counter: "from_emery", tiers: [25], cls: "emery", rare: true },

    // Things done TO you. The receiving side had no idea about spanks or
    // tickles before these, so both are now detected there too.
    { id: "spanked_by_dev", icon: "⭐", name: "Kitty's Mark", desc: "Get spanked by Emery",     counter: "spank_from_emery", tiers: [1], cls: "emery", rare: true },
    { id: "patted_by_dev",  icon: "⭐", name: "Good Pet",     desc: "Get headpatted by Emery",  counter: "pet_from_emery",   tiers: [1], cls: "emery", rare: true },
    { id: "booped_by_dev",  icon: "⭐", name: "Nose Booped",  desc: "Get booped by Emery",      counter: "boop_from_emery",  tiers: [1], cls: "emery", rare: true },
    { id: "hugged_by_dev",  icon: "⭐", name: "Held Close",   desc: "Get hugged by Emery",      counter: "hug_from_emery",   tiers: [1], cls: "emery", rare: true },
    { id: "tied_by_dev",    icon: "⭐", name: "Caught",       desc: "Get tied up by Emery",     counter: "tied_by_emery",    tiers: [1], cls: "emery", rare: true },
    { id: "tickle_the_dev", icon: "⭐", name: "Menace",       desc: "Tickle Emery {n} times",   counter: "tickle_emery",     tiers: [5], cls: "emery", rare: true },
    // Thresholds track the roster length so they stay right if it grows. If you
    // are credited yourself you count toward your own total - you already know
    // who you are - so everyone needs the same number.
    { id: "met_emery", icon: "⭐", name: "Met the Kitty", desc: "Share a room with Emery",                        counter: "met_emery", tiers: [1], cls: "emery", rare: true },
    { id: "crew_met",  icon: "⭐", name: "Met the Crew",  desc: "Share a room with all {n} credited EBC people", counter: "crew_met",  tiers: [CREDITED.length], cls: "emery", rare: true },

    // Completionist is not tracked like the others - its progress is derived
    // from everything else, in completionProgress() below. It is listed last so
    // it reads as the summary of the list rather than another entry in it.
    { id: "completionist", icon: "🏆", name: "Completionist", desc: "Every achievement at its highest level", counter: "completion", tiers: [1], cls: "emery", rare: true },
];

interface AchState {
    c: Record<string, number>;  // counters
    u: Record<string, number>;  // announced tier count per achievement id
    p?: number[];               // distinct member numbers who acted on you (capped)
    cm?: number[];              // credited people you have shared a room with
    cp?: number[];              // credited people you have headpatted
}

function getState(): AchState {
    try {
        const store = getSettings() as Record<string, unknown>;
        const v = store.achievements as AchState | undefined;
        if (v && typeof v === "object") {
            if (!v.c || typeof v.c !== "object") v.c = {};
            if (!v.u || typeof v.u !== "object") v.u = {};
            return v;
        }
        const fresh: AchState = { c: {}, u: {} };
        store.achievements = fresh;
        return fresh;
    } catch {
        return { c: {}, u: {} };
    }
}

// -- Testing: reset and restore ----------------------------------------------
// Wiping achievements is the only way to see an unlock fire twice, so it exists
// - but real progress is years of play, so a reset always takes a copy first
// and the copy is never overwritten by a second reset. Creator only: this is a
// testing tool, not a feature, and an accidental reset with no way back would
// be a genuinely miserable thing to do to somebody.

const ACH_BACKUP_LS = "EBC_achBackup";

/** Only the creator sees the reset controls. */
export function canResetAchievements(): boolean {
    return hasCreatorAccess(Player?.MemberNumber);
}

export function hasAchievementBackup(): boolean {
    try { return !!localStorage.getItem(ACH_BACKUP_LS); } catch { return false; }
}

/** When the held copy was taken, for showing next to the restore button. */
export function achievementBackupAge(): string | null {
    try {
        const raw = localStorage.getItem(ACH_BACKUP_LS);
        if (!raw) return null;
        const ts = (JSON.parse(raw) as { ts?: number }).ts;
        if (typeof ts !== "number") return null;
        const mins = Math.floor((Date.now() - ts) / 60_000);
        if (mins < 1) return "just now";
        if (mins < 60) return `${mins} min ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
        const days = Math.floor(hrs / 24);
        return `${days} day${days === 1 ? "" : "s"} ago`;
    } catch { return null; }
}

/**
 * Clears all progress, keeping a copy. The copy is only taken when there is not
 * already one - so resetting twice in a row still restores the state you had
 * before you started testing, not the empty one from the first reset.
 */
export function resetAchievementsForTesting(): boolean {
    if (!canResetAchievements()) return false;
    try {
        const store = getSettings() as Record<string, unknown>;
        if (!hasAchievementBackup()) {
            const snapshot = JSON.stringify({ ts: Date.now(), state: store.achievements ?? {} });
            localStorage.setItem(ACH_BACKUP_LS, snapshot);
        }
        store.achievements = { c: {}, u: {} } as AchState;
        syncSettings();
        return true;
    } catch { return false; }
}

/** Puts the held copy back and discards it. */
export function restoreAchievements(): boolean {
    if (!canResetAchievements()) return false;
    try {
        const raw = localStorage.getItem(ACH_BACKUP_LS);
        if (!raw) return false;
        const parsed = JSON.parse(raw) as { state?: unknown };
        if (!parsed.state || typeof parsed.state !== "object") return false;
        const store = getSettings() as Record<string, unknown>;
        store.achievements = parsed.state;
        localStorage.removeItem(ACH_BACKUP_LS);
        syncSettings();
        return true;
    } catch { return false; }
}

// Debounced settings sync - counters can bump rapidly during play.
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function save(): void {
    if (_saveTimer !== null) return;
    _saveTimer = setTimeout(() => {
        _saveTimer = null;
        try { syncSettings(); } catch { /* ignore */ }
    }, 3000);
}

const TIER_TOAST_COLOR = ["#cd7f32", "#c8d0dc", "#ffd700"]; // bronze, silver, gold

/**
 * Records one credited person against a roster achievement and keeps its counter
 * in step. `key` is the AchState field, `counter` the achievement counter.
 * Your own number is seeded on first use when you are credited, so a credited
 * player is never chasing a total they cannot reach.
 */
/**
 * A quiet note the moment one of the credited crew counts. Without it you only
 * find out by opening the panel later, by which point the person has gone and
 * the chance to pet them for the other achievement has gone with them.
 */
function showCrewToast(name: string, kind: "met" | "petted", done: number, total: number): void {
    try {
        const el = document.createElement("div");
        el.style.cssText = "position:fixed;bottom:180px;left:50%;transform:translateX(-50%);"
            + "background:#160a20;border:1px solid #cf6f98;border-radius:9px;padding:8px 16px;"
            + "color:#fff;font-family:'Trebuchet MS',serif;font-size:12px;z-index:999999;"
            + "cursor:pointer;text-align:center;box-shadow:0 5px 24px rgba(0,0,0,0.8);";
        const line = document.createElement("div");
        line.textContent = kind === "met" ? `\u{1F43E} Met ${name}` : `\u{1F44B} Petted ${name}`;
        const sub = document.createElement("div");
        sub.style.cssText = "font-size:10px;color:#c8a0b4;margin-top:2px;";
        sub.textContent = kind === "met"
            ? `${done} of ${total} crew met` + (done < total ? " - pet them too for Crew Cuddler" : "")
            : `${done} of ${total} crew petted`;
        el.appendChild(line);
        el.appendChild(sub);
        el.addEventListener("click", () => el.remove());
        document.body.appendChild(el);
        window.setTimeout(() => el.remove(), 7000);
    } catch { /* ignore */ }
}

function collectCredited(key: "cm" | "cp", counter: string, num: number): void {
    if (!isCredited(num)) return;
    const st = getState();
    let list = st[key];
    if (!Array.isArray(list)) { list = []; st[key] = list; }

    // Seed yourself every time, not only when the list is first created. Being
    // credited AFTER your list already existed - which is what happens whenever
    // someone new is added to the credits - left you permanently missing from
    // your own count while the checklist showed you as done. The two disagreed.
    const me = Player?.MemberNumber ?? 0;
    let changed = false;
    if (isCredited(me) && !list.includes(me)) { list.push(me); changed = true; }
    // Seeding yourself is bookkeeping, not an event - only announce other people.
    let announce = false;
    if (!list.includes(num)) { list.push(num); changed = true; announce = num !== me; }
    if (!changed) return;

    st.c[counter] = list.length;
    if (announce) {
        const who = CREDITED.find(p => p.num === num)?.name ?? `#${num}`;
        showCrewToast(who, key === "cm" ? "met" : "petted", list.length, CREDITED.length);
    }
    checkUnlocks();
    save();
}

/**
 * Who still counts against a roster achievement, by name.
 *
 * Without this the counter is opaque: you count toward your own total if you
 * are credited, so meeting one person reads as 2/6 and looks like nothing
 * happened. Naming who is left makes it obvious it registered.
 */
export function crewRosterStatus(id: string): { done: string[]; left: string[]; all: Array<{ name: string; done: boolean }> } | null {
    // "cp" was Crew Cuddler, removed - headpatting six people to finish a list
    // is pressure to touch someone who never asked. Old saved data is simply
    // ignored rather than migrated.
    const key = id === "crew_met" ? "cm" : null;
    if (!key) return null;
    try {
        const st = getState();
        const have = new Set(Array.isArray(st[key]) ? st[key] as number[] : []);
        const me = Player?.MemberNumber ?? 0;
        // Seeded lazily on first collection, so reflect it before that happens.
        if (isCredited(me)) have.add(me);
        const done: string[] = [];
        const left: string[] = [];
        const all: Array<{ name: string; done: boolean }> = [];
        for (const p of CREDITED) {
            const got = have.has(p.num);
            (got ? done : left).push(p.name);
            all.push({ name: p.name, done: got });
        }
        return { done, left, all };
    } catch { return null; }
}

/** Marks every credited person currently in the room as met. Called from the
 *  room-sync hooks rather than polled, so a brief visit still counts. */
export function achievementScanRoom(): void {
    try {
        if (!isAchievementUser(Player?.MemberNumber)) return;
        const room = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
            Array<{ MemberNumber?: number }> | undefined;
        if (!Array.isArray(room)) return;
        for (const c of room) collectCredited("cm", "crew_met", c.MemberNumber ?? -1);

        // Meeting Emery - or, when you ARE Emery, any of the credited crew,
        // since she cannot share a room with herself. Recorded once and left
        // alone; the room is scanned constantly and this is not a counter.
        const specials = specialNums();
        if (room.some(c => typeof c.MemberNumber === "number" && specials.includes(c.MemberNumber))) {
            const st = getState();
            if ((st.c["met_emery"] ?? 0) < 1) {
                st.c["met_emery"] = 1;
                checkUnlocks();
                save();
            }
        }
    } catch { /* ignore */ }
}

function tiersReached(def: AchievementDef, count: number): number {
    let n = 0;
    for (const t of def.tiers) if (count >= t) n++;
    return n;
}

function showTierToast(a: AchievementDef, tier: number): void {
    try {
        const maxed = tier >= a.tiers.length;
        const col = a.rare || maxed ? "#ffd700" : TIER_TOAST_COLOR[Math.min(tier - 1, 2)];
        const tierLabel = a.tiers.length > 1 ? ` ${tier}` : "";
        const el = document.createElement("div");
        // Clickable: it used to be pointer-events:none, so the only way past it
        // was to wait out the full six seconds.
        el.style.cssText = `position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:#160a20;border:2px solid ${col};border-radius:10px;padding:12px 26px 12px 24px;color:#fff;font-family:'Trebuchet MS',serif;font-size:13px;z-index:999999;cursor:pointer;text-align:center;box-shadow:0 6px 30px rgba(0,0,0,0.85);`;
        el.title = "Click to dismiss";
        el.addEventListener("click", () => el.remove());
        const toastClose = document.createElement("div");
        toastClose.textContent = "×";
        toastClose.style.cssText = `position:absolute;top:3px;right:8px;font-size:14px;line-height:1;color:${col}99;`;
        el.appendChild(toastClose);
        const head = document.createElement("div");
        head.style.cssText = `font-size:10.5px;color:${col};letter-spacing:0.15em;margin-bottom:3px;`;
        head.textContent = a.tiers.length > 1 && !maxed ? "🏆 ACHIEVEMENT TIER UP" : "🏆 ACHIEVEMENT UNLOCKED";
        const name = document.createElement("div");
        name.style.cssText = "font-weight:bold;font-size:14px;";
        name.textContent = `${a.icon} ${a.name}${tierLabel}`;
        const desc = document.createElement("div");
        desc.style.cssText = "font-size:10.5px;color:#b8a8c8;margin-top:2px;";
        desc.textContent = achievementDesc(a, a.tiers[tier - 1] ?? a.tiers[a.tiers.length - 1]);
        el.appendChild(head);
        el.appendChild(name);
        el.appendChild(desc);

        // A bar across the bottom showing the time left, which stops while the
        // pointer is on the toast. Without the pause it could close in the
        // instant you reached for the X, and the click landed on whatever was
        // behind it.
        const LIFE_MS = 6000;
        const track = document.createElement("div");
        track.style.cssText = "position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,0.10);border-radius:0 0 8px 8px;overflow:hidden;";
        const bar = document.createElement("div");
        bar.style.cssText = `height:100%;width:100%;background:${col};transition:width 0.1s linear;`;
        track.appendChild(bar);
        el.appendChild(track);

        let left = LIFE_MS;
        let paused = false;
        const TICK = 100;
        const timer = window.setInterval(() => {
            if (!paused) left -= TICK;
            bar.style.width = `${Math.max(0, (left / LIFE_MS) * 100)}%`;
            if (left <= 0) { window.clearInterval(timer); el.remove(); }
        }, TICK);
        el.addEventListener("mouseenter", () => { paused = true; bar.style.background = "#ffffff88"; });
        el.addEventListener("mouseleave", () => { paused = false; bar.style.background = col; });
        el.addEventListener("click", () => { window.clearInterval(timer); el.remove(); });

        document.body.appendChild(el);
    } catch { /* ignore */ }
}

function checkUnlocks(): void {
    const st = getState();
    for (const a of ACHIEVEMENTS) {
        const reached = tiersReached(a, st.c[a.counter] ?? 0);
        const announced = st.u[a.id] ?? 0;
        if (reached > announced) {
            st.u[a.id] = reached;
            showTierToast(a, reached);
        }
    }
}

function bump(counter: string, by = 1): void {
    const st = getState();
    st.c[counter] = (st.c[counter] ?? 0) + by;
    checkUnlocks();
    save();
}

/** Feed an activity message: source did actName (on actGroup) to target.
 *  The GROUP matters - BC's "Boop Nose" is the Pet activity on ItemNose, while
 *  a headpat is the same Pet activity on ItemHead. Without the group the two
 *  are indistinguishable. */
/**
 * Who the "Emery" achievements point at.
 *
 * They all say Emery, and Emery cannot do things to herself - so as written she
 * could never finish her own list. When the player IS Emery, they point at the
 * credited crew instead. Same achievement, same reward, a target she can
 * actually reach.
 *
 * Deliberately not "anyone": that would turn Brave Soul into the ordinary
 * Heavy Hand achievement and the rare ones would stop meaning anything.
 */
function specialNums(): number[] {
    const me = Player?.MemberNumber ?? 0;
    if (me !== EMERY) return [EMERY];
    return CREDITED.map(p => p.num).filter(n => n !== EMERY);
}

function isSpecialTarget(n: number | undefined): boolean {
    return typeof n === "number" && specialNums().includes(n);
}

const isFromSpecial = isSpecialTarget;

export function achievementOnActivity(
    sourceNum: number | undefined,
    targetNum: number | undefined,
    actName: string | undefined,
    actGroup?: string,
): void {
    try {
        if (!isAchievementUser(Player?.MemberNumber) || !actName) return;
        const me = Player.MemberNumber ?? 0;
        const act = actName.toLowerCase();
        const grp = (actGroup ?? "").toLowerCase();
        // Diagnostic: shows the exact activity name + group BC/addons send, so an
        // achievement that never moves can be traced in one step.
        try { console.debug(`[EBC] activity "${actName}" group="${actGroup ?? "?"}" src=${sourceNum} tgt=${targetNum}`); } catch { /* ignore */ }

        // Boop = the Pet activity aimed at the nose; headpat = Pet anywhere else.
        const isBoop = act.includes("boop") || (act.includes("pet") && grp.includes("nose"));
        const isPat  = !isBoop && act.includes("pet");
        const isHug  = act.includes("hug") || act.includes("cuddle") || act.includes("nuzzle");

        if (targetNum === me && typeof sourceNum === "number" && sourceNum !== me) {
            // Done TO you
            const isSpank  = act.includes("spank");
            const isTickle = act.includes("tickle");
            if (isBoop) bump("boop_recv");
            if (isPat) bump("pet_recv");
            if (isHug) bump("hug_recv");
            if (act.includes("kiss")) bump("kiss_recv");
            // Who it came from, per activity. Only the total existed before, so
            // "get spanked by Emery" had nothing to read.
            if (isFromSpecial(sourceNum)) {
                bump("from_emery");
                if (isSpank)  bump("spank_from_emery");
                if (isPat)    bump("pet_from_emery");
                if (isBoop)   bump("boop_from_emery");
                if (isHug)    bump("hug_from_emery");
            }
            // Distinct people who have done anything to you
            const st = getState();
            if (!Array.isArray(st.p)) st.p = [];
            if (!st.p.includes(sourceNum)) {
                st.p.push(sourceNum);
                if (st.p.length > 100) st.p.splice(0, st.p.length - 100);
                st.c["people"] = st.p.length;
                checkUnlocks();
                save();
            }
        } else if (sourceNum === me && typeof targetNum === "number" && targetNum !== me) {
            // Things YOU do to others
            const toEmery = isSpecialTarget(targetNum);
            if (isBoop) {
                bump("boop_give");
                if (toEmery) bump("boop_emery");
            }
            if (isPat) {
                bump("pet_give");
                if (toEmery) bump("pet_emery");
            }
            if (isHug) {
                bump("hug_give");
                if (toEmery) bump("hug_emery");
            }
            if (act.includes("kiss")) bump("kiss_give");
            if (act.includes("spank")) {
                bump("spank_give");
                if (toEmery) bump("spank_emery");
            }
            if (act.includes("tickle")) {
                bump("tickle_give");
                if (toEmery) bump("tickle_emery");
            }
        }
    } catch { /* ignore */ }
}

/** Feed an item-apply action: source put an item (in group) on target. */
export function achievementOnItemApply(
    sourceNum: number | undefined,
    targetNum: number | undefined,
    group: string | undefined,
): void {
    try {
        if (!isAchievementUser(Player?.MemberNumber)) return;
        if (!group || !group.startsWith("Item")) return; // restraint/item slots only
        const me = Player.MemberNumber ?? 0;
        if (targetNum === me && typeof sourceNum === "number" && sourceNum !== me) {
            bump("tied_recv");
            if (isFromSpecial(sourceNum)) bump("tied_by_emery");
        } else if (sourceNum === me && typeof targetNum === "number" && targetNum !== me) {
            bump("tie_give");
            if (isSpecialTarget(targetNum)) bump("bind_emery");
        }
    } catch { /* ignore */ }
}

/** Called when the Feedback & Bugs form is submitted (bug or feature alike). */
export function achievementOnFeedbackSent(): void {
    try {
        if (!isAchievementUser(Player?.MemberNumber)) return;
        bump("feedback_sent");
    } catch { /* ignore */ }
}

// ── Sharing ───────────────────────────────────────────────────────────────────
// An unlocked achievement is shared as a WHISPER to one chosen person - never
// broadcast to the whole room - with a cooldown so chat can't be spammed. The
// whisper carries a machine-readable Dictionary entry: the recipient's EBC
// suppresses the plain whisper text and renders a big shiny plaque instead;
// recipients without EBC just see a normal whispered emote line.

const SHARE_COOLDOWN_MS = 60_000;
let _lastShareTs = 0;

/** Milliseconds until the next share is allowed (0 = ready). */
export function getShareCooldownMs(): number {
    return Math.max(0, SHARE_COOLDOWN_MS - (Date.now() - _lastShareTs));
}

export type ShareMode = { kind: "public" } | { kind: "friends" } | { kind: "person"; num: number; name: string };

/** Shares an unlocked achievement - publicly to the room, privately to every
 *  friend present, or privately to one person. */
export function shareAchievement(
    id: string,
    mode: ShareMode,
): "ok" | "noRoom" | "locked" | "cooldown" | "noTargets" | "error" {
    try {
        const a = ACHIEVEMENTS.find(x => x.id === id);
        if (!a) return "error";
        const st = getState();
        // Derive the tier from the live counter (exactly like the UI does) - the
        // announced-unlocks map can lag until the next bump/tick runs checkUnlocks.
        const tier = tiersReached(a, st.c[a.counter] ?? 0);
        if (tier <= 0) return "locked";
        const w = window as unknown as Record<string, unknown>;
        if (w.CurrentScreen !== "ChatRoom") return "noRoom";
        if (getShareCooldownMs() > 0) return "cooldown";
        const tierLabel = a.tiers.length > 1 ? ` ${tier}` : "";
        const desc = achievementDesc(a, a.tiers[tier - 1]);
        const content = `shares an achievement: 🏆 ${a.name}${tierLabel} - ${desc}`;
        // TextDictionaryEntry - { Tag, Text } - is a shape BC knows. The old entry
        // invented AchId/AchTier fields, and a dictionary BC cannot parse leaves
        // the message unacknowledged: it stays in the pale "still sending" state
        // with the dots after it and never turns into normal chat text. That is
        // why the share looked half invisible and stuck.
        //
        // Nothing in the message contains the tag text, so no substitution
        // happens - it is only along for the ride.
        const dict = [{ Tag: "EBCACH", Text: JSON.stringify({ id: a.id, tier }) }];

        if (mode.kind === "public") {
            ServerSend("ChatRoomChat", { Content: content, Type: "Emote", Dictionary: dict } as never);
            _lastShareTs = Date.now();
            renderSharedPlaque("you shared with the room", a, tier);
            return "ok";
        }

        if (mode.kind === "friends") {
            // One whisper per friend in the room, staggered so the server's rate
            // limiter never sees a burst.
            const me = Player?.MemberNumber ?? 0;
            const room = w.ChatRoomCharacter as Array<{ MemberNumber?: number }> | undefined;
            const friends = (Player?.FriendList ?? []) as number[];
            const targets = (room ?? [])
                .map(c => c.MemberNumber)
                .filter((n): n is number => typeof n === "number" && n !== me && friends.includes(n));
            if (targets.length === 0) return "noTargets";
            targets.forEach((n, i) => {
                window.setTimeout(() => {
                    try { ServerSend("ChatRoomChat", { Content: content, Type: "Whisper", Target: n, Dictionary: dict } as never); } catch { /* ignore */ }
                }, i * 350);
            });
            _lastShareTs = Date.now();
            renderSharedPlaque(`you shared with ${targets.length} friend${targets.length === 1 ? "" : "s"}`, a, tier);
            return "ok";
        }

        ServerSend("ChatRoomChat", { Content: content, Type: "Whisper", Target: mode.num, Dictionary: dict } as never);
        _lastShareTs = Date.now();
        // Local confirmation plaque for the sender (whispers aren't echoed back).
        renderSharedPlaque(`you shared with ${mode.name}`, a, tier);
        return "ok";
    } catch { return "error"; }
}

// One plaque per sender per 30s - a hand-crafted whisper flood can't fill the log.
const _plaqueLastBySender = new Map<number, number>();

/** Detects an incoming achievement share. Renders the plaque and returns true
 *  so the caller suppresses the plain whisper. Works for EVERY EBC user. */
export function handleAchievementShareMessage(data: Record<string, unknown> | null | undefined): boolean {
    try {
        if (!data || (data.Type !== "Emote" && data.Type !== "Chat" && data.Type !== "Whisper")) return false;
        const dict = Array.isArray(data.Dictionary) ? data.Dictionary as Array<Record<string, unknown>> : [];
        const entry = dict.find(d => d?.Tag === "EBCACH");
        if (!entry) return false;
        // Respect the viewer: opted out, or plaques switched off = show nothing
        // special, let BC render the plain message instead.
        if (!getShowSharedPlaques()) return false;
        // Read the new { Text: "{id,tier}" } form, falling back to the old
        // AchId/AchTier fields so shares from anyone still on an older build
        // keep rendering as a plaque instead of silently doing nothing.
        let sharedId: unknown = entry.AchId;
        let sharedTier: unknown = entry.AchTier;
        if (typeof entry.Text === "string") {
            try {
                const parsed = JSON.parse(entry.Text) as { id?: unknown; tier?: unknown };
                if (parsed && typeof parsed === "object") {
                    sharedId = parsed.id ?? sharedId;
                    sharedTier = parsed.tier ?? sharedTier;
                }
            } catch { /* not ours after all - fall through to the old fields */ }
        }
        const a = ACHIEVEMENTS.find(x => x.id === sharedId);
        if (!a) return false;
        const senderNum = typeof data.Sender === "number" ? data.Sender : 0;
        // Our own room share comes straight back to us, and shareAchievement has
        // already drawn the nicer "you shared with the room" plaque. Without this
        // the sharer saw the same achievement twice, once as themselves and once
        // as "shared by <own name>".
        if (senderNum && senderNum === (Player?.MemberNumber ?? -1)) return true;
        const last = _plaqueLastBySender.get(senderNum) ?? 0;
        if (Date.now() - last < 30_000) return true; // swallow the spam silently
        _plaqueLastBySender.set(senderNum, Date.now());
        const tier = typeof sharedTier === "number" ? Math.max(1, Math.min(sharedTier, a.tiers.length)) : 1;
        let senderName = `#${senderNum}`;
        try {
            const room = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
                Array<{ MemberNumber?: number; Nickname?: string; Name?: string }> | undefined;
            const c = room?.find(x => x.MemberNumber === senderNum);
            if (c) senderName = (c.Nickname ?? "").trim() || c.Name || senderName;
        } catch { /* ignore */ }
        return renderSharedPlaque(`shared by ${senderName}`, a, tier);
    } catch { return false; }
}

function ensureShineStyle(): void {
    if (document.getElementById("ebc-ach-shine-style")) return;
    const st = document.createElement("style");
    st.id = "ebc-ach-shine-style";
    st.textContent = "@keyframes ebcAchShine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }";
    // (The sweep speed is set per-plaque below - keep it slow and subtle.)
    document.head.appendChild(st);
}

/** Big shiny plaque in the chat log - deliberately larger than normal messages,
 *  like addon update notices, but in EBC's dark + metal style. */
function renderSharedPlaque(byline: string, a: AchievementDef, tier: number): boolean {
    try {
        const log = document.getElementById("TextAreaChatLog");
        if (!log) return false;
        ensureShineStyle();
        const maxed = tier >= a.tiers.length;
        const metal = a.rare || maxed ? "#ffd700" : tier === 2 ? "#c8d0dc" : "#cd7f32";
        const tierLabel = a.tiers.length > 1 ? ` ${tier}` : "";
        const desc = achievementDesc(a, a.tiers[tier - 1]);

        const plaque = document.createElement("div");
        plaque.style.cssText = [
            "margin:4px 4px",
            "padding:7px 12px",
            "border-radius:8px",
            `border:1px solid ${metal}99`,
            // The sweep is an overlay on top of a solid base. It used to be one
            // gradient whose middle stop was the metal at 8% alpha, which made
            // the plaque nearly see-through there - on BC's default light chat
            // log that read as a glaring white band rather than a metal sheen.
            "background-color:rgba(22,10,20,0.96)",
            `background-image:linear-gradient(120deg, transparent 42%, ${metal}1c 50%, transparent 58%)`,
            "background-size:200% 100%",
            "animation:ebcAchShine 14s linear infinite",
            `box-shadow:inset 0 1px 0 rgba(255,255,255,0.06)`,
            "font-family:'Trebuchet MS',serif",
            "text-align:center",
            "position:relative",
        ].join(";");

        // Plaques stay in the log forever, so give people a way out of one.
        const close = document.createElement("div");
        close.textContent = "×";
        close.title = "Dismiss this achievement";
        close.style.cssText = `position:absolute;top:2px;right:7px;font-size:14px;line-height:1;color:${metal}88;cursor:pointer;padding:2px 4px;`;
        close.addEventListener("mouseenter", () => { close.style.color = metal; });
        close.addEventListener("mouseleave", () => { close.style.color = `${metal}88`; });
        close.addEventListener("click", (ev) => { ev.stopPropagation(); plaque.remove(); });

        const head = document.createElement("div");
        head.style.cssText = `font-size:8.5px;letter-spacing:0.14em;color:${metal}bb;text-transform:uppercase;`;
        head.textContent = `Achievement · ${byline}`;
        const nameEl = document.createElement("div");
        nameEl.style.cssText = `font-size:13px;font-weight:bold;color:${metal};margin-top:1px;`;
        nameEl.textContent = a.name + tierLabel + (a.rare ? " ★" : "");
        const descEl = document.createElement("div");
        descEl.style.cssText = "font-size:10.5px;color:#c0aec4;margin-top:1px;";
        descEl.textContent = desc;

        plaque.appendChild(close);
        plaque.appendChild(head);
        plaque.appendChild(nameEl);
        plaque.appendChild(descEl);
        log.appendChild(plaque);
        log.scrollTop = log.scrollHeight;
        return true;
    } catch { return false; }
}

/** Progress rows for the DEV-tab UI. */
export interface AchievementProgress extends AchievementDef {
    value: number;        // raw counter
    tier: number;         // tiers reached (0 = locked)
    maxed: boolean;
    nextTarget: number | null;  // next threshold, null when maxed
    tierLabel: string;    // "II" etc., "" for single-tier or locked
    descNow: string;      // desc for the next target (or the final tier when maxed)
}

export function getAchievementProgress(): AchievementProgress[] {
    const st = getState();
    return ACHIEVEMENTS.map(a => {
        const value = st.c[a.counter] ?? 0;
        const tier = tiersReached(a, value);
        const maxed = tier >= a.tiers.length;
        const nextTarget = maxed ? null : a.tiers[tier];
        const descN = maxed ? a.tiers[a.tiers.length - 1] : a.tiers[tier];
        return {
            ...a,
            value,
            tier,
            maxed,
            nextTarget,
            tierLabel: a.tiers.length > 1 && tier > 0 ? String(tier) : "",
            descNow: achievementDesc(a, descN),
        };
    });
}

// Periodic tick, now only the continuous bound streak - the room-time
// achievements were removed because how long you have been somewhere cannot be
// measured honestly across reloads and reconnects.
// No-op for non-achievement users; cheap enough to just run.
const TICK_MS = 5 * 60 * 1000;

setInterval(() => {
    try {
        if (!isAchievementUser(Player?.MemberNumber)) return;
        const st = getState();

        // Longest continuous bound streak (any room). Read from the per-item
        // restraint timers, which persist across rooms and offline, so this is
        // the one time-based achievement that does not depend on room tracking.
        const best = (key: string, ms: number): void => {
            const hours = Math.floor(ms / 3_600_000);
            if (hours > (st.c[key] ?? 0)) st.c[key] = hours;
        };
        best("bound_h",  getRestrainedMs());
        best("gag_h",    getGaggedMs());
        best("chaste_h", getChastityMs());

        checkUnlocks();
        save();
    } catch { /* ignore */ }
}, TICK_MS);
