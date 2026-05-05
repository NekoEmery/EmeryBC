(function () {
    'use strict';

    const PANEL_W = 1260;
    const PANEL_H = 940;
    const PANEL_PADDING = 28;
    const CONTENT_LEFT = PANEL_PADDING;
    const CONTENT_RIGHT = PANEL_W - PANEL_PADDING;
    const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;
    const UI = {
        backdrop: "#12070d",
        panel: "#1b0d17",
        panelInner: "#24111d",
        panelEdge: "#4c2537",
        panelGlow: "#311320",
        card: "#2a1421",
        cardAlt: "#331827",
        cardMuted: "#190b13",
        text: "#f7e6ee",
        textMuted: "#cbaab7",
        textSoft: "#967281",
        accent: "#cf6f98",
        accentDeep: "#91405f",
        accentSoft: "#5b2439",
        gold: "#c9ab72",
        success: "#79a885",
        danger: "#cb798c",
        buttonMuted: "#432232",
        buttonDisabled: "#2b1520"};
    const STAT_TONES = {
        accent: { fill: "#351622", border: UI.accentDeep, text: UI.accent },
        gold: { fill: "#322313", border: "#7f6132", text: UI.gold },
        success: { fill: "#1f2c24", border: "#406650", text: UI.success },
        danger: { fill: "#33151f", border: "#7d394a", text: UI.danger },
        muted: { fill: "#24111d", border: "#553142", text: UI.textMuted },
    };
    const BUTTON_TONES = {
        accent: { fill: UI.accentDeep, border: UI.accent, frame: "#250d18" },
        gold: { fill: "#6d532c", border: UI.gold, frame: "#24170a" },
        success: { fill: "#32523f", border: UI.success, frame: "#132119" },
        danger: { fill: "#6f3142", border: UI.danger, frame: "#231018" },
        muted: { fill: UI.buttonMuted, border: UI.textSoft, frame: "#1f0d16" },
    };
    function drawSettingsScaffold(title, subtitle, stats) {
        var _a;
        DrawRect(0, 60, PANEL_W, PANEL_H, UI.backdrop);
        DrawRect(10, 70, PANEL_W - 20, PANEL_H - 20, UI.panel);
        DrawRect(18, 78, PANEL_W - 36, PANEL_H - 36, UI.panelInner);
        DrawEmptyRect(10, 70, PANEL_W - 20, PANEL_H - 20, UI.panelEdge, 2);
        DrawRect(18, 78, PANEL_W - 36, 126, UI.panelGlow);
        DrawRect(18, 78, 10, PANEL_H - 36, UI.accentDeep);
        DrawRect(18, 202, PANEL_W - 36, 2, UI.panelEdge);
        drawPill(42, 92, 96, 24, "EMERYBC", UI.accentSoft, UI.accent);
        DrawTextFit(title, 306, 124, 420, UI.text);
        DrawTextFit(subtitle, 392, 156, 660, UI.textMuted);
        DrawTextFit("Quick tools, cleaner layout, faster setup.", PANEL_W - 208, 156, 304, UI.textSoft);
        const statWidth = 110;
        const statGap = 12;
        const totalWidth = stats.length * statWidth + Math.max(0, stats.length - 1) * statGap;
        let left = PANEL_W - 36 - totalWidth;
        for (const stat of stats) {
            drawStatCard(left, 90, statWidth, 52, stat.label, stat.value, (_a = stat.tone) !== null && _a !== void 0 ? _a : "muted");
            left += statWidth + statGap;
        }
    }
    function drawStatCard(left, top, width, height, label, value, tone) {
        const style = STAT_TONES[tone];
        DrawRect(left, top, width, height, "#12070d");
        DrawRect(left + 2, top + 2, width - 4, height - 4, style.fill);
        DrawEmptyRect(left + 2, top + 2, width - 4, height - 4, style.border, 1);
        DrawTextFit(label, left + width / 2, top + 14, width - 12, UI.textSoft);
        DrawTextFit(value, left + width / 2, top + 33, width - 12, style.text);
    }
    function drawCard(left, top, width, height, tone = "default") {
        const fill = tone === "alt" ? UI.cardAlt : tone === "muted" ? UI.cardMuted : UI.card;
        DrawRect(left + 4, top + 4, width, height, "rgba(0, 0, 0, 0.28)");
        DrawRect(left, top, width, height, fill);
        DrawEmptyRect(left, top, width, height, UI.panelEdge, 1);
    }
    function drawChromeButton(left, top, width, height, label, tone, disabled = false, hoverText = "") {
        const style = BUTTON_TONES[tone];
        DrawRect(left, top, width, height, style.frame);
        DrawButton(left + 2, top + 2, width - 4, height - 4, label, disabled ? UI.buttonDisabled : style.fill, "", hoverText, disabled);
        DrawEmptyRect(left + 2, top + 2, width - 4, height - 4, disabled ? UI.buttonMuted : style.border, 1);
    }
    function drawPill(left, top, width, height, label, fill, textColor) {
        DrawRect(left, top, width, height, fill);
        DrawEmptyRect(left, top, width, height, textColor, 1);
        DrawTextFit(label, left + width / 2, top + height / 2 + 1, width - 12, textColor);
    }
    let colorInputStylesInjected = false;
    function ensureColorInputStyles() {
        if (colorInputStylesInjected)
            return;
        const style = document.createElement("style");
        style.textContent = `
        .emerybc-color-input {
            appearance: none;
            -webkit-appearance: none;
            border: 1px solid #7a465a;
            border-radius: 12px;
            background: #1f0d16;
            padding: 3px;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06);
            cursor: pointer;
        }
        .emerybc-color-input::-webkit-color-swatch-wrapper {
            padding: 0;
            border-radius: 9px;
        }
        .emerybc-color-input::-webkit-color-swatch {
            border: none;
            border-radius: 9px;
        }
        .emerybc-color-input::-moz-color-swatch {
            border: none;
            border-radius: 9px;
        }
    `;
        document.head.appendChild(style);
        colorInputStylesInjected = true;
    }
    function styleInput(id, widthHint = "medium") {
        const input = document.getElementById(id);
        if (!input)
            return;
        const fontSize = widthHint === "long" ? "14px" : "15px";
        input.style.background = "linear-gradient(180deg, #fff5f9 0%, #f3dde6 100%)";
        input.style.border = "1px solid #7a465a";
        input.style.borderRadius = "12px";
        input.style.boxShadow = "inset 0 1px 2px rgba(60, 18, 35, 0.16), 0 0 0 1px rgba(255,255,255,0.08)";
        input.style.color = "#401524";
        input.style.fontFamily = "\"Trebuchet MS\", \"Palatino Linotype\", serif";
        input.style.fontSize = fontSize;
        input.style.padding = "0 12px";
        input.style.outline = "none";
        input.style.letterSpacing = "0.02em";
        input.autocomplete = "off";
    }
    function styleColorInput(id) {
        const input = document.getElementById(id);
        if (!input)
            return;
        ensureColorInputStyles();
        input.classList.add("emerybc-color-input");
        input.style.padding = "2px";
        input.style.background = UI.cardMuted;
        input.style.border = "1px solid #7a465a";
        input.style.borderRadius = "12px";
        input.style.boxShadow = "inset 0 1px 2px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06)";
    }
    function mouseInRect(x, y, w, h) {
        return MouseX >= x && MouseX <= x + w && MouseY >= y && MouseY <= y + h;
    }

    // Action buttons drawn below BCAR's upperleft buttons (EAR/TAIL/WINGS end at y=270)
    const DEFAULT_BUTTONS = [
        { label: "NOD", emote: "nods their head", color: "#c2185b", enabled: true },
        { label: "SHAKE", emote: "shakes their head", color: "#c2185b", enabled: true },
        { label: "WAVE", emote: "waves", color: "#c2185b", enabled: true },
        { label: "BOW", emote: "bows their head politely", color: "#c2185b", enabled: true },
        { label: "", emote: "", color: "#c2185b", enabled: false },
        { label: "", emote: "", color: "#c2185b", enabled: false },
    ];
    const BTN_X = 0;
    const BTN_START_Y = 270;
    const BTN_SIZE = 45;
    const MAX_SLOTS = 6;
    const GRID_COLS = 2;
    const GRID_GAP_X = 20;
    const GRID_GAP_Y = 18;
    const GRID_TOP = 214;
    const CARD_W = Math.floor((CONTENT_WIDTH - GRID_GAP_X) / GRID_COLS);
    const CARD_H = 188;
    const FOOTER_TOP = GRID_TOP + Math.ceil(MAX_SLOTS / GRID_COLS) * CARD_H + (Math.ceil(MAX_SLOTS / GRID_COLS) - 1) * GRID_GAP_Y + 18;
    function getButtons() {
        var _a;
        const stored = (_a = Player.ExtensionSettings.EmeryBC) === null || _a === void 0 ? void 0 : _a.actionButtons;
        if (Array.isArray(stored))
            return stored;
        return DEFAULT_BUTTONS;
    }
    function saveButtons(buttons) {
        if (!Player.ExtensionSettings.EmeryBC)
            Player.ExtensionSettings.EmeryBC = {};
        Player.ExtensionSettings.EmeryBC.actionButtons = buttons;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    }
    function normalizeHexColor(value, fallback = "#c2185b") {
        const color = (value || "").trim();
        if (/^#[0-9a-f]{6}$/i.test(color))
            return color.toLowerCase();
        const shortMatch = /^#([0-9a-f]{3})$/i.exec(color);
        if (shortMatch) {
            const [r, g, b] = shortMatch[1].split("");
            return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
        }
        return fallback;
    }
    function getSlotPosition(slot) {
        const col = slot % GRID_COLS;
        const row = Math.floor(slot / GRID_COLS);
        return {
            left: CONTENT_LEFT + col * (CARD_W + GRID_GAP_X),
            top: GRID_TOP + row * (CARD_H + GRID_GAP_Y),
        };
    }
    // ─── In-game ─────────────────────────────────────────────────────────────────
    function drawActionButtons() {
        if (CurrentScreen !== "ChatRoom")
            return;
        const buttons = getButtons();
        for (let i = 0; i < MAX_SLOTS; i++) {
            const btn = buttons[i];
            if (!(btn === null || btn === void 0 ? void 0 : btn.enabled) || !btn.label)
                continue;
            DrawButton(BTN_X, BTN_START_Y + i * BTN_SIZE, BTN_SIZE, BTN_SIZE, btn.label, btn.color || "#c2185b", "", btn.emote);
        }
    }
    function handleActionButtonClick() {
        if (CurrentScreen !== "ChatRoom")
            return false;
        const buttons = getButtons();
        for (let i = 0; i < MAX_SLOTS; i++) {
            const btn = buttons[i];
            if (!(btn === null || btn === void 0 ? void 0 : btn.enabled) || !btn.label)
                continue;
            const y = BTN_START_Y + i * BTN_SIZE;
            if (MouseX >= BTN_X && MouseX <= BTN_X + BTN_SIZE &&
                MouseY >= y && MouseY <= y + BTN_SIZE) {
                ServerSend("ChatRoomChat", { Content: btn.emote.trim(), Type: "Emote" });
                return true;
            }
        }
        return false;
    }
    // ─── Settings ─────────────────────────────────────────────────────────────────
    // settingsButtons is only initialised in settingsLoad (called once on screen open)
    // so toggle/edit state persists across frames while the screen is open
    let settingsButtons = [];
    function inputId(slot, field) {
        return `EmeryBtn_${field}_${slot}`;
    }
    function ensureInputs$1() {
        var _a;
        for (let i = 0; i < MAX_SLOTS; i++) {
            const btn = (_a = settingsButtons[i]) !== null && _a !== void 0 ? _a : DEFAULT_BUTTONS[i];
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
    function settingsLoad() {
        const stored = getButtons();
        settingsButtons = Array.from({ length: MAX_SLOTS }, (_, i) => { var _a; return (Object.assign({}, ((_a = stored[i]) !== null && _a !== void 0 ? _a : DEFAULT_BUTTONS[i]))); });
    }
    function placeInput$1(id, left, y, width, height) {
        ElementPosition(id, left + width / 2, y + height / 2, width, height);
    }
    function settingsRun$1() {
        var _a, _b, _c, _d;
        ensureInputs$1();
        const activeCount = settingsButtons.filter(btn => btn.enabled && btn.label.trim()).length;
        drawSettingsScaffold("Action Buttons", "Quick emote shortcuts for the chatroom sidebar.", [
            { label: "ACTIVE", value: `${activeCount}/${MAX_SLOTS}`, tone: "accent" },
            { label: "LAYOUT", value: "2-Column", tone: "gold" },
        ]);
        for (let i = 0; i < MAX_SLOTS; i++) {
            const btn = (_a = settingsButtons[i]) !== null && _a !== void 0 ? _a : DEFAULT_BUTTONS[i];
            const { left, top } = getSlotPosition(i);
            const previewColor = normalizeHexColor((_b = document.getElementById(inputId(i, "color"))) === null || _b === void 0 ? void 0 : _b.value, btn.color || "#c2185b");
            const previewLabel = (((_c = document.getElementById(inputId(i, "label"))) === null || _c === void 0 ? void 0 : _c.value) || btn.label || "EMPTY").slice(0, 6);
            const previewEmote = ((_d = document.getElementById(inputId(i, "emote"))) === null || _d === void 0 ? void 0 : _d.value) || btn.emote || "Describe the emote text here";
            drawCard(left, top, CARD_W, CARD_H, i % 2 === 0 ? "default" : "alt");
            drawPill(left + 18, top + 16, 66, 18, `Slot ${i + 1}`, UI.accentSoft, UI.accent);
            drawChromeButton(left + CARD_W - 126, top + 12, 108, 28, btn.enabled ? "Enabled" : "Disabled", btn.enabled ? "accent" : "muted");
            DrawRect(left + 18, top + 46, 128, 58, UI.cardMuted);
            DrawEmptyRect(left + 18, top + 46, 128, 58, UI.panelEdge, 1);
            DrawButton(left + 28, top + 58, 108, 34, previewLabel || "EMPTY", previewColor, "", previewEmote);
            DrawTextFit("Quickbar preview", left + 82, top + 114, 120, UI.textSoft);
            DrawTextFit("Label", left + 232, top + 34, 120, UI.textSoft);
            placeInput$1(inputId(i, "label"), left + 166, top + 48, 132, 34);
            DrawTextFit("Color", left + 380, top + 34, 100, UI.textSoft);
            placeInput$1(inputId(i, "color"), left + 322, top + 48, 78, 34);
            DrawTextFit(previewColor.toUpperCase(), left + 480, top + 66, 148, UI.textMuted);
            DrawTextFit("tap swatch to pick", left + 480, top + 90, 148, UI.textSoft);
            DrawTextFit("Emote Text", left + CARD_W / 2, top + 118, 180, UI.textSoft);
            placeInput$1(inputId(i, "emote"), left + 18, top + 128, CARD_W - 36, 36);
            DrawTextFit(`/me ${previewEmote}`, left + CARD_W / 2, top + 171, CARD_W - 44, UI.textSoft);
        }
        drawCard(CONTENT_LEFT, FOOTER_TOP, CONTENT_WIDTH, 118, "muted");
        DrawText("Layout Actions", CONTENT_LEFT + 112, FOOTER_TOP + 24, UI.text);
        DrawTextFit("Use these controls to save the current builder, auto-toggle filled slots, or reset everything cleanly.", CONTENT_LEFT + 436, FOOTER_TOP + 24, 660, UI.textSoft);
        drawChromeButton(CONTENT_LEFT + 18, FOOTER_TOP + 50, 268, 42, "Save Layout", "success");
        drawChromeButton(CONTENT_LEFT + 304, FOOTER_TOP + 50, 268, 42, "Enable Filled Slots", "accent");
        drawChromeButton(CONTENT_LEFT + 590, FOOTER_TOP + 50, 268, 42, "Reset Defaults", "gold");
        drawChromeButton(CONTENT_LEFT + 876, FOOTER_TOP + 50, 328, 42, "Disable Empty Slots", "muted");
        DrawTextFit("Action text becomes a /me emote in chat, and the picker updates the quickbar color immediately.", CONTENT_LEFT + CONTENT_WIDTH / 2, FOOTER_TOP + 106, CONTENT_WIDTH - 44, UI.textMuted);
    }
    function settingsClick$1() {
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
            settingsButtons = DEFAULT_BUTTONS.map(b => (Object.assign({}, b)));
            for (let i = 0; i < MAX_SLOTS; i++) {
                document.getElementById(inputId(i, "label")).value = settingsButtons[i].label;
                document.getElementById(inputId(i, "color")).value = normalizeHexColor(settingsButtons[i].color);
                document.getElementById(inputId(i, "emote")).value = settingsButtons[i].emote;
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
    function settingsExit$1() {
        for (let i = 0; i < MAX_SLOTS; i++) {
            ElementRemove(inputId(i, "label"));
            ElementRemove(inputId(i, "color"));
            ElementRemove(inputId(i, "emote"));
        }
    }

    const RESTRAINT_GROUPS = new Set([
        "ItemArms", "ItemHands", "ItemLegs", "ItemFeet", "ItemBoots",
        "ItemMouth", "ItemMouthAccessory", "ItemHead", "ItemHood",
        "ItemNeck", "ItemNeckAccessories", "ItemNeckRestraints",
        "ItemPelvis", "ItemVulva", "ItemButt", "ItemBreast", "ItemNipples",
        "ItemTorso", "ItemTorso2", "ItemEars", "ItemNose", "ItemMisc",
    ]);
    const OUTFITS_PER_PAGE = 4;
    const NAV_Y = 216;
    const LIST_Y = 268;
    const ROW_H = 104;
    const LIST_LEFT = CONTENT_LEFT;
    const LIST_WIDTH = 700;
    const LIST_BUTTON_W = 84;
    const EDITOR_GAP = 20;
    const EDITOR_LEFT = LIST_LEFT + LIST_WIDTH + EDITOR_GAP;
    const EDITOR_WIDTH = CONTENT_RIGHT - EDITOR_LEFT;
    const EDITOR_TOP = NAV_Y;
    const EDITOR_HEIGHT = 652;
    let settingsPage = 0;
    let addIncludeRestraints = false;
    let editingOutfitId = null;
    const MAX_SERIALIZE_DEPTH = 12;
    let outfitApplyPending = false;
    let refreshScheduled = false;
    let cachedOutfits = null;
    function placeInput(id, left, y, width, height) {
        ElementPosition(id, left + width / 2, y + height / 2, width, height);
    }
    function getAddon() {
        if (!Player.ExtensionSettings.EmeryBC) {
            Player.ExtensionSettings.EmeryBC = {};
        }
        return Player.ExtensionSettings.EmeryBC;
    }
    function loadOutfitsFromSettings() {
        const list = getAddon().outfits;
        const outfits = Array.isArray(list) ? list.map(sanitizeOutfit) : [];
        cachedOutfits = outfits;
        return outfits;
    }
    function getOutfits() {
        return cachedOutfits !== null && cachedOutfits !== void 0 ? cachedOutfits : loadOutfitsFromSettings();
    }
    function saveOutfits(list) {
        const sanitized = list.map(sanitizeOutfit);
        cachedOutfits = sanitized;
        getAddon().outfits = sanitized;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    }
    function uid() {
        return Math.random().toString(36).slice(2, 9);
    }
    function sanitizeSerializable(value, seen = new WeakSet(), depth = 0) {
        if (value == null)
            return value;
        if (depth > MAX_SERIALIZE_DEPTH)
            return undefined;
        const valueType = typeof value;
        if (valueType === "string" || valueType === "number" || valueType === "boolean") {
            return value;
        }
        if (Array.isArray(value)) {
            return value
                .map(entry => sanitizeSerializable(entry, seen, depth + 1))
                .filter(entry => entry !== undefined);
        }
        if (valueType !== "object")
            return undefined;
        const obj = value;
        if (seen.has(obj))
            return undefined;
        seen.add(obj);
        const proto = Object.getPrototypeOf(obj);
        if (proto !== Object.prototype && proto !== null) {
            seen.delete(obj);
            return undefined;
        }
        const clone = {};
        for (const [key, entry] of Object.entries(obj)) {
            const sanitized = sanitizeSerializable(entry, seen, depth + 1);
            if (sanitized !== undefined) {
                clone[key] = sanitized;
            }
        }
        seen.delete(obj);
        return clone;
    }
    function sanitizeColor(color) {
        if (typeof color === "string")
            return color;
        if (Array.isArray(color)) {
            return color.filter((entry) => typeof entry === "string");
        }
        return undefined;
    }
    function sanitizeCraft(craft) {
        const sanitized = sanitizeSerializable(craft);
        return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
            ? sanitized
            : undefined;
    }
    function sanitizeProperty(property) {
        const sanitized = sanitizeSerializable(property);
        return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
            ? sanitized
            : undefined;
    }
    function sanitizeItem(item) {
        return {
            Group: item.Group,
            Name: item.Name,
            Color: sanitizeColor(item.Color),
            Difficulty: typeof item.Difficulty === "number" ? item.Difficulty : undefined,
            Property: sanitizeProperty(item.Property),
            Craft: sanitizeCraft(item.Craft),
        };
    }
    function sanitizeOutfit(outfit) {
        return {
            id: outfit.id,
            command: outfit.command,
            displayName: outfit.displayName,
            announceText: outfit.announceText,
            includeRestraints: !!outfit.includeRestraints,
            items: Array.isArray(outfit.items) ? outfit.items.map(sanitizeItem) : [],
        };
    }
    function sanitizeLiveAppearance() {
        for (const item of Player.Appearance) {
            item.Color = sanitizeColor(item.Color);
            item.Property = sanitizeProperty(item.Property);
            item.Craft = sanitizeCraft(item.Craft);
        }
    }
    function cloneAppearanceItem(item) {
        const asset = AssetGet(Player.AssetFamily, item.Asset.Group.Name, item.Asset.Name);
        if (!asset)
            return null;
        return {
            Asset: asset,
            Color: sanitizeColor(item.Color),
            Difficulty: typeof item.Difficulty === "number" ? item.Difficulty : undefined,
            Property: sanitizeProperty(item.Property),
            Craft: sanitizeCraft(item.Craft),
        };
    }
    function buildAppearanceItem(saved) {
        const asset = AssetGet(Player.AssetFamily, saved.Group, saved.Name);
        if (!asset)
            return null;
        const property = saved.Property ? Object.assign({}, saved.Property) : undefined;
        if (property) {
            delete property["LockedBy"];
            delete property["LockMemberNumber"];
            delete property["CombinationNumber"];
            delete property["Password"];
            delete property["MemberNumberListKeys"];
        }
        return {
            Asset: asset,
            Color: saved.Color,
            Difficulty: saved.Difficulty,
            Property: property,
            Craft: saved.Craft ? Object.assign({}, saved.Craft) : undefined,
        };
    }
    function sendRoomAppearanceUpdate() {
        var _a;
        if (Player.OnlineID == null)
            return;
        ServerSend("ChatRoomCharacterUpdate", {
            ID: Player.OnlineID,
            ActivePose: (_a = Player.ActivePose) !== null && _a !== void 0 ? _a : null,
            Appearance: ServerAppearanceBundle(Player.Appearance),
        });
    }
    function scheduleAppearanceRefresh() {
        if (refreshScheduled)
            return;
        refreshScheduled = true;
        window.setTimeout(() => {
            try {
                CharacterRefresh(Player, false, false);
            }
            finally {
                refreshScheduled = false;
            }
        }, 0);
    }
    function captureAppearance(includeRestraints) {
        return Player.Appearance
            .filter(item => includeRestraints || !RESTRAINT_GROUPS.has(item.Asset.Group.Name))
            .map(item => sanitizeItem({
            Group: item.Asset.Group.Name,
            Name: item.Asset.Name,
            Color: item.Color,
            Difficulty: item.Difficulty,
            Property: item.Property,
            Craft: item.Craft,
        }));
    }
    function applyOutfit(outfit) {
        if (outfitApplyPending) {
            localNotice("An outfit swap is already in progress.", "#ffb7c7");
            return;
        }
        outfitApplyPending = true;
        const nextAppearance = [];
        if (!outfit.includeRestraints) {
            for (const currentItem of Player.Appearance) {
                const group = currentItem.Asset.Group.Name;
                if (!RESTRAINT_GROUPS.has(group))
                    continue;
                const cloned = cloneAppearanceItem(currentItem);
                if (cloned)
                    nextAppearance.push(cloned);
            }
        }
        for (const saved of outfit.items) {
            const built = buildAppearanceItem(saved);
            if (built)
                nextAppearance.push(built);
        }
        Player.Appearance = nextAppearance;
        sanitizeLiveAppearance();
        sendRoomAppearanceUpdate();
        scheduleAppearanceRefresh();
        // Let the appearance update hit the send queue before we add the optional emote.
        window.setTimeout(() => {
            try {
                if (outfit.announceText.trim()) {
                    ServerSend("ChatRoomChat", { Content: outfit.announceText.trim(), Type: "Emote" });
                }
            }
            finally {
                outfitApplyPending = false;
            }
        }, 80);
        localNotice(`Loaded "${outfit.displayName}" (/${outfit.command})`);
    }
    function handleOutfitCommand(inputValue) {
        const trimmed = inputValue.trim();
        if (!trimmed.startsWith("/"))
            return false;
        const command = trimmed.slice(1).toLowerCase();
        const outfit = getOutfits().find(entry => entry.command.toLowerCase() === command);
        if (!outfit)
            return false;
        if (!outfit.items.length) {
            localNotice(`Outfit "/${outfit.command}" has no saved appearance yet. Save it from Extensions.`, "#ffb7c7");
            return true;
        }
        applyOutfit(outfit);
        return true;
    }
    function localNotice(msg, color = UI.accent) {
        const log = document.getElementById("TextAreaChatLog");
        if (!log)
            return;
        const div = document.createElement("div");
        div.style.cssText = [
            `color:${color}`,
            `background:${UI.cardMuted}`,
            `border-left:3px solid ${UI.accent}`,
            "font-style:italic",
            "padding:4px 8px",
            "margin:2px 0",
        ].join(";");
        div.textContent = `[EmeryBC] ${msg}`;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }
    function ensureInputs() {
        if (!document.getElementById("EmeryOF_Cmd")) {
            ElementCreateInput("EmeryOF_Cmd", "text", "", "20");
        }
        if (!document.getElementById("EmeryOF_Name")) {
            ElementCreateInput("EmeryOF_Name", "text", "", "40");
        }
        if (!document.getElementById("EmeryOF_Announce")) {
            ElementCreateInput("EmeryOF_Announce", "text", "changes into her outfit", "120");
        }
        styleInput("EmeryOF_Cmd", "short");
        styleInput("EmeryOF_Name", "medium");
        styleInput("EmeryOF_Announce", "long");
    }
    function setEditorValues(command, name, announce, includeRestraints) {
        const cmdInput = document.getElementById("EmeryOF_Cmd");
        const nameInput = document.getElementById("EmeryOF_Name");
        const announceInput = document.getElementById("EmeryOF_Announce");
        if (cmdInput)
            cmdInput.value = command;
        if (nameInput)
            nameInput.value = name;
        if (announceInput)
            announceInput.value = announce;
        addIncludeRestraints = includeRestraints;
    }
    function resetEditor() {
        editingOutfitId = null;
        setEditorValues("", "", "changes into her outfit", false);
    }
    function beginEditing(outfit) {
        editingOutfitId = outfit.id;
        setEditorValues(outfit.command, outfit.displayName, outfit.announceText, outfit.includeRestraints);
    }
    function outfitSettingsLoad() {
        loadOutfitsFromSettings();
        settingsPage = 0;
        editingOutfitId = null;
        addIncludeRestraints = false;
    }
    function outfitSettingsRun() {
        var _a;
        ensureInputs();
        const outfits = getOutfits();
        const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
        const page = Math.min(settingsPage, totalPages - 1);
        const visible = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);
        const editingOutfit = editingOutfitId ? (_a = outfits.find(outfit => outfit.id === editingOutfitId)) !== null && _a !== void 0 ? _a : null : null;
        drawSettingsScaffold("Outfit Commands", "Capture a look once, then switch with a slash command.", [
            { label: "OUTFITS", value: `${outfits.length}`, tone: "accent" },
            { label: "PAGE", value: `${page + 1}/${totalPages}`, tone: "gold" },
        ]);
        drawChromeButton(LIST_LEFT, NAV_Y, 96, 30, "Prev", "muted", page === 0);
        DrawText("Wardrobe", LIST_LEFT + 154, NAV_Y + 18, UI.textMuted);
        DrawTextFit(`${page + 1} of ${totalPages}`, LIST_LEFT + 286, NAV_Y + 18, 120, UI.textSoft);
        drawChromeButton(LIST_LEFT + LIST_WIDTH - 96, NAV_Y, 96, 30, "Next", "muted", page >= totalPages - 1);
        DrawTextFit("Select a row to edit it. Use the row buttons to wear, refresh, or delete without leaving the screen.", LIST_LEFT + LIST_WIDTH / 2, NAV_Y + 42, LIST_WIDTH - 40, UI.textSoft);
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            const y = LIST_Y + i * ROW_H;
            const isEditing = editingOutfitId === (outfit === null || outfit === void 0 ? void 0 : outfit.id);
            drawCard(LIST_LEFT, y, LIST_WIDTH, ROW_H - 8, i % 2 === 0 ? "default" : "alt");
            if (isEditing) {
                DrawEmptyRect(LIST_LEFT - 1, y - 1, LIST_WIDTH + 2, ROW_H - 6, UI.accent, 2);
            }
            if (!outfit) {
                DrawText("Empty slot", LIST_LEFT + LIST_WIDTH / 2, y + 30, UI.textMuted);
                DrawTextFit("Create a new outfit from the editor on the right to fill this space.", LIST_LEFT + LIST_WIDTH / 2, y + 58, 420, UI.textSoft);
                continue;
            }
            const hasSave = outfit.items.length > 0;
            const statusText = `${hasSave ? `${outfit.items.length} items saved` : "No save data"} • ${outfit.includeRestraints ? "includes restraints" : "clothes only"}`;
            drawPill(LIST_LEFT + 16, y + 16, 104, 22, `/${outfit.command}`, UI.accentSoft, UI.accent);
            DrawTextFit(outfit.displayName, LIST_LEFT + 228, y + 24, 212, UI.text);
            DrawTextFit(statusText, LIST_LEFT + 296, y + 52, 360, hasSave ? UI.textMuted : UI.textSoft);
            DrawTextFit(`/me ${outfit.announceText}`, LIST_LEFT + 296, y + 76, 420, UI.textSoft);
            drawChromeButton(LIST_LEFT + LIST_WIDTH - 286, y + 24, LIST_BUTTON_W, 26, "Wear", "accent");
            drawChromeButton(LIST_LEFT + LIST_WIDTH - 192, y + 24, LIST_BUTTON_W, 26, "Update", "success", false, "Save current appearance");
            drawChromeButton(LIST_LEFT + LIST_WIDTH - 98, y + 24, LIST_BUTTON_W, 26, "Delete", "danger");
        }
        drawCard(EDITOR_LEFT, EDITOR_TOP, EDITOR_WIDTH, EDITOR_HEIGHT, "muted");
        DrawText(editingOutfit ? "Outfit Editor" : "New Outfit Builder", EDITOR_LEFT + 104, EDITOR_TOP + 24, UI.text);
        DrawTextFit(editingOutfit
            ? `Editing /${editingOutfit.command}. Save settings here, or refresh its saved look with Update or Save Current Look.`
            : "Dress your character first, then capture that look here into a reusable slash command.", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 24, EDITOR_WIDTH - 150, UI.textSoft);
        drawPill(EDITOR_LEFT + 18, EDITOR_TOP + 44, EDITOR_WIDTH - 36, 22, editingOutfit ? `Currently editing: /${editingOutfit.command}` : "No outfit selected yet", UI.cardMuted, editingOutfit ? UI.accent : UI.textMuted);
        DrawTextFit("Command", EDITOR_LEFT + 90, EDITOR_TOP + 94, 140, UI.textSoft);
        DrawText("/", EDITOR_LEFT + 30, EDITOR_TOP + 126, UI.accent);
        placeInput("EmeryOF_Cmd", EDITOR_LEFT + 56, EDITOR_TOP + 108, 150, 34);
        DrawTextFit("Display Name", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 160, 180, UI.textSoft);
        placeInput("EmeryOF_Name", EDITOR_LEFT + 18, EDITOR_TOP + 174, EDITOR_WIDTH - 36, 36);
        DrawTextFit("Restraint Mode", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 228, 180, UI.textSoft);
        drawChromeButton(EDITOR_LEFT + 18, EDITOR_TOP + 242, EDITOR_WIDTH - 36, 34, addIncludeRestraints ? "Include restraints in the saved outfit" : "Save clothing only and preserve restraints", addIncludeRestraints ? "danger" : "success");
        DrawTextFit("Announce Text", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 306, 180, UI.textSoft);
        DrawText("/me", EDITOR_LEFT + 30, EDITOR_TOP + 338, UI.accent);
        placeInput("EmeryOF_Announce", EDITOR_LEFT + 60, EDITOR_TOP + 320, EDITOR_WIDTH - 78, 36);
        drawCard(EDITOR_LEFT + 18, EDITOR_TOP + 384, EDITOR_WIDTH - 36, 128, "default");
        DrawText("Quick Actions", EDITOR_LEFT + 96, EDITOR_TOP + 408, UI.text);
        DrawTextFit("These buttons either save the command settings or capture the look your character is currently wearing.", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 408, EDITOR_WIDTH - 90, UI.textSoft);
        drawChromeButton(EDITOR_LEFT + 28, EDITOR_TOP + 434, EDITOR_WIDTH - 56, 36, editingOutfit ? "Save Outfit Settings" : "Create New Outfit From Current Look", "success");
        drawChromeButton(EDITOR_LEFT + 28, EDITOR_TOP + 476, EDITOR_WIDTH - 56, 30, editingOutfit ? "Save Current Look Into This Outfit" : "Capture Current Look Preview", editingOutfit ? "accent" : "muted", !editingOutfit);
        drawCard(EDITOR_LEFT + 18, EDITOR_TOP + 532, EDITOR_WIDTH - 36, 100, "default");
        DrawText("Notes", EDITOR_LEFT + 60, EDITOR_TOP + 556, UI.textMuted);
        DrawTextFit("Use the row buttons on the left to wear or delete saved outfits instantly. Clicking a row opens it here for editing.", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 580, EDITOR_WIDTH - 52, UI.textSoft);
        DrawTextFit("The saved announce text becomes a /me emote when you trigger the slash command.", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 608, EDITOR_WIDTH - 52, UI.textMuted);
        if (editingOutfit) {
            drawChromeButton(EDITOR_LEFT + 28, EDITOR_TOP + 642, EDITOR_WIDTH - 56, 30, "Cancel Edit", "muted");
        }
    }
    function outfitSettingsClick() {
        const outfits = getOutfits();
        const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
        const page = Math.min(settingsPage, totalPages - 1);
        const visible = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);
        if (mouseInRect(LIST_LEFT, NAV_Y, 96, 30)) {
            settingsPage = Math.max(0, page - 1);
            return;
        }
        if (mouseInRect(LIST_LEFT + LIST_WIDTH - 96, NAV_Y, 96, 30)) {
            settingsPage = Math.min(totalPages - 1, page + 1);
            return;
        }
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            if (!outfit)
                continue;
            const y = LIST_Y + i * ROW_H;
            if (mouseInRect(LIST_LEFT + LIST_WIDTH - 286, y + 22, LIST_BUTTON_W, 24)) {
                applyOutfit(outfit);
                return;
            }
            if (mouseInRect(LIST_LEFT + LIST_WIDTH - 192, y + 22, LIST_BUTTON_W, 24)) {
                const idx = outfits.indexOf(outfit);
                outfits[idx].items = captureAppearance(outfit.includeRestraints);
                saveOutfits(outfits);
                localNotice(`Updated "/${outfit.command}"`);
                return;
            }
            if (mouseInRect(LIST_LEFT + LIST_WIDTH - 98, y + 22, LIST_BUTTON_W, 24)) {
                saveOutfits(outfits.filter(entry => entry.id !== outfit.id));
                if (editingOutfitId === outfit.id) {
                    resetEditor();
                }
                settingsPage = Math.min(settingsPage, Math.max(0, Math.ceil((outfits.length - 1) / OUTFITS_PER_PAGE) - 1));
                return;
            }
            if (mouseInRect(LIST_LEFT, y, LIST_WIDTH, ROW_H - 8)) {
                beginEditing(outfit);
                return;
            }
        }
        if (mouseInRect(EDITOR_LEFT + 18, EDITOR_TOP + 242, EDITOR_WIDTH - 36, 34)) {
            addIncludeRestraints = !addIncludeRestraints;
            return;
        }
        if (editingOutfitId && mouseInRect(EDITOR_LEFT + 28, EDITOR_TOP + 642, EDITOR_WIDTH - 56, 30)) {
            resetEditor();
            return;
        }
        if (mouseInRect(EDITOR_LEFT + 28, EDITOR_TOP + 434, EDITOR_WIDTH - 56, 36)) {
            const cmd = ElementValue("EmeryOF_Cmd").trim().replace(/\s+/g, "").toLowerCase();
            const name = ElementValue("EmeryOF_Name").trim();
            const announce = ElementValue("EmeryOF_Announce").trim();
            if (!cmd) {
                localNotice("Command cannot be empty.", "#ffb7c7");
                return;
            }
            if (!name) {
                localNotice("Name cannot be empty.", "#ffb7c7");
                return;
            }
            if (outfits.some(outfit => outfit.command.toLowerCase() === cmd && outfit.id !== editingOutfitId)) {
                localNotice(`"/${cmd}" already exists.`, "#ffb7c7");
                return;
            }
            if (editingOutfitId) {
                const idx = outfits.findIndex(outfit => outfit.id === editingOutfitId);
                if (idx < 0) {
                    resetEditor();
                    localNotice("That outfit no longer exists.", "#ffb7c7");
                    return;
                }
                outfits[idx] = Object.assign(Object.assign({}, outfits[idx]), { command: cmd, displayName: name, announceText: announce || "changes outfit", includeRestraints: addIncludeRestraints });
                saveOutfits(outfits);
                localNotice(`Updated /${cmd} settings.`);
                resetEditor();
                return;
            }
            const newOutfit = {
                id: uid(),
                command: cmd,
                displayName: name,
                announceText: announce || "changes outfit",
                includeRestraints: addIncludeRestraints,
                items: captureAppearance(addIncludeRestraints),
            };
            saveOutfits([...outfits, newOutfit]);
            resetEditor();
            settingsPage = Math.floor(outfits.length / OUTFITS_PER_PAGE);
            localNotice(`Created "/${cmd}" - ${newOutfit.items.length} items saved.`);
            return;
        }
        if (editingOutfitId && mouseInRect(EDITOR_LEFT + 28, EDITOR_TOP + 476, EDITOR_WIDTH - 56, 30)) {
            const idx = outfits.findIndex(outfit => outfit.id === editingOutfitId);
            if (idx < 0) {
                resetEditor();
                localNotice("That outfit no longer exists.", "#ffb7c7");
                return;
            }
            outfits[idx].items = captureAppearance(outfits[idx].includeRestraints);
            saveOutfits(outfits);
            localNotice(`Updated "/${outfits[idx].command}"`);
        }
    }
    function outfitSettingsExit() {
        editingOutfitId = null;
        ElementRemove("EmeryOF_Cmd");
        ElementRemove("EmeryOF_Name");
        ElementRemove("EmeryOF_Announce");
    }

    const MOD_NAME = "EmeryBC";
    const MOD_VERSION = "0.1.7";
    const EXTENSION_ICON = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90">
        <rect x="8" y="8" width="74" height="74" rx="18" fill="#2a1421" stroke="#cf6f98" stroke-width="4"/>
        <path d="M28 30 L37 18 L45 31 L53 18 L62 30" fill="#cf6f98"/>
        <circle cx="34" cy="43" r="4" fill="#f7e6ee"/>
        <circle cx="56" cy="43" r="4" fill="#f7e6ee"/>
        <path d="M38 56 Q45 63 52 56" stroke="#f7e6ee" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`);
    let noticeShown = false;
    let activeTab = "actions";
    let settingsRegistered = false;
    const TAB_BTN_Y = 86;
    const TAB_BTN_H = 30;
    const TAB_BTN_W = 132;
    const TAB_BTN_GAP = 14;
    const TAB_BTN_LEFT = 156;
    const CHANGELOG = [
        {
            version: "0.1.7",
            changes: [
                "Moved the overhead EBC badge higher and removed the extra logo chip beside it.",
                "Spread the action button builder out further to reduce label and picker overlap.",
                "Reworked the outfit list and editor spacing to reduce overlapping text and controls.",
            ],
        },
        {
            version: "0.1.6",
            changes: [
                "Moved EmeryBC presence sharing onto BC's shared online settings path so other clients can receive the head tag.",
                "The badge now reads shared presence from online settings first, with local settings as a fallback.",
            ],
        },
        {
            version: "0.1.5",
            changes: [
                "Changed /ebc version so it only prints the current addon version.",
                "Kept the full history on /ebc changelog and /ebc changes.",
            ],
        },
        {
            version: "0.1.4",
            changes: [
                "Shifted the overhead EmeryBC badge a little further left for better alignment above characters.",
            ],
        },
        {
            version: "0.1.3",
            changes: [
                "Synced EmeryBC presence/version data automatically so the overhead badge has real data to read.",
                "Moved the badge above the character and added a version line under the EBC label.",
                "Keep the overhead version marker and pushed bundle version in lockstep on update.",
            ],
        },
        {
            version: "0.1.2",
            changes: [
                "Redesigned the Extensions UI into wider multi-panel layouts instead of the cramped left-column stack.",
                "Replaced the action button color hex field with a real click-to-pick color control.",
                "Added quicker wardrobe-side buttons for wearing, refreshing, and editing saved outfits.",
            ],
        },
        {
            version: "0.1.1",
            changes: [
                "Removed unstable overhead marker hooks so the addon loads safely again.",
                "Improved outfit command handling and reduced refresh delay during swaps.",
                "Updated the userscript loader and bundle versioning for cleaner updates.",
            ],
        },
        {
            version: "0.1.0",
            changes: [
                "Added action buttons and outfit command support.",
                "Added editable outfit name, command, restraint mode, and announce text settings.",
                "Added refreshed EmeryBC settings styling and startup notice.",
            ],
        },
    ];
    function appendLocalLogLine(text, color = UI.accent) {
        const log = document.getElementById("TextAreaChatLog");
        if (!log)
            return;
        const msg = document.createElement("div");
        msg.style.cssText = `
        background: ${UI.cardMuted};
        color: ${color};
        border-left: 3px solid ${UI.accent};
        padding: 4px 8px;
        margin: 2px 0;
        font-style: italic;
        font-size: 12px;
    `;
        msg.textContent = text;
        log.appendChild(msg);
        log.scrollTop = log.scrollHeight;
    }
    function showVersionInfo() {
        appendLocalLogLine(`[EmeryBC] Version ${MOD_VERSION}`, UI.gold);
    }
    function showChangelog() {
        appendLocalLogLine(`[EmeryBC] Version ${MOD_VERSION}`, UI.gold);
        for (const entry of CHANGELOG) {
            appendLocalLogLine(`[EmeryBC] v${entry.version}`, UI.textMuted);
            for (const change of entry.changes) {
                appendLocalLogLine(`- ${change}`, UI.accent);
            }
        }
    }
    function handleMetaCommand(inputValue) {
        var _a;
        const trimmed = inputValue.trim();
        if (!trimmed.startsWith("/"))
            return false;
        const parts = trimmed.slice(1).split(/\s+/);
        if (((_a = parts[0]) === null || _a === void 0 ? void 0 : _a.toLowerCase()) !== "ebc")
            return false;
        const subcommand = (parts[1] || "version").toLowerCase();
        if (["version", "ver", "v"].includes(subcommand)) {
            showVersionInfo();
            return true;
        }
        if (["changelog", "changes"].includes(subcommand)) {
            showChangelog();
            return true;
        }
        appendLocalLogLine("[EmeryBC] Usage: /ebc version", UI.gold);
        return true;
    }
    function getSharedPresence(character) {
        var _a, _b, _c;
        if (!character)
            return null;
        const shared = (_a = character.OnlineSharedSettings) === null || _a === void 0 ? void 0 : _a[MOD_NAME];
        if (shared && typeof shared === "object") {
            const presence = shared.presence;
            if ((presence === null || presence === void 0 ? void 0 : presence.marker) === "EBC")
                return presence;
        }
        const online = (_b = character.OnlineSettings) === null || _b === void 0 ? void 0 : _b[MOD_NAME];
        if (online && typeof online === "object") {
            const presence = online.presence;
            if ((presence === null || presence === void 0 ? void 0 : presence.marker) === "EBC")
                return presence;
        }
        const addon = (_c = getAddonSettings(character, false)) === null || _c === void 0 ? void 0 : _c.presence;
        return (addon === null || addon === void 0 ? void 0 : addon.marker) === "EBC" ? addon : null;
    }
    function getAddonSettings(character, create = false) {
        if (!character)
            return null;
        const extensionSettings = character.ExtensionSettings;
        if (!extensionSettings)
            return null;
        const existing = extensionSettings[MOD_NAME];
        if (existing && typeof existing === "object") {
            return existing;
        }
        if (!create)
            return null;
        const created = {};
        extensionSettings[MOD_NAME] = created;
        return created;
    }
    function syncPresenceMarker() {
        var _a;
        const settings = getAddonSettings(Player, true);
        if (!settings)
            return;
        const current = settings.presence;
        const localUpToDate = (current === null || current === void 0 ? void 0 : current.version) === MOD_VERSION && current.marker === "EBC";
        const onlineSettings = ((_a = Player.OnlineSettings) !== null && _a !== void 0 ? _a : (Player.OnlineSettings = {}));
        const sharedCurrent = onlineSettings[MOD_NAME];
        const sharedPresence = sharedCurrent && typeof sharedCurrent === "object"
            ? sharedCurrent.presence
            : null;
        const sharedUpToDate = (sharedPresence === null || sharedPresence === void 0 ? void 0 : sharedPresence.version) === MOD_VERSION && sharedPresence.marker === "EBC";
        if (localUpToDate && sharedUpToDate)
            return;
        settings.presence = {
            version: MOD_VERSION,
            marker: "EBC",
        };
        onlineSettings[MOD_NAME] = Object.assign(Object.assign({}, (sharedCurrent && typeof sharedCurrent === "object" ? sharedCurrent : {})), { presence: settings.presence });
        ServerPlayerExtensionSettingsSync(MOD_NAME);
        ServerSend("AccountUpdate", { OnlineSettings: onlineSettings });
    }
    function hasEmeryBC(character) {
        return !!getSharedPresence(character);
    }
    function drawPresenceMarker(args) {
        if (CurrentScreen !== "ChatRoom")
            return;
        const character = args[0];
        const left = typeof args[1] === "number" ? args[1] : null;
        const top = typeof args[2] === "number" ? args[2] : null;
        const zoom = typeof args[3] === "number" ? args[3] : 1;
        if (!character || left == null || top == null || !hasEmeryBC(character))
            return;
        const presence = getSharedPresence(character);
        const versionText = (presence === null || presence === void 0 ? void 0 : presence.version) ? `v${presence.version}` : "v?";
        const width = Math.max(64, 82 * zoom);
        const height = Math.max(26, 32 * zoom);
        const x = left + 228 * zoom;
        const y = top - 34 * zoom;
        const badgeLeft = x - width / 2;
        const badgeTop = y - height / 2;
        DrawRect(badgeLeft + 2, badgeTop + 2, width, height, "rgba(0, 0, 0, 0.28)");
        DrawRect(badgeLeft, badgeTop, width, height, UI.cardMuted);
        DrawEmptyRect(badgeLeft, badgeTop, width, height, UI.panelEdge, 1);
        DrawTextFit("EBC", badgeLeft + width / 2, badgeTop + 10, width - 10, UI.accent);
        DrawTextFit(versionText, badgeLeft + width / 2, badgeTop + 23, width - 10, UI.textMuted);
    }
    function showLoadNotice() {
        if (noticeShown)
            return;
        noticeShown = true;
        const wrap = document.createElement("div");
        wrap.style.cssText = `
        position: fixed;
        top: 14px;
        right: 14px;
        width: 288px;
        font-family: "Trebuchet MS", "Palatino Linotype", serif;
        font-size: 13px;
        border: 1px solid ${UI.panelEdge};
        border-radius: 16px;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
        overflow: hidden;
        z-index: 99999;
        cursor: pointer;
        user-select: none;
        background: linear-gradient(180deg, #341522 0%, #1b0d17 100%);
    `;
        const title = document.createElement("div");
        title.style.cssText = `
        background: linear-gradient(90deg, ${UI.accentDeep} 0%, ${UI.accentSoft} 100%);
        color: ${UI.text};
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        text-align: center;
        padding: 9px 12px;
        font-size: 13px;
    `;
        title.textContent = "EmeryBC Ready";
        const body = document.createElement("div");
        body.style.cssText = `
        color: ${UI.text};
        padding: 12px 14px 13px;
        line-height: 1.65;
    `;
        body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="color:${UI.textMuted};">Version</span>
            <span style="color:${UI.gold};">${MOD_VERSION}</span>
        </div>
        <div style="padding:8px 10px;border:1px solid ${UI.panelEdge};border-radius:12px;background:${UI.cardMuted};">
            <div style="margin-bottom:4px;">Action Buttons online</div>
            <div>Outfit Commands online</div>
        </div>
        <div style="margin-top:9px;font-size:11px;color:${UI.textSoft};text-align:center;">Click to dismiss</div>
    `;
        wrap.appendChild(title);
        wrap.appendChild(body);
        wrap.addEventListener("click", () => wrap.remove());
        document.body.appendChild(wrap);
        setTimeout(() => wrap.remove(), 10000);
        const log = document.getElementById("TextAreaChatLog");
        if (log) {
            appendLocalLogLine(`EmeryBC v${MOD_VERSION} loaded - open Preferences > Extensions to configure it.`);
        }
    }
    function drawTabs() {
        drawChromeButton(TAB_BTN_LEFT, TAB_BTN_Y, TAB_BTN_W, TAB_BTN_H, "Actions", activeTab === "actions" ? "accent" : "muted");
        drawChromeButton(TAB_BTN_LEFT + TAB_BTN_W + TAB_BTN_GAP, TAB_BTN_Y, TAB_BTN_W, TAB_BTN_H, "Outfits", activeTab === "outfits" ? "accent" : "muted");
    }
    function settingsRun() {
        if (activeTab === "actions") {
            settingsRun$1();
        }
        else {
            outfitSettingsRun();
        }
        drawTabs();
    }
    function settingsClick() {
        if (MouseY >= TAB_BTN_Y && MouseY <= TAB_BTN_Y + TAB_BTN_H) {
            if (MouseX >= TAB_BTN_LEFT && MouseX <= TAB_BTN_LEFT + TAB_BTN_W && activeTab !== "actions") {
                outfitSettingsExit();
                activeTab = "actions";
                settingsLoad();
                return;
            }
            const outfitsLeft = TAB_BTN_LEFT + TAB_BTN_W + TAB_BTN_GAP;
            if (MouseX >= outfitsLeft && MouseX <= outfitsLeft + TAB_BTN_W && activeTab !== "outfits") {
                settingsExit$1();
                activeTab = "outfits";
                outfitSettingsLoad();
                return;
            }
        }
        if (activeTab === "actions") {
            settingsClick$1();
        }
        else {
            outfitSettingsClick();
        }
    }
    function settingsExit() {
        if (activeTab === "actions") {
            settingsExit$1();
        }
        else {
            outfitSettingsExit();
        }
        activeTab = "actions";
    }
    function registerSettings() {
        if (settingsRegistered)
            return;
        const globalScope = window;
        const register = globalScope["PreferenceRegisterExtensionSetting"];
        if (!register) {
            setTimeout(registerSettings, 1000);
            return;
        }
        try {
            register({
                Identifier: MOD_NAME,
                ButtonText: "EmeryBC",
                Image: EXTENSION_ICON,
                load: () => {
                    activeTab = "actions";
                    settingsLoad();
                    outfitSettingsLoad();
                },
                run: settingsRun,
                click: settingsClick,
                exit: settingsExit,
            });
            settingsRegistered = true;
        }
        catch (error) {
            console.error("[EmeryBC] Extension registration failed:", error);
        }
    }
    function tryHookFunction(modAPI, funcName, priority, hook) {
        try {
            modAPI.hookFunction(funcName, priority, hook);
        }
        catch (error) {
            console.warn(`[${MOD_NAME}] Optional hook "${funcName}" unavailable:`, error);
        }
    }
    function init() {
        const modAPI = bcModSDK.registerMod({ name: MOD_NAME, fullName: "EmeryBC", version: MOD_VERSION }, { allowReplace: true });
        modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
            next(args);
            try {
                drawActionButtons();
            }
            catch (_a) {
                // Ignore draw failures so the room UI still renders.
            }
        });
        tryHookFunction(modAPI, "DrawCharacter", 3, (args, next) => {
            const result = next(args);
            try {
                drawPresenceMarker(args);
            }
            catch (_a) {
                // Ignore marker draw failures.
            }
            return result;
        });
        modAPI.hookFunction("ChatRoomSync", 3, (args, next) => {
            const result = next(args);
            try {
                syncPresenceMarker();
            }
            catch (_a) {
                // Ignore sync failures.
            }
            try {
                showLoadNotice();
            }
            catch (_b) {
                // Ignore notice failures.
            }
            return result;
        });
        modAPI.hookFunction("ChatRoomClick", 3, (args, next) => {
            try {
                if (handleActionButtonClick())
                    return;
            }
            catch (_a) {
                // Ignore click failures.
            }
            return next(args);
        });
        modAPI.hookFunction("ChatRoomKeyDown", 10, (args, next) => {
            try {
                if (typeof KeyPress !== "undefined" && KeyPress === 13) {
                    const input = document.getElementById("InputChat");
                    if (input && (handleMetaCommand(input.value) || handleOutfitCommand(input.value))) {
                        input.value = "";
                        return;
                    }
                }
            }
            catch (_a) {
                // Ignore keydown failures.
            }
            return next(args);
        });
        modAPI.hookFunction("ChatRoomSendChat", 10, (args, next) => {
            try {
                const input = document.getElementById("InputChat");
                if (input && (handleMetaCommand(input.value) || handleOutfitCommand(input.value))) {
                    input.value = "";
                    return;
                }
            }
            catch (_a) {
                // Ignore command failures.
            }
            return next(args);
        });
        registerSettings();
        try {
            syncPresenceMarker();
        }
        catch (_a) {
            // Ignore early sync failures.
        }
        try {
            showLoadNotice();
        }
        catch (_b) {
            // Ignore early notice failures.
        }
        console.log(`[${MOD_NAME}] v${MOD_VERSION} loaded`);
    }
    const readyInterval = setInterval(() => {
        if (typeof bcModSDK !== "undefined") {
            clearInterval(readyInterval);
            init();
        }
    }, 100);

})();
