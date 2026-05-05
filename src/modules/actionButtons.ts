// Action buttons drawn below BCAR's upperleft buttons (EAR/TAIL/WINGS end at y=270)

export interface ActionButton {
    label:   string;   // short label on button, max ~5 chars
    emote:   string;   // text sent as /me — e.g. "nods her head"
    color:   string;   // hex color for the button
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

const BTN_X        = 0;
const BTN_START_Y  = 270;
const BTN_SIZE     = 45;
const MAX_SLOTS    = 6;

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

function sendEmote(text: string): void {
    if (!text.trim()) return;
    // Sends as /me — BC wraps it as "* Name text *"
    ServerSend("ChatRoomChat", { Content: text.trim(), Type: "Emote" });
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

export function drawActionButtons(): void {
    if (CurrentScreen !== "ChatRoom") return;
    const buttons = getButtons();
    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        const y = BTN_START_Y + i * BTN_SIZE;
        DrawButton(BTN_X, y, BTN_SIZE, BTN_SIZE, btn.label, btn.color || "#c2185b", "", btn.emote);
    }
}

// ─── Click handling ───────────────────────────────────────────────────────────

export function handleActionButtonClick(): boolean {
    if (CurrentScreen !== "ChatRoom") return false;
    const buttons = getButtons();
    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        const y = BTN_START_Y + i * BTN_SIZE;
        if (MouseX >= BTN_X && MouseX <= BTN_X + BTN_SIZE &&
            MouseY >= y    && MouseY <= y + BTN_SIZE) {
            sendEmote(btn.emote);
            return true;
        }
    }
    return false;
}

// ─── Settings screen ─────────────────────────────────────────────────────────

let settingsButtons: ActionButton[] = [];

const INPUT_PREFIX = "EmeryBtn";

function inputId(slot: number, field: "label" | "emote" | "color"): string {
    return `${INPUT_PREFIX}_${field}_${slot}`;
}

export function settingsRun(): void {
    settingsButtons = getButtons().map(b => ({ ...b }));

    DrawRect(0, 60, 1000, 940, "#1a0a2e");
    DrawText("Action Buttons", 500, 105, "White", "Black");

    DrawText("On",    75,  160, "#aaaaaa");
    DrawText("Label", 185, 160, "#aaaaaa");
    DrawText("Color", 305, 160, "#aaaaaa");
    DrawText("Action text  (sent as /me ...)", 630, 160, "#aaaaaa");

    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = settingsButtons[i];
        const y   = 190 + i * 100;

        DrawRect(55, y, 890, 90, "#221440");
        DrawEmptyRect(55, y, 890, 90, "#3a2a5a");

        // Enabled toggle
        DrawButton(60, y + 22, 45, 45,
            btn.enabled ? "✓" : "",
            btn.enabled ? "#7b1fa2" : "#2a1a3a");

        // Label input
        if (!document.getElementById(inputId(i, "label")))
            ElementCreateInput(inputId(i, "label"), "text", btn.label, "6");
        ElementPosition(inputId(i, "label"), 185, y + 44, 160, 42);

        // Color input
        if (!document.getElementById(inputId(i, "color")))
            ElementCreateInput(inputId(i, "color"), "text", btn.color || "#c2185b", "7");
        ElementPosition(inputId(i, "color"), 340, y + 44, 140, 42);

        // Color preview swatch
        DrawRect(425, y + 15, 42, 60, btn.color || "#c2185b");
        DrawEmptyRect(425, y + 15, 42, 60, "#ffffff", 1);

        // Emote input
        if (!document.getElementById(inputId(i, "emote")))
            ElementCreateInput(inputId(i, "emote"), "text", btn.emote, "120");
        ElementPosition(inputId(i, "emote"), 680, y + 44, 560, 42);
    }

    DrawButton(200, 810, 250, 60, "Save", "#2a5a2a");
    DrawButton(550, 810, 280, 60, "Reset defaults", "#5a3a1a");

    DrawText("/me action text — e.g. \"waves goodbye\" appears as  * Name waves goodbye *",
        500, 895, "#666688");
}

export function settingsClick(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
        const y = 190 + i * 100;
        if (MouseX >= 60 && MouseX <= 105 && MouseY >= y + 22 && MouseY <= y + 67) {
            settingsButtons[i].enabled = !settingsButtons[i].enabled;

            // Refresh color preview from input when toggling
            const col = (document.getElementById(inputId(i, "color")) as HTMLInputElement | null)?.value;
            if (col) settingsButtons[i].color = col;
            return;
        }
    }

    if (MouseX >= 200 && MouseX <= 450 && MouseY >= 810 && MouseY <= 870) {
        for (let i = 0; i < MAX_SLOTS; i++) {
            settingsButtons[i].label   = ElementValue(inputId(i, "label")).trim().slice(0, 6);
            settingsButtons[i].emote   = ElementValue(inputId(i, "emote")).trim();
            settingsButtons[i].color   = ElementValue(inputId(i, "color")).trim() || "#c2185b";
        }
        saveButtons(settingsButtons);
        return;
    }

    if (MouseX >= 550 && MouseX <= 830 && MouseY >= 810 && MouseY <= 870) {
        settingsButtons = DEFAULT_BUTTONS.map(b => ({ ...b }));
        for (let i = 0; i < MAX_SLOTS; i++) {
            const l = document.getElementById(inputId(i, "label")) as HTMLInputElement | null;
            const e = document.getElementById(inputId(i, "emote")) as HTMLInputElement | null;
            const c = document.getElementById(inputId(i, "color")) as HTMLInputElement | null;
            if (l) l.value = settingsButtons[i].label;
            if (e) e.value = settingsButtons[i].emote;
            if (c) c.value = settingsButtons[i].color;
        }
        saveButtons(settingsButtons);
    }
}

export function settingsExit(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
        ElementRemove(inputId(i, "label"));
        ElementRemove(inputId(i, "emote"));
        ElementRemove(inputId(i, "color"));
    }
}
