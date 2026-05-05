// Action buttons drawn below BCAR's upperleft buttons (EAR/TAIL/WINGS end at y=270)

export interface ActionButton {
    label: string;   // short label shown on button, max ~5 chars
    emote: string;   // text sent as emote when clicked
    enabled: boolean;
}

const DEFAULT_BUTTONS: ActionButton[] = [
    { label: "NOD",   emote: "*nods their head*",          enabled: true  },
    { label: "SHAKE", emote: "*shakes their head*",        enabled: true  },
    { label: "WAVE",  emote: "*waves*",                    enabled: true  },
    { label: "BOW",   emote: "*bows their head politely*", enabled: true  },
    { label: "",      emote: "",                            enabled: false },
    { label: "",      emote: "",                            enabled: false },
];

// BCAR upperleft buttons end at y=270; we start there
const BTN_X = 0;
const BTN_START_Y = 270;
const BTN_SIZE = 45;
const MAX_SLOTS = 6;

function getButtons(): ActionButton[] {
    const stored = (Player.ExtensionSettings.EmeryBC as Record<string, unknown> | undefined)?.actionButtons;
    if (Array.isArray(stored)) return stored as ActionButton[];
    return DEFAULT_BUTTONS;
}

function saveButtons(buttons: ActionButton[]): void {
    if (!Player.ExtensionSettings.EmeryBC) {
        Player.ExtensionSettings.EmeryBC = {};
    }
    (Player.ExtensionSettings.EmeryBC as Record<string, unknown>).actionButtons = buttons;
    ServerSend("AccountUpdate", { ExtensionSettings: Player.ExtensionSettings });
}

function sendEmote(text: string): void {
    if (!text.trim()) return;
    ServerSend("ChatRoomChat", { Content: text, Type: "Emote" });
}

// --- Drawing ---

export function drawActionButtons(): void {
    if (CurrentScreen !== "ChatRoom") return;
    const buttons = getButtons();
    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        const y = BTN_START_Y + i * BTN_SIZE;
        DrawButton(BTN_X, y, BTN_SIZE, BTN_SIZE, btn.label, "#2a1a4a", "", btn.emote);
    }
}

// --- Click handling ---

export function handleActionButtonClick(): boolean {
    if (CurrentScreen !== "ChatRoom") return false;
    const buttons = getButtons();
    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = buttons[i];
        if (!btn?.enabled || !btn.label) continue;
        const y = BTN_START_Y + i * BTN_SIZE;
        if (MouseX >= BTN_X && MouseX <= BTN_X + BTN_SIZE &&
            MouseY >= y && MouseY <= y + BTN_SIZE) {
            sendEmote(btn.emote);
            return true;
        }
    }
    return false;
}

// --- Settings screen ---

let settingsButtons: ActionButton[] = [];
let settingsPage = 0; // for future pagination

export function settingsRun(): void {
    settingsButtons = getButtons().map(b => ({ ...b }));

    DrawRect(0, 60, 1000, 940, "#1a0a2e");
    DrawText("Action Buttons", 500, 105, "White", "Black");
    DrawText("Label", 200, 160, "#aaaaaa");
    DrawText("Emote / Action text", 620, 160, "#aaaaaa");
    DrawText("On", 90, 160, "#aaaaaa");

    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = settingsButtons[i];
        const y = 190 + i * 100;

        // Enabled toggle
        DrawButton(60, y, 45, 45, btn.enabled ? "✓" : "", btn.enabled ? "#4a2a6a" : "#2a1a3a");

        // Label input
        const labelEl = document.getElementById(`EmeryBtn_Label_${i}`) as HTMLInputElement | null;
        if (!labelEl) {
            ElementCreateInput(`EmeryBtn_Label_${i}`, "text", btn.label, "6");
        }
        ElementPosition(`EmeryBtn_Label_${i}`, 200, y + 22, 160, 45);

        // Emote input
        const emoteEl = document.getElementById(`EmeryBtn_Emote_${i}`) as HTMLInputElement | null;
        if (!emoteEl) {
            ElementCreateInput(`EmeryBtn_Emote_${i}`, "text", btn.emote, "120");
        }
        ElementPosition(`EmeryBtn_Emote_${i}`, 620, y + 22, 600, 45);
    }

    DrawButton(200, 840, 250, 64, "Save", "#3a6a3a");
    DrawButton(550, 840, 250, 64, "Reset defaults", "#6a3a1a");
}

export function settingsClick(): void {
    // Enabled toggles
    for (let i = 0; i < MAX_SLOTS; i++) {
        const y = 190 + i * 100;
        if (MouseX >= 60 && MouseX <= 105 && MouseY >= y && MouseY <= y + 45) {
            settingsButtons[i].enabled = !settingsButtons[i].enabled;
            return;
        }
    }

    // Save
    if (MouseX >= 200 && MouseX <= 450 && MouseY >= 840 && MouseY <= 904) {
        for (let i = 0; i < MAX_SLOTS; i++) {
            settingsButtons[i].label = ElementValue(`EmeryBtn_Label_${i}`).trim().slice(0, 6);
            settingsButtons[i].emote = ElementValue(`EmeryBtn_Emote_${i}`).trim();
        }
        saveButtons(settingsButtons);
        return;
    }

    // Reset
    if (MouseX >= 550 && MouseX <= 800 && MouseY >= 840 && MouseY <= 904) {
        settingsButtons = DEFAULT_BUTTONS.map(b => ({ ...b }));
        for (let i = 0; i < MAX_SLOTS; i++) {
            const el = document.getElementById(`EmeryBtn_Label_${i}`) as HTMLInputElement | null;
            if (el) el.value = settingsButtons[i].label;
            const el2 = document.getElementById(`EmeryBtn_Emote_${i}`) as HTMLInputElement | null;
            if (el2) el2.value = settingsButtons[i].emote;
        }
        saveButtons(settingsButtons);
    }
}

export function settingsExit(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
        ElementRemove(`EmeryBtn_Label_${i}`);
        ElementRemove(`EmeryBtn_Emote_${i}`);
    }
}
