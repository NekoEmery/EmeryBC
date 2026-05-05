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
        DrawRect(18, 78, PANEL_W - 36, 126, UI.panelGlow);
        DrawRect(18, 78, 8, 904, UI.accentDeep);
        DrawRect(18, 188, PANEL_W - 36, 2, UI.panelEdge);
        drawPill(34, 92, 92, 24, "EMERYBC", UI.accentSoft, UI.accent);
        DrawText(title, 170, 142, UI.text);
        DrawText(subtitle, 204, 170, UI.textMuted);
        const statWidth = 118;
        const statGap = 12;
        const totalWidth = stats.length * statWidth + Math.max(0, stats.length - 1) * statGap;
        let left = PANEL_W - 34 - totalWidth;
        for (const stat of stats) {
            drawStatCard(left, 96, statWidth, 58, stat.label, stat.value, (_a = stat.tone) !== null && _a !== void 0 ? _a : "muted");
            left += statWidth + statGap;
        }
    }
    function drawStatCard(left, top, width, height, label, value, tone) {
        const style = STAT_TONES[tone];
        DrawRect(left, top, width, height, "#12070d");
        DrawRect(left + 2, top + 2, width - 4, height - 4, style.fill);
        DrawEmptyRect(left + 2, top + 2, width - 4, height - 4, style.border, 1);
        DrawText(label, left + width / 2, top + 18, UI.textSoft);
        DrawTextFit(value, left + width / 2, top + 40, width - 16, style.text);
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
    const SLOT_H = 105;
    const SLOTS_Y = 208;
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
            drawCard(24, y, PANEL_W - 48, SLOT_H - 10, i % 2 === 0 ? "default" : "alt");
            DrawRect(38, y + 14, 74, 64, UI.cardMuted);
            DrawEmptyRect(38, y + 14, 74, 64, UI.panelEdge, 1);
            drawPill(48, y + 22, 54, 18, `Slot ${i + 1}`, UI.accentSoft, UI.accent);
            DrawRect(48, y + 46, 54, 24, previewColor);
            DrawEmptyRect(48, y + 46, 54, 24, UI.swatchBorder, 1);
            DrawTextFit(previewLabel || "EMPTY", 75, y + 59, 48, "#fff7fa");
            drawInsetLabel("Label", 168, y + 26);
            drawInsetLabel("Color", 294, y + 26);
            drawInsetLabel("Action", 474, y + 26);
            ElementPosition(inputId(i, "label"), 168, y + 56, 100, 38);
            ElementPosition(inputId(i, "color"), 294, y + 56, 110, 38);
            ElementPosition(inputId(i, "emote"), 474, y + 56, 222, 38);
            drawChromeButton(532, y + 20, 78, 30, btn.enabled ? "On" : "Off", btn.enabled ? "accent" : "muted");
        }
        const btnY = SLOTS_Y + MAX_SLOTS * SLOT_H + 10;
        drawChromeButton(34, btnY, 220, 50, "Save Layout", "success");
        drawChromeButton(272, btnY, 220, 50, "Reset Defaults", "gold");
        drawCard(24, btnY + 70, PANEL_W - 48, 62, "muted");
        DrawText("Action text becomes a /me emote in chat.", PANEL_W / 2, btnY + 92, UI.textMuted);
        DrawText("Example: \"waves\" sends * Name waves *", PANEL_W / 2, btnY + 116, UI.textSoft);
    }
    function settingsClick$1() {
        for (let i = 0; i < MAX_SLOTS; i++) {
            const y = SLOTS_Y + i * SLOT_H;
            if (mouseInRect(532, y + 20, 78, 30)) {
                settingsButtons[i].enabled = !settingsButtons[i].enabled;
                return;
            }
        }
        const btnY = SLOTS_Y + MAX_SLOTS * SLOT_H + 10;
        // Save
        if (MouseX >= 34 && MouseX <= 254 && MouseY >= btnY && MouseY <= btnY + 50) {
            for (let i = 0; i < MAX_SLOTS; i++) {
                settingsButtons[i].label = ElementValue(inputId(i, "label")).trim().slice(0, 6);
                settingsButtons[i].color = ElementValue(inputId(i, "color")).trim() || "#c2185b";
                settingsButtons[i].emote = ElementValue(inputId(i, "emote")).trim();
            }
            saveButtons(settingsButtons);
            return;
        }
        // Reset
        if (MouseX >= 272 && MouseX <= 492 && MouseY >= btnY && MouseY <= btnY + 50) {
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
    const ROW_H = 78;
    const NAV_Y = 198;
    const LIST_Y = 238;
    const ADD_Y = LIST_Y + OUTFITS_PER_PAGE * ROW_H + 18;
    let settingsPage = 0;
    let addIncludeRestraints = false;
    function getAddon() {
        if (!Player.ExtensionSettings.EmeryBC) {
            Player.ExtensionSettings.EmeryBC = {};
        }
        return Player.ExtensionSettings.EmeryBC;
    }
    function getOutfits() {
        const list = getAddon().outfits;
        return Array.isArray(list) ? list : [];
    }
    function saveOutfits(list) {
        getAddon().outfits = list;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    }
    function uid() {
        return Math.random().toString(36).slice(2, 9);
    }
    function captureAppearance(includeRestraints) {
        return Player.Appearance
            .filter(item => includeRestraints || !RESTRAINT_GROUPS.has(item.Asset.Group.Name))
            .map(item => ({
            Group: item.Asset.Group.Name,
            Name: item.Asset.Name,
            Color: item.Color,
            Difficulty: item.Difficulty,
            Property: item.Property ? Object.assign({}, item.Property) : undefined,
            Craft: item.Craft ? Object.assign({}, item.Craft) : undefined,
        }));
    }
    function applyOutfit(outfit) {
        var _a;
        for (const item of [...Player.Appearance]) {
            const group = item.Asset.Group.Name;
            const isLocked = !!((_a = item.Property) === null || _a === void 0 ? void 0 : _a.LockedBy);
            if (RESTRAINT_GROUPS.has(group) && !outfit.includeRestraints)
                continue;
            if (isLocked && !outfit.includeRestraints)
                continue;
            InventoryRemove(Player, group, false);
        }
        for (const saved of outfit.items) {
            const asset = AssetGet(Player.AssetFamily, saved.Group, saved.Name);
            if (!asset)
                continue;
            InventoryWear(Player, saved.Name, saved.Group, saved.Color, saved.Difficulty, undefined, saved.Craft);
            if (saved.Property) {
                const worn = InventoryGet(Player, saved.Group);
                if (worn) {
                    const prop = Object.assign({}, saved.Property);
                    delete prop["LockedBy"];
                    delete prop["LockMemberNumber"];
                    delete prop["CombinationNumber"];
                    delete prop["Password"];
                    delete prop["MemberNumberListKeys"];
                    worn.Property = prop;
                }
            }
        }
        ServerSend("AccountUpdate", { Appearance: Player.Appearance });
        CharacterRefresh(Player, false, false);
        ChatRoomCharacterUpdate(Player);
        if (outfit.announceText.trim()) {
            ServerSend("ChatRoomChat", { Content: outfit.announceText.trim(), Type: "Emote" });
        }
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
    function outfitSettingsLoad() {
        settingsPage = 0;
        addIncludeRestraints = false;
    }
    function outfitSettingsRun() {
        ensureInputs();
        const outfits = getOutfits();
        const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
        const page = Math.min(settingsPage, totalPages - 1);
        const visible = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);
        drawSettingsScaffold("Outfit Commands", "Capture a look once, then switch with a slash command.", [
            { label: "OUTFITS", value: `${outfits.length}`, tone: "accent" },
            { label: "PAGE", value: `${page + 1}/${totalPages}`, tone: "gold" },
        ]);
        drawChromeButton(34, NAV_Y, 90, 30, "Prev", "muted", page === 0);
        DrawText("Wardrobe", 186, NAV_Y + 18, UI.textMuted);
        DrawText(`${page + 1} of ${totalPages}`, 322, NAV_Y + 18, UI.textSoft);
        drawChromeButton(526, NAV_Y, 90, 30, "Next", "muted", page >= totalPages - 1);
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            const y = LIST_Y + i * ROW_H;
            drawCard(24, y, PANEL_W - 48, ROW_H - 10, i % 2 === 0 ? "default" : "alt");
            if (!outfit) {
                DrawText("Empty slot", PANEL_W / 2, y + 27, UI.textMuted);
                DrawText("Create a new outfit below to fill this space.", PANEL_W / 2, y + 50, UI.textSoft);
                continue;
            }
            const hasSave = outfit.items.length > 0;
            drawPill(40, y + 18, 94, 26, `/${outfit.command}`, UI.accentSoft, UI.accent);
            DrawTextFit(outfit.displayName, 228, y + 26, 180, UI.text);
            DrawTextFit(`/me ${outfit.announceText}`, 248, y + 50, 220, UI.textSoft);
            drawPill(364, y + 16, 108, 22, outfit.includeRestraints ? "Includes restraints" : "Clothes only", outfit.includeRestraints ? UI.dangerDeep : UI.successDeep, outfit.includeRestraints ? UI.danger : UI.success);
            drawPill(364, y + 42, 108, 18, hasSave ? `${outfit.items.length} items saved` : "No save data", hasSave ? UI.successDeep : UI.buttonMuted, hasSave ? UI.success : UI.textMuted);
            drawChromeButton(508, y + 14, 96, 24, "Update", "success", false, "Save current appearance");
            drawChromeButton(508, y + 42, 96, 24, "Delete", "danger");
        }
        drawCard(24, ADD_Y, PANEL_W - 48, 258, "muted");
        DrawText("Add New Outfit", 128, ADD_Y + 26, UI.text);
        DrawText("Dress your character first, then save the current appearance into a command slot.", 305, ADD_Y + 26, UI.textSoft);
        drawInsetLabel("Command", 92, ADD_Y + 58);
        DrawText("/", 46, ADD_Y + 90, UI.accent);
        ElementPosition("EmeryOF_Cmd", 122, ADD_Y + 90, 120, 38);
        drawInsetLabel("Display Name", 318, ADD_Y + 58);
        ElementPosition("EmeryOF_Name", 336, ADD_Y + 90, 240, 38);
        drawInsetLabel("Restraint Mode", 518, ADD_Y + 58);
        drawChromeButton(458, ADD_Y + 74, 144, 34, addIncludeRestraints ? "Include restraints" : "Clothes only", addIncludeRestraints ? "danger" : "success");
        drawInsetLabel("Announce Text", 132, ADD_Y + 128);
        DrawText("/me", 52, ADD_Y + 164, UI.accent);
        ElementPosition("EmeryOF_Announce", 325, ADD_Y + 164, 520, 38);
        drawChromeButton(44, ADD_Y + 206, PANEL_W - 88, 42, "Save Current Appearance as New Outfit", "success");
    }
    function outfitSettingsClick() {
        const outfits = getOutfits();
        const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
        const page = Math.min(settingsPage, totalPages - 1);
        const visible = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);
        if (mouseInRect(34, NAV_Y, 90, 30)) {
            settingsPage = Math.max(0, page - 1);
            return;
        }
        if (mouseInRect(526, NAV_Y, 90, 30)) {
            settingsPage = Math.min(totalPages - 1, page + 1);
            return;
        }
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            if (!outfit)
                continue;
            const y = LIST_Y + i * ROW_H;
            if (mouseInRect(508, y + 14, 96, 24)) {
                const idx = outfits.indexOf(outfit);
                outfits[idx].items = captureAppearance(outfit.includeRestraints);
                saveOutfits(outfits);
                localNotice(`Updated "/${outfit.command}"`);
                return;
            }
            if (mouseInRect(508, y + 42, 96, 24)) {
                saveOutfits(outfits.filter(entry => entry.id !== outfit.id));
                settingsPage = Math.min(settingsPage, Math.max(0, Math.ceil((outfits.length - 1) / OUTFITS_PER_PAGE) - 1));
                return;
            }
        }
        if (mouseInRect(458, ADD_Y + 74, 144, 34)) {
            addIncludeRestraints = !addIncludeRestraints;
            return;
        }
        if (mouseInRect(44, ADD_Y + 206, PANEL_W - 88, 42)) {
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
            if (outfits.some(outfit => outfit.command.toLowerCase() === cmd)) {
                localNotice(`"/${cmd}" already exists.`, "#ffb7c7");
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
            document.getElementById("EmeryOF_Cmd").value = "";
            document.getElementById("EmeryOF_Name").value = "";
            document.getElementById("EmeryOF_Announce").value = "changes into her outfit";
            addIncludeRestraints = false;
            settingsPage = Math.floor(outfits.length / OUTFITS_PER_PAGE);
            localNotice(`Created "/${cmd}" - ${newOutfit.items.length} items saved.`);
        }
    }
    function outfitSettingsExit() {
        ElementRemove("EmeryOF_Cmd");
        ElementRemove("EmeryOF_Name");
        ElementRemove("EmeryOF_Announce");
    }

    const MOD_NAME = "EmeryBC";
    const MOD_VERSION = "0.1.0";
    let noticeShown = false;
    let activeTab = "actions";
    let settingsRegistered = false;
    const TAB_BTN_Y = 86;
    const TAB_BTN_H = 28;
    const TAB_BTN_W = 108;
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
        drawChromeButton(140, TAB_BTN_Y, TAB_BTN_W, TAB_BTN_H, "Actions", activeTab === "actions" ? "accent" : "muted");
        drawChromeButton(258, TAB_BTN_Y, TAB_BTN_W, TAB_BTN_H, "Outfits", activeTab === "outfits" ? "accent" : "muted");
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
            if (MouseX >= 140 && MouseX <= 140 + TAB_BTN_W && activeTab !== "actions") {
                outfitSettingsExit();
                activeTab = "actions";
                settingsLoad();
                return;
            }
            if (MouseX >= 258 && MouseX <= 258 + TAB_BTN_W && activeTab !== "outfits") {
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
        modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
            next(args);
            try {
                drawActionButtons();
            }
            catch (_a) {
                // Ignore draw failures so the room UI still renders.
            }
        });
        modAPI.hookFunction("ChatRoomSync", 3, (args, next) => {
            const result = next(args);
            try {
                showLoadNotice();
            }
            catch (_a) {
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
