(function () {
    'use strict';

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
        ServerSend("AccountUpdate", { ExtensionSettings: Player.ExtensionSettings });
    }
    function sendEmote(text) {
        if (!text.trim())
            return;
        // Sends as /me — BC wraps it as "* Name text *"
        ServerSend("ChatRoomChat", { Content: text.trim(), Type: "Emote" });
    }
    // ─── Drawing ──────────────────────────────────────────────────────────────────
    function drawActionButtons() {
        if (CurrentScreen !== "ChatRoom")
            return;
        const buttons = getButtons();
        for (let i = 0; i < MAX_SLOTS; i++) {
            const btn = buttons[i];
            if (!(btn === null || btn === void 0 ? void 0 : btn.enabled) || !btn.label)
                continue;
            const y = BTN_START_Y + i * BTN_SIZE;
            DrawButton(BTN_X, y, BTN_SIZE, BTN_SIZE, btn.label, btn.color || "#c2185b", "", btn.emote);
        }
    }
    // ─── Click handling ───────────────────────────────────────────────────────────
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
                sendEmote(btn.emote);
                return true;
            }
        }
        return false;
    }
    // ─── Settings screen ─────────────────────────────────────────────────────────
    let settingsButtons = [];
    const INPUT_PREFIX = "EmeryBtn";
    function inputId(slot, field) {
        return `${INPUT_PREFIX}_${field}_${slot}`;
    }
    function settingsRun$1() {
        settingsButtons = getButtons().map(b => (Object.assign({}, b)));
        DrawRect(0, 60, 1000, 940, "#1a0a2e");
        DrawText("Action Buttons", 500, 105, "White", "Black");
        DrawText("On", 75, 160, "#aaaaaa");
        DrawText("Label", 185, 160, "#aaaaaa");
        DrawText("Color", 305, 160, "#aaaaaa");
        DrawText("Action text  (sent as /me ...)", 630, 160, "#aaaaaa");
        for (let i = 0; i < MAX_SLOTS; i++) {
            const btn = settingsButtons[i];
            const y = 190 + i * 100;
            DrawRect(55, y, 890, 90, "#221440");
            DrawEmptyRect(55, y, 890, 90, "#3a2a5a");
            // Enabled toggle
            DrawButton(60, y + 22, 45, 45, btn.enabled ? "✓" : "", btn.enabled ? "#7b1fa2" : "#2a1a3a");
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
        DrawText("/me action text — e.g. \"waves goodbye\" appears as  * Name waves goodbye *", 500, 895, "#666688");
    }
    function settingsClick$1() {
        var _a;
        for (let i = 0; i < MAX_SLOTS; i++) {
            const y = 190 + i * 100;
            if (MouseX >= 60 && MouseX <= 105 && MouseY >= y + 22 && MouseY <= y + 67) {
                settingsButtons[i].enabled = !settingsButtons[i].enabled;
                // Refresh color preview from input when toggling
                const col = (_a = document.getElementById(inputId(i, "color"))) === null || _a === void 0 ? void 0 : _a.value;
                if (col)
                    settingsButtons[i].color = col;
                return;
            }
        }
        if (MouseX >= 200 && MouseX <= 450 && MouseY >= 810 && MouseY <= 870) {
            for (let i = 0; i < MAX_SLOTS; i++) {
                settingsButtons[i].label = ElementValue(inputId(i, "label")).trim().slice(0, 6);
                settingsButtons[i].emote = ElementValue(inputId(i, "emote")).trim();
                settingsButtons[i].color = ElementValue(inputId(i, "color")).trim() || "#c2185b";
            }
            saveButtons(settingsButtons);
            return;
        }
        if (MouseX >= 550 && MouseX <= 830 && MouseY >= 810 && MouseY <= 870) {
            settingsButtons = DEFAULT_BUTTONS.map(b => (Object.assign({}, b)));
            for (let i = 0; i < MAX_SLOTS; i++) {
                const l = document.getElementById(inputId(i, "label"));
                const e = document.getElementById(inputId(i, "emote"));
                const c = document.getElementById(inputId(i, "color"));
                if (l)
                    l.value = settingsButtons[i].label;
                if (e)
                    e.value = settingsButtons[i].emote;
                if (c)
                    c.value = settingsButtons[i].color;
            }
            saveButtons(settingsButtons);
        }
    }
    function settingsExit$1() {
        for (let i = 0; i < MAX_SLOTS; i++) {
            ElementRemove(inputId(i, "label"));
            ElementRemove(inputId(i, "emote"));
            ElementRemove(inputId(i, "color"));
        }
    }

    // Outfit manager — commands are configured in the extensions settings tab.
    // Each outfit gets a custom slash command, e.g. /dom /sub /comfy
    // Restraint saving is per-outfit (toggled in settings).
    const RESTRAINT_GROUPS = new Set([
        "ItemArms", "ItemHands", "ItemLegs", "ItemFeet", "ItemBoots",
        "ItemMouth", "ItemMouthAccessory", "ItemHead", "ItemHood",
        "ItemNeck", "ItemNeckAccessories", "ItemNeckRestraints",
        "ItemPelvis", "ItemVulva", "ItemButt", "ItemBreast", "ItemNipples",
        "ItemTorso", "ItemTorso2", "ItemEars", "ItemNose", "ItemMisc",
    ]);
    // ─── Storage ─────────────────────────────────────────────────────────────────
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
        ServerSend("AccountUpdate", { ExtensionSettings: Player.ExtensionSettings });
    }
    function uid() {
        return Math.random().toString(36).slice(2, 9);
    }
    // ─── Serialisation ────────────────────────────────────────────────────────────
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
    // ─── Loading ──────────────────────────────────────────────────────────────────
    function applyOutfit(outfit) {
        var _a, _b;
        // Remove current items — keep locked restraints we didn't save
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
                    // Strip lock data so restraints are removable after loading
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
        if ((_b = outfit.announceText) === null || _b === void 0 ? void 0 : _b.trim()) {
            ServerSend("ChatRoomChat", { Content: outfit.announceText.trim(), Type: "Emote" });
        }
        localNotice(`Loaded "${outfit.displayName}" (/${outfit.command})`);
    }
    // ─── Command hook (called from main) ─────────────────────────────────────────
    function handleOutfitCommand(inputValue) {
        const trimmed = inputValue.trim();
        if (!trimmed.startsWith("/"))
            return false;
        const cmd = trimmed.slice(1).toLowerCase();
        const outfit = getOutfits().find(o => o.command.toLowerCase() === cmd);
        if (!outfit)
            return false;
        if (!outfit.items.length) {
            localNotice(`Outfit "/${outfit.command}" has no saved appearance yet — open Extensions > EmeryBC to save it.`);
            return true;
        }
        applyOutfit(outfit);
        return true;
    }
    // ─── UI helpers ───────────────────────────────────────────────────────────────
    function localNotice(msg, color = "#c084fc") {
        const log = document.getElementById("TextAreaChatLog");
        if (!log)
            return;
        const div = document.createElement("div");
        div.style.cssText = `color:${color};font-style:italic;padding:2px 4px;`;
        div.textContent = `[EmeryBC] ${msg}`;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }
    // ─── Settings screen ─────────────────────────────────────────────────────────
    let settingsPage = 0;
    let addIncludeRestraints = false;
    const OUTFITS_PER_PAGE = 4;
    const ROW_H = 100;
    const LIST_START_Y = 175;
    const ADD_Y = 635;
    const INPUT_IDS = ["EmeryOF_Cmd", "EmeryOF_Name", "EmeryOF_Announce"];
    function ensureInputs() {
        if (!document.getElementById("EmeryOF_Cmd")) {
            ElementCreateInput("EmeryOF_Cmd", "text", "", "20");
            ElementCreateInput("EmeryOF_Name", "text", "", "40");
            ElementCreateInput("EmeryOF_Announce", "text", "*changes outfit*", "120");
        }
    }
    function outfitSettingsRun() {
        DrawRect(0, 60, 1000, 940, "#1a0a2e");
        DrawText("Outfit Commands", 500, 105, "White", "Black");
        // How-to hint bar
        DrawRect(55, 112, 890, 22, "#1a0a3a");
        DrawText("Set a command below, dress up, then click Save Current.  Type /command in chat to switch outfits.", 500, 123, "#8866aa");
        ensureInputs();
        const outfits = getOutfits();
        const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
        const page = Math.min(settingsPage, totalPages - 1);
        const visible = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);
        // Page nav
        DrawButton(60, 135, 100, 38, "◀ Prev", page > 0 ? "#3a2a5a" : "#1f1435", "", "", page === 0);
        DrawText(`${page + 1} / ${totalPages}`, 500, 154, "#888888");
        DrawButton(840, 135, 100, 38, "Next ▶", page < totalPages - 1 ? "#3a2a5a" : "#1f1435", "", "", page >= totalPages - 1);
        // Column headers
        DrawText("Command", 160, 167, "#7c5cbf");
        DrawText("Name", 350, 167, "#7c5cbf");
        DrawText("Flags", 640, 167, "#7c5cbf");
        // Outfit rows
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            const y = LIST_START_Y + i * ROW_H;
            DrawRect(55, y, 890, ROW_H - 6, outfit ? "#221440" : "#150b2a");
            DrawEmptyRect(55, y, 890, ROW_H - 6, "#3a2a5a");
            if (!outfit) {
                DrawText("— empty slot —", 500, y + (ROW_H - 6) / 2, "#333355");
                continue;
            }
            // Command badge
            DrawRect(65, y + 12, 140, 38, "#4a2a7a");
            DrawText(`/${outfit.command}`, 135, y + 31, "White");
            // Display name
            DrawTextFit(outfit.displayName, 360, y + 31, 230, "White");
            // Restraints badge
            if (outfit.includeRestraints) {
                DrawRect(610, y + 14, 120, 34, "#5a1515");
                DrawText("RESTRAINTS", 670, y + 31, "#ff8888");
            }
            // Announce preview (small)
            if (outfit.announceText) {
                DrawTextFit(`"${outfit.announceText}"`, 360, y + 63, 355, "#666688");
            }
            const hasSave = outfit.items.length > 0;
            DrawText(hasSave ? `${outfit.items.length} items` : "⚠ unsaved", 760, y + 31, hasSave ? "#668866" : "#cc6622");
            // Update button
            DrawButton(800, y + 10, 130, 38, "Save Current", "#2a5a2a", "", "Overwrite with current appearance");
            // Delete button
            DrawButton(800, y + 54, 130, 32, "Delete", "#5a1515");
        }
        // ── Add New section ──────────────────────────────────────────────────────
        DrawRect(55, ADD_Y, 890, 310, "#160d2a");
        DrawEmptyRect(55, ADD_Y, 890, 310, "#4a3a6a", 2);
        DrawText("Add New Outfit", 260, ADD_Y + 26, "#c084fc");
        DrawText("Command:", 80, ADD_Y + 70, "#aaaaaa");
        DrawText("/", 227, ADD_Y + 70, "#7c5cbf");
        ElementPosition("EmeryOF_Cmd", 310, ADD_Y + 70, 200, 42);
        DrawText("Name:", 540, ADD_Y + 70, "#aaaaaa");
        ElementPosition("EmeryOF_Name", 720, ADD_Y + 70, 220, 42);
        DrawText("Include restraints:", 80, ADD_Y + 140, "#aaaaaa");
        DrawButton(290, ADD_Y + 118, 45, 45, addIncludeRestraints ? "✓" : "", addIncludeRestraints ? "#6a1a1a" : "#2a1a3a");
        DrawText("Announce text:", 80, ADD_Y + 210, "#aaaaaa");
        ElementPosition("EmeryOF_Announce", 310, ADD_Y + 210, 600, 42);
        DrawButton(280, ADD_Y + 256, 440, 50, "+ Save Current Appearance as New Outfit", "#2a5a2a");
    }
    function outfitSettingsClick() {
        const outfits = getOutfits();
        const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
        const page = Math.min(settingsPage, totalPages - 1);
        const visible = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);
        // Prev / Next
        if (mouseInRect(60, 135, 100, 38)) {
            settingsPage = Math.max(0, page - 1);
            return;
        }
        if (mouseInRect(840, 135, 100, 38)) {
            settingsPage = Math.min(totalPages - 1, page + 1);
            return;
        }
        // Outfit row buttons
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            if (!outfit)
                continue;
            const y = LIST_START_Y + i * ROW_H;
            // Save Current → Update
            if (mouseInRect(800, y + 10, 130, 38)) {
                const idx = outfits.indexOf(outfit);
                outfits[idx].items = captureAppearance(outfit.includeRestraints);
                saveOutfits(outfits);
                localNotice(`Saved current appearance to "/${outfit.command}"`);
                return;
            }
            // Delete
            if (mouseInRect(800, y + 54, 130, 32)) {
                saveOutfits(outfits.filter(o => o.id !== outfit.id));
                settingsPage = Math.min(settingsPage, Math.max(0, Math.ceil((outfits.length - 1) / OUTFITS_PER_PAGE) - 1));
                return;
            }
        }
        // Restraints toggle (add form)
        if (mouseInRect(290, ADD_Y + 118, 45, 45)) {
            addIncludeRestraints = !addIncludeRestraints;
            return;
        }
        // Add new outfit
        if (mouseInRect(280, ADD_Y + 256, 440, 50)) {
            const cmd = ElementValue("EmeryOF_Cmd").trim().replace(/\s+/g, "").toLowerCase();
            const name = ElementValue("EmeryOF_Name").trim();
            const announce = ElementValue("EmeryOF_Announce").trim();
            if (!cmd) {
                localNotice("Command cannot be empty.", "#ff6666");
                return;
            }
            if (!name) {
                localNotice("Name cannot be empty.", "#ff6666");
                return;
            }
            if (outfits.some(o => o.command.toLowerCase() === cmd)) {
                localNotice(`Command "/${cmd}" already exists.`, "#ff6666");
                return;
            }
            const newOutfit = {
                id: uid(),
                command: cmd,
                displayName: name,
                announceText: announce || "*changes outfit*",
                includeRestraints: addIncludeRestraints,
                items: captureAppearance(addIncludeRestraints),
            };
            saveOutfits([...outfits, newOutfit]);
            // Clear inputs
            document.getElementById("EmeryOF_Cmd").value = "";
            document.getElementById("EmeryOF_Name").value = "";
            document.getElementById("EmeryOF_Announce").value = "*changes outfit*";
            addIncludeRestraints = false;
            localNotice(`Created "/${cmd}" with ${newOutfit.items.length} items saved.`);
            settingsPage = Math.floor(outfits.length / OUTFITS_PER_PAGE);
        }
    }
    function outfitSettingsExit() {
        INPUT_IDS.forEach(id => ElementRemove(id));
    }
    function mouseInRect(x, y, w, h) {
        return MouseX >= x && MouseX <= x + w && MouseY >= y && MouseY <= y + h;
    }

    const MOD_NAME = "EmeryBC";
    const MOD_VERSION = "0.1.0";
    // ─── Load notice ──────────────────────────────────────────────────────────────
    let noticeShown = false;
    function showLoadNotice() {
        if (noticeShown)
            return;
        noticeShown = true;
        // Popup in top-right corner
        const wrap = document.createElement("div");
        wrap.style.cssText = `
        position: fixed; top: 10px; right: 10px; width: 260px;
        font-family: Arial, sans-serif; font-size: 13px;
        border: 2px solid #4a0080; border-radius: 6px;
        box-shadow: 0 3px 12px rgba(0,0,0,0.6);
        z-index: 99999; cursor: pointer; user-select: none;
    `;
        const title = document.createElement("div");
        title.style.cssText = `
        background: #4a0080; color: white; font-weight: bold;
        text-align: center; padding: 6px 10px;
        border-radius: 4px 4px 0 0; font-size: 14px;
    `;
        title.textContent = "EmeryBC Loaded";
        const body = document.createElement("div");
        body.style.cssText = `
        background: #7c3fbf; color: white;
        padding: 8px 12px; line-height: 1.6;
        border-radius: 0 0 4px 4px;
    `;
        body.innerHTML = `
        Version: ${MOD_VERSION}<br>
        ✓ Action Buttons<br>
        ✓ Outfit Commands<br>
        <span style="font-size:11px;opacity:0.7;">(click to dismiss)</span>
    `;
        wrap.appendChild(title);
        wrap.appendChild(body);
        wrap.addEventListener("click", () => wrap.remove());
        document.body.appendChild(wrap);
        setTimeout(() => wrap.remove(), 10000);
        // Message in chat log
        const log = document.getElementById("TextAreaChatLog");
        if (log) {
            const msg = document.createElement("div");
            msg.style.cssText = `
            background: #2a0a4a; color: #c084fc;
            border-left: 3px solid #7c3fbf;
            padding: 4px 8px; margin: 2px 0;
            font-style: italic; font-size: 12px;
        `;
            msg.textContent = `✓ EmeryBC v${MOD_VERSION} loaded — configure in Preferences > Extensions`;
            log.appendChild(msg);
            log.scrollTop = log.scrollHeight;
        }
    }
    let activeTab = "actions";
    const TAB_BTN_Y = 65;
    const TAB_BTN_H = 50;
    function drawTabs() {
        DrawButton(60, TAB_BTN_Y, 220, TAB_BTN_H, "Action Buttons", activeTab === "actions" ? "#4a2a7a" : "#2a1a4a");
        DrawButton(290, TAB_BTN_Y, 220, TAB_BTN_H, "Outfits", activeTab === "outfits" ? "#4a2a7a" : "#2a1a4a");
    }
    function settingsRun() {
        DrawRect(0, 0, 1000, 65, "#0f0720");
        drawTabs();
        if (activeTab === "actions")
            settingsRun$1();
        else
            outfitSettingsRun();
    }
    function settingsClick() {
        if (MouseY >= TAB_BTN_Y && MouseY <= TAB_BTN_Y + TAB_BTN_H) {
            if (MouseX >= 60 && MouseX <= 280 && activeTab !== "actions") {
                outfitSettingsExit();
                activeTab = "actions";
                return;
            }
            if (MouseX >= 290 && MouseX <= 510 && activeTab !== "outfits") {
                settingsExit$1();
                activeTab = "outfits";
                return;
            }
        }
        if (activeTab === "actions")
            settingsClick$1();
        else
            outfitSettingsClick();
    }
    function settingsExit() {
        if (activeTab === "actions")
            settingsExit$1();
        else
            outfitSettingsExit();
        activeTab = "actions";
    }
    // ─── Init ─────────────────────────────────────────────────────────────────────
    let settingsRegistered = false;
    function registerSettings() {
        if (settingsRegistered)
            return;
        const g = window;
        const reg = g["PreferenceRegisterExtensionSetting"];
        if (reg) {
            reg({
                Identifier: MOD_NAME,
                ButtonText: "EmeryBC",
                Image: "",
                load: () => { },
                run: settingsRun,
                click: settingsClick,
                exit: settingsExit,
            });
            settingsRegistered = true;
        }
        else {
            setTimeout(registerSettings, 1000);
        }
    }
    function init() {
        const modAPI = bcModSDK.registerMod({ name: MOD_NAME, fullName: "EmeryBC", version: MOD_VERSION }, { allowReplace: true });
        modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
            next(args);
            try {
                drawActionButtons();
            }
            catch ( /* silent */_a) { /* silent */ }
        });
        modAPI.hookFunction("ChatRoomSync", 3, (args, next) => {
            const result = next(args);
            try {
                showLoadNotice();
            }
            catch ( /* silent */_a) { /* silent */ }
            return result;
        });
        modAPI.hookFunction("ChatRoomClick", 3, (args, next) => {
            try {
                if (handleActionButtonClick())
                    return;
            }
            catch ( /* silent */_a) { /* silent */ }
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
            catch ( /* silent */_a) { /* silent */ }
            return next(args);
        });
        registerSettings();
        try {
            showLoadNotice();
        }
        catch ( /* silent */_a) { /* silent */ }
        console.log(`[${MOD_NAME}] v${MOD_VERSION} loaded`);
    }
    const readyInterval = setInterval(() => {
        if (typeof bcModSDK !== "undefined") {
            clearInterval(readyInterval);
            init();
        }
    }, 100);

})();
