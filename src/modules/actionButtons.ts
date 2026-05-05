// Action buttons drawn in the chatroom sidebar below BCAR's buttons.
import {
    CONTENT_LEFT,
    CONTENT_RIGHT,
    CONTENT_WIDTH,
    UI,
    drawChromeButton,
    drawSettingsScaffold,
    mouseInRect,
    styleColorInput,
    styleInput,
} from "./ui";

export interface ActionButton {
    label:   string;
    emote:   string;
    color:   string;
    enabled: boolean;
}

const DEFAULT_BUTTONS: ActionButton[] = [
    { label: "NOD",   emote: "nods.",                    color: "#c2185b", enabled: true  },
    { label: "SHAKE", emote: "shakes their head.",       color: "#c2185b", enabled: true  },
    { label: "WAVE",  emote: "waves.",                   color: "#c2185b", enabled: true  },
    { label: "BOW",   emote: "bows politely.",           color: "#c2185b", enabled: true  },
    { label: "",      emote: "",                         color: "#c2185b", enabled: false },
    { label: "",      emote: "",                         color: "#c2185b", enabled: false },
];

const ABSOLUTE_MAX  = 12;
const DEFAULT_SLOTS = DEFAULT_BUTTONS.length;

// In-game sidebar
const BTN_X       = 0;
const BTN_START_Y = 270;
const BTN_SIZE    = 45;

// Settings list layout — one row per slot
const ROW_H    = 56;
const LIST_Y   = 226;
const HEADER_Y = 213;

// Column x positions (left edges)
const COL_TOG = CONTENT_LEFT;                    // toggle button
const COL_LAB = CONTENT_LEFT + 62;              // label input
const COL_COL = CONTENT_LEFT + 200;             // color picker
const COL_ME  = CONTENT_LEFT + 254;             // "/me" prefix text
const COL_EMO = CONTENT_LEFT + 292;             // emote input
const COL_DEL = CONTENT_RIGHT - 76;             // delete button
const EMO_W   = COL_DEL - COL_EMO - 10;        // emote input width

// ─── Storage ─────────────────────────────────────────────────────────────────

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

function getButtons(): ActionButton[] {
    const stored = getStore().actionButtons;
    return Array.isArray(stored) ? (stored as ActionButton[]) : DEFAULT_BUTTONS;
}

function getSlotCount(): number {
    const store = getStore();
    const n = store.actionSlotCount;
    if (typeof n === "number") return Math.min(ABSOLUTE_MAX, Math.max(1, n));
    const buttons = getButtons();
    return Math.min(ABSOLUTE_MAX, Math.max(DEFAULT_SLOTS, buttons.length));
}

function saveData(buttons: ActionButton[], slotCount: number): void {
    const store = getStore();
    store.actionButtons   = buttons;
    store.actionSlotCount = slotCount;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

function normalizeHex(value: string | undefined, fallback = "#c2185b"): string {
    const c = (value ?? "").trim();
    if (/^#[0-9a-f]{6}$/i.test(c)) return c.toLowerCase();
    const m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) { const [r,g,b] = m[1].split(""); return `#${r}${r}${g}${g}${b}${b}`; }
    return fallback;
}

// ─── In-game ─────────────────────────────────────────────────────────────────

export function drawActionButtons(): void {
    if (CurrentScreen !== "ChatRoom") return;
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
    const buttons = getButtons();
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        const y = BTN_START_Y + i * BTN_SIZE;
        if (MouseX >= BTN_X && MouseX <= BTN_X + BTN_SIZE &&
            MouseY >= y    && MouseY <= y + BTN_SIZE) {
            ServerSend("ChatRoomChat", { Content: `(${Player.Name} ${btn.emote.trim()})`, Type: "Chat" });
            return true;
        }
    }
    return false;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

let settingsButtons: ActionButton[] = [];
let settingsSlotCount = DEFAULT_SLOTS;

function inputId(slot: number, field: "label" | "emote" | "color"): string {
    return `EmeryBtn_${field}_${slot}`;
}

function ensureInputs(): void {
    for (let i = 0; i < ABSOLUTE_MAX; i++) {
        const btn = settingsButtons[i] ?? { label: "", emote: "", color: "#c2185b", enabled: false };
        if (!document.getElementById(inputId(i, "label")))
            ElementCreateInput(inputId(i, "label"), "text", btn.label, "6");
        if (!document.getElementById(inputId(i, "color")))
            ElementCreateInput(inputId(i, "color"), "color", normalizeHex(btn.color));
        if (!document.getElementById(inputId(i, "emote")))
            ElementCreateInput(inputId(i, "emote"), "text", btn.emote, "120");
        styleInput(inputId(i, "label"), "short");
        styleColorInput(inputId(i, "color"));
        styleInput(inputId(i, "emote"), "long");
    }
}

export function settingsLoad(): void {
    const buttons = getButtons();
    settingsSlotCount = getSlotCount();
    settingsButtons = Array.from({ length: ABSOLUTE_MAX }, (_, i) => ({
        ...(buttons[i] ?? { label: "", emote: "", color: "#c2185b", enabled: false }),
    }));
}

function syncInputsFromButtons(): void {
    for (let i = 0; i < ABSOLUTE_MAX; i++) {
        (document.getElementById(inputId(i, "label")) as HTMLInputElement | null)?.
            setAttribute("value", settingsButtons[i].label);
        const lbl = document.getElementById(inputId(i, "label")) as HTMLInputElement | null;
        const clr = document.getElementById(inputId(i, "color")) as HTMLInputElement | null;
        const emt = document.getElementById(inputId(i, "emote")) as HTMLInputElement | null;
        if (lbl) lbl.value = settingsButtons[i].label;
        if (clr) clr.value = normalizeHex(settingsButtons[i].color);
        if (emt) emt.value = settingsButtons[i].emote;
    }
}

function collectFromInputs(): void {
    for (let i = 0; i < settingsSlotCount; i++) {
        settingsButtons[i].label = ElementValue(inputId(i, "label")).trim().slice(0, 6);
        settingsButtons[i].color = normalizeHex(ElementValue(inputId(i, "color")));
        settingsButtons[i].emote = ElementValue(inputId(i, "emote")).trim();
    }
}

export function settingsRun(): void {
    ensureInputs();
    const activeCount = settingsButtons.slice(0, settingsSlotCount).filter(b => b.enabled && b.label.trim()).length;

    drawSettingsScaffold("Action Buttons", "Quick emote shortcuts shown in the chatroom sidebar.", [
        { label: "ACTIVE", value: `${activeCount}/${settingsSlotCount}`, tone: "accent" },
        { label: "SLOTS",  value: `${settingsSlotCount}/${ABSOLUTE_MAX}`,  tone: "gold"   },
    ]);

    // ── Column headers ──────────────────────────────────────────────────────
    DrawRect(CONTENT_LEFT, HEADER_Y - 4, CONTENT_WIDTH, 1, UI.panelEdge);
    DrawTextFit("On",    COL_TOG + 27, HEADER_Y,  54,    UI.textSoft);
    DrawTextFit("Label", COL_LAB + 57, HEADER_Y,  100,   UI.textSoft);
    DrawTextFit("Color", COL_COL + 22, HEADER_Y,  72,    UI.textSoft);
    DrawTextFit("/me Emote Text  (sent as * Name text * in chat)",
        COL_EMO + EMO_W / 2, HEADER_Y, EMO_W, UI.textSoft);
    DrawRect(CONTENT_LEFT, HEADER_Y + 6, CONTENT_WIDTH, 1, UI.panelEdge);

    // ── Rows ────────────────────────────────────────────────────────────────
    for (let i = 0; i < settingsSlotCount; i++) {
        const btn = settingsButtons[i];
        const y   = LIST_Y + i * ROW_H;

        DrawRect(CONTENT_LEFT, y, CONTENT_WIDTH, ROW_H - 2,
            i % 2 === 0 ? UI.card : UI.cardAlt);
        DrawEmptyRect(CONTENT_LEFT, y, CONTENT_WIDTH, ROW_H - 2, UI.panelEdge, 1);

        // Toggle
        DrawButton(COL_TOG + 5, y + 9, 44, ROW_H - 18,
            btn.enabled ? "✓" : "",
            btn.enabled ? UI.accentDeep : UI.buttonMuted,
            "", btn.enabled ? "Click to disable" : "Click to enable");

        // Label input — centered in cell
        ElementPosition(inputId(i, "label"),
            COL_LAB + 57, y + ROW_H / 2, 110, 36);

        // Color picker
        ElementPosition(inputId(i, "color"),
            COL_COL + 22, y + ROW_H / 2, 42, 36);

        // "/me" prefix label — clearly to the left of the emote input
        DrawTextFit("/me", COL_ME + 18, y + ROW_H / 2, 36, UI.accent);

        // Emote input
        ElementPosition(inputId(i, "emote"),
            COL_EMO + EMO_W / 2, y + ROW_H / 2, EMO_W, 36);

        // Delete button
        DrawButton(COL_DEL + 3, y + 10, 66, ROW_H - 20,
            "✕ Del", UI.dangerDeep, "", "Remove this slot");
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = LIST_Y + settingsSlotCount * ROW_H + 14;
    DrawRect(CONTENT_LEFT, footerY - 6, CONTENT_WIDTH, 1, UI.panelEdge);

    const canAdd = settingsSlotCount < ABSOLUTE_MAX;
    drawChromeButton(CONTENT_LEFT,       footerY, 228, 44,
        `＋ Add Slot  (${settingsSlotCount}/${ABSOLUTE_MAX})`,
        canAdd ? "success" : "muted", !canAdd);
    drawChromeButton(CONTENT_LEFT + 244, footerY, 200, 44, "Save Layout",     "accent");
    drawChromeButton(CONTENT_LEFT + 460, footerY, 200, 44, "Reset Defaults",  "gold");

    DrawTextFit(
        "Sends as (Name text) in chat — e.g. \"nods.\" becomes (Emery nods.)",
        CONTENT_LEFT + CONTENT_WIDTH / 2, footerY + 62, CONTENT_WIDTH - 40, UI.textMuted);
}

export function settingsClick(): void {
    // ── Toggle + Delete per row ──────────────────────────────────────────────
    for (let i = 0; i < settingsSlotCount; i++) {
        const y = LIST_Y + i * ROW_H;

        if (mouseInRect(COL_TOG + 5, y + 9, 44, ROW_H - 18)) {
            settingsButtons[i].enabled = !settingsButtons[i].enabled;
            return;
        }

        if (mouseInRect(COL_DEL + 3, y + 10, 66, ROW_H - 20)) {
            collectFromInputs();
            settingsButtons.splice(i, 1);
            settingsButtons.push({ label: "", emote: "", color: "#c2185b", enabled: false });
            settingsSlotCount = Math.max(1, settingsSlotCount - 1);
            syncInputsFromButtons();
            return;
        }
    }

    // ── Footer buttons ───────────────────────────────────────────────────────
    const footerY = LIST_Y + settingsSlotCount * ROW_H + 14;

    if (canAdd() && mouseInRect(CONTENT_LEFT, footerY, 228, 44)) {
        collectFromInputs();
        settingsSlotCount = Math.min(ABSOLUTE_MAX, settingsSlotCount + 1);
        return;
    }

    if (mouseInRect(CONTENT_LEFT + 244, footerY, 200, 44)) {
        collectFromInputs();
        saveData([...settingsButtons], settingsSlotCount);
        return;
    }

    if (mouseInRect(CONTENT_LEFT + 460, footerY, 200, 44)) {
        settingsButtons = Array.from({ length: ABSOLUTE_MAX }, (_, i) => ({
            ...(DEFAULT_BUTTONS[i] ?? { label: "", emote: "", color: "#c2185b", enabled: false }),
        }));
        settingsSlotCount = DEFAULT_SLOTS;
        syncInputsFromButtons();
        saveData([...settingsButtons], settingsSlotCount);
    }
}

function canAdd(): boolean {
    return settingsSlotCount < ABSOLUTE_MAX;
}

export function settingsExit(): void {
    for (let i = 0; i < ABSOLUTE_MAX; i++) {
        ElementRemove(inputId(i, "label"));
        ElementRemove(inputId(i, "color"));
        ElementRemove(inputId(i, "emote"));
    }
}
