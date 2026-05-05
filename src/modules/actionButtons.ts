// Action buttons drawn below BCAR's upperleft buttons (EAR/TAIL/WINGS end at y=270)
import {
    PANEL_W,
    UI,
    drawCard,
    drawChromeButton,
    drawInsetLabel,
    drawPill,
    drawSettingsScaffold,
    mouseInRect,
    styleInput,
} from "./ui";

export interface ActionButton {
    label:   string;
    emote:   string;
    color:   string;
    enabled: boolean;
}

const DEFAULT_BUTTONS: ActionButton[] = [
    { label: "NOD",   emote: "nods their head",          color: "#c2185b", enabled: true  },
    { label: "SHAKE", emote: "shakes their head",        color: "#c2185b", enabled: true  },
    { label: "WAVE",  emote: "waves",                    color: "#c2185b", enabled: true  },
    { label: "BOW",   emote: "bows their head politely", color: "#c2185b", enabled: true  },
    { label: "",      emote: "",                         color: "#c2185b", enabled: false },
    { label: "",      emote: "",                         color: "#c2185b", enabled: false },
];

const BTN_X       = 0;
const BTN_START_Y = 270;
const BTN_SIZE    = 45;
const MAX_SLOTS   = 6;
const ROW_LEFT    = 24;
const ROW_WIDTH   = PANEL_W - 48;

function getButtons(): ActionButton[] {
    const stored = (Player.ExtensionSettings.EmeryBC as Record<string, unknown> | undefined)?.actionButtons;
    if (Array.isArray(stored)) return stored as ActionButton[];
    return DEFAULT_BUTTONS;
}

function saveButtons(buttons: ActionButton[]): void {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    (Player.ExtensionSettings.EmeryBC as Record<string, unknown>).actionButtons = buttons;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

// ─── In-game ─────────────────────────────────────────────────────────────────

export function drawActionButtons(): void {
    if (CurrentScreen !== "ChatRoom") return;
    const buttons = getButtons();
    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        DrawButton(BTN_X, BTN_START_Y + i * BTN_SIZE, BTN_SIZE, BTN_SIZE,
            btn.label, btn.color || "#c2185b", "", btn.emote);
    }
}

export function handleActionButtonClick(): boolean {
    if (CurrentScreen !== "ChatRoom") return false;
    const buttons = getButtons();
    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        const y = BTN_START_Y + i * BTN_SIZE;
        if (MouseX >= BTN_X && MouseX <= BTN_X + BTN_SIZE &&
            MouseY >= y    && MouseY <= y + BTN_SIZE) {
            ServerSend("ChatRoomChat", { Content: btn.emote.trim(), Type: "Emote" });
            return true;
        }
    }
    return false;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

// settingsButtons is only initialised in settingsLoad (called once on screen open)
// so toggle/edit state persists across frames while the screen is open
let settingsButtons: ActionButton[] = [];

function inputId(slot: number, field: "label" | "emote" | "color"): string {
    return `EmeryBtn_${field}_${slot}`;
}

function ensureInputs(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = settingsButtons[i] ?? DEFAULT_BUTTONS[i];
        if (!document.getElementById(inputId(i, "label")))
            ElementCreateInput(inputId(i, "label"), "text", btn.label, "6");
        if (!document.getElementById(inputId(i, "color")))
            ElementCreateInput(inputId(i, "color"), "text", btn.color || "#c2185b", "7");
        if (!document.getElementById(inputId(i, "emote")))
            ElementCreateInput(inputId(i, "emote"), "text", btn.emote, "120");
        styleInput(inputId(i, "label"), "short");
        styleInput(inputId(i, "color"), "short");
        styleInput(inputId(i, "emote"), "long");
    }
}

export function settingsLoad(): void {
    const stored = getButtons();
    settingsButtons = Array.from({ length: MAX_SLOTS }, (_, i) => ({ ...(stored[i] ?? DEFAULT_BUTTONS[i]) }));
}

const SLOT_H      = 84;
const SLOTS_Y     = 188;

function placeInput(id: string, left: number, y: number, width: number, height: number): void {
    ElementPosition(id, left + width / 2, y + height / 2, width, height);
}

export function settingsRun(): void {
    ensureInputs();
    const activeCount = settingsButtons.filter(btn => btn.enabled && btn.label.trim()).length;

    drawSettingsScaffold("Action Buttons", "Quick emote shortcuts for the chatroom sidebar.", [
        { label: "ACTIVE", value: `${activeCount}/${MAX_SLOTS}`, tone: "accent" },
        { label: "LAYOUT", value: "Quickbar", tone: "gold" },
    ]);

    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = settingsButtons[i] ?? DEFAULT_BUTTONS[i];
        const y   = SLOTS_Y + i * SLOT_H;
        const previewColor = (document.getElementById(inputId(i, "color")) as HTMLInputElement | null)?.value || btn.color || "#c2185b";
        const previewLabel = ((document.getElementById(inputId(i, "label")) as HTMLInputElement | null)?.value || btn.label || "EMPTY").slice(0, 6);

        drawCard(ROW_LEFT, y, ROW_WIDTH, SLOT_H - 10, i % 2 === 0 ? "default" : "alt");

        DrawRect(36, y + 10, 68, 52, UI.cardMuted);
        DrawEmptyRect(36, y + 10, 68, 52, UI.panelEdge, 1);
        drawPill(44, y + 16, 52, 16, `Slot ${i + 1}`, UI.accentSoft, UI.accent);
        DrawRect(44, y + 38, 52, 18, previewColor);
        DrawEmptyRect(44, y + 38, 52, 18, UI.swatchBorder, 1);
        DrawTextFit(previewLabel || "EMPTY", 70, y + 48, 46, "#fff7fa");

        drawInsetLabel("Label", 170, y + 22);
        drawInsetLabel("Color", 286, y + 22);
        drawInsetLabel("Action", 438, y + 22);
        drawInsetLabel("State", 554, y + 22);

        placeInput(inputId(i, "label"), 118, y + 34, 86, 32);
        placeInput(inputId(i, "color"), 224, y + 34, 92, 32);
        placeInput(inputId(i, "emote"), 334, y + 34, 170, 32);

        drawChromeButton(516, y + 26, 78, 26, btn.enabled ? "On" : "Off", btn.enabled ? "accent" : "muted");
    }

    const btnY = SLOTS_Y + MAX_SLOTS * SLOT_H + 10;
    drawChromeButton(34, btnY, 206, 46, "Save Layout", "success");
    drawChromeButton(254, btnY, 206, 46, "Reset Defaults", "gold");

    drawCard(24, btnY + 56, PANEL_W - 48, 52, "muted");
    DrawTextFit("Action text becomes a /me emote in chat.", PANEL_W / 2, btnY + 76, 520, UI.textMuted);
    DrawTextFit("Example: \"waves\" sends * Name waves *", PANEL_W / 2, btnY + 96, 520, UI.textSoft);
}

export function settingsClick(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
        const y = SLOTS_Y + i * SLOT_H;
        if (mouseInRect(516, y + 22, 78, 28)) {
            settingsButtons[i].enabled = !settingsButtons[i].enabled;
            return;
        }
    }

    const btnY = SLOTS_Y + MAX_SLOTS * SLOT_H + 10;

    // Save
    if (MouseX >= 34 && MouseX <= 240 && MouseY >= btnY && MouseY <= btnY + 46) {
        for (let i = 0; i < MAX_SLOTS; i++) {
            settingsButtons[i].label = ElementValue(inputId(i, "label")).trim().slice(0, 6);
            settingsButtons[i].color = ElementValue(inputId(i, "color")).trim() || "#c2185b";
            settingsButtons[i].emote = ElementValue(inputId(i, "emote")).trim();
        }
        saveButtons(settingsButtons);
        return;
    }

    // Reset
    if (MouseX >= 254 && MouseX <= 460 && MouseY >= btnY && MouseY <= btnY + 46) {
        settingsButtons = DEFAULT_BUTTONS.map(b => ({ ...b }));
        for (let i = 0; i < MAX_SLOTS; i++) {
            (document.getElementById(inputId(i, "label")) as HTMLInputElement).value = settingsButtons[i].label;
            (document.getElementById(inputId(i, "color")) as HTMLInputElement).value = settingsButtons[i].color;
            (document.getElementById(inputId(i, "emote")) as HTMLInputElement).value = settingsButtons[i].emote;
        }
        saveButtons(settingsButtons);
    }
}

export function settingsExit(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
        ElementRemove(inputId(i, "label"));
        ElementRemove(inputId(i, "color"));
        ElementRemove(inputId(i, "emote"));
    }
}
