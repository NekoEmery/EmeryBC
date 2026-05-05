(function () {
    'use strict';

    const PANEL_W = 998;
    const PANEL_H = 940;
    const PANEL_PADDING = 22;
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
        dangerDeep: "#552332",
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

    // Action buttons drawn in the chatroom sidebar below BCAR's buttons.
    const DEFAULT_BUTTONS = [
        { label: "NOD", emote: "nods.", color: "#c2185b", enabled: true },
        { label: "SHAKE", emote: "shakes their head.", color: "#c2185b", enabled: true },
        { label: "WAVE", emote: "waves.", color: "#c2185b", enabled: true },
        { label: "BOW", emote: "bows politely.", color: "#c2185b", enabled: true },
        { label: "", emote: "", color: "#c2185b", enabled: false },
        { label: "", emote: "", color: "#c2185b", enabled: false },
    ];
    const ABSOLUTE_MAX = 12;
    const DEFAULT_SLOTS = DEFAULT_BUTTONS.length;
    // In-game sidebar
    const BTN_X = 0;
    const BTN_START_Y = 270;
    const BTN_SIZE = 45;
    // Settings list layout — one row per slot
    const ROW_H$1 = 56;
    const LIST_Y$1 = 226;
    const HEADER_Y = 213;
    // Column x positions (left edges)
    const COL_TOG = CONTENT_LEFT; // toggle button
    const COL_LAB = CONTENT_LEFT + 62; // label input
    const COL_COL = CONTENT_LEFT + 200; // color picker
    const COL_ME = CONTENT_LEFT + 254; // "/me" prefix text
    const COL_EMO = CONTENT_LEFT + 292; // emote input
    const COL_DEL = CONTENT_RIGHT - 76; // delete button
    const EMO_W = COL_DEL - COL_EMO - 10; // emote input width
    // ─── Storage ─────────────────────────────────────────────────────────────────
    function getStore() {
        if (!Player.ExtensionSettings.EmeryBC)
            Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC;
    }
    function getButtons() {
        const stored = getStore().actionButtons;
        return Array.isArray(stored) ? stored : DEFAULT_BUTTONS;
    }
    function getSlotCount() {
        const store = getStore();
        const n = store.actionSlotCount;
        if (typeof n === "number")
            return Math.min(ABSOLUTE_MAX, Math.max(1, n));
        const buttons = getButtons();
        return Math.min(ABSOLUTE_MAX, Math.max(DEFAULT_SLOTS, buttons.length));
    }
    function saveData(buttons, slotCount) {
        const store = getStore();
        store.actionButtons = buttons;
        store.actionSlotCount = slotCount;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    }
    function normalizeHex(value, fallback = "#c2185b") {
        const c = (value !== null && value !== void 0 ? value : "").trim();
        if (/^#[0-9a-f]{6}$/i.test(c))
            return c.toLowerCase();
        const m = /^#([0-9a-f]{3})$/i.exec(c);
        if (m) {
            const [r, g, b] = m[1].split("");
            return `#${r}${r}${g}${g}${b}${b}`;
        }
        return fallback;
    }
    // ─── In-game ─────────────────────────────────────────────────────────────────
    function drawActionButtons() {
        if (CurrentScreen !== "ChatRoom")
            return;
        const buttons = getButtons();
        for (let i = 0; i < buttons.length; i++) {
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
        for (let i = 0; i < buttons.length; i++) {
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
    let settingsButtons = [];
    let settingsSlotCount = DEFAULT_SLOTS;
    function inputId(slot, field) {
        return `EmeryBtn_${field}_${slot}`;
    }
    function ensureInputs$1() {
        var _a;
        for (let i = 0; i < ABSOLUTE_MAX; i++) {
            const btn = (_a = settingsButtons[i]) !== null && _a !== void 0 ? _a : { label: "", emote: "", color: "#c2185b"};
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
    function settingsLoad() {
        const buttons = getButtons();
        settingsSlotCount = getSlotCount();
        settingsButtons = Array.from({ length: ABSOLUTE_MAX }, (_, i) => {
            var _a;
            return (Object.assign({}, ((_a = buttons[i]) !== null && _a !== void 0 ? _a : { label: "", emote: "", color: "#c2185b", enabled: false })));
        });
    }
    function syncInputsFromButtons() {
        var _a;
        for (let i = 0; i < ABSOLUTE_MAX; i++) {
            (_a = document.getElementById(inputId(i, "label"))) === null || _a === void 0 ? void 0 : _a.setAttribute("value", settingsButtons[i].label);
            const lbl = document.getElementById(inputId(i, "label"));
            const clr = document.getElementById(inputId(i, "color"));
            const emt = document.getElementById(inputId(i, "emote"));
            if (lbl)
                lbl.value = settingsButtons[i].label;
            if (clr)
                clr.value = normalizeHex(settingsButtons[i].color);
            if (emt)
                emt.value = settingsButtons[i].emote;
        }
    }
    function collectFromInputs() {
        for (let i = 0; i < settingsSlotCount; i++) {
            settingsButtons[i].label = ElementValue(inputId(i, "label")).trim().slice(0, 6);
            settingsButtons[i].color = normalizeHex(ElementValue(inputId(i, "color")));
            settingsButtons[i].emote = ElementValue(inputId(i, "emote")).trim();
        }
    }
    function settingsRun$1() {
        ensureInputs$1();
        const activeCount = settingsButtons.slice(0, settingsSlotCount).filter(b => b.enabled && b.label.trim()).length;
        drawSettingsScaffold("Action Buttons", "Quick emote shortcuts shown in the chatroom sidebar.", [
            { label: "ACTIVE", value: `${activeCount}/${settingsSlotCount}`, tone: "accent" },
            { label: "SLOTS", value: `${settingsSlotCount}/${ABSOLUTE_MAX}`, tone: "gold" },
        ]);
        // ── Column headers ──────────────────────────────────────────────────────
        DrawRect(CONTENT_LEFT, HEADER_Y - 4, CONTENT_WIDTH, 1, UI.panelEdge);
        DrawTextFit("On", COL_TOG + 27, HEADER_Y, 54, UI.textSoft);
        DrawTextFit("Label", COL_LAB + 57, HEADER_Y, 100, UI.textSoft);
        DrawTextFit("Color", COL_COL + 22, HEADER_Y, 72, UI.textSoft);
        DrawTextFit("/me Emote Text  (sent as * Name text * in chat)", COL_EMO + EMO_W / 2, HEADER_Y, EMO_W, UI.textSoft);
        DrawRect(CONTENT_LEFT, HEADER_Y + 6, CONTENT_WIDTH, 1, UI.panelEdge);
        // ── Rows ────────────────────────────────────────────────────────────────
        for (let i = 0; i < settingsSlotCount; i++) {
            const btn = settingsButtons[i];
            const y = LIST_Y$1 + i * ROW_H$1;
            DrawRect(CONTENT_LEFT, y, CONTENT_WIDTH, ROW_H$1 - 2, i % 2 === 0 ? UI.card : UI.cardAlt);
            DrawEmptyRect(CONTENT_LEFT, y, CONTENT_WIDTH, ROW_H$1 - 2, UI.panelEdge, 1);
            // Toggle
            DrawButton(COL_TOG + 5, y + 9, 44, ROW_H$1 - 18, btn.enabled ? "✓" : "", btn.enabled ? UI.accentDeep : UI.buttonMuted, "", btn.enabled ? "Click to disable" : "Click to enable");
            // Label input — centered in cell
            ElementPosition(inputId(i, "label"), COL_LAB + 57, y + ROW_H$1 / 2, 110, 36);
            // Color picker
            ElementPosition(inputId(i, "color"), COL_COL + 22, y + ROW_H$1 / 2, 42, 36);
            // "/me" prefix label — clearly to the left of the emote input
            DrawTextFit("/me", COL_ME + 18, y + ROW_H$1 / 2, 36, UI.accent);
            // Emote input
            ElementPosition(inputId(i, "emote"), COL_EMO + EMO_W / 2, y + ROW_H$1 / 2, EMO_W, 36);
            // Delete button
            DrawButton(COL_DEL + 3, y + 10, 66, ROW_H$1 - 20, "✕ Del", UI.dangerDeep, "", "Remove this slot");
        }
        // ── Footer ───────────────────────────────────────────────────────────────
        const footerY = LIST_Y$1 + settingsSlotCount * ROW_H$1 + 14;
        DrawRect(CONTENT_LEFT, footerY - 6, CONTENT_WIDTH, 1, UI.panelEdge);
        const canAdd = settingsSlotCount < ABSOLUTE_MAX;
        drawChromeButton(CONTENT_LEFT, footerY, 228, 44, `＋ Add Slot  (${settingsSlotCount}/${ABSOLUTE_MAX})`, canAdd ? "success" : "muted", !canAdd);
        drawChromeButton(CONTENT_LEFT + 244, footerY, 200, 44, "Save Layout", "accent");
        drawChromeButton(CONTENT_LEFT + 460, footerY, 200, 44, "Reset Defaults", "gold");
        DrawTextFit("Sends as (Name text) in chat — e.g. \"nods.\" becomes (Emery nods.)", CONTENT_LEFT + CONTENT_WIDTH / 2, footerY + 62, CONTENT_WIDTH - 40, UI.textMuted);
    }
    function settingsClick$1() {
        // ── Toggle + Delete per row ──────────────────────────────────────────────
        for (let i = 0; i < settingsSlotCount; i++) {
            const y = LIST_Y$1 + i * ROW_H$1;
            if (mouseInRect(COL_TOG + 5, y + 9, 44, ROW_H$1 - 18)) {
                settingsButtons[i].enabled = !settingsButtons[i].enabled;
                return;
            }
            if (mouseInRect(COL_DEL + 3, y + 10, 66, ROW_H$1 - 20)) {
                collectFromInputs();
                settingsButtons.splice(i, 1);
                settingsButtons.push({ label: "", emote: "", color: "#c2185b", enabled: false });
                settingsSlotCount = Math.max(1, settingsSlotCount - 1);
                syncInputsFromButtons();
                return;
            }
        }
        // ── Footer buttons ───────────────────────────────────────────────────────
        const footerY = LIST_Y$1 + settingsSlotCount * ROW_H$1 + 14;
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
            settingsButtons = Array.from({ length: ABSOLUTE_MAX }, (_, i) => {
                var _a;
                return (Object.assign({}, ((_a = DEFAULT_BUTTONS[i]) !== null && _a !== void 0 ? _a : { label: "", emote: "", color: "#c2185b", enabled: false })));
            });
            settingsSlotCount = DEFAULT_SLOTS;
            syncInputsFromButtons();
            saveData([...settingsButtons], settingsSlotCount);
        }
    }
    function canAdd() {
        return settingsSlotCount < ABSOLUTE_MAX;
    }
    function settingsExit$1() {
        for (let i = 0; i < ABSOLUTE_MAX; i++) {
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
    const LIST_Y = 270;
    const ROW_H = 86;
    const LIST_LEFT = CONTENT_LEFT;
    const LIST_WIDTH = 538;
    const LIST_BTN_W = 68;
    const EDITOR_GAP = 18;
    const EDITOR_LEFT = LIST_LEFT + LIST_WIDTH + EDITOR_GAP;
    const EDITOR_WIDTH = CONTENT_RIGHT - EDITOR_LEFT;
    const EDITOR_TOP = NAV_Y;
    const EDITOR_HEIGHT = 660;
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
            "font-size:12px",
            "padding:2px 8px",
            "margin:1px 0",
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
        const editingOutfit = editingOutfitId ? (_a = outfits.find(o => o.id === editingOutfitId)) !== null && _a !== void 0 ? _a : null : null;
        drawSettingsScaffold("Outfit Commands", "Capture a look once, then switch with a slash command.", [
            { label: "OUTFITS", value: `${outfits.length}`, tone: "accent" },
            { label: "PAGE", value: `${page + 1}/${totalPages}`, tone: "gold" },
        ]);
        // ── List nav ────────────────────────────────────────────────────────────
        drawChromeButton(LIST_LEFT, NAV_Y, 88, 30, "◀ Prev", "muted", page === 0);
        DrawTextFit(`Page ${page + 1} of ${totalPages}`, LIST_LEFT + LIST_WIDTH / 2, NAV_Y + 15, LIST_WIDTH - 200, UI.textMuted);
        drawChromeButton(LIST_LEFT + LIST_WIDTH - 88, NAV_Y, 88, 30, "Next ▶", "muted", page >= totalPages - 1);
        DrawTextFit("Click any row to open it in the editor. Use the row buttons to act on it.", LIST_LEFT + LIST_WIDTH / 2, NAV_Y + 40, LIST_WIDTH - 10, UI.textSoft);
        // ── Outfit rows ─────────────────────────────────────────────────────────
        // Button columns (right-aligned, shared across all rows)
        const btnDel = LIST_LEFT + LIST_WIDTH - LIST_BTN_W - 8;
        const btnUpdate = btnDel - LIST_BTN_W - 6;
        const btnWear = btnUpdate - LIST_BTN_W - 6;
        const pillRight = LIST_LEFT + 10 + 90; // pill ends here
        const nameRight = btnWear - 10; // name text can go up to here
        const nameCenter = (pillRight + 8 + nameRight) / 2;
        const nameWidth = nameRight - pillRight - 8;
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            const y = LIST_Y + i * ROW_H;
            const isEditing = editingOutfitId === (outfit === null || outfit === void 0 ? void 0 : outfit.id);
            drawCard(LIST_LEFT, y, LIST_WIDTH, ROW_H - 6, i % 2 === 0 ? "default" : "alt");
            if (isEditing)
                DrawEmptyRect(LIST_LEFT - 1, y - 1, LIST_WIDTH + 2, ROW_H - 4, UI.accent, 2);
            if (!outfit) {
                DrawTextFit("Empty — fill in using the editor on the right", LIST_LEFT + LIST_WIDTH / 2, y + ROW_H / 2, LIST_WIDTH - 40, UI.textMuted);
                continue;
            }
            const hasSave = outfit.items.length > 0;
            // Top line: pill | name | [Wear] [Update] [Delete]
            drawPill(LIST_LEFT + 10, y + 9, 90, 24, `/${outfit.command}`, UI.accentSoft, UI.accent);
            DrawTextFit(outfit.displayName, nameCenter, y + 21, nameWidth, UI.text);
            drawChromeButton(btnWear, y + 8, LIST_BTN_W, 26, "Wear", "accent");
            drawChromeButton(btnUpdate, y + 8, LIST_BTN_W, 26, "Update", "success", false, "Save current look");
            drawChromeButton(btnDel, y + 8, LIST_BTN_W, 26, "Delete", "danger");
            // Divider between top/bottom
            DrawRect(LIST_LEFT + 8, y + 42, LIST_WIDTH - 16, 1, UI.panelEdge);
            // Bottom line: items | restraint mode | announce text (spans full row width)
            const announceCenterX = LIST_LEFT + 272 + (LIST_LEFT + LIST_WIDTH - 10 - (LIST_LEFT + 272)) / 2;
            const announceWidth = LIST_LEFT + LIST_WIDTH - 10 - (LIST_LEFT + 272);
            DrawTextFit(hasSave ? `${outfit.items.length} items` : "⚠ empty", LIST_LEFT + 46, y + 64, 80, hasSave ? UI.success : UI.gold);
            DrawTextFit(outfit.includeRestraints ? "incl. restraints" : "clothes only", LIST_LEFT + 148, y + 64, 100, outfit.includeRestraints ? UI.danger : UI.textMuted);
            DrawTextFit(`/me ${outfit.announceText}`, announceCenterX, y + 64, announceWidth, UI.textSoft);
        }
        // ── Editor panel ────────────────────────────────────────────────────────
        drawCard(EDITOR_LEFT, EDITOR_TOP, EDITOR_WIDTH, EDITOR_HEIGHT, "muted");
        // Header
        DrawTextFit(editingOutfit ? "Editing Outfit" : "New Outfit", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 22, EDITOR_WIDTH - 20, UI.text);
        drawPill(EDITOR_LEFT + 18, EDITOR_TOP + 38, EDITOR_WIDTH - 36, 22, editingOutfit ? `/${editingOutfit.command}` : "no outfit selected", UI.cardMuted, editingOutfit ? UI.accent : UI.textMuted);
        // ── Slash command ──
        DrawTextFit("Slash Command", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 80, EDITOR_WIDTH - 36, UI.textSoft);
        // "/" label sits to the left of the input, at same vertical center as input center
        // input top = EDITOR_TOP+94, height=34 → center y = EDITOR_TOP+111
        DrawTextFit("/", EDITOR_LEFT + 28, EDITOR_TOP + 111, 20, UI.accent);
        placeInput("EmeryOF_Cmd", EDITOR_LEFT + 48, EDITOR_TOP + 94, EDITOR_WIDTH - 66, 34);
        // ── Display name ──
        DrawTextFit("Display Name", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 148, EDITOR_WIDTH - 36, UI.textSoft);
        placeInput("EmeryOF_Name", EDITOR_LEFT + 18, EDITOR_TOP + 162, EDITOR_WIDTH - 36, 34);
        // ── Restraint mode ──
        DrawTextFit("Restraint Mode", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 212, EDITOR_WIDTH - 36, UI.textSoft);
        drawChromeButton(EDITOR_LEFT + 18, EDITOR_TOP + 226, EDITOR_WIDTH - 36, 32, addIncludeRestraints ? "Includes restraints" : "Clothes only (restraints preserved)", addIncludeRestraints ? "danger" : "success");
        // ── Announce text ──
        DrawTextFit("Announce Text  (/me ...)", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 274, EDITOR_WIDTH - 36, UI.textSoft);
        // input top = EDITOR_TOP+288, height=34 → center y = EDITOR_TOP+305  (label is 14px above input)
        placeInput("EmeryOF_Announce", EDITOR_LEFT + 18, EDITOR_TOP + 288, EDITOR_WIDTH - 36, 34);
        // ── Save / Create ──
        DrawRect(EDITOR_LEFT + 18, EDITOR_TOP + 336, EDITOR_WIDTH - 36, 1, UI.panelEdge);
        drawChromeButton(EDITOR_LEFT + 18, EDITOR_TOP + 348, EDITOR_WIDTH - 36, 38, editingOutfit ? "Save Outfit Settings" : "Create Outfit From Current Look", "success");
        drawChromeButton(EDITOR_LEFT + 18, EDITOR_TOP + 394, EDITOR_WIDTH - 36, 32, editingOutfit ? "Refresh Saved Look" : "Capture Look Preview", editingOutfit ? "accent" : "muted", !editingOutfit);
        // ── Notes ──
        DrawRect(EDITOR_LEFT + 18, EDITOR_TOP + 440, EDITOR_WIDTH - 36, 1, UI.panelEdge);
        DrawTextFit("How to use", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 458, EDITOR_WIDTH - 36, UI.textMuted);
        DrawTextFit("→ Click a row to open it for editing here.", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 478, EDITOR_WIDTH - 36, UI.textSoft);
        DrawTextFit("→ Wear applies the outfit to your character instantly.", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 498, EDITOR_WIDTH - 36, UI.textSoft);
        DrawTextFit("→ Update replaces the saved look with what you're wearing.", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 518, EDITOR_WIDTH - 36, UI.textSoft);
        DrawTextFit("→ Announce text is sent as a /me emote when the outfit loads.", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 538, EDITOR_WIDTH - 36, UI.textSoft);
        if (editingOutfit) {
            drawChromeButton(EDITOR_LEFT + 18, EDITOR_TOP + 562, EDITOR_WIDTH - 36, 30, "Cancel Edit", "muted");
        }
    }
    function outfitSettingsClick() {
        const outfits = getOutfits();
        const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
        const page = Math.min(settingsPage, totalPages - 1);
        const visible = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);
        if (mouseInRect(LIST_LEFT, NAV_Y, 88, 30)) {
            settingsPage = Math.max(0, page - 1);
            return;
        }
        if (mouseInRect(LIST_LEFT + LIST_WIDTH - 88, NAV_Y, 88, 30)) {
            settingsPage = Math.min(totalPages - 1, page + 1);
            return;
        }
        const btnDel = LIST_LEFT + LIST_WIDTH - LIST_BTN_W - 8;
        const btnUpdate = btnDel - LIST_BTN_W - 6;
        const btnWear = btnUpdate - LIST_BTN_W - 6;
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            if (!outfit)
                continue;
            const y = LIST_Y + i * ROW_H;
            if (mouseInRect(btnWear, y + 8, LIST_BTN_W, 26)) {
                applyOutfit(outfit);
                return;
            }
            if (mouseInRect(btnUpdate, y + 8, LIST_BTN_W, 26)) {
                const idx = outfits.indexOf(outfit);
                outfits[idx].items = captureAppearance(outfit.includeRestraints);
                saveOutfits(outfits);
                localNotice(`Updated "/${outfit.command}"`);
                return;
            }
            if (mouseInRect(btnDel, y + 8, LIST_BTN_W, 26)) {
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
        if (mouseInRect(EDITOR_LEFT + 18, EDITOR_TOP + 226, EDITOR_WIDTH - 36, 32)) {
            addIncludeRestraints = !addIncludeRestraints;
            return;
        }
        if (editingOutfitId && mouseInRect(EDITOR_LEFT + 18, EDITOR_TOP + 562, EDITOR_WIDTH - 36, 30)) {
            resetEditor();
            return;
        }
        if (mouseInRect(EDITOR_LEFT + 18, EDITOR_TOP + 348, EDITOR_WIDTH - 36, 38)) {
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
        if (editingOutfitId && mouseInRect(EDITOR_LEFT + 18, EDITOR_TOP + 394, EDITOR_WIDTH - 36, 32)) {
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
    const MOD_VERSION = "0.1.24";
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
            version: "0.1.24",
            changes: [
                "Added /ebc release (alias: /ebc free) — removes all restraints from yourself instantly.",
            ],
        },
        {
            version: "0.1.23",
            changes: [
                "Moved EBC badge another 15% to the left.",
            ],
        },
        {
            version: "0.1.22",
            changes: [
                "Moved EBC badge 10% to the left.",
            ],
        },
        {
            version: "0.1.21",
            changes: [
                "Stripped version line from EBC badge — now just a small subtle EBC chip.",
            ],
        },
        {
            version: "0.1.20",
            changes: [
                "Scaled EBC badge down by 50%.",
            ],
        },
        {
            version: "0.1.19",
            changes: [
                "Moved EBC badge further right and scaled it up for better text readability.",
            ],
        },
        {
            version: "0.1.18",
            changes: [
                "Moved EBC badge 15% to the right.",
                "Widened badge so EBC text and version number render without clipping.",
            ],
        },
        {
            version: "0.1.17",
            changes: [
                "Made EBC overhead badge much smaller and shifted it 15% to the left.",
            ],
        },
        {
            version: "0.1.16",
            changes: [
                "Made EBC overhead badge slightly smaller and moved it further down.",
            ],
        },
        {
            version: "0.1.15",
            changes: [
                "Removed login screen popup — no more dialog on startup.",
                "Added a quiet chat message on room join confirming EmeryBC loaded successfully.",
                "Fixed badge version text visibility by widening the overhead badge further.",
            ],
        },
        {
            version: "0.1.14",
            changes: [
                "Added version number back under EBC in the overhead badge.",
            ],
        },
        {
            version: "0.1.13",
            changes: [
                "Badge 50% bigger, fixed EBC text clipping by increasing internal padding.",
            ],
        },
        {
            version: "0.1.12",
            changes: [
                "EBC badge scaled up 45% and text rendering fixed to always show EBC.",
            ],
        },
        {
            version: "0.1.11",
            changes: [
                "Made EBC badge slightly bigger so 'EBC' text is no longer clipped to 'BC'.",
                "Moved badge further down by 25%.",
            ],
        },
        {
            version: "0.1.10",
            changes: [
                "Made EBC overhead badge significantly smaller and moved it further down.",
                "Reverted action buttons back to Emote type (* Name text *).",
            ],
        },
        {
            version: "0.1.9",
            changes: [
                "Fixed outfit page row and editor overlaps — labels, inputs and buttons no longer stack on each other.",
                "Action buttons now use Type:Action so they show as (Name text.) instead of * Name text *.",
                "Default action emotes updated to match the new format.",
                "EBC overhead badge made smaller and drops the version line.",
                "Outfit notice messages bumped to 12px to match other log messages.",
            ],
        },
        {
            version: "0.1.8",
            changes: [
                "Fixed EBC badge visibility — now uses OnlineSharedSettings so all room members can see it.",
                "Shrunk outfit notice messages in chat to 11px so they are less intrusive.",
                "Bumped version number that was missed in previous release.",
            ],
        },
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
    function releaseRestraints() {
        const restraintGroups = Player.Appearance
            .filter(item => item.Asset.Group.IsRestraint)
            .map(item => item.Asset.Group.Name);
        if (restraintGroups.length === 0) {
            appendLocalLogLine("[EmeryBC] No restraints found to remove.", UI.textMuted);
            return;
        }
        for (const group of restraintGroups) {
            InventoryRemove(Player, group, false);
        }
        CharacterRefresh(Player, true);
        ServerPlayerAppearanceSync();
        appendLocalLogLine(`[EmeryBC] Released ${restraintGroups.length} restraint(s).`, UI.gold);
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
        if (["release", "free"].includes(subcommand)) {
            releaseRestraints();
            return true;
        }
        appendLocalLogLine("[EmeryBC] Commands: /ebc version  |  /ebc changelog  |  /ebc release", UI.gold);
        return true;
    }
    function getSharedPresence(character) {
        var _a, _b;
        if (!character)
            return null;
        // OnlineSharedSettings are broadcast to all room members via ChatRoomSync
        // and CharacterUpdate — this is the reliable cross-client path.
        const shared = (_a = character.OnlineSharedSettings) === null || _a === void 0 ? void 0 : _a[MOD_NAME];
        if (shared && typeof shared === "object") {
            const presence = shared.presence;
            if ((presence === null || presence === void 0 ? void 0 : presence.marker) === "EBC")
                return presence;
        }
        // Fallback: ExtensionSettings (visible if they were synced before room join)
        const addon = (_b = getAddonSettings(character, false)) === null || _b === void 0 ? void 0 : _b.presence;
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
        var _a, _b;
        const presence = { version: MOD_VERSION, marker: "EBC" };
        // Write to ExtensionSettings for local persistence
        const settings = getAddonSettings(Player, true);
        if (settings)
            settings.presence = presence;
        ServerPlayerExtensionSettingsSync(MOD_NAME);
        // Write to OnlineSharedSettings — this IS broadcast to all room members
        // via ChatRoomSync and CharacterUpdate packets, making the badge visible
        // to every other EmeryBC user in the room.
        const shared = ((_a = Player.OnlineSharedSettings) !== null && _a !== void 0 ? _a : (Player.OnlineSharedSettings = {}));
        const current = shared[MOD_NAME];
        const alreadySynced = current && typeof current === "object" &&
            ((_b = current.presence) === null || _b === void 0 ? void 0 : _b.version) === MOD_VERSION;
        if (!alreadySynced) {
            shared[MOD_NAME] = { presence };
            ServerSend("AccountUpdate", { OnlineSharedSettings: shared });
        }
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
        getSharedPresence(character);
        const width = Math.max(30, 34 * zoom);
        const height = Math.max(12, 14 * zoom);
        const x = left + 197 * zoom;
        const y = top + 26 * zoom;
        const badgeLeft = x - width / 2;
        const badgeTop = y - height / 2;
        DrawRect(badgeLeft + 1, badgeTop + 1, width, height, "rgba(0, 0, 0, 0.28)");
        DrawRect(badgeLeft, badgeTop, width, height, UI.cardMuted);
        DrawEmptyRect(badgeLeft, badgeTop, width, height, UI.panelEdge, 1);
        DrawTextFit("EBC", badgeLeft + width / 2, badgeTop + height / 2 + 1, width - 6, UI.accent);
    }
    function showRoomLoadNotice() {
        if (noticeShown)
            return;
        noticeShown = true;
        appendLocalLogLine(`✓ EmeryBC v${MOD_VERSION} loaded successfully.`);
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
                showRoomLoadNotice();
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
        console.log(`[${MOD_NAME}] v${MOD_VERSION} loaded`);
    }
    const readyInterval = setInterval(() => {
        if (typeof bcModSDK !== "undefined") {
            clearInterval(readyInterval);
            init();
        }
    }, 100);

})();
