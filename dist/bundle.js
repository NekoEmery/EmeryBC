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
    // Left-panel width — BC shows character preview on the right half
    const PANEL_W$2 = 650;
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
        }
    }
    function settingsLoad() {
        settingsButtons = getButtons().map(b => (Object.assign({}, b)));
    }
    const SLOT_H = 105;
    const SLOTS_Y = 145;
    function settingsRun$1() {
        var _a, _b, _c;
        // Dark panel on left only
        DrawRect(0, 60, PANEL_W$2, 940, "#130920");
        DrawText("Action Buttons", PANEL_W$2 / 2, 95, "White");
        // Column headers
        DrawRect(0, 108, PANEL_W$2, 1, "#3a2a5a");
        DrawText("On", 55, 128, "#9966cc");
        DrawText("Label", 140, 128, "#9966cc");
        DrawText("Color", 270, 128, "#9966cc");
        DrawText("/me action text", 460, 128, "#9966cc");
        DrawRect(0, 138, PANEL_W$2, 1, "#3a2a5a");
        ensureInputs$1();
        for (let i = 0; i < MAX_SLOTS; i++) {
            const btn = (_a = settingsButtons[i]) !== null && _a !== void 0 ? _a : DEFAULT_BUTTONS[i];
            const y = SLOTS_Y + i * SLOT_H;
            // Row background — alternate shade
            DrawRect(0, y, PANEL_W$2, SLOT_H - 4, i % 2 === 0 ? "#1a0d30" : "#160a28");
            // Toggle
            DrawButton(20, y + 30, 42, 42, btn.enabled ? "✓" : "", btn.enabled ? "#7b1fa2" : "#33204a");
            // Label input
            ElementPosition(inputId(i, "label"), 140, y + 51, 105, 38);
            // Color input + live swatch
            ElementPosition(inputId(i, "color"), 272, y + 51, 108, 38);
            const liveColor = (_c = (_b = document.getElementById(inputId(i, "color"))) === null || _b === void 0 ? void 0 : _b.value) !== null && _c !== void 0 ? _c : btn.color;
            DrawRect(390, y + 30, 36, 42, liveColor);
            DrawEmptyRect(390, y + 30, 36, 42, "#ffffff", 1);
            // Emote input
            ElementPosition(inputId(i, "emote"), 500, y + 51, 290, 38);
        }
        const btnY = SLOTS_Y + MAX_SLOTS * SLOT_H + 10;
        DrawButton(30, btnY, 200, 52, "Save", "#1a4a1a");
        DrawButton(250, btnY, 240, 52, "Reset defaults", "#4a2a0a");
        DrawRect(0, btnY + 66, PANEL_W$2, 1, "#3a2a5a");
        DrawText("Action text is sent as /me — e.g. \"waves\" → * Name waves *", PANEL_W$2 / 2, btnY + 82, "#554466");
    }
    function settingsClick$1() {
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
        ServerPlayerExtensionSettingsSync("EmeryBC");
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
    const PANEL_W$1 = 650;
    const OUTFITS_PER_PAGE = 5;
    const ROW_H = 62;
    const LIST_Y = 180;
    const ADD_Y = LIST_Y + OUTFITS_PER_PAGE * ROW_H + 20;
    let settingsPage = 0;
    let addIncludeRestraints = false;
    function ensureInputs() {
        if (!document.getElementById("EmeryOF_Cmd"))
            ElementCreateInput("EmeryOF_Cmd", "text", "", "20");
        if (!document.getElementById("EmeryOF_Name"))
            ElementCreateInput("EmeryOF_Name", "text", "", "40");
        if (!document.getElementById("EmeryOF_Announce"))
            ElementCreateInput("EmeryOF_Announce", "text", "changes into her outfit", "120");
    }
    function outfitSettingsLoad() {
        settingsPage = 0;
        addIncludeRestraints = false;
    }
    function outfitSettingsRun() {
        DrawRect(0, 60, PANEL_W$1, 940, "#130920");
        DrawText("Outfit Commands", PANEL_W$1 / 2, 95, "White");
        // Hint
        DrawRect(0, 108, PANEL_W$1, 1, "#3a2a5a");
        DrawText("Dress up → Save Current to capture.  Type /command in chat to load.", PANEL_W$1 / 2, 125, "#9966cc");
        DrawRect(0, 138, PANEL_W$1, 1, "#3a2a5a");
        ensureInputs();
        const outfits = getOutfits();
        const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
        const page = Math.min(settingsPage, totalPages - 1);
        const visible = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);
        // Page nav
        DrawButton(20, 152, 80, 28, "◀ Prev", page > 0 ? "#3a2a5a" : "#1a0d2a", "", "", page === 0);
        DrawText(`${page + 1} / ${totalPages}`, PANEL_W$1 / 2, 166, "#666688");
        DrawButton(550, 152, 80, 28, "Next ▶", page < totalPages - 1 ? "#3a2a5a" : "#1a0d2a", "", "", page >= totalPages - 1);
        // Outfit rows
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            const y = LIST_Y + i * ROW_H;
            const shade = i % 2 === 0 ? "#1a0d30" : "#160a28";
            DrawRect(0, y, PANEL_W$1, ROW_H - 2, shade);
            if (!outfit) {
                DrawText("— empty —", PANEL_W$1 / 2, y + ROW_H / 2 - 1, "#333355");
                continue;
            }
            // Command badge
            DrawRect(8, y + 12, 120, 34, "#4a2a7a");
            DrawTextFit(`/${outfit.command}`, 68, y + 29, 110, "White");
            // Name
            DrawTextFit(outfit.displayName, 200, y + 20, 165, "White");
            // Announce preview
            DrawTextFit(`/me ${outfit.announceText}`, 200, y + 44, 165, "#665577");
            // Restraints pill
            if (outfit.includeRestraints) {
                DrawRect(375, y + 16, 88, 26, "#5a1515");
                DrawText("RESTRAINTS", 419, y + 29, "#ff9999");
            }
            // Item count
            const hasSave = outfit.items.length > 0;
            DrawText(hasSave ? `${outfit.items.length} items` : "⚠ empty", 472, y + 29, hasSave ? "#558855" : "#cc6622");
            // Buttons
            DrawButton(520, y + 8, 58, 22, "Update", "#1a3a1a", "", "Save current appearance");
            DrawButton(520, y + 34, 58, 22, "Delete", "#3a1010");
            DrawRect(0, y + ROW_H - 2, PANEL_W$1, 2, "#2a1a4a");
        }
        // ── Add New ───────────────────────────────────────────────────────────────
        DrawRect(0, ADD_Y - 2, PANEL_W$1, 2, "#4a2a7a");
        DrawText("Add New Outfit", 160, ADD_Y + 22, "#c084fc");
        // Row 1: command + name
        DrawText("/", 24, ADD_Y + 60, "#7c5cbf");
        ElementPosition("EmeryOF_Cmd", 60, ADD_Y + 60, 130, 36);
        DrawText("Name:", 220, ADD_Y + 60, "#aaaaaa");
        ElementPosition("EmeryOF_Name", 280, ADD_Y + 60, 220, 36);
        DrawText("Restraints:", 24, ADD_Y + 108, "#aaaaaa");
        DrawButton(120, ADD_Y + 90, 36, 36, addIncludeRestraints ? "✓" : "", addIncludeRestraints ? "#6a1a1a" : "#2a1a3a");
        // Row 2: announce
        DrawText("/me", 24, ADD_Y + 155, "#7c5cbf");
        ElementPosition("EmeryOF_Announce", 70, ADD_Y + 155, 480, 36);
        // Save button
        DrawButton(20, ADD_Y + 205, PANEL_W$1 - 40, 50, "+ Save Current Appearance as New Outfit", "#1a4a1a");
    }
    function outfitSettingsClick() {
        const outfits = getOutfits();
        const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
        const page = Math.min(settingsPage, totalPages - 1);
        const visible = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);
        if (mouseInRect(20, 152, 80, 28)) {
            settingsPage = Math.max(0, page - 1);
            return;
        }
        if (mouseInRect(550, 152, 80, 28)) {
            settingsPage = Math.min(totalPages - 1, page + 1);
            return;
        }
        for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
            const outfit = visible[i];
            if (!outfit)
                continue;
            const y = LIST_Y + i * ROW_H;
            if (mouseInRect(520, y + 8, 58, 22)) {
                const idx = outfits.indexOf(outfit);
                outfits[idx].items = captureAppearance(outfit.includeRestraints);
                saveOutfits(outfits);
                localNotice(`Updated "/${outfit.command}"`);
                return;
            }
            if (mouseInRect(520, y + 34, 58, 22)) {
                saveOutfits(outfits.filter(o => o.id !== outfit.id));
                settingsPage = Math.min(settingsPage, Math.max(0, Math.ceil((outfits.length - 1) / OUTFITS_PER_PAGE) - 1));
                return;
            }
        }
        // Restraints toggle
        if (mouseInRect(120, ADD_Y + 90, 36, 36)) {
            addIncludeRestraints = !addIncludeRestraints;
            return;
        }
        // Add new
        if (mouseInRect(20, ADD_Y + 205, PANEL_W$1 - 40, 50)) {
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
                localNotice(`"/${cmd}" already exists.`, "#ff6666");
                return;
            }
            const newOutfit = {
                id: uid(), command: cmd, displayName: name,
                announceText: announce || "changes outfit",
                includeRestraints: addIncludeRestraints,
                items: captureAppearance(addIncludeRestraints),
            };
            saveOutfits([...outfits, newOutfit]);
            document.getElementById("EmeryOF_Cmd").value = "";
            document.getElementById("EmeryOF_Name").value = "";
            document.getElementById("EmeryOF_Announce").value = "changes into her outfit";
            addIncludeRestraints = false;
            localNotice(`Created "/${cmd}" — ${newOutfit.items.length} items saved.`);
            settingsPage = Math.floor(outfits.length / OUTFITS_PER_PAGE);
        }
    }
    function outfitSettingsExit() {
        ElementRemove("EmeryOF_Cmd");
        ElementRemove("EmeryOF_Name");
        ElementRemove("EmeryOF_Announce");
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
        DrawButton(10, TAB_BTN_Y, 310, TAB_BTN_H, "Action Buttons", activeTab === "actions" ? "#5a3a8a" : "#2a1a4a");
        DrawButton(330, TAB_BTN_Y, 310, TAB_BTN_H, "Outfits", activeTab === "outfits" ? "#5a3a8a" : "#2a1a4a");
    }
    const PANEL_W = 650;
    function settingsRun() {
        DrawRect(0, 0, PANEL_W, 65, "#0f0720");
        drawTabs();
        if (activeTab === "actions")
            settingsRun$1();
        else
            outfitSettingsRun();
    }
    function settingsClick() {
        if (MouseY >= TAB_BTN_Y && MouseY <= TAB_BTN_Y + TAB_BTN_H) {
            if (MouseX >= 10 && MouseX <= 320 && activeTab !== "actions") {
                outfitSettingsExit();
                activeTab = "actions";
                settingsLoad();
                return;
            }
            if (MouseX >= 330 && MouseX <= 640 && activeTab !== "outfits") {
                settingsExit$1();
                activeTab = "outfits";
                outfitSettingsLoad();
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
        console.log(`[EmeryBC] registerSettings: fn=${typeof reg}, player=${typeof Player !== "undefined" ? Player.MemberNumber : "N/A"}`);
        if (reg) {
            try {
                reg({
                    Identifier: MOD_NAME,
                    ButtonText: "EmeryBC",
                    Image: "",
                    load: () => { activeTab = "actions"; settingsLoad(); outfitSettingsLoad(); },
                    run: settingsRun,
                    click: settingsClick,
                    exit: settingsExit,
                });
                settingsRegistered = true;
                console.log("[EmeryBC] Extension settings registered OK");
            }
            catch (e) {
                console.error("[EmeryBC] Registration failed:", e);
            }
        }
        else {
            console.log("[EmeryBC] PreferenceRegisterExtensionSetting not ready yet, retrying in 1s");
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
