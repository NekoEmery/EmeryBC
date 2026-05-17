// Kitty menu — only visible to Lucy (#230466).
// Actions target Emery (#130267).

export const LUCY_MEMBER   = 230466;
export const EMERY_MEMBER  = 130267;
const KITTY_CMD_PREFIX = "[EBC-KITTY:";

export type KittyMood = "kind" | "rough";

// ── Data types ────────────────────────────────────────────────────────────────

export interface KittyEmote {
    id: string;
    label: string;         // button label shown in the menu
    text: string;          // message body in kind mode (no asterisks / parens — those are added by BC)
    roughText?: string;    // message body used when mood is "rough" (falls back to text if empty)
    type: "emote" | "action"; // emote = * Lucy text * , action = (Lucy text)
    interactive?: boolean;    // if true, also sends a react beep so Emery can respond
    expression?: string;      // kitty expression command to send on click, e.g. "Ears:Wiggle"
    bcGroup?: string;         // BC asset group to use for ActivityRun, e.g. "ItemHead"
    bcActivity?: string;      // BC activity name to use for ActivityRun, e.g. "Pet"
    reactionCategory?: "punishment" | "reward"; // if set, fires a random reaction from that pool
}

export interface KittyItem {
    Name: string;
    Group: string;
    Color?: string | string[];
    Difficulty?: number;
    Property?: Record<string, unknown>;
    Craft?: Record<string, unknown>;
}

export interface KittyRestraintSet {
    id: string;
    label: string;
    items: KittyItem[];
    kindEmote?: string;
    roughEmote?: string;
    expression?: string;    // optional expression triggered when preset is applied
}

export interface KittyPose {
    id: string;
    label: string;
    poses: string[];        // BC pose names — empty = neutral
    kindEmote: string;      // emote sent to room in kind mode
    roughEmote: string;     // emote sent to room in rough mode
    expression?: string;    // optional expression triggered when pose is applied e.g. "Blush:Medium"
}

export interface KittyPunishmentStep {
    type: "emote" | "restraint";
    kindText?: string;    // emote step — kind mode text
    roughText?: string;   // emote step — rough mode text
    items?: KittyItem[];  // restraint step — items to apply
}

export interface KittyPunishmentReaction {
    expression?: string;  // "FaceType:State" e.g. "Blush:1"
    poses?: string[];     // BC pose names e.g. ["Kneel"]
}

export interface KittyPunishment {
    id: string;
    label: string;
    steps: KittyPunishmentStep[];
    reaction?: KittyPunishmentReaction;
    // Legacy fields kept only for migration — not written by new code
    kindEmote?: string;
    roughEmote?: string;
    restraintSetId?: string;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_EMOTES: KittyEmote[] = [
    {
        id: "headpat",  label: "🐾 Headpat",
        text:      "gently pats Emery on the head~ 🐾",
        roughText: "grabs Emery by the hair and gives her head a firm tug~ 🐾",
        type: "emote", expression: "Blush:Low",
        bcGroup: "ItemHead", bcActivity: "Pet",
    },
    {
        id: "goodgirl", label: "✨ Good girl",
        text:      "scratches Emery behind the ears~ Good girl~ ✨",
        roughText: "grabs Emery's chin and tilts it up sharply~ Good girl. For once.~",
        type: "emote", expression: "Blush:Medium",
    },
    {
        id: "treat",    label: "🍖 Treat",
        text:      "holds out a treat for her little pet~ 🍖",
        roughText: "tosses a treat at Emery's feet without even looking up~",
        type: "emote",  interactive: true,
    },
    {
        id: "praise",   label: "🎀 Praise",
        text:      "pats Emery's head with a warm smile~ Such a precious thing~ 🎀",
        roughText: "grabs the back of Emery's head and tilts it back, examining her with a smirk~ Not bad.~",
        type: "emote",  interactive: true,
    },
    {
        id: "announce", label: "💜 Mine",
        text:      "Emery belongs to Lucy~ 💜",
        roughText: "Emery is Lucy's. End of discussion.~",
        type: "action",
    },
    {
        id: "snuggle",  label: "🤗 Snuggle",
        text:      "pulls Emery into a warm snuggle, resting her chin on her head~",
        roughText: "yanks Emery close and holds her firmly in place, not letting her wiggle free~",
        type: "emote",
    },
    {
        id: "spank",    label: "👋 Spank",
        text:      "gives Emery a playful swat on the bottom~",
        roughText: "delivers a sharp smack to Emery's bottom without warning~",
        type: "emote",
        bcGroup: "ItemButt", bcActivity: "Spank",
    },
    {
        id: "bap",      label: "🐾 Bap",
        text:      "gives Emery a playful bap on the head~ 🐾",
        roughText: "gives Emery a sharp flick to the forehead without warning~",
        type: "emote",
    },
];

const DEFAULT_POSES: KittyPose[] = [
    {
        id: "allfours", label: "🐱 All fours", poses: ["AllFours"],
        kindEmote: "gently guides Emery down onto all fours, patting her head softly~",
        roughEmote: "places a firm hand on Emery's back and pushes her down to all fours~",
    },
    {
        id: "kneel", label: "🙇 Kneel", poses: ["Kneel"],
        kindEmote: "gently presses on Emery's shoulder, guiding her to kneel with a warm smile~",
        roughEmote: "grips Emery's shoulder firmly and points to the floor~",
    },
    {
        id: "kneel_spread", label: "🙇 Kneel & spread", poses: ["KneelingSpread"],
        kindEmote: "guides Emery down to her knees and nudges her legs apart with a soft smile~",
        roughEmote: "pushes Emery to her knees and kicks her legs apart~",
    },
    {
        id: "spread", label: "🦵 Spread", poses: ["Spread"],
        kindEmote: "gently nudges Emery's feet apart~",
        roughEmote: "kicks Emery's feet apart with a sharp look~",
    },
    {
        id: "legs_closed", label: "🧍 Legs closed", poses: ["LegsClosed"],
        kindEmote: "guides Emery's feet back together with a soft touch~",
        roughEmote: "snaps her fingers at Emery's feet, making her close them~",
    },
    {
        id: "handsup", label: "🙌 Hands up", poses: ["OverTheHead"],
        kindEmote: "lifts Emery's hands above her head, humming softly to herself~",
        roughEmote: "grabs Emery's wrists and raises them sharply above her head~",
    },
    {
        id: "boxTie", label: "🎀 Box tie", poses: ["BackBoxTie"],
        kindEmote: "guides Emery's arms behind her back into a neat box tie~",
        roughEmote: "pulls Emery's arms behind her back and pins them there~",
    },
    {
        id: "neutral", label: "🔄 Neutral", poses: [],
        kindEmote: "releases Emery from her position with a gentle pat on the cheek~",
        roughEmote: "releases her hold with a curt nod~",
    },
];

const DEFAULT_PUNISHMENTS: KittyPunishment[] = [
    {
        id: "badgirl", label: "😤 Bad girl",
        steps: [{ type: "emote", kindText: "tilts her head with a disappointed look~ Now now, Emery...", roughText: "snaps her fingers sharply and fixes Emery with a stern glare~" }],
        reaction: { expression: "Eyes:Sad" },
    },
    {
        id: "gag", label: "😶 Gag",
        steps: [
            { type: "emote", kindText: "reaches over and gently presses a gag to Emery's lips~ Shh, little one~", roughText: "grabs Emery's chin and firmly presses a gag in with a sharp look~" },
            { type: "restraint", items: [] },
        ],
        reaction: { expression: "Blush:1" },
    },
    {
        id: "corner", label: "🧱 Corner",
        steps: [{ type: "emote", kindText: "points to the corner with a firm but patient look~ Go think about what you did.", roughText: "marches Emery firmly to the corner by the collar~ Stay." }],
        reaction: { poses: ["Kneel"] },
    },
    {
        id: "bind", label: "⛓ Bind",
        steps: [
            { type: "emote", kindText: "takes Emery's wrists and begins wrapping them together, whispering softly~", roughText: "pins Emery's wrists behind her back and binds them without a word~" },
            { type: "restraint", items: [] },
        ],
        reaction: { expression: "Blush:1", poses: ["Kneel"] },
    },
];

// ── Storage helpers ───────────────────────────────────────────────────────────

function lsGet<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw) as T;
    } catch { /* ignore */ }
    return fallback;
}
function lsSet(key: string, val: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
}

export function getKittyMood(): KittyMood {
    const v = lsGet<string>("EBC_kittyMood", "kind");
    return v === "rough" ? "rough" : "kind";
}
export function setKittyMood(m: KittyMood): void { lsSet("EBC_kittyMood", m); }

// Seed values for existing stored emotes that predate the roughText / expression fields.
// Only applied if the field is currently undefined (user hasn't touched it yet).
const ROUGH_TEXT_SEEDS: Record<string, string> = {
    "headpat":  "grabs Emery by the hair and gives her head a firm tug~ 🐾",
    "goodgirl": "grabs Emery's chin and tilts it up sharply~ Good girl. For once.~",
    "treat":    "tosses a treat at Emery's feet without even looking up~",
    "praise":   "grabs the back of Emery's head and tilts it back, examining her with a smirk~ Not bad.~",
    "announce": "Emery is Lucy's. End of discussion.~",
    "snuggle":  "yanks Emery close and holds her firmly in place, not letting her wiggle free~",
    "spank":    "delivers a sharp smack to Emery's bottom without warning~",
    "bap":      "gives Emery a sharp flick to the forehead without warning~",
};
// "Ears" is not a valid CharacterSetFacialExpression group in BC.
// Seeds updated to valid Blush states (only applied when the field is still undefined).
const EXPRESSION_SEEDS: Record<string, string> = {
    "headpat":  "Blush:Low",
    "goodgirl": "Blush:Medium",
};
// Seed bcGroup/bcActivity for stored emotes that predate these fields (v2.2.75+).
const BC_ACTIVITY_SEEDS: Record<string, { group: string; activity: string }> = {
    "headpat": { group: "ItemHead", activity: "Pet"   },
    "spank":   { group: "ItemButt", activity: "Spank" },
};
// New emotes to seed into existing stored lists that predate them.
const NEW_EMOTE_SEEDS: KittyEmote[] = [
    {
        id: "bap",    label: "🐾 Bap",
        text:      "gives Emery a playful bap on the head~ 🐾",
        roughText: "gives Emery a sharp flick to the forehead without warning~",
        type: "emote",
    },
    {
        id: "spank",  label: "👋 Spank",
        text:      "gives Emery a playful swat on the bottom~",
        roughText: "delivers a sharp smack to Emery's bottom without warning~",
        type: "emote",
        bcGroup: "ItemButt", bcActivity: "Spank",
    },
];

export function getKittyEmotes(): KittyEmote[] {
    const raw = lsGet<KittyEmote[]>("EBC_kittyEmotes", DEFAULT_EMOTES);
    const emotes: KittyEmote[] = raw
        // Migration: remove leash emote (replaced by standalone leash button)
        .filter(e => e.id !== "leash")
        .map(e => ({
            ...e,
            // Migration: fix stored bap kind text that still says "nose" — should be "head"
            // Use .includes() rather than exact match because old seeds omitted the 🐾 emoji
            text: e.id === "bap" && e.text.includes("bap on the nose")
                ? "gives Emery a playful bap on the head~ 🐾"
                : e.text,
            // Migration: fix stored bap rough text that still says "nose" — should be "forehead"
            roughText: e.id === "bap" && (e.roughText ?? "").includes("flick on the nose")
                ? "gives Emery a sharp flick to the forehead without warning~"
                : (e.roughText ?? ROUGH_TEXT_SEEDS[e.id] ?? ""),
            expression: e.expression ?? EXPRESSION_SEEDS[e.id]  ?? "",
            // Migration: bap no longer fires a BC activity (ActivityRun sends its own chat
            // message which would say "boops nose" and conflict with the custom emote text)
            bcGroup:    e.id === "bap" ? undefined : (e.bcGroup    ?? BC_ACTIVITY_SEEDS[e.id]?.group),
            bcActivity: e.id === "bap" ? undefined : (e.bcActivity ?? BC_ACTIVITY_SEEDS[e.id]?.activity),
        }));
    // Append any new default emotes that weren't in the stored list yet
    for (const seed of NEW_EMOTE_SEEDS) {
        if (!emotes.find(e => e.id === seed.id)) {
            emotes.push({ roughText: "", expression: "", ...seed });
        }
    }
    return emotes;
}
export function saveKittyEmotes(v: KittyEmote[]): void { lsSet("EBC_kittyEmotes", v); }

export function getKittyRestraintSets(): KittyRestraintSet[] {
    // Migrate old sets that lack emote fields
    const raw = lsGet<KittyRestraintSet[]>("EBC_kittyRestraintSets", []);
    return raw.map(s => ({
        ...s,
        kindEmote:  s.kindEmote  ?? "",
        roughEmote: s.roughEmote ?? "",
    }));
}
export function saveKittyRestraintSets(v: KittyRestraintSet[]): void { lsSet("EBC_kittyRestraintSets", v); }

// New poses seeded into existing stored lists that predate them.
const NEW_POSE_SEEDS: KittyPose[] = DEFAULT_POSES.filter(p =>
    !["allfours", "kneel", "handsup", "neutral"].includes(p.id)
);

export function getKittyPoses(): KittyPose[] {
    const raw = lsGet<KittyPose[]>("EBC_kittyPoses", DEFAULT_POSES);
    const poses: KittyPose[] = raw
        // Migration: remove elbow tie (BackElbowTouch conflicts in BC)
        .filter(p => p.id !== "elbowTie")
        .map(p => ({
            ...p,
            kindEmote:  p.kindEmote  ?? "",
            roughEmote: p.roughEmote ?? "",
            // Migration: fix old PresentationKneel → KneelingSpread
            poses: p.id === "kneel_spread" && p.poses.includes("PresentationKneel")
                ? ["KneelingSpread"]
                : p.poses,
        }));
    // Additive migration: append new defaults not present in stored list
    for (const seed of NEW_POSE_SEEDS) {
        if (!poses.find(p => p.id === seed.id)) poses.push({ ...seed });
    }
    return poses;
}
export function saveKittyPoses(v: KittyPose[]): void { lsSet("EBC_kittyPoses", v); }

// ── Pet Reactions ─────────────────────────────────────────────────────────────
// Categorised one-click emotes Emery sends on Lucy's behalf.

export interface KittyReactionEntry {
    id: string;
    text: string;
    category: "punishment" | "reward";
}

const DEFAULT_REACTIONS: KittyReactionEntry[] = [
    { id: "pu1", text: "eeep~",                                                               category: "punishment" },
    { id: "pu2", text: "lets out a small startled squeak, ears pinning back~ >_<",            category: "punishment" },
    { id: "pu3", text: "squints and makes a tiny disgruntled noise~ nuu~",                    category: "punishment" },
    { id: "pu4", text: "gives a flustered huff, cheeks going pink~",                         category: "punishment" },
    { id: "rw1", text: "purrs softly~ 🐾",                                                   category: "reward" },
    { id: "rw2", text: "meows happily and nuzzles in close~",                                 category: "reward" },
    { id: "rw3", text: "gives a content little chirp and flicks her tail~ ♪",                category: "reward" },
    { id: "rw4", text: "rumbles with a deep pleased purr, going all soft~",                  category: "reward" },
];

export function getKittyReactions(): KittyReactionEntry[] {
    return lsGet<KittyReactionEntry[]>("EBC_kittyReactions", DEFAULT_REACTIONS);
}
export function saveKittyReactions(v: KittyReactionEntry[]): void { lsSet("EBC_kittyReactions", v); }

export function getKittyPunishments(): KittyPunishment[] {
    const raw = lsGet<KittyPunishment[]>("EBC_kittyPunishments", DEFAULT_PUNISHMENTS);
    return raw.map(p => {
        if (p.steps) return p; // already new format
        // Migrate legacy kindEmote/roughEmote to an emote step
        const steps: KittyPunishmentStep[] = [];
        if (p.kindEmote || p.roughEmote) {
            steps.push({ type: "emote", kindText: p.kindEmote ?? "", roughText: p.roughEmote ?? "" });
        }
        return { id: p.id, label: p.label, steps };
    });
}
export function saveKittyPunishments(v: KittyPunishment[]): void { lsSet("EBC_kittyPunishments", v); }

// ── Expression Presets ────────────────────────────────────────────────────────
// Named multi-expression combos (e.g. "Shy" = Blush:Low + Eyes:Shy + Mouth:Pout)

export interface KittyExpressionPreset {
    id: string;
    label: string;
    commands: string[];  // e.g. ["Blush:Low", "Eyes:Shy", "Mouth:Pout"]
}

export function getKittyExpressionPresets(): KittyExpressionPreset[] {
    return lsGet<KittyExpressionPreset[]>("EBC_kittyExprPresets", []);
}
export function saveKittyExpressionPresets(v: KittyExpressionPreset[]): void {
    lsSet("EBC_kittyExprPresets", v);
}

// ── Command protocol ──────────────────────────────────────────────────────────
// Format: [EBC-KITTY:cmd:arg]  or  [EBC-KITTY:cmd]
// Sent as a beep from Lucy to Emery and silently intercepted by Emery's EBC.

export function buildKittyCmd(cmd: string, arg = ""): string {
    return arg ? `${KITTY_CMD_PREFIX}${cmd}:${arg}]` : `${KITTY_CMD_PREFIX}${cmd}]`;
}

/** Returns { cmd, arg } if the message is a valid kitty command, null otherwise. */
export function parseKittyCmd(msg: string): { cmd: string; arg: string } | null {
    if (!msg.startsWith(KITTY_CMD_PREFIX) || !msg.endsWith("]")) return null;
    const inner = msg.slice(KITTY_CMD_PREFIX.length, -1);
    const ci = inner.indexOf(":");
    return ci >= 0
        ? { cmd: inner.slice(0, ci), arg: inner.slice(ci + 1) }
        : { cmd: inner, arg: "" };
}

export function sendKittyCmd(cmd: string, arg = ""): void {
    try {
        ServerSend("AccountBeep", {
            MemberNumber: EMERY_MEMBER,
            Message: buildKittyCmd(cmd, arg),
            ChatRoomName: null,
            BeepType: "Beep",
        });
    } catch { /* ignore */ }
}
