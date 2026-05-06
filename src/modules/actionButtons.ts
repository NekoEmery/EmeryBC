// Action buttons drawn in the chatroom sidebar below BCAR's buttons.
import { UI } from "./ui";

export interface ActionButton {
    label:   string;
    emote:   string;
    color:   string;
    enabled: boolean;
}

export const DEFAULT_BUTTONS: ActionButton[] = [
    { label: "NOD",   emote: "nods.",              color: "#c2185b", enabled: true  },
    { label: "SHAKE", emote: "shakes their head.", color: "#c2185b", enabled: true  },
    { label: "WAVE",  emote: "waves.",             color: "#c2185b", enabled: true  },
    { label: "BOW",   emote: "bows politely.",     color: "#c2185b", enabled: true  },
    { label: "",      emote: "",                   color: "#c2185b", enabled: false },
    { label: "",      emote: "",                   color: "#c2185b", enabled: false },
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

// --- Helper: send as BC Action - displays as (Name text) ---------------------

export function sendAction(emote: string): void {
    ServerSend("ChatRoomChat", {
        Type: "Action",
        Content: "EBCEmote",
        Dictionary: [
            { Tag: "EBCEmote", Text: "{SourceCharacter} " + emote.trim() },
            { SourceCharacter: Player.MemberNumber },
        ],
    });
}

// --- In-game sidebar ---------------------------------------------------------

const BTN_X       = 0;
const BTN_START_Y = 270;
const BTN_SIZE    = 45;

// Collapse toggle - same 45x45 square as the action buttons, sits just above them
const CHIP_X = 0;
const CHIP_Y = 222;
const CHIP_W = 45;
const CHIP_H = 45;

let sidebarCollapsed = false;

export function drawActionButtons(): void {
    if (CurrentScreen !== "ChatRoom") return;

    // Collapse toggle button - same size as action buttons so it blends in
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
            sendAction(btn.emote);
            return true;
        }
    }
    return false;
}
