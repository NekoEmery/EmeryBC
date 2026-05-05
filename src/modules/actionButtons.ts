// Action buttons drawn below BCAR's upperleft buttons (EAR/TAIL/WINGS end at y=270)

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

// Left-panel width — BC shows character preview on the right half
const PANEL_W = 650;

function getButtons(): ActionButton[] {
    const stored = (Player.ExtensionSettings.EmeryBC as Record<string, unknown> | undefined)?.actionButtons;
    if (Array.isArray(stored)) return stored as ActionButton[];
    return DEFAULT_BUTTONS;
}

function saveButtons(buttons: ActionButton[]): void {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    (Player.ExtensionSettings.EmeryBC as Record<string, unknown>).actionButtons = buttons;
    ServerSend("AccountUpdate", { ExtensionSettings: Player.ExtensionSettings });
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
    }
}

export function settingsLoad(): void {
    settingsButtons = getButtons().map(b => ({ ...b }));
}

const SLOT_H      = 105;
const SLOTS_Y     = 145;

export function settingsRun(): void {
    // Dark panel on left only
    DrawRect(0, 60, PANEL_W, 940, "#130920");

    DrawText("Action Buttons", PANEL_W / 2, 95, "White");

    // Column headers
    DrawRect(0, 108, PANEL_W, 1, "#3a2a5a");
    DrawText("On",     55,  128, "#9966cc");
    DrawText("Label",  140, 128, "#9966cc");
    DrawText("Color",  270, 128, "#9966cc");
    DrawText("/me action text", 460, 128, "#9966cc");
    DrawRect(0, 138, PANEL_W, 1, "#3a2a5a");

    ensureInputs();

    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = settingsButtons[i] ?? DEFAULT_BUTTONS[i];
        const y   = SLOTS_Y + i * SLOT_H;

        // Row background — alternate shade
        DrawRect(0, y, PANEL_W, SLOT_H - 4, i % 2 === 0 ? "#1a0d30" : "#160a28");

        // Toggle
        DrawButton(20, y + 30, 42, 42,
            btn.enabled ? "✓" : "",
            btn.enabled ? "#7b1fa2" : "#33204a");

        // Label input
        ElementPosition(inputId(i, "label"), 140, y + 51, 105, 38);

        // Color input + live swatch
        ElementPosition(inputId(i, "color"), 272, y + 51, 108, 38);
        const liveColor = (document.getElementById(inputId(i, "color")) as HTMLInputElement | null)?.value ?? btn.color;
        DrawRect(390, y + 30, 36, 42, liveColor);
        DrawEmptyRect(390, y + 30, 36, 42, "#ffffff", 1);

        // Emote input
        ElementPosition(inputId(i, "emote"), 500, y + 51, 290, 38);
    }

    const btnY = SLOTS_Y + MAX_SLOTS * SLOT_H + 10;
    DrawButton(30,  btnY, 200, 52, "Save",          "#1a4a1a");
    DrawButton(250, btnY, 240, 52, "Reset defaults", "#4a2a0a");

    DrawRect(0, btnY + 66, PANEL_W, 1, "#3a2a5a");
    DrawText("Action text is sent as /me — e.g. \"waves\" → * Name waves *",
        PANEL_W / 2, btnY + 82, "#554466");
}

export function settingsClick(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
        const y = SLOTS_Y + i * SLOT_H;
        if (MouseX >= 20 && MouseX <= 62 && MouseY >= y + 30 && MouseY <= y + 72) {
            settingsButtons[i].enabled = !settingsButtons[i].enabled;
            return;
        }
    }

    const btnY = SLOTS_Y + MAX_SLOTS * SLOT_H + 10;

    // Save
    if (MouseX >= 30 && MouseX <= 230 && MouseY >= btnY && MouseY <= btnY + 52) {
        for (let i = 0; i < MAX_SLOTS; i++) {
            settingsButtons[i].label = ElementValue(inputId(i, "label")).trim().slice(0, 6);
            settingsButtons[i].color = ElementValue(inputId(i, "color")).trim() || "#c2185b";
            settingsButtons[i].emote = ElementValue(inputId(i, "emote")).trim();
        }
        saveButtons(settingsButtons);
        return;
    }

    // Reset
    if (MouseX >= 250 && MouseX <= 490 && MouseY >= btnY && MouseY <= btnY + 52) {
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
