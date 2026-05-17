// Kitty menu — only visible to Lucy (#230466).
// Actions target Emery (#130267).

export const LUCY_MEMBER   = 230466;
export const EMERY_MEMBER  = 130267;
const KITTY_CMD_PREFIX = "[EBC-KITTY:";

// ── Data types ────────────────────────────────────────────────────────────────

export interface KittyEmote {
    id: string;
    label: string;         // button label shown in the menu
    text: string;          // message body (no asterisks / parens — those are added by BC)
    type: "emote" | "action"; // emote = * Lucy text * , action = (Lucy text)
}

export interface KittyItem {
    Name: string;
    Group: string;
    Color?: string | string[];
}

export interface KittyRestraintSet {
    id: string;
    label: string;
    items: KittyItem[];
}

export interface KittyPose {
    id: string;
    label: string;
    poses: string[];   // BC pose names — empty = neutral
}

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_EMOTES: KittyEmote[] = [
    { id: "headpat",   label: "🐾 Headpat",   text: "gently pats Emery on the head~ 🐾",                       type: "emote"  },
    { id: "goodgirl",  label: "✨ Good girl",  text: "scratches Emery behind the ears~ Good girl~ ✨",           type: "emote"  },
    { id: "badgirl",   label: "😤 Bad girl",   text: "gives Emery a firm look~",                                 type: "action" },
    { id: "treat",     label: "🍖 Treat",      text: "holds out a treat for her little pet~ 🍖",                 type: "emote"  },
    { id: "praise",    label: "🎀 Praise",     text: "pats Emery's head with a warm smile~ Such a precious thing~ 🎀", type: "emote" },
    { id: "announce",  label: "📢 Mine",       text: "Emery belongs to Lucy~ 💜",                               type: "action" },
];

const DEFAULT_POSES: KittyPose[] = [
    { id: "allfours", label: "🐱 All fours",  poses: ["AllFours"]    },
    { id: "kneel",    label: "🙇 Kneel",       poses: ["Kneel"]       },
    { id: "handsup",  label: "🙌 Hands up",    poses: ["OverTheHead"] },
    { id: "neutral",  label: "🔄 Neutral",     poses: []              },
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

export function getKittyEmotes(): KittyEmote[] {
    return lsGet("EBC_kittyEmotes", DEFAULT_EMOTES);
}
export function saveKittyEmotes(v: KittyEmote[]): void { lsSet("EBC_kittyEmotes", v); }

export function getKittyRestraintSets(): KittyRestraintSet[] {
    return lsGet("EBC_kittyRestraintSets", []);
}
export function saveKittyRestraintSets(v: KittyRestraintSet[]): void { lsSet("EBC_kittyRestraintSets", v); }

export function getKittyPoses(): KittyPose[] {
    return lsGet("EBC_kittyPoses", DEFAULT_POSES);
}
export function saveKittyPoses(v: KittyPose[]): void { lsSet("EBC_kittyPoses", v); }

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
