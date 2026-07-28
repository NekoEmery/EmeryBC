// Achievement system - currently limited to the credits crew (devs & friends).
// Tiered: most achievements level up through thresholds (e.g. 5 → 25 → 100) and
// their card upgrades bronze → silver → gold. Counts things done TO the player
// (pats, hugs, kisses, being tied...), things the player DOES (boops, pats,
// hugs), plus rare Emery-targeted ones. Progress lives in EBC settings (synced,
// tiny); tier-ups pop a toast. Fed from main.ts's ChatRoomMessage hook.

import { getSettings, syncSettings } from "./bcUtils";
import { getRestraintMs } from "./timer";
import { CREDITED, ACHIEVEMENT_MEMBERS, isCredited } from "./crew";

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

/** Crew member who hasn't opted out - gates tracking, the trophy, and the popup. */
export function isAchievementUser(memberNumber: number | null | undefined): boolean {
    return isAchievementCrewMember(memberNumber) && !isAchievementsOptedOut();
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

/** Fills {n} in a description, honouring the def's formatter. */
export function achievementDesc(a: AchievementDef, n: number): string {
    return a.desc.replace("{n}", a.fmtN ? a.fmtN(n) : String(n));
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
    { id: "streak", icon: "⏳", name: "Living in Rope", desc: "Stay bound {n} hours straight",        counter: "bound_h",   tiers: [24, 100, 500], cls: "bondage" },
    { id: "rigger", icon: "🪢", name: "Rigger",         desc: "Put restraints on others {n} times",   counter: "tie_give",  tiers: [10, 50, 250], cls: "bondage" },
    // ⭐ Emery - rare single golden unlocks
    { id: "pat_the_dev",   icon: "⭐", name: "Pat the Kitty",   desc: "Headpat Emery {n} times",      counter: "pet_emery",   tiers: [5],  cls: "emery", rare: true },
    { id: "boop_the_dev",  icon: "⭐", name: "Boop the Kitty",  desc: "Boop Emery {n} times",         counter: "boop_emery",  tiers: [10], cls: "emery", rare: true },
    { id: "hug_the_dev",   icon: "⭐", name: "Kitty Cuddler",   desc: "Hug Emery {n} times",          counter: "hug_emery",   tiers: [10], cls: "emery", rare: true },
    { id: "spank_the_dev", icon: "⭐", name: "Brave Soul",      desc: "Spank Emery {n} times",        counter: "spank_emery", tiers: [5],  cls: "emery", rare: true },
    { id: "dev_wrangler",  icon: "⭐", name: "Kitty Rigger",    desc: "Tie Emery up",                 counter: "bind_emery",  tiers: [1],  cls: "emery", rare: true },
    { id: "devs_favorite", icon: "⭐", name: "Kitty's Favorite", desc: "Emery does {n} things to you", counter: "from_emery", tiers: [25], cls: "emery", rare: true },
    { id: "hq_visitor",    icon: "⭐", name: "HQ Regular",       desc: "Spend {n} hours in EBC HQ",    counter: "hq_h",       tiers: [1], cls: "emery", rare: true },
    // Thresholds track the roster length so they stay right if it grows. If you
    // are credited yourself you count toward your own total - you already know
    // who you are - so everyone needs the same number.
    { id: "crew_met", icon: "⭐", name: "Met the Crew",  desc: "Share a room with all {n} credited EBC people", counter: "crew_met", tiers: [CREDITED.length], cls: "emery", rare: true },
    { id: "crew_pet", icon: "⭐", name: "Crew Cuddler",  desc: "Headpat all {n} credited EBC people",           counter: "crew_pet", tiers: [CREDITED.length], cls: "emery", rare: true },
];

interface AchState {
    c: Record<string, number>;  // counters
    u: Record<string, number>;  // announced tier count per achievement id
    p?: number[];               // distinct member numbers who acted on you (capped)
    cm?: number[];              // credited people you have shared a room with
    cp?: number[];              // credited people you have headpatted
    // Kept in state rather than a module variable so a page reload does not
    // reset it - this is a lifetime total, not a per-session one.
    hqMin?: number;             // total minutes in EBC HQ, all sessions
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

const TIER_TOAST_COLOR = ["#cd7f32", "#c8d0dc", "#ffd700"]; // bronze, silver, gold

/**
 * Records one credited person against a roster achievement and keeps its counter
 * in step. `key` is the AchState field, `counter` the achievement counter.
 * Your own number is seeded on first use when you are credited, so a credited
 * player is never chasing a total they cannot reach.
 */
function collectCredited(key: "cm" | "cp", counter: string, num: number): void {
    if (!isCredited(num)) return;
    const st = getState();
    let list = st[key];
    if (!Array.isArray(list)) {
        list = [];
        st[key] = list;
        const me = Player?.MemberNumber ?? 0;
        if (isCredited(me)) list.push(me);
    }
    if (list.includes(num)) return;
    list.push(num);
    st.c[counter] = list.length;
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
export function crewRosterStatus(id: string): { done: string[]; left: string[] } | null {
    const key = id === "crew_met" ? "cm" : id === "crew_pet" ? "cp" : null;
    if (!key) return null;
    try {
        const st = getState();
        const have = new Set(Array.isArray(st[key]) ? st[key] as number[] : []);
        const me = Player?.MemberNumber ?? 0;
        // Seeded lazily on first collection, so reflect it before that happens.
        if (isCredited(me)) have.add(me);
        const done: string[] = [];
        const left: string[] = [];
        for (const p of CREDITED) (have.has(p.num) ? done : left).push(p.name);
        return { done, left };
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

/** Feed an activity message: source did actName (on actGroup) to target.
 *  The GROUP matters - BC's "Boop Nose" is the Pet activity on ItemNose, while
 *  a headpat is the same Pet activity on ItemHead. Without the group the two
 *  are indistinguishable. */
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
            if (isBoop) bump("boop_recv");
            if (isPat) bump("pet_recv");
            if (isHug) bump("hug_recv");
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
            if (isBoop) {
                bump("boop_give");
                if (toEmery) bump("boop_emery");
            }
            if (isPat) {
                bump("pet_give");
                if (toEmery) bump("pet_emery");
                collectCredited("cp", "crew_pet", targetNum);
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
        const dict = [{ Tag: "EBCACH", AchId: a.id, AchTier: tier }];

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
        const a = ACHIEVEMENTS.find(x => x.id === entry.AchId);
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
        const tier = typeof entry.AchTier === "number" ? Math.max(1, Math.min(entry.AchTier, a.tiers.length)) : 1;
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

// Periodic tick: bound streak, bound-in-one-room streak, and time spent in EBC
// HQ. No-op for non-achievement users; cheap enough to just run.
const TICK_MS = 5 * 60 * 1000;
const HQ_ROOM = "emerybc (ebc) hq";

setInterval(() => {
    try {
        if (!isAchievementUser(Player?.MemberNumber)) return;
        const w = window as unknown as Record<string, unknown>;
        const room = String((w.ChatRoomData as { Name?: string } | null | undefined)?.Name ?? "");
        const st = getState();

        // Longest continuous bound streak (any room).
        const hours = Math.floor(getRestraintMs() / 3_600_000);
        if (hours > (st.c["bound_h"] ?? 0)) st.c["bound_h"] = hours;

        // Total time in the EBC HQ support room. A total, not a streak, so it
        // persists across sessions - two half-hour visits add up.
        if (room.trim().toLowerCase() === HQ_ROOM) {
            st.hqMin = (st.hqMin ?? 0) + TICK_MS / 60_000;
            st.c["hq_h"] = Math.floor(st.hqMin / 60);
        }

        checkUnlocks();
        save();
    } catch { /* ignore */ }
}, TICK_MS);
