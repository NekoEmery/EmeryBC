// Achievement system - currently limited to the credits crew (devs & friends).
// Tiered: most achievements level up through thresholds (e.g. 5 → 25 → 100) and
// their card upgrades bronze → silver → gold. Counts things done TO the player
// (pats, hugs, kisses, being tied...), things the player DOES (boops, pats,
// hugs), plus rare Emery-targeted ones. Progress lives in EBC settings (synced,
// tiny); tier-ups pop a toast. Fed from main.ts's ChatRoomMessage hook.

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
    /** Description template - {n} is replaced with the tier threshold. */
    desc: string;
    counter: string;
    /** Ascending thresholds. One entry = single unlock; three = bronze/silver/gold. */
    tiers: number[];
    /** Achievement class - groups the list (see ACHIEVEMENT_CLASSES). */
    cls: string;
    rare?: boolean;
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
    { id: "popular", icon: "🌟", name: "Popular",       desc: "{n} different people do things to you", counter: "people",    tiers: [5, 25, 100], cls: "received" },
    // 🖐 Given - things YOU do to others
    { id: "boops",     icon: "👉", name: "Boop!",          desc: "Boop someone {n} times",    counter: "boop_give",   tiers: [10, 50, 250], cls: "given" },
    { id: "patgiver",  icon: "🖐", name: "Pat Dispenser",  desc: "Headpat others {n} times",  counter: "pet_give",    tiers: [10, 50, 250], cls: "given" },
    { id: "huggiver",  icon: "💞", name: "Hug Dealer",     desc: "Give {n} hugs",             counter: "hug_give",    tiers: [10, 50, 250], cls: "given" },
    { id: "kissgiver", icon: "😘", name: "Kiss Bandit",    desc: "Kiss others {n} times",     counter: "kiss_give",   tiers: [10, 50, 250], cls: "given" },
    { id: "spanker",   icon: "🍑", name: "Heavy Hand",     desc: "Spank others {n} times",    counter: "spank_give",  tiers: [10, 50, 250], cls: "given" },
    { id: "tickler",   icon: "🪶", name: "Tickle Monster", desc: "Tickle others {n} times",   counter: "tickle_give", tiers: [10, 50, 250], cls: "given" },
    // ⛓ Bondage
    { id: "tied",   icon: "⛓",  name: "Tied Down",      desc: "Have restraints put on you {n} times", counter: "tied_recv", tiers: [5, 25, 100],  cls: "bondage" },
    { id: "streak", icon: "⏳", name: "Living in Rope", desc: "Stay bound {n} hours straight",        counter: "bound_h",   tiers: [24, 100, 500], cls: "bondage" },
    { id: "rigger", icon: "🪢", name: "Rigger",         desc: "Put restraints on others {n} times",   counter: "tie_give",  tiers: [10, 50, 250], cls: "bondage" },
    // ⭐ Emery - rare single golden unlocks
    { id: "pat_the_dev",   icon: "⭐", name: "Pat the Dev",    desc: "Headpat Emery {n} times",      counter: "pet_emery",   tiers: [5],  cls: "emery", rare: true },
    { id: "boop_the_dev",  icon: "⭐", name: "Boop the Dev",   desc: "Boop Emery {n} times",         counter: "boop_emery",  tiers: [10], cls: "emery", rare: true },
    { id: "hug_the_dev",   icon: "⭐", name: "Dev Cuddler",    desc: "Hug Emery {n} times",          counter: "hug_emery",   tiers: [10], cls: "emery", rare: true },
    { id: "spank_the_dev", icon: "⭐", name: "Brave Soul",     desc: "Spank Emery {n} times",        counter: "spank_emery", tiers: [5],  cls: "emery", rare: true },
    { id: "dev_wrangler",  icon: "⭐", name: "Dev Wrangler",   desc: "Tie Emery up",                 counter: "bind_emery",  tiers: [1],  cls: "emery", rare: true },
    { id: "devs_favorite", icon: "⭐", name: "Dev's Favorite", desc: "Emery does {n} things to you", counter: "from_emery",  tiers: [25], cls: "emery", rare: true },
];

interface AchState {
    c: Record<string, number>;  // counters
    u: Record<string, number>;  // announced tier count per achievement id
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

const ROMAN = ["I", "II", "III", "IV", "V"];
const TIER_TOAST_COLOR = ["#cd7f32", "#c8d0dc", "#ffd700"]; // bronze, silver, gold

function tiersReached(def: AchievementDef, count: number): number {
    let n = 0;
    for (const t of def.tiers) if (count >= t) n++;
    return n;
}

function showTierToast(a: AchievementDef, tier: number): void {
    try {
        const maxed = tier >= a.tiers.length;
        const col = a.rare || maxed ? "#ffd700" : TIER_TOAST_COLOR[Math.min(tier - 1, 2)];
        const tierLabel = a.tiers.length > 1 ? ` ${ROMAN[tier - 1] ?? tier}` : "";
        const el = document.createElement("div");
        el.style.cssText = `position:fixed;bottom:120px;left:50%;transform:translateX(-50%);background:#160a20;border:2px solid ${col};border-radius:10px;padding:12px 24px;color:#fff;font-family:'Trebuchet MS',serif;font-size:13px;z-index:999999;pointer-events:none;text-align:center;box-shadow:0 6px 30px rgba(0,0,0,0.85);`;
        const head = document.createElement("div");
        head.style.cssText = `font-size:10.5px;color:${col};letter-spacing:0.15em;margin-bottom:3px;`;
        head.textContent = a.tiers.length > 1 && !maxed ? "🏆 ACHIEVEMENT TIER UP" : "🏆 ACHIEVEMENT UNLOCKED";
        const name = document.createElement("div");
        name.style.cssText = "font-weight:bold;font-size:14px;";
        name.textContent = `${a.icon} ${a.name}${tierLabel}`;
        const desc = document.createElement("div");
        desc.style.cssText = "font-size:10.5px;color:#b8a8c8;margin-top:2px;";
        desc.textContent = a.desc.replace("{n}", String(a.tiers[tier - 1] ?? a.tiers[a.tiers.length - 1]));
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
            // Done TO you
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
        } else if (sourceNum === me && typeof targetNum === "number" && targetNum !== me) {
            // Things YOU do to others
            const toEmery = targetNum === EMERY;
            if (act.includes("boop")) {
                bump("boop_give");
                if (toEmery) bump("boop_emery");
            }
            if (act.includes("pet")) {
                bump("pet_give");
                if (toEmery) bump("pet_emery");
            }
            if (act.includes("hug") || act.includes("cuddle")) {
                bump("hug_give");
                if (toEmery) bump("hug_emery");
            }
            if (act.includes("kiss")) bump("kiss_give");
            if (act.includes("spank")) {
                bump("spank_give");
                if (toEmery) bump("spank_emery");
            }
            if (act.includes("tickle")) bump("tickle_give");
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
        } else if (sourceNum === me && typeof targetNum === "number" && targetNum !== me) {
            bump("tie_give");
            if (targetNum === EMERY) bump("bind_emery");
        }
    } catch { /* ignore */ }
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
            tierLabel: a.tiers.length > 1 && tier > 0 ? (ROMAN[tier - 1] ?? String(tier)) : "",
            descNow: a.desc.replace("{n}", String(descN)),
        };
    });
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
