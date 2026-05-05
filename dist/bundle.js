(function () {
    'use strict';

    // Action buttons drawn below BCAR's upperleft buttons (EAR/TAIL/WINGS end at y=270)
    const DEFAULT_BUTTONS = [
        { label: "NOD", emote: "*nods their head*", enabled: true },
        { label: "SHAKE", emote: "*shakes their head*", enabled: true },
        { label: "WAVE", emote: "*waves*", enabled: true },
        { label: "BOW", emote: "*bows their head politely*", enabled: true },
        { label: "", emote: "", enabled: false },
        { label: "", emote: "", enabled: false },
    ];
    // BCAR upperleft buttons end at y=270; we start there
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
        if (!Player.ExtensionSettings.EmeryBC) {
            Player.ExtensionSettings.EmeryBC = {};
        }
        Player.ExtensionSettings.EmeryBC.actionButtons = buttons;
        ServerSend("AccountUpdate", { ExtensionSettings: Player.ExtensionSettings });
    }
    function sendEmote(text) {
        if (!text.trim())
            return;
        ServerSend("ChatRoomChat", { Content: text, Type: "Emote" });
    }
    // --- Drawing ---
    function drawActionButtons() {
        if (CurrentScreen !== "ChatRoom")
            return;
        const buttons = getButtons();
        for (let i = 0; i < MAX_SLOTS; i++) {
            const btn = buttons[i];
            if (!(btn === null || btn === void 0 ? void 0 : btn.enabled) || !btn.label)
                continue;
            const y = BTN_START_Y + i * BTN_SIZE;
            DrawButton(BTN_X, y, BTN_SIZE, BTN_SIZE, btn.label, "#2a1a4a", "", btn.emote);
        }
    }
    // --- Click handling ---
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
    // --- Settings screen ---
    let settingsButtons = [];
    function settingsRun$1() {
        settingsButtons = getButtons().map(b => (Object.assign({}, b)));
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
            const labelEl = document.getElementById(`EmeryBtn_Label_${i}`);
            if (!labelEl) {
                ElementCreateInput(`EmeryBtn_Label_${i}`, "text", btn.label, "6");
            }
            ElementPosition(`EmeryBtn_Label_${i}`, 200, y + 22, 160, 45);
            // Emote input
            const emoteEl = document.getElementById(`EmeryBtn_Emote_${i}`);
            if (!emoteEl) {
                ElementCreateInput(`EmeryBtn_Emote_${i}`, "text", btn.emote, "120");
            }
            ElementPosition(`EmeryBtn_Emote_${i}`, 620, y + 22, 600, 45);
        }
        DrawButton(200, 840, 250, 64, "Save", "#3a6a3a");
        DrawButton(550, 840, 250, 64, "Reset defaults", "#6a3a1a");
    }
    function settingsClick$1() {
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
            settingsButtons = DEFAULT_BUTTONS.map(b => (Object.assign({}, b)));
            for (let i = 0; i < MAX_SLOTS; i++) {
                const el = document.getElementById(`EmeryBtn_Label_${i}`);
                if (el)
                    el.value = settingsButtons[i].label;
                const el2 = document.getElementById(`EmeryBtn_Emote_${i}`);
                if (el2)
                    el2.value = settingsButtons[i].emote;
            }
            saveButtons(settingsButtons);
        }
    }
    function settingsExit$1() {
        for (let i = 0; i < MAX_SLOTS; i++) {
            ElementRemove(`EmeryBtn_Label_${i}`);
            ElementRemove(`EmeryBtn_Emote_${i}`);
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
    const modAPI = bcModSDK.registerMod({ name: MOD_NAME, fullName: "EmeryBC", version: MOD_VERSION }, { allowReplace: true });
    // ─── Load indicator ───────────────────────────────────────────────────────────
    // Small badge drawn above BCAR's buttons (BCAR upperleft starts at y=135)
    function drawLoadIndicator() {
        DrawRect(0, 92, 45, 38, "#2a0a4a");
        DrawEmptyRect(0, 92, 45, 38, "#7c3fbf", 1);
        DrawText("NA", 22, 111, "#c084fc");
    }
    // One-time chat notice per session
    let noticeShown = false;
    function showLoadNotice() {
        if (noticeShown)
            return;
        noticeShown = true;
        const log = document.getElementById("TextAreaChatLog");
        if (!log)
            return;
        const div = document.createElement("div");
        div.style.cssText = "color:#c084fc;font-style:italic;padding:3px 5px;border-left:3px solid #7c3fbf;margin:2px 0;";
        div.textContent = `✓ EmeryBC v${MOD_VERSION} loaded`;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }
    // ─── In-game hooks ────────────────────────────────────────────────────────────
    modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
        next(args);
        try {
            drawActionButtons();
        }
        catch ( /* silent */_a) { /* silent */ }
        try {
            drawLoadIndicator();
        }
        catch ( /* silent */_b) { /* silent */ }
    });
    // Show notice once when first entering a room
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
    // Intercept slash commands before BC processes them
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
    let activeTab = "actions";
    const TAB_BTN_Y = 65;
    const TAB_BTN_H = 50;
    function drawTabs() {
        DrawButton(60, TAB_BTN_Y, 220, TAB_BTN_H, "Action Buttons", activeTab === "actions" ? "#4a2a7a" : "#2a1a4a");
        DrawButton(290, TAB_BTN_Y, 220, TAB_BTN_H, "Outfits", activeTab === "outfits" ? "#4a2a7a" : "#2a1a4a");
    }
    function settingsRun() {
        DrawRect(0, 0, 1000, 65, "#0f0720"); // tab bar background
        drawTabs();
        if (activeTab === "actions")
            settingsRun$1();
        else
            outfitSettingsRun();
    }
    function settingsClick() {
        // Tab switching
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
    PreferenceRegisterExtensionSetting({
        Identifier: MOD_NAME,
        ButtonText: "EmeryBC",
        Image: "",
        run: settingsRun,
        click: settingsClick,
        exit: settingsExit,
    });
    console.log(`[${MOD_NAME}] v${MOD_VERSION} loaded`);

})();
