// Achievement system - currently limited to the credits crew (devs & friends).
// Counts things done TO the player (pats, hugs, kisses, being tied...) plus a
// few rare Emery-targeted ones. Progress lives in EBC settings (synced, tiny);
// unlocks pop a golden toast. Fed from main.ts's ChatRoomMessage hook.

import { getSettings, syncSettings } from "./bcUtils";
import { getRestraintMs } from "./timer";

// Same crew as the credits tab. Only these members track or see achievements.
export const ACHIEVEMENT_MEMBERS = [130267, 143776, 124264, 230466, 80];
const EMERY = 130267;

export function isAchievementUser(memberNumber: number | null | undefined): boolean {
    return typeof memberNumber === "number" && ACHIEVEMENT_MEMBERS.includes(memberNumber);
}

export interface AchievementDef {
    id: string;
    icon: string;
    name: string;
    desc: string;
    counter: string;
    target: number;
    rare?: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
    // Things done TO you
    { id: "pat_magnet",    icon: "🐾", name: "Pat Magnet",     desc: "Get headpatted 25 times",                 counter: "pet_recv",  target: 25 },
    { id: "pat_addict",    icon: "💖", name: "Pat Addict",     desc: "Get headpatted 250 times",                counter: "pet_recv",  target: 250 },
    { id: "hug_collector", icon: "🤗", name: "Hug Collector",  desc: "Receive 50 hugs",                         counter: "hug_recv",  target: 50 },
    { id: "cherished",     icon: "💋", name: "Cherished",      desc: "Receive 100 kisses",                      counter: "kiss_recv", target: 100 },
    { id: "popular",       icon: "🌟", name: "Popular",        desc: "25 different people do things to you",    counter: "people",    target: 25 },
    { id: "tied_down",     icon: "⛓",  name: "Tied Down",      desc: "Have restraints put on you 50 times",     counter: "tied_recv", target: 50 },
    { id: "iron_streak",   icon: "⏳", name: "Living in Rope", desc: "Stay bound for 24 hours straight",        counter: "bound_h",   target: 24 },
    // Rare - Emery-targeted
    { id: "pat_the_dev",   icon: "⭐", name: "Pat the Dev",    desc: "Headpat Emery 5 times",                   counter: "pet_emery",  target: 5,  rare: true },
    { id: "dev_wrangler",  icon: "⭐", name: "Dev Wrangler",   desc: "Tie Emery up",                            counter: "bind_emery", target: 1,  rare: true },
    { id: "devs_favorite", icon: "⭐", name: "Dev's Favorite", desc: "Emery does 25 things to you",             counter: "from_emery", target: 25, rare: true },
];

interface AchState {
    c: Record<string, number>;  // counters
    u: Record<string, number>;  // unlocked: id -> unix ms
    p?: number[];               // distinct member numbers who acted on you (capped)
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

// Debounced settings sync - counters can bump rapidly during play.
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function save(): void {
    if (_saveTimer !== null) return;
    _saveTimer = setTimeout(() => {
        _saveTimer = null;
        try { syncSettings(); } catch { /* ignore */ }
    }, 3000);
}

function showUnlockToast(a: AchievementDef): void {
    try {
        const col = a.rare ? "#ffd700" : "#cf6f98";
        const el = document.createElement("div");
        el.style.cssText = `position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:#160a20;border:2px solid ${col};border-radius:10px;padding:12px 24px;color:#fff;font-family:'Trebuchet MS',serif;font-size:13px;z-index:999999;pointer-events:none;text-align:center;box-shadow:0 6px 30px rgba(0,0,0,0.85);`;
        const head = document.createElement("div");
        head.style.cssText = `font-size:10.5px;color:${col};letter-spacing:0.15em;margin-bottom:3px;`;
        head.textContent = "🏆 ACHIEVEMENT UNLOCKED";
        const name = document.createElement("div");
        name.style.cssText = "font-weight:bold;font-size:14px;";
        name.textContent = `${a.icon} ${a.name}`;
        const desc = document.createElement("div");
        desc.style.cssText = "font-size:10.5px;color:#b8a8c8;margin-top:2px;";
        desc.textContent = a.desc;
        el.appendChild(head);
        el.appendChild(name);
        el.appendChild(desc);
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 6000);
    } catch { /* ignore */ }
}

function checkUnlocks(): void {
    const st = getState();
    for (const a of ACHIEVEMENTS) {
        if (st.u[a.id]) continue;
        if ((st.c[a.counter] ?? 0) >= a.target) {
            st.u[a.id] = Date.now();
            showUnlockToast(a);
        }
    }
}

function bump(counter: string, by = 1): void {
    const st = getState();
    st.c[counter] = (st.c[counter] ?? 0) + by;
    checkUnlocks();
    save();
}

/** Feed an activity message: source did actName to target. */
export function achievementOnActivity(
    sourceNum: number | undefined,
    targetNum: number | undefined,
    actName: string | undefined,
): void {
    try {
        if (!isAchievementUser(Player?.MemberNumber) || !actName) return;
        const me = Player.MemberNumber ?? 0;
        const act = actName.toLowerCase();

        if (targetNum === me && typeof sourceNum === "number" && sourceNum !== me) {
            if (act.includes("pet")) bump("pet_recv");
            if (act.includes("hug") || act.includes("cuddle")) bump("hug_recv");
            if (act.includes("kiss")) bump("kiss_recv");
            if (sourceNum === EMERY) bump("from_emery");
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
        } else if (sourceNum === me && targetNum === EMERY && me !== EMERY) {
            if (act.includes("pet")) bump("pet_emery");
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
        } else if (sourceNum === me && targetNum === EMERY && me !== EMERY) {
            bump("bind_emery");
        }
    } catch { /* ignore */ }
}

// ── Worn badge ────────────────────────────────────────────────────────────────
// One unlocked achievement can be "worn" - its icon travels in EBC's presence
// broadcast and other EBC users see it next to the name in People-in-Room.

let _presenceRefresh: (() => void) | null = null;
/** main.ts registers its presence broadcaster here so badge changes push out. */
export function setPresenceRefreshCallback(cb: () => void): void {
    _presenceRefresh = cb;
}

export function getWornBadgeId(): string | null {
    try {
        const st = getState() as AchState & { w?: string };
        return typeof st.w === "string" && st.w ? st.w : null;
    } catch { return null; }
}

/** The worn badge's icon, for the presence payload. Null when nothing worn. */
export function getWornBadgeIcon(): string | null {
    const id = getWornBadgeId();
    if (!id) return null;
    const st = getState();
    if (!st.u[id]) return null; // must actually be unlocked
    return ACHIEVEMENTS.find(a => a.id === id)?.icon ?? null;
}

/** Wear an unlocked achievement's badge (null = wear nothing). */
export function setWornBadge(id: string | null): boolean {
    try {
        const st = getState() as AchState & { w?: string };
        if (id !== null && !st.u[id]) return false; // not unlocked
        if (id === null) delete st.w; else st.w = id;
        syncSettings();
        try { _presenceRefresh?.(); } catch { /* ignore */ }
        return true;
    } catch { return false; }
}

/** Cap incoming badge strings from other clients - emoji only, no essays. */
export function sanitizeBadgeIcon(v: unknown): string | null {
    return typeof v === "string" && v.length > 0 && v.length <= 8 ? v : null;
}

/** Progress rows for the credits-tab UI. */
export function getAchievementProgress(): Array<AchievementDef & { value: number; unlockedAt: number | null }> {
    const st = getState();
    return ACHIEVEMENTS.map(a => ({
        ...a,
        value: Math.min(a.target, st.c[a.counter] ?? 0),
        unlockedAt: st.u[a.id] ?? null,
    }));
}

// Continuous bound-streak check - the counter keeps the LONGEST streak seen.
// No-op for non-achievement users; cheap enough to just run.
setInterval(() => {
    try {
        if (!isAchievementUser(Player?.MemberNumber)) return;
        const hours = Math.floor(getRestraintMs() / 3_600_000);
        const st = getState();
        if (hours > (st.c["bound_h"] ?? 0)) {
            st.c["bound_h"] = hours;
            checkUnlocks();
            save();
        }
    } catch { /* ignore */ }
}, 5 * 60 * 1000);
