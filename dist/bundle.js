(function () {
    'use strict';

    const PANEL_W = 650;
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
        successDeep: "#284132",
        danger: "#cb798c",
        dangerDeep: "#552332",
        buttonMuted: "#432232",
        buttonDisabled: "#2b1520",
        swatchBorder: "#f8dce8",
    };
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
        DrawRect(0, 60, PANEL_W, 940, UI.backdrop);
        DrawRect(10, 70, PANEL_W - 20, 920, UI.panel);
        DrawRect(18, 78, PANEL_W - 36, 904, UI.panelInner);
        DrawEmptyRect(10, 70, PANEL_W - 20, 920, UI.panelEdge, 2);
        DrawRect(18, 78, PANEL_W - 36, 108, UI.panelGlow);
        DrawRect(18, 78, 8, 904, UI.accentDeep);
        DrawRect(18, 176, PANEL_W - 36, 2, UI.panelEdge);
        drawPill(34, 88, 88, 22, "EMERYBC", UI.accentSoft, UI.accent);
        DrawTextFit(title, 206, 126, 280, UI.text);
        DrawTextFit(subtitle, 232, 154, 330, UI.textMuted);
        const statWidth = 88;
        const statGap = 10;
        const totalWidth = stats.length * statWidth + Math.max(0, stats.length - 1) * statGap;
        let left = PANEL_W - 30 - totalWidth;
        for (const stat of stats) {
            drawStatCard(left, 86, statWidth, 48, stat.label, stat.value, (_a = stat.tone) !== null && _a !== void 0 ? _a : "muted");
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
    function drawInsetLabel(text, x, y) {
        DrawText(text, x, y, UI.textSoft);
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
    const ROW_LEFT = 24;
    const ROW_WIDTH = PANEL_W - 48;
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
                ElementCreateInput(inputId(i, "color"), "text", btn.color || "#c2185b", "7");
            if (!document.getElementById(inputId(i, "emote")))
                ElementCreateInput(inputId(i, "emote"), "text", btn.emote, "120");
            styleInput(inputId(i, "label"), "short");
            styleInput(inputId(i, "color"), "short");
            styleInput(inputId(i, "emote"), "long");
        }
    }
    function settingsLoad() {
        const stored = getButtons();
        settingsButtons = Array.from({ length: MAX_SLOTS }, (_, i) => { var _a; return (Object.assign({}, ((_a = stored[i]) !== null && _a !== void 0 ? _a : DEFAULT_BUTTONS[i]))); });
    }
    const SLOT_H = 84;
    const SLOTS_Y = 188;
    function placeInput$1(id, left, y, width, height) {
        ElementPosition(id, left + width / 2, y + height / 2, width, height);
    }
    function settingsRun$1() {
        var _a, _b, _c;
        ensureInputs$1();
        const activeCount = settingsButtons.filter(btn => btn.enabled && btn.label.trim()).length;
        drawSettingsScaffold("Action Buttons", "Quick emote shortcuts for the chatroom sidebar.", [
            { label: "ACTIVE", value: `${activeCount}/${MAX_SLOTS}`, tone: "accent" },
            { label: "LAYOUT", value: "Quickbar", tone: "gold" },
        ]);
        for (let i = 0; i < MAX_SLOTS; i++) {
            const btn = (_a = settingsButtons[i]) !== null && _a !== void 0 ? _a : DEFAULT_BUTTONS[i];
            const y = SLOTS_Y + i * SLOT_H;
            const previewColor = ((_b = document.getElementById(inputId(i, "color"))) === null || _b === void 0 ? void 0 : _b.value) || btn.color || "#c2185b";
            const previewLabel = (((_c = document.getElementById(inputId(i, "label"))) === null || _c === void 0 ? void 0 : _c.value) || btn.label || "EMPTY").slice(0, 6);
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
            placeInput$1(inputId(i, "label"), 118, y + 34, 86, 32);
            placeInput$1(inputId(i, "color"), 224, y + 34, 92, 32);
            placeInput$1(inputId(i, "emote"), 334, y + 34, 170, 32);
            drawChromeButton(516, y + 26, 78, 26, btn.enabled ? "On" : "Off", btn.enabled ? "accent" : "muted");
        }
        const btnY = SLOTS_Y + MAX_SLOTS * SLOT_H + 10;
        drawChromeButton(34, btnY, 206, 46, "Save Layout", "success");
        drawChromeButton(254, btnY, 206, 46, "Reset Defaults", "gold");
        drawCard(24, btnY + 56, PANEL_W - 48, 52, "muted");
        DrawTextFit("Action text becomes a /me emote in chat.", PANEL_W / 2, btnY + 76, 520, UI.textMuted);
        DrawTextFit("Example: \"waves\" sends * Name waves *", PANEL_W / 2, btnY + 96, 520, UI.textSoft);
    }
    function settingsClick$1() {
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
            settingsButtons = DEFAULT_BUTTONS.map(b => (Object.assign({}, b)));
            for (let i = 0; i < MAX_SLOTS; i++) {
                document.getElementById(inputId(i, "label")).value = settingsButtons[i].label;
                document.getElementById(inputId(i, "color")).value = settingsButtons[i].color;
                document.getElementById(inputId(i, "emote")).value = settingsButtons[i].emote;
            }
            saveButtons(settingsButtons);
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
    const OUTFITS_PER_PAGE = 5;
    const ROW_H = 70;
    const NAV_Y = 186;
    const LIST_Y = 224;
    const ADD_Y = LIST_Y + OUTFITS_PER_PAGE * ROW_H + 16;
    const CARD_LEFT = 24;
    const CARD_WIDTH = PANEL_W - 48;
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
        drawChromeButton(34, NAV_Y, 90, 28, "Prev", "muted", page === 0);
        DrawText("Wardrobe", 184, NAV_Y + 16, UI.textMuted);
        DrawText(`${page + 1} of ${totalPages}`, 320, NAV_Y + 16, UI.textSoft);
        drawChromeButton(526, NAV_Y, 90, 28, "Next", "muted", page >= totalPages - 1);
        DrawTextFit("Click an outfit row to edit its command, name, or change text.", PANEL_W / 2, NAV_Y + 40, 520, UI.textSoft);
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            const y = LIST_Y + i * ROW_H;
            const isEditing = editingOutfitId === (outfit === null || outfit === void 0 ? void 0 : outfit.id);
            drawCard(CARD_LEFT, y, CARD_WIDTH, ROW_H - 8, i % 2 === 0 ? "default" : "alt");
            if (isEditing) {
                DrawEmptyRect(CARD_LEFT - 1, y - 1, CARD_WIDTH + 2, ROW_H - 6, UI.accent, 2);
            }
            if (!outfit) {
                DrawText("Empty slot", PANEL_W / 2, y + 24, UI.textMuted);
                DrawTextFit("Create a new outfit below to fill this space.", PANEL_W / 2, y + 44, 420, UI.textSoft);
                continue;
            }
            const hasSave = outfit.items.length > 0;
            drawPill(38, y + 16, 94, 22, `/${outfit.command}`, UI.accentSoft, UI.accent);
            DrawTextFit(outfit.displayName, 218, y + 22, 170, UI.text);
            DrawTextFit(`/me ${outfit.announceText}`, 240, y + 44, 250, UI.textSoft);
            drawPill(364, y + 14, 108, 20, outfit.includeRestraints ? "Includes restraints" : "Clothes only", outfit.includeRestraints ? UI.dangerDeep : UI.successDeep, outfit.includeRestraints ? UI.danger : UI.success);
            drawPill(364, y + 38, 108, 18, hasSave ? `${outfit.items.length} items saved` : "No save data", hasSave ? UI.successDeep : UI.buttonMuted, hasSave ? UI.success : UI.textMuted);
            drawChromeButton(500, y + 12, 98, 22, "Update", "success", false, "Save current appearance");
            drawChromeButton(500, y + 38, 98, 22, "Delete", "danger");
        }
        drawCard(CARD_LEFT, ADD_Y, CARD_WIDTH, 210, "muted");
        DrawText(editingOutfit ? "Edit Outfit" : "Add New Outfit", 126, ADD_Y + 22, UI.text);
        DrawTextFit(editingOutfit ? `Editing /${editingOutfit.command}. Update text here, and use Update on the row to resave the look.` : "Dress your character first, then save the current appearance into a command slot.", 334, ADD_Y + 22, 410, UI.textSoft);
        drawInsetLabel("Command", 96, ADD_Y + 48);
        DrawText("/", 56, ADD_Y + 80, UI.accent);
        placeInput("EmeryOF_Cmd", 82, ADD_Y + 62, 120, 34);
        drawInsetLabel("Display Name", 316, ADD_Y + 48);
        placeInput("EmeryOF_Name", 248, ADD_Y + 62, 200, 34);
        drawInsetLabel("Restraint Mode", 522, ADD_Y + 48);
        drawChromeButton(470, ADD_Y + 56, 126, 28, addIncludeRestraints ? "Include restraints" : "Clothes only", addIncludeRestraints ? "danger" : "success");
        drawInsetLabel("Announce Text", 114, ADD_Y + 108);
        DrawText("/me", 58, ADD_Y + 138, UI.accent);
        placeInput("EmeryOF_Announce", 86, ADD_Y + 120, 470, 34);
        if (editingOutfit) {
            drawChromeButton(44, ADD_Y + 164, 152, 34, "Cancel Edit", "muted");
            drawChromeButton(210, ADD_Y + 164, PANEL_W - 254, 34, "Save Outfit Settings", "success");
        }
        else {
            drawChromeButton(44, ADD_Y + 164, PANEL_W - 88, 34, "Save Current Appearance as New Outfit", "success");
        }
    }
    function outfitSettingsClick() {
        const outfits = getOutfits();
        const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
        const page = Math.min(settingsPage, totalPages - 1);
        const visible = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);
        if (mouseInRect(34, NAV_Y, 90, 28)) {
            settingsPage = Math.max(0, page - 1);
            return;
        }
        if (mouseInRect(526, NAV_Y, 90, 28)) {
            settingsPage = Math.min(totalPages - 1, page + 1);
            return;
        }
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            if (!outfit)
                continue;
            const y = LIST_Y + i * ROW_H;
            if (mouseInRect(500, y + 12, 98, 22)) {
                const idx = outfits.indexOf(outfit);
                outfits[idx].items = captureAppearance(outfit.includeRestraints);
                saveOutfits(outfits);
                localNotice(`Updated "/${outfit.command}"`);
                return;
            }
            if (mouseInRect(500, y + 38, 98, 22)) {
                saveOutfits(outfits.filter(entry => entry.id !== outfit.id));
                if (editingOutfitId === outfit.id) {
                    resetEditor();
                }
                settingsPage = Math.min(settingsPage, Math.max(0, Math.ceil((outfits.length - 1) / OUTFITS_PER_PAGE) - 1));
                return;
            }
            if (mouseInRect(CARD_LEFT, y, CARD_WIDTH, ROW_H - 8)) {
                beginEditing(outfit);
                return;
            }
        }
        if (mouseInRect(470, ADD_Y + 56, 126, 28)) {
            addIncludeRestraints = !addIncludeRestraints;
            return;
        }
        if (editingOutfitId && mouseInRect(44, ADD_Y + 164, 152, 34)) {
            resetEditor();
            return;
        }
        if (mouseInRect(editingOutfitId ? 210 : 44, ADD_Y + 164, editingOutfitId ? PANEL_W - 254 : PANEL_W - 88, 34)) {
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
        }
    }
    function outfitSettingsExit() {
        editingOutfitId = null;
        ElementRemove("EmeryOF_Cmd");
        ElementRemove("EmeryOF_Name");
        ElementRemove("EmeryOF_Announce");
    }

    const MOD_NAME = "EmeryBC";
    const MOD_VERSION = "0.1.0";
    let noticeShown = false;
    let activeTab = "actions";
    let settingsRegistered = false;
    const TAB_BTN_Y = 82;
    const TAB_BTN_H = 28;
    const TAB_BTN_W = 102;
    function getAddonSettings() {
        if (typeof Player === "undefined" || !Player)
            return null;
        if (!Player.ExtensionSettings || typeof Player.ExtensionSettings !== "object") {
            Player.ExtensionSettings = {};
        }
        if (!Player.ExtensionSettings.EmeryBC || typeof Player.ExtensionSettings.EmeryBC !== "object") {
            Player.ExtensionSettings.EmeryBC = {};
        }
        return Player.ExtensionSettings.EmeryBC;
    }
    function syncPresenceMarker() {
        const settings = getAddonSettings();
        if (!settings)
            return;
        if (settings["marker"] === MOD_VERSION)
            return;
        settings["marker"] = MOD_VERSION;
        try {
            ServerPlayerExtensionSettingsSync("EmeryBC");
        }
        catch (_a) {
            // Ignore sync failures here.
        }
    }
    function hasEmeryBC(character) {
        var _a;
        const settings = (_a = character === null || character === void 0 ? void 0 : character.ExtensionSettings) === null || _a === void 0 ? void 0 : _a.EmeryBC;
        return !!settings && typeof settings === "object";
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
        const width = Math.max(54, 64 * zoom);
        const height = Math.max(18, 20 * zoom);
        const x = left + 250 * zoom;
        const y = top + 22 * zoom;
        const badgeLeft = x - width / 2;
        const badgeTop = y - height / 2;
        const iconWidth = Math.max(18, 22 * zoom);
        DrawRect(badgeLeft + 2, badgeTop + 2, width, height, "rgba(0, 0, 0, 0.28)");
        DrawRect(badgeLeft, badgeTop, width, height, UI.cardMuted);
        DrawEmptyRect(badgeLeft, badgeTop, width, height, UI.panelEdge, 1);
        DrawRect(badgeLeft + 2, badgeTop + 2, iconWidth, height - 4, UI.accentSoft);
        DrawEmptyRect(badgeLeft + 2, badgeTop + 2, iconWidth, height - 4, UI.accent, 1);
        DrawTextFit("=:3", badgeLeft + 2 + iconWidth / 2, y + 1, iconWidth - 4, UI.text);
        DrawTextFit("EBC", badgeLeft + iconWidth + (width - iconWidth) / 2, y + 1, width - iconWidth - 6, UI.accent);
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
            const msg = document.createElement("div");
            msg.style.cssText = `
            background: ${UI.cardMuted};
            color: ${UI.accent};
            border-left: 3px solid ${UI.accent};
            padding: 4px 8px;
            margin: 2px 0;
            font-style: italic;
            font-size: 12px;
        `;
            msg.textContent = `EmeryBC v${MOD_VERSION} loaded - open Preferences > Extensions to configure it.`;
            log.appendChild(msg);
            log.scrollTop = log.scrollHeight;
        }
    }
    function drawTabs() {
        drawChromeButton(134, TAB_BTN_Y, TAB_BTN_W, TAB_BTN_H, "Actions", activeTab === "actions" ? "accent" : "muted");
        drawChromeButton(246, TAB_BTN_Y, TAB_BTN_W, TAB_BTN_H, "Outfits", activeTab === "outfits" ? "accent" : "muted");
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
            if (MouseX >= 134 && MouseX <= 134 + TAB_BTN_W && activeTab !== "actions") {
                outfitSettingsExit();
                activeTab = "actions";
                settingsLoad();
                return;
            }
            if (MouseX >= 246 && MouseX <= 246 + TAB_BTN_W && activeTab !== "outfits") {
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
                Image: "",
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
    function init() {
        const modAPI = bcModSDK.registerMod({ name: MOD_NAME, fullName: "EmeryBC", version: MOD_VERSION }, { allowReplace: true });
        syncPresenceMarker();
        modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
            next(args);
            try {
                drawActionButtons();
            }
            catch (_a) {
                // Ignore draw failures so the room UI still renders.
            }
        });
        modAPI.hookFunction("ChatRoomDrawCharacter", 3, (args, next) => {
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
                // Ignore presence sync failures.
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
                    if (input && handleOutfitCommand(input.value)) {
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
                if (input && handleOutfitCommand(input.value)) {
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
            showLoadNotice();
        }
        catch (_a) {
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
