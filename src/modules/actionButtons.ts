// Action buttons drawn in the chatroom sidebar below BCAR's buttons.
import { UI } from "./ui";

export type ActionStyle = "action" | "emote" | "seq";
// "action" = (Name text)
// "emote"  = * Name text *
// "seq"    = pose/action sequence (pipe-separated steps)

export interface ActionButton {
    label:   string;
    emote:   string;   // for "seq" style: pipe-separated sequence steps
    color:   string;
    enabled: boolean;
    style:   ActionStyle;
}

export const DEFAULT_BUTTONS: ActionButton[] = [
    { label: "NOD",   emote: "nods.",              color: "#c2185b", enabled: true,  style: "action" },
    { label: "SHAKE", emote: "shakes their head.", color: "#c2185b", enabled: true,  style: "action" },
    { label: "WAVE",  emote: "waves.",             color: "#c2185b", enabled: true,  style: "action" },
    { label: "BOW",   emote: "bows politely.",     color: "#c2185b", enabled: true,  style: "action" },
    { label: "",      emote: "",                   color: "#c2185b", enabled: false, style: "action" },
    { label: "",      emote: "",                   color: "#c2185b", enabled: false, style: "action" },
];

export const ABSOLUTE_MAX  = 12;
const DEFAULT_SLOTS = DEFAULT_BUTTONS.length;

// --- Storage -----------------------------------------------------------------

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

export function getButtons(): ActionButton[] {
    const stored = getStore().actionButtons;
    return Array.isArray(stored) ? (stored as ActionButton[]) : DEFAULT_BUTTONS;
}

export function getSlotCount(): number {
    const store = getStore();
    const n = store.actionSlotCount;
    if (typeof n === "number") return Math.min(ABSOLUTE_MAX, Math.max(1, n));
    const buttons = getButtons();
    return Math.min(ABSOLUTE_MAX, Math.max(DEFAULT_SLOTS, buttons.length));
}

export function saveButtons(buttons: ActionButton[], slotCount: number): void {
    const store = getStore();
    store.actionButtons   = buttons;
    store.actionSlotCount = slotCount;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

export function normalizeHex(value: string | undefined, fallback = "#c2185b"): string {
    const c = (value ?? "").trim();
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    const m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) { const [r,g,b] = m[1].split(""); return `#${r}${r}${g}${g}${b}${b}`; }
    return fallback;
}

// --- Display name helper -----------------------------------------------------

export function getDisplayName(): string {
    // CharacterNickname is a BC global not always in the type declarations
    const nickFn = (window as unknown as Record<string, unknown>).CharacterNickname;
    if (typeof nickFn === "function") return (nickFn as (c: Character) => string)(Player);
    return (Player as unknown as Record<string, unknown>).Nickname as string || Player.Name || "Player";
}

// --- Sequence runner ----------------------------------------------------------
// Sequence steps are pipe-separated (|). Each step is one of:
//   PoseName   – set BC pose (e.g. "HandsUp", "Yoked")
//   _          – clear all active poses back to neutral
//   !text      – send as (Name text) action message
//   *text      – send as * Name text * emote message
// Steps run 500 ms apart. Original poses are restored when done.

let seqRunning = false;

function bcSetPose(poseName: string): void {
    const w = window as unknown as Record<string, unknown>;
    const fn = w.CharacterSetActivePose;
    if (typeof fn === "function") {
        (fn as (c: Character, p: string | null, b: boolean) => void)(Player, poseName, false);
    } else {
        const cur = Player.ActivePose ?? [];
        if (!cur.includes(poseName)) Player.ActivePose = [...cur, poseName];
    }
}

function bcClearPose(original: string[]): void {
    Player.ActivePose = original;
}

function bcRefresh(): void {
    try { CharacterRefresh(Player, false, false); } catch (_) { /* ignore */ }
    try { ChatRoomCharacterUpdate(Player); } catch (_) { /* ignore */ }
}

export function runSequence(sequence: string): void {
    if (seqRunning) return;
    const steps = sequence.split("|").map(s => s.trim()).filter(Boolean);
    if (!steps.length) return;

    seqRunning = true;
    const originalPoses: string[] = [...(Player.ActivePose ?? [])];
    let idx = 0;

    const next = (): void => {
        if (idx >= steps.length) {
            // Restore original pose and unlock
            bcClearPose(originalPoses);
            bcRefresh();
            seqRunning = false;
            return;
        }

        const step = steps[idx++];

        if (step === "_") {
            bcClearPose([]);
            bcRefresh();
        } else if (step.startsWith("!")) {
            sendAction(step.slice(1), "action");
        } else if (step.startsWith("*")) {
            sendAction(step.slice(1), "emote");
        } else {
            // Treat as BC pose name
            bcSetPose(step);
            bcRefresh();
        }

        window.setTimeout(next, 500);
    };

    next();
}

// --- Send chat message --------------------------------------------------------
// "action" -> (Name text)   "emote" -> * Name text *   "seq" -> runSequence

export function sendAction(emote: string, style: ActionStyle = "action"): void {
    const text = emote.trim();
    if (!text) return;

    if (style === "seq") { runSequence(text); return; }

    if (style === "emote") {
        // BC natively formats Emote as:  * Name text *
        ServerSend("ChatRoomChat", { Type: "Emote", Content: text, Dictionary: [] });
        return;
    }

    // Action style: (Name text)
    // BC can't find the key in Interface.csv so it prepends "MISSING TEXT IN "Interface.csv": ".
    // We include the player's name directly in Content, then use the poison tag to strip the prefix,
    // leaving only the zero-width char + text so it renders as  (​Name text).
    ServerSend("ChatRoomChat", {
        Type: "Action",
        Content: getDisplayName() + " " + text,
        Dictionary: [
            { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
            { SourceCharacter: Player.MemberNumber },
        ],
    });
}

// --- In-game sidebar ---------------------------------------------------------

const BTN_X       = 0;
const BTN_START_Y = 320;
const BTN_SIZE    = 45;

// Collapse toggle - shorter than action buttons so it reads as a control, not a content button
const CHIP_X = 0;
const CHIP_Y = 270;
const CHIP_W = 45;
const CHIP_H = 28;

let sidebarCollapsed = false;

export function drawActionButtons(): void {
    if (CurrentScreen !== "ChatRoom") return;

    DrawButton(CHIP_X, CHIP_Y, CHIP_W, CHIP_H,
        sidebarCollapsed ? "+" : "=",
        sidebarCollapsed ? UI.buttonMuted : UI.cardMuted,
        "", sidebarCollapsed ? "Show quick actions" : "Hide quick actions");

    if (sidebarCollapsed) return;

    const buttons = getButtons();
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        DrawButton(BTN_X, BTN_START_Y + i * BTN_SIZE, BTN_SIZE, BTN_SIZE,
            btn.label, btn.color || "#c2185b", "", btn.emote);
    }
}

export function handleActionButtonClick(): boolean {
    if (CurrentScreen !== "ChatRoom") return false;

    // Collapse toggle
    if (MouseX >= CHIP_X && MouseX <= CHIP_X + CHIP_W &&
        MouseY >= CHIP_Y && MouseY <= CHIP_Y + CHIP_H) {
        sidebarCollapsed = !sidebarCollapsed;
        return true;
    }

    if (sidebarCollapsed) return false;

    const buttons = getButtons();
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        const y = BTN_START_Y + i * BTN_SIZE;
        if (MouseX >= BTN_X && MouseX <= BTN_X + BTN_SIZE &&
            MouseY >= y    && MouseY <= y + BTN_SIZE) {
            sendAction(btn.emote, btn.style ?? "action");
            return true;
        }
    }
    return false;
}
