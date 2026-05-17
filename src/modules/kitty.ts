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
    interactive?: boolean; // if true, also sends a react beep so Emery can respond
    expression?: string;   // kitty expression command to send on click, e.g. "Ears:Wiggle"
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
}

export interface KittyPose {
    id: string;
    label: string;
    poses: string[];   // BC pose names — empty = neutral
    kindEmote: string; // emote sent to room in kind mode
    roughEmote: string;// emote sent to room in rough mode
}

export interface KittyPunishment {
    id: string;
    label: string;
    kindEmote: string;
    roughEmote: string;
    restraintSetId?: string; // ID of a saved kitty restraint set to apply when Emery accepts
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_EMOTES: KittyEmote[] = [
    {
        id: "headpat",  label: "🐾 Headpat",
        text:      "gently pats Emery on the head~ 🐾",
        roughText: "grabs Emery by the hair and gives her head a firm tug~ 🐾",
        type: "emote", expression: "Ears:Wiggle",
    },
    {
        id: "goodgirl", label: "✨ Good girl",
        text:      "scratches Emery behind the ears~ Good girl~ ✨",
        roughText: "grabs Emery's chin and tilts it up sharply~ Good girl. For once.~",
        type: "emote", expression: "Ears:Wiggle",
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
        id: "handsup", label: "🙌 Hands up", poses: ["OverTheHead"],
        kindEmote: "lifts Emery's hands above her head, humming softly to herself~",
        roughEmote: "grabs Emery's wrists and raises them sharply above her head~",
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
        kindEmote: "tilts her head with a disappointed look~ Now now, Emery...",
        roughEmote: "snaps her fingers sharply and fixes Emery with a stern glare~",
    },
    {
        id: "gag", label: "😶 Gag",
        kindEmote: "reaches over and gently presses a gag to Emery's lips~ Shh, little one~",
        roughEmote: "grabs Emery's chin and firmly presses a gag in with a sharp look~",
    },
    {
        id: "corner", label: "🧱 Corner",
        kindEmote: "points to the corner with a firm but patient look~ Go think about what you did.",
        roughEmote: "marches Emery firmly to the corner by the collar~ Stay.",
    },
    {
        id: "bind", label: "⛓ Bind",
        kindEmote: "takes Emery's wrists and begins wrapping them together, whispering softly~",
        roughEmote: "pins Emery's wrists behind her back and binds them without a word~",
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
};
const EXPRESSION_SEEDS: Record<string, string> = {
    "headpat":  "Ears:Wiggle",
    "goodgirl": "Ears:Wiggle",
};

export function getKittyEmotes(): KittyEmote[] {
    const raw = lsGet<KittyEmote[]>("EBC_kittyEmotes", DEFAULT_EMOTES);
    return raw.map(e => ({
        ...e,
        roughText:  e.roughText  ?? ROUGH_TEXT_SEEDS[e.id]  ?? "",
        expression: e.expression ?? EXPRESSION_SEEDS[e.id]  ?? "",
    }));
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

export function getKittyPoses(): KittyPose[] {
    // Migrate old poses that lack emote fields
    const raw = lsGet<KittyPose[]>("EBC_kittyPoses", DEFAULT_POSES);
    return raw.map(p => ({
        ...p,
        kindEmote:  p.kindEmote  ?? "",
        roughEmote: p.roughEmote ?? "",
    }));
}
export function saveKittyPoses(v: KittyPose[]): void { lsSet("EBC_kittyPoses", v); }

export function getKittyPunishments(): KittyPunishment[] {
    return lsGet("EBC_kittyPunishments", DEFAULT_PUNISHMENTS);
}
export function saveKittyPunishments(v: KittyPunishment[]): void { lsSet("EBC_kittyPunishments", v); }

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
