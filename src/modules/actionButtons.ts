// Action buttons drawn below BCAR's upperleft buttons (EAR/TAIL/WINGS end at y=270)
import {
    CONTENT_LEFT,
    CONTENT_WIDTH,
    UI,
    drawCard,
    drawChromeButton,
    drawInsetLabel,
    drawPill,
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
const GRID_COLS   = 2;
const GRID_GAP_X  = 20;
const GRID_GAP_Y  = 18;
const GRID_TOP    = 214;
const CARD_W      = Math.floor((CONTENT_WIDTH - GRID_GAP_X) / GRID_COLS);
const CARD_H      = 172;
const FOOTER_TOP  = GRID_TOP + Math.ceil(MAX_SLOTS / GRID_COLS) * CARD_H + (Math.ceil(MAX_SLOTS / GRID_COLS) - 1) * GRID_GAP_Y + 18;

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

function normalizeHexColor(value: string | undefined, fallback = "#c2185b"): string {
    const color = (value || "").trim();
    if (/^#[0-9a-f]{6}$/i.test(color)) return color.toLowerCase();
    const shortMatch = /^#([0-9a-f]{3})$/i.exec(color);
    if (shortMatch) {
        const [r, g, b] = shortMatch[1].split("");
        return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return fallback;
}

function getSlotPosition(slot: number): { left: number; top: number } {
    const col = slot % GRID_COLS;
    const row = Math.floor(slot / GRID_COLS);
    return {
        left: CONTENT_LEFT + col * (CARD_W + GRID_GAP_X),
        top: GRID_TOP + row * (CARD_H + GRID_GAP_Y),
    };
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
            ElementCreateInput(inputId(i, "color"), "color", normalizeHexColor(btn.color));
        if (!document.getElementById(inputId(i, "emote")))
            ElementCreateInput(inputId(i, "emote"), "text", btn.emote, "120");
        styleInput(inputId(i, "label"), "short");
        styleColorInput(inputId(i, "color"));
        styleInput(inputId(i, "emote"), "long");
    }
}

export function settingsLoad(): void {
    const stored = getButtons();
    settingsButtons = Array.from({ length: MAX_SLOTS }, (_, i) => ({ ...(stored[i] ?? DEFAULT_BUTTONS[i]) }));
}

function placeInput(id: string, left: number, y: number, width: number, height: number): void {
    ElementPosition(id, left + width / 2, y + height / 2, width, height);
}

export function settingsRun(): void {
    ensureInputs();
    const activeCount = settingsButtons.filter(btn => btn.enabled && btn.label.trim()).length;

    drawSettingsScaffold("Action Buttons", "Quick emote shortcuts for the chatroom sidebar.", [
        { label: "ACTIVE", value: `${activeCount}/${MAX_SLOTS}`, tone: "accent" },
        { label: "LAYOUT", value: "2-Column", tone: "gold" },
    ]);

    for (let i = 0; i < MAX_SLOTS; i++) {
        const btn = settingsButtons[i] ?? DEFAULT_BUTTONS[i];
        const { left, top } = getSlotPosition(i);
        const previewColor = normalizeHexColor((document.getElementById(inputId(i, "color")) as HTMLInputElement | null)?.value, btn.color || "#c2185b");
        const previewLabel = ((document.getElementById(inputId(i, "label")) as HTMLInputElement | null)?.value || btn.label || "EMPTY").slice(0, 6);
        const previewEmote = (document.getElementById(inputId(i, "emote")) as HTMLInputElement | null)?.value || btn.emote || "Describe the emote text here";

        drawCard(left, top, CARD_W, CARD_H, i % 2 === 0 ? "default" : "alt");

        drawPill(left + 18, top + 16, 66, 18, `Slot ${i + 1}`, UI.accentSoft, UI.accent);
        drawChromeButton(left + CARD_W - 126, top + 12, 108, 28, btn.enabled ? "Enabled" : "Disabled", btn.enabled ? "accent" : "muted");

        DrawRect(left + 18, top + 44, 126, 54, UI.cardMuted);
        DrawEmptyRect(left + 18, top + 44, 126, 54, UI.panelEdge, 1);
        DrawButton(left + 28, top + 54, 106, 34, previewLabel || "EMPTY", previewColor, "", previewEmote);
        DrawTextFit("Quickbar preview", left + 81, top + 111, 120, UI.textSoft);

        drawInsetLabel("Button Label", left + 220, top + 28);
        placeInput(inputId(i, "label"), left + 158, top + 44, 148, 34);

        drawInsetLabel("Color Picker", left + 394, top + 28);
        placeInput(inputId(i, "color"), left + 332, top + 44, 74, 34);
        DrawTextFit(previewColor.toUpperCase(), left + 467, top + 62, 112, UI.textMuted);
        DrawTextFit("Tap the swatch to open the picker", left + 467, top + 86, 126, UI.textSoft);

        drawInsetLabel("Emote Text", left + 112, top + 112);
        placeInput(inputId(i, "emote"), left + 18, top + 122, CARD_W - 36, 36);
        DrawTextFit(`/me ${previewEmote}`, left + CARD_W / 2, top + 155, CARD_W - 44, UI.textSoft);
    }

    drawCard(CONTENT_LEFT, FOOTER_TOP, CONTENT_WIDTH, 110, "muted");
    DrawText("Layout Actions", CONTENT_LEFT + 112, FOOTER_TOP + 24, UI.text);
    DrawTextFit("Use the buttons below to save, auto-enable filled slots, or reset the whole quickbar.", CONTENT_LEFT + 370, FOOTER_TOP + 24, 520, UI.textSoft);
    drawChromeButton(CONTENT_LEFT + 18, FOOTER_TOP + 48, 250, 42, "Save Layout", "success");
    drawChromeButton(CONTENT_LEFT + 286, FOOTER_TOP + 48, 250, 42, "Enable Filled Slots", "accent");
    drawChromeButton(CONTENT_LEFT + 554, FOOTER_TOP + 48, 250, 42, "Reset Defaults", "gold");
    drawChromeButton(CONTENT_LEFT + 822, FOOTER_TOP + 48, 330, 42, "Disable Empty Slots", "muted");

    DrawTextFit("Action text becomes a /me emote in chat, and the color picker updates the sidebar button immediately.", CONTENT_LEFT + CONTENT_WIDTH / 2, FOOTER_TOP + 102, CONTENT_WIDTH - 44, UI.textMuted);
}

export function settingsClick(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
        const { left, top } = getSlotPosition(i);
        if (mouseInRect(left + CARD_W - 126, top + 12, 108, 28)) {
            settingsButtons[i].enabled = !settingsButtons[i].enabled;
            return;
        }
    }

    if (mouseInRect(CONTENT_LEFT + 18, FOOTER_TOP + 48, 250, 42)) {
        for (let i = 0; i < MAX_SLOTS; i++) {
            settingsButtons[i].label = ElementValue(inputId(i, "label")).trim().slice(0, 6);
            settingsButtons[i].color = normalizeHexColor(ElementValue(inputId(i, "color")));
            settingsButtons[i].emote = ElementValue(inputId(i, "emote")).trim();
        }
        saveButtons(settingsButtons);
        return;
    }

    if (mouseInRect(CONTENT_LEFT + 286, FOOTER_TOP + 48, 250, 42)) {
        for (let i = 0; i < MAX_SLOTS; i++) {
            const label = ElementValue(inputId(i, "label")).trim();
            const emote = ElementValue(inputId(i, "emote")).trim();
            settingsButtons[i].enabled = !!(label || emote);
        }
        return;
    }

    if (mouseInRect(CONTENT_LEFT + 554, FOOTER_TOP + 48, 250, 42)) {
        settingsButtons = DEFAULT_BUTTONS.map(b => ({ ...b }));
        for (let i = 0; i < MAX_SLOTS; i++) {
            (document.getElementById(inputId(i, "label")) as HTMLInputElement).value = settingsButtons[i].label;
            (document.getElementById(inputId(i, "color")) as HTMLInputElement).value = normalizeHexColor(settingsButtons[i].color);
            (document.getElementById(inputId(i, "emote")) as HTMLInputElement).value = settingsButtons[i].emote;
        }
        saveButtons(settingsButtons);
        return;
    }

    if (mouseInRect(CONTENT_LEFT + 822, FOOTER_TOP + 48, 330, 42)) {
        for (let i = 0; i < MAX_SLOTS; i++) {
            const label = ElementValue(inputId(i, "label")).trim();
            const emote = ElementValue(inputId(i, "emote")).trim();
            settingsButtons[i].enabled = !!(label && emote);
        }
    }
}

export function settingsExit(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
        ElementRemove(inputId(i, "label"));
        ElementRemove(inputId(i, "color"));
        ElementRemove(inputId(i, "emote"));
    }
}
