(function () {
    'use strict';

    const UI = {
        panelEdge: "#4c2537",
        cardMuted: "#190b13",
        textMuted: "#cbaab7",
        accent: "#cf6f98",
        gold: "#c9ab72"};

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
    // --- Storage -----------------------------------------------------------------
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
    function saveButtons(buttons, slotCount) {
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
    // --- Helper: send as BC Action - displays as (Name text) ---------------------
    function sendAction(emote) {
        ServerSend("ChatRoomChat", {
            Type: "Action",
            Content: "EBCEmote",
            Dictionary: [
                { Tag: "EBCEmote", Text: "{SourceCharacter} " + emote.trim() },
                { SourceCharacter: Player.MemberNumber },
            ],
        });
    }
    // --- In-game sidebar ---------------------------------------------------------
    const BTN_X = 0;
    const BTN_START_Y = 270;
    const BTN_SIZE = 45;
    // Collapse toggle chip - small (-) / (+) button above the action buttons
    const CHIP_X = 0;
    const CHIP_Y = 255;
    const CHIP_W = 45;
    const CHIP_H = 13;
    let sidebarCollapsed = false;
    function drawActionButtons() {
        if (CurrentScreen !== "ChatRoom")
            return;
        // Collapse toggle chip
        DrawButton(CHIP_X, CHIP_Y, CHIP_W, CHIP_H, sidebarCollapsed ? "+" : "-", sidebarCollapsed ? "#3a1928" : UI.cardMuted, "", sidebarCollapsed ? "Show quick buttons" : "Hide quick buttons");
        if (sidebarCollapsed)
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
        // Collapse chip
        if (MouseX >= CHIP_X && MouseX <= CHIP_X + CHIP_W &&
            MouseY >= CHIP_Y && MouseY <= CHIP_Y + CHIP_H) {
            sidebarCollapsed = !sidebarCollapsed;
            return true;
        }
        if (sidebarCollapsed)
            return false;
        const buttons = getButtons();
        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            if (!(btn === null || btn === void 0 ? void 0 : btn.enabled) || !btn.label)
                continue;
            const y = BTN_START_Y + i * BTN_SIZE;
            if (MouseX >= BTN_X && MouseX <= BTN_X + BTN_SIZE &&
                MouseY >= y && MouseY <= y + BTN_SIZE) {
                sendAction(btn.emote);
                return true;
            }
        }
        return false;
    }

    const RESTRAINT_GROUPS = new Set([
        "ItemArms", "ItemHands", "ItemLegs", "ItemFeet", "ItemBoots",
        "ItemMouth", "ItemMouthAccessory", "ItemHead", "ItemHood",
        "ItemNeck", "ItemNeckAccessories", "ItemNeckRestraints",
        "ItemPelvis", "ItemVulva", "ItemButt", "ItemBreast", "ItemNipples",
        "ItemTorso", "ItemTorso2", "ItemEars", "ItemNose", "ItemMisc",
    ]);
    const MAX_SERIALIZE_DEPTH = 12;
    let outfitApplyPending = false;
    let refreshScheduled = false;
    let cachedOutfits = null;
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
                    ServerSend("ChatRoomChat", {
                        Type: "Action",
                        Content: "EBCAnnounce",
                        Dictionary: [
                            { Tag: "EBCAnnounce", Text: "{SourceCharacter} " + outfit.announceText.trim() },
                            { SourceCharacter: Player.MemberNumber },
                        ],
                    });
                }
            }
            finally {
                outfitApplyPending = false;
            }
        }, 80);
        localNotice(`Loaded "${outfit.displayName}" (/${outfit.command})`);
    }
    // Called from the drawer to snapshot current appearance into an existing outfit slot
    function saveCurrentAppearanceToOutfit(id) {
        const outfits = getOutfits();
        const outfit = outfits.find(o => o.id === id);
        if (!outfit)
            return false;
        outfit.items = captureAppearance(outfit.includeRestraints);
        saveOutfits(outfits);
        localNotice(`Saved current look to "${outfit.displayName}".`);
        return true;
    }
    // Called from the drawer to create a brand new outfit from current appearance
    function createOutfitFromCurrent(command, displayName, announceText, includeRestraints) {
        const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
        if (!cmd || !displayName.trim())
            return null;
        // Block duplicate commands
        if (getOutfits().some(o => o.command === cmd)) {
            localNotice(`Command "/${cmd}" is already used by another outfit.`, "#ffb7c7");
            return null;
        }
        const outfit = {
            id: uid(),
            command: cmd,
            displayName: displayName.trim(),
            announceText: announceText.trim(),
            includeRestraints,
            items: captureAppearance(includeRestraints),
        };
        saveOutfits([...getOutfits(), outfit]);
        localNotice(`Created outfit "${outfit.displayName}" (/${outfit.command}).`);
        return outfit;
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
            localNotice(`Outfit "/${outfit.command}" has no saved appearance yet. Use the EBC drawer to save it.`, "#ffb7c7");
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

    /**
     * EmeryBC Drawer
     *
     * CRABS-inspired sliding panel aligned to the right edge of the chat log,
     * positioned 10% down from the top (just below CRABS's own tab).
     * Tabs: Outfits | Buttons
     *
     * UI pattern inspired by CRABS by Sin (https://github.com/sin-1337/CRABS).
     * Thank you Sin for the open design!
     */
    // -- Icon ----------------------------------------------------------------------
    const TAB_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 90 90">'
        + '<rect x="8" y="8" width="74" height="74" rx="18" fill="#2a1421" stroke="#cf6f98" stroke-width="4"/>'
        + '<path d="M28 30 L37 18 L45 31 L53 18 L62 30" fill="#cf6f98"/>'
        + '<circle cx="34" cy="43" r="4" fill="#f7e6ee"/>'
        + '<circle cx="56" cy="43" r="4" fill="#f7e6ee"/>'
        + '<path d="M38 56 Q45 63 52 56" stroke="#f7e6ee" stroke-width="4" fill="none" stroke-linecap="round"/>'
        + '</svg>';
    // -- Styles --------------------------------------------------------------------
    const CSS = `
#emerybc-drawer {
    position: fixed;
    z-index: 99;
    display: flex;
    align-items: flex-start;
    transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: transform;
    pointer-events: none;
    width: 260px;
}

#emerybc-drawer.ebc-closed { transform: translateX(calc(100% + 40px)); }
#emerybc-drawer.ebc-open   { transform: translateX(0); }

/* Tab button - sits at top: 10px, same as CRABS */
#ebc-tab {
    pointer-events: auto;
    width: 36px;
    height: 36px;
    background: rgba(42, 20, 33, 0.93);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(207, 111, 152, 0.45);
    border-right: none;
    border-radius: 8px 0 0 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: -3px 0 10px rgba(0,0,0,0.55);
    position: absolute;
    left: -36px;
    top: 10px;
    z-index: 99;
    transition: background 0.18s;
    flex-shrink: 0;
}

#ebc-tab:hover { background: rgba(76, 37, 55, 0.97); }

.ebc-panel {
    pointer-events: auto;
    background: rgba(27, 13, 23, 0.97);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-left: 2px solid #4c2537;
    display: flex;
    flex-direction: column;
    width: 260px;
    height: 100%;
    overflow: hidden;
    box-shadow: -4px 0 20px rgba(0,0,0,0.5);
}

/* -- Header -- */
.ebc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid #4c2537;
    background: rgba(36, 17, 29, 0.9);
    flex-shrink: 0;
    gap: 6px;
}

.ebc-title {
    font-family: "Trebuchet MS", serif;
    font-size: 12px;
    font-weight: bold;
    color: #cf6f98;
    letter-spacing: 0.07em;
    white-space: nowrap;
    flex: 1;
}

.ebc-header-btns { display: flex; gap: 4px; align-items: center; }

.ebc-icon-btn {
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #967281;
    cursor: pointer;
    padding: 2px 6px;
    font-size: 11px;
    line-height: 1.3;
    font-family: "Trebuchet MS", serif;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
}

.ebc-icon-btn:hover { background: #4c2537; color: #f7e6ee; border-color: #cf6f98; }

/* -- Tabs -- */
.ebc-tabs {
    display: flex;
    border-bottom: 1px solid #4c2537;
    flex-shrink: 0;
}

.ebc-tab-btn {
    flex: 1;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 0.06em;
    padding: 6px 0;
    transition: color 0.14s, border-color 0.14s;
}

.ebc-tab-btn:hover { color: #967281; }
.ebc-tab-btn.ebc-tab-active { color: #cf6f98; border-bottom-color: #cf6f98; }

/* -- Body -- */
.ebc-body {
    flex: 1;
    overflow-y: auto;
    padding: 7px;
    scrollbar-width: thin;
    scrollbar-color: #4c2537 transparent;
}

.ebc-body::-webkit-scrollbar { width: 4px; }
.ebc-body::-webkit-scrollbar-track { background: transparent; }
.ebc-body::-webkit-scrollbar-thumb { background: #4c2537; border-radius: 2px; }

/* -- Section label -- */
.ebc-section-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.1em;
    color: #553142;
    text-transform: uppercase;
    padding: 4px 4px 5px;
}

/* -- Outfit rows -- */
.ebc-outfit-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 7px;
    border-radius: 7px;
    margin-bottom: 4px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    transition: border-color 0.14s;
}

.ebc-outfit-row:hover { border-color: #6b3048; }

.ebc-outfit-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.ebc-outfit-name {
    font-family: "Trebuchet MS", serif;
    font-size: 12px;
    font-weight: bold;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-outfit-cmd {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #cf6f98;
}

.ebc-wear-btn {
    flex-shrink: 0;
    background: #2a1421;
    border: 1px solid #91405f;
    border-radius: 5px;
    color: #cf6f98;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    padding: 3px 8px;
    transition: background 0.14s, color 0.12s;
    white-space: nowrap;
}

.ebc-wear-btn:hover  { background: #91405f; color: #f7e6ee; }
.ebc-wear-btn:active { transform: scale(0.96); }
.ebc-wear-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.ebc-update-btn {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #7a4a5e;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 3px 6px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
}

.ebc-update-btn:hover    { background: #3a1928; color: #cf6f98; border-color: #7a4a5e; }
.ebc-update-btn:active   { transform: scale(0.96); }
.ebc-update-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* -- Empty -- */
.ebc-empty {
    color: #553142;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    text-align: center;
    padding: 16px 6px;
    line-height: 1.7;
}

/* -- Divider -- */
.ebc-divider { height: 1px; background: #2a1421; margin: 6px 0; }

/* -- New outfit toggle -- */
.ebc-new-outfit-btn {
    width: 100%;
    background: transparent;
    border: 1px dashed #4c2537;
    border-radius: 6px;
    color: #7a4a5e;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 5px 0;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    text-align: center;
}

.ebc-new-outfit-btn:hover { background: #2a1421; color: #cf6f98; border-color: #7a4a5e; border-style: solid; }

/* -- New outfit form -- */
.ebc-new-form {
    margin-top: 5px;
    display: none;
    flex-direction: column;
    gap: 5px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    border-radius: 7px;
    padding: 7px;
}

.ebc-form-row { display: flex; align-items: center; gap: 5px; }

.ebc-form-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #967281;
    white-space: nowrap;
    width: 58px;
    flex-shrink: 0;
}

.ebc-form-input {
    flex: 1;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #f7e6ee;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    padding: 3px 5px;
    min-width: 0;
    outline: none;
    transition: border-color 0.14s;
}

.ebc-form-input:focus { border-color: #cf6f98; }

.ebc-form-check-row {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
}

.ebc-form-check-row input[type="checkbox"] { accent-color: #cf6f98; }

.ebc-form-check-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #967281;
    cursor: pointer;
    user-select: none;
}

.ebc-create-btn {
    width: 100%;
    background: #2a1421;
    border: 1px solid #91405f;
    border-radius: 5px;
    color: #cf6f98;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    padding: 5px 0;
    margin-top: 2px;
    transition: background 0.14s, color 0.12s;
}

.ebc-create-btn:hover    { background: #91405f; color: #f7e6ee; }
.ebc-create-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* -- Button slot rows -- */
.ebc-slot-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 6px;
    border-radius: 7px;
    margin-bottom: 4px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
}

.ebc-slot-top {
    display: flex;
    align-items: center;
    gap: 4px;
}

.ebc-slot-bottom {
    display: flex;
    align-items: center;
    gap: 4px;
}

.ebc-slot-toggle {
    flex-shrink: 0;
    width: 26px;
    height: 22px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-slot-toggle.on { background: #6b3048; color: #f7e6ee; border-color: #cf6f98; }
.ebc-slot-toggle:hover { border-color: #7a4a5e; }

.ebc-slot-label {
    flex-shrink: 0;
    width: 52px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #f7e6ee;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    padding: 2px 4px;
    outline: none;
    transition: border-color 0.14s;
    text-transform: uppercase;
}

.ebc-slot-label:focus { border-color: #cf6f98; }

.ebc-slot-color {
    flex-shrink: 0;
    width: 28px;
    height: 22px;
    border-radius: 4px;
    border: 1px solid #4c2537;
    background: transparent;
    cursor: pointer;
    padding: 1px;
}

.ebc-slot-emote {
    flex: 1;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #cf6f98;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 2px 4px;
    outline: none;
    min-width: 0;
    transition: border-color 0.14s;
}

.ebc-slot-emote:focus { border-color: #cf6f98; }

.ebc-slot-del {
    flex-shrink: 0;
    width: 24px;
    height: 22px;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-slot-del:hover { background: #3a1017; color: #cf6f98; border-color: #7a4a5e; }

.ebc-slot-me-label {
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    color: #4c2537;
    white-space: nowrap;
    flex-shrink: 0;
}

/* -- Buttons tab footer -- */
.ebc-btn-footer {
    display: flex;
    gap: 5px;
    margin-top: 6px;
}

.ebc-btn-footer-btn {
    flex: 1;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #7a4a5e;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 5px 0;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-btn-footer-btn:hover { background: #2a1421; color: #cf6f98; border-color: #7a4a5e; }
.ebc-btn-footer-btn.save  { border-color: #91405f; color: #cf6f98; }
.ebc-btn-footer-btn.save:hover { background: #91405f; color: #f7e6ee; }
.ebc-btn-footer-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* -- Footer -- */
.ebc-footer {
    flex-shrink: 0;
    padding: 4px 10px;
    border-top: 1px solid #2a1421;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    color: #2a1421;
    text-align: center;
}
`;
    class EBCDrawer {
        constructor() {
            this.el = null;
            this.isOpen = false;
            this.currentTab = "outfits";
            this.resizeObserver = null;
            this.positioned = false;
            EBCDrawer._instance = this;
            if (document.body) {
                this.setup();
            }
            else {
                document.addEventListener("DOMContentLoaded", () => this.setup());
            }
        }
        // -- Setup -----------------------------------------------------------------
        setup() {
            if (this.el)
                return;
            this.injectStyles();
            const el = document.createElement("div");
            el.id = "emerybc-drawer";
            el.className = "ebc-closed";
            el.style.display = "none";
            el.style.right = "-9999px"; // off-screen until syncToChat gives real coords
            // Tab button (the little icon in the chat log margin)
            const tab = document.createElement("div");
            tab.id = "ebc-tab";
            tab.title = "EmeryBC";
            tab.innerHTML = TAB_ICON;
            el.appendChild(tab);
            // Panel
            const panel = document.createElement("div");
            panel.className = "ebc-panel";
            // Header
            const header = document.createElement("div");
            header.className = "ebc-header";
            const title = document.createElement("span");
            title.className = "ebc-title";
            title.textContent = "EmeryBC";
            const headerBtns = document.createElement("div");
            headerBtns.className = "ebc-header-btns";
            const refreshBtn = document.createElement("button");
            refreshBtn.className = "ebc-icon-btn";
            refreshBtn.title = "Refresh";
            refreshBtn.textContent = "R";
            const closeBtn = document.createElement("button");
            closeBtn.className = "ebc-icon-btn";
            closeBtn.title = "Close";
            closeBtn.textContent = "X";
            headerBtns.appendChild(refreshBtn);
            headerBtns.appendChild(closeBtn);
            header.appendChild(title);
            header.appendChild(headerBtns);
            // Tab bar
            const tabBar = document.createElement("div");
            tabBar.className = "ebc-tabs";
            const outfitTabBtn = document.createElement("button");
            outfitTabBtn.className = "ebc-tab-btn ebc-tab-active";
            outfitTabBtn.id = "ebc-tab-outfits";
            outfitTabBtn.textContent = "OUTFITS";
            const buttonsTabBtn = document.createElement("button");
            buttonsTabBtn.className = "ebc-tab-btn";
            buttonsTabBtn.id = "ebc-tab-buttons";
            buttonsTabBtn.textContent = "BUTTONS";
            tabBar.appendChild(outfitTabBtn);
            tabBar.appendChild(buttonsTabBtn);
            // Body
            const body = document.createElement("div");
            body.className = "ebc-body";
            body.id = "ebc-body";
            // Footer
            const footer = document.createElement("div");
            footer.className = "ebc-footer";
            footer.textContent = "UI inspired by CRABS by Sin";
            panel.appendChild(header);
            panel.appendChild(tabBar);
            panel.appendChild(body);
            panel.appendChild(footer);
            el.appendChild(panel);
            document.body.appendChild(el);
            this.el = el;
            // Events
            tab.addEventListener("click", () => this.toggle());
            closeBtn.addEventListener("click", () => this.close());
            refreshBtn.addEventListener("click", () => this.renderCurrentTab());
            outfitTabBtn.addEventListener("click", () => this.switchTab("outfits"));
            buttonsTabBtn.addEventListener("click", () => this.switchTab("buttons"));
            document.addEventListener("keydown", (e) => {
                if (e.key === "Escape" && this.isOpen)
                    this.close();
            });
        }
        injectStyles() {
            if (document.getElementById("emerybc-drawer-css"))
                return;
            const s = document.createElement("style");
            s.id = "emerybc-drawer-css";
            s.textContent = CSS;
            document.head.appendChild(s);
        }
        // -- Positioning -----------------------------------------------------------
        // Aligned to the right edge of TextAreaChatLog, 10% down from the top.
        // This places our tab just below CRABS's tab.
        syncToChat() {
            const chatLog = document.getElementById("TextAreaChatLog");
            if (!chatLog || !this.el)
                return false;
            const rect = chatLog.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0)
                return false;
            const topOffset = rect.height * 0.10;
            this.el.style.top = `${rect.top + topOffset}px`;
            this.el.style.right = `${document.documentElement.clientWidth - rect.right}px`;
            this.el.style.height = `${rect.height - topOffset}px`;
            this.positioned = true;
            return true;
        }
        // -- Visibility ------------------------------------------------------------
        updateVisibility() {
            var _a;
            if (!this.el)
                return;
            const inRoom = typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatRoom";
            if (!inRoom) {
                this.el.style.display = "none";
                this.isOpen = false;
                this.el.className = "ebc-closed";
                this.positioned = false;
                (_a = this.resizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
                this.resizeObserver = null;
                return;
            }
            // Try to position; if the chat log isn't laid out yet, retry next frame
            const synced = this.syncToChat();
            if (synced) {
                this.el.style.display = "flex";
            }
            else {
                requestAnimationFrame(() => {
                    if (this.syncToChat() && this.el) {
                        this.el.style.display = "flex";
                    }
                });
            }
            if (!this.resizeObserver && typeof ResizeObserver !== "undefined") {
                const chatLog = document.getElementById("TextAreaChatLog");
                if (chatLog) {
                    this.resizeObserver = new ResizeObserver(() => this.syncToChat());
                    this.resizeObserver.observe(chatLog);
                }
            }
        }
        // -- Tab switching ---------------------------------------------------------
        switchTab(tab) {
            var _a, _b;
            this.currentTab = tab;
            const outfitBtn = (_a = this.el) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-tab-outfits");
            const buttonBtn = (_b = this.el) === null || _b === void 0 ? void 0 : _b.querySelector("#ebc-tab-buttons");
            if (outfitBtn)
                outfitBtn.className = "ebc-tab-btn" + (tab === "outfits" ? " ebc-tab-active" : "");
            if (buttonBtn)
                buttonBtn.className = "ebc-tab-btn" + (tab === "buttons" ? " ebc-tab-active" : "");
            this.renderCurrentTab();
        }
        renderCurrentTab() {
            if (this.currentTab === "outfits") {
                this.renderOutfits();
            }
            else {
                this.renderButtons();
            }
        }
        // -- Outfits tab -----------------------------------------------------------
        renderOutfits() {
            var _a;
            const body = (_a = this.el) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-body");
            if (!body)
                return;
            while (body.firstChild)
                body.removeChild(body.firstChild);
            const outfits = getOutfits();
            if (outfits.length > 0) {
                const lbl = document.createElement("div");
                lbl.className = "ebc-section-label";
                lbl.textContent = "Saved Outfits";
                body.appendChild(lbl);
                for (const o of outfits) {
                    body.appendChild(this.buildOutfitRow(o, body));
                }
            }
            else {
                const empty = document.createElement("div");
                empty.className = "ebc-empty";
                empty.textContent = "No outfits saved yet.";
                const br = document.createElement("br");
                const hint = document.createElement("span");
                hint.style.color = "#4c2537";
                hint.textContent = "Use the form below to create one.";
                empty.appendChild(br);
                empty.appendChild(hint);
                body.appendChild(empty);
            }
            this.buildNewOutfitSection(body);
        }
        buildOutfitRow(o, body) {
            const row = document.createElement("div");
            row.className = "ebc-outfit-row";
            const info = document.createElement("div");
            info.className = "ebc-outfit-info";
            const nameEl = document.createElement("span");
            nameEl.className = "ebc-outfit-name";
            nameEl.textContent = o.displayName;
            const cmdEl = document.createElement("span");
            cmdEl.className = "ebc-outfit-cmd";
            cmdEl.textContent = "/" + o.command;
            info.appendChild(nameEl);
            info.appendChild(cmdEl);
            const updateBtn = document.createElement("button");
            updateBtn.className = "ebc-update-btn";
            updateBtn.textContent = "Update";
            updateBtn.title = "Save current appearance to this outfit";
            const wearBtn = document.createElement("button");
            wearBtn.className = "ebc-wear-btn";
            wearBtn.textContent = "Wear";
            row.appendChild(info);
            row.appendChild(updateBtn);
            row.appendChild(wearBtn);
            const setAllDisabled = (v) => {
                body.querySelectorAll(".ebc-wear-btn, .ebc-update-btn").forEach(b => { b.disabled = v; });
            };
            wearBtn.addEventListener("click", () => {
                const fresh = getOutfits().find(x => x.id === o.id);
                if (!fresh)
                    return;
                setAllDisabled(true);
                applyOutfit(fresh);
                window.setTimeout(() => setAllDisabled(false), 500);
            });
            updateBtn.addEventListener("click", () => {
                setAllDisabled(true);
                const ok = saveCurrentAppearanceToOutfit(o.id);
                if (!ok) {
                    setAllDisabled(false);
                    return;
                }
                updateBtn.textContent = "Saved!";
                window.setTimeout(() => {
                    updateBtn.textContent = "Update";
                    setAllDisabled(false);
                }, 1200);
            });
            return row;
        }
        buildNewOutfitSection(body) {
            const div = document.createElement("div");
            div.className = "ebc-divider";
            body.appendChild(div);
            const newBtn = document.createElement("button");
            newBtn.className = "ebc-new-outfit-btn";
            newBtn.textContent = "+ New Outfit from Current Look";
            body.appendChild(newBtn);
            const form = document.createElement("div");
            form.className = "ebc-new-form";
            body.appendChild(form);
            const makeRow = (labelText, input) => {
                const row = document.createElement("div");
                row.className = "ebc-form-row";
                const lbl = document.createElement("span");
                lbl.className = "ebc-form-label";
                lbl.textContent = labelText;
                row.appendChild(lbl);
                row.appendChild(input);
                return row;
            };
            const cmdInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "e.g. dom", maxLength: 20,
            });
            const nameInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "e.g. Dom Clothes", maxLength: 40,
            });
            const announceInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "e.g. changes into dom mode", maxLength: 120,
            });
            form.appendChild(makeRow("Command", cmdInput));
            form.appendChild(makeRow("Name", nameInput));
            form.appendChild(makeRow("Announce", announceInput));
            const checkRow = document.createElement("label");
            checkRow.className = "ebc-form-check-row";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            const checkLbl = document.createElement("span");
            checkLbl.className = "ebc-form-check-label";
            checkLbl.textContent = "Include restraints";
            checkRow.appendChild(checkbox);
            checkRow.appendChild(checkLbl);
            form.appendChild(checkRow);
            const createBtn = document.createElement("button");
            createBtn.className = "ebc-create-btn";
            createBtn.textContent = "Save as New Outfit";
            form.appendChild(createBtn);
            newBtn.addEventListener("click", () => {
                const open = form.style.display !== "none";
                form.style.display = open ? "none" : "flex";
                newBtn.textContent = open ? "+ New Outfit from Current Look" : "- Cancel";
                if (!open)
                    cmdInput.focus();
            });
            createBtn.addEventListener("click", () => {
                cmdInput.style.borderColor = cmdInput.value.trim() ? "" : "#cf6f98";
                nameInput.style.borderColor = nameInput.value.trim() ? "" : "#cf6f98";
                if (!cmdInput.value.trim() || !nameInput.value.trim())
                    return;
                createBtn.disabled = true;
                createBtn.textContent = "Saving...";
                const result = createOutfitFromCurrent(cmdInput.value, nameInput.value, announceInput.value, checkbox.checked);
                if (result) {
                    cmdInput.value = "";
                    nameInput.value = "";
                    announceInput.value = "";
                    checkbox.checked = false;
                    form.style.display = "none";
                    newBtn.textContent = "+ New Outfit from Current Look";
                    this.renderOutfits();
                }
                else {
                    createBtn.disabled = false;
                    createBtn.textContent = "Save as New Outfit";
                }
            });
        }
        // -- Buttons tab -----------------------------------------------------------
        renderButtons() {
            var _a;
            const body = (_a = this.el) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-body");
            if (!body)
                return;
            while (body.firstChild)
                body.removeChild(body.firstChild);
            // Working copies so we don't mutate storage until Save is clicked
            let btns = getButtons().map(b => (Object.assign({}, b)));
            let slotCount = getSlotCount();
            // Ensure array has slotCount entries
            while (btns.length < slotCount) {
                btns.push({ label: "", emote: "", color: "#c2185b", enabled: false });
            }
            const lbl = document.createElement("div");
            lbl.className = "ebc-section-label";
            lbl.textContent = "Quick Action Buttons";
            body.appendChild(lbl);
            const slotList = document.createElement("div");
            slotList.id = "ebc-slot-list";
            body.appendChild(slotList);
            const renderSlots = () => {
                var _a;
                while (slotList.firstChild)
                    slotList.removeChild(slotList.firstChild);
                for (let i = 0; i < slotCount; i++) {
                    const btn = (_a = btns[i]) !== null && _a !== void 0 ? _a : { label: "", emote: "", color: "#c2185b", enabled: false };
                    const row = document.createElement("div");
                    row.className = "ebc-slot-row";
                    // Top line: toggle | label input | color picker | del
                    const topLine = document.createElement("div");
                    topLine.className = "ebc-slot-top";
                    const toggle = document.createElement("button");
                    toggle.className = "ebc-slot-toggle" + (btn.enabled ? " on" : "");
                    toggle.textContent = btn.enabled ? "ON" : "OFF";
                    toggle.title = btn.enabled ? "Click to disable" : "Click to enable";
                    const labelInp = document.createElement("input");
                    labelInp.className = "ebc-slot-label";
                    labelInp.type = "text";
                    labelInp.maxLength = 6;
                    labelInp.placeholder = "Label";
                    labelInp.value = btn.label;
                    labelInp.title = "Button label (max 6 chars)";
                    const colorInp = document.createElement("input");
                    colorInp.className = "ebc-slot-color";
                    colorInp.type = "color";
                    colorInp.value = normalizeHex(btn.color);
                    colorInp.title = "Button color";
                    const delBtn = document.createElement("button");
                    delBtn.className = "ebc-slot-del";
                    delBtn.textContent = "x";
                    delBtn.title = "Remove this slot";
                    topLine.appendChild(toggle);
                    topLine.appendChild(labelInp);
                    topLine.appendChild(colorInp);
                    topLine.appendChild(delBtn);
                    // Bottom line: /me prefix | emote input
                    const botLine = document.createElement("div");
                    botLine.className = "ebc-slot-bottom";
                    const meLbl = document.createElement("span");
                    meLbl.className = "ebc-slot-me-label";
                    meLbl.textContent = "/me";
                    const emoteInp = document.createElement("input");
                    emoteInp.className = "ebc-slot-emote";
                    emoteInp.type = "text";
                    emoteInp.maxLength = 120;
                    emoteInp.placeholder = "e.g. nods.";
                    emoteInp.value = btn.emote;
                    emoteInp.title = "Emote text sent as (Name text)";
                    botLine.appendChild(meLbl);
                    botLine.appendChild(emoteInp);
                    row.appendChild(topLine);
                    row.appendChild(botLine);
                    slotList.appendChild(row);
                    // -- Events (capture i) --
                    const idx = i;
                    toggle.addEventListener("click", () => {
                        btns[idx].enabled = !btns[idx].enabled;
                        toggle.className = "ebc-slot-toggle" + (btns[idx].enabled ? " on" : "");
                        toggle.textContent = btns[idx].enabled ? "ON" : "OFF";
                    });
                    labelInp.addEventListener("input", () => {
                        btns[idx].label = labelInp.value.trim().slice(0, 6);
                    });
                    colorInp.addEventListener("input", () => {
                        btns[idx].color = normalizeHex(colorInp.value);
                    });
                    emoteInp.addEventListener("input", () => {
                        btns[idx].emote = emoteInp.value;
                    });
                    delBtn.addEventListener("click", () => {
                        btns.splice(idx, 1);
                        btns.push({ label: "", emote: "", color: "#c2185b", enabled: false });
                        slotCount = Math.max(1, slotCount - 1);
                        renderSlots();
                        updateFooterState();
                    });
                }
            };
            renderSlots();
            // Footer buttons
            const footer = document.createElement("div");
            footer.className = "ebc-btn-footer";
            const addBtn = document.createElement("button");
            addBtn.className = "ebc-btn-footer-btn";
            addBtn.textContent = `+ Add (${slotCount}/${ABSOLUTE_MAX})`;
            const saveBtn = document.createElement("button");
            saveBtn.className = "ebc-btn-footer-btn save";
            saveBtn.textContent = "Save";
            const resetBtn = document.createElement("button");
            resetBtn.className = "ebc-btn-footer-btn";
            resetBtn.textContent = "Reset";
            resetBtn.title = "Reset to defaults";
            footer.appendChild(addBtn);
            footer.appendChild(saveBtn);
            footer.appendChild(resetBtn);
            body.appendChild(footer);
            const updateFooterState = () => {
                addBtn.disabled = slotCount >= ABSOLUTE_MAX;
                addBtn.textContent = `+ Add (${slotCount}/${ABSOLUTE_MAX})`;
            };
            updateFooterState();
            addBtn.addEventListener("click", () => {
                if (slotCount >= ABSOLUTE_MAX)
                    return;
                slotCount++;
                renderSlots();
                updateFooterState();
                // Scroll to bottom so new slot is visible
                body.scrollTop = body.scrollHeight;
            });
            saveBtn.addEventListener("click", () => {
                // Flush any partially typed values from inputs before saving
                const rows = slotList.querySelectorAll(".ebc-slot-row");
                rows.forEach((row, i) => {
                    const lInp = row.querySelector(".ebc-slot-label");
                    const cInp = row.querySelector(".ebc-slot-color");
                    const eInp = row.querySelector(".ebc-slot-emote");
                    if (lInp)
                        btns[i].label = lInp.value.trim().slice(0, 6);
                    if (cInp)
                        btns[i].color = normalizeHex(cInp.value);
                    if (eInp)
                        btns[i].emote = eInp.value;
                });
                saveButtons([...btns], slotCount);
                saveBtn.textContent = "Saved!";
                window.setTimeout(() => { saveBtn.textContent = "Save"; }, 1200);
            });
            resetBtn.addEventListener("click", () => {
                btns = DEFAULT_BUTTONS.map(b => (Object.assign({}, b)));
                slotCount = DEFAULT_BUTTONS.length;
                saveButtons([...btns], slotCount);
                renderSlots();
                updateFooterState();
            });
        }
        // -- Open / Close / Toggle -------------------------------------------------
        toggle() { this.isOpen ? this.close() : this.open(); }
        open() {
            if (!this.el)
                return;
            this.isOpen = true;
            this.el.className = "ebc-open";
            if (!this.positioned)
                this.syncToChat();
            this.renderCurrentTab();
        }
        close() {
            if (!this.el)
                return;
            this.isOpen = false;
            this.el.className = "ebc-closed";
        }
        // -- Lifecycle -------------------------------------------------------------
        destroy() {
            var _a, _b;
            (_a = this.resizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
            (_b = this.el) === null || _b === void 0 ? void 0 : _b.remove();
            this.el = null;
            EBCDrawer._instance = null;
        }
        static getInstance() {
            return EBCDrawer._instance;
        }
    }
    EBCDrawer._instance = null;

    const MOD_NAME = "EmeryBC";
    const MOD_VERSION = "0.1.34";
    let noticeShown = false;
    const CHANGELOG = [
        {
            version: "0.1.34",
            changes: [
                "/ebc release and /ebc unlock now also skip family padlocks (OwnerPadlock, LoverPadlock, FamilyPadlock, etc.).",
            ],
        },
        {
            version: "0.1.33",
            changes: [
                "Removed Extensions/Preferences settings screen - all management now lives in the EBC drawer.",
                "Drawer now has two tabs: Outfits and Buttons.",
                "Buttons tab: inline DOM editor for all action button slots (toggle, label, color, emote, delete, add, save).",
                "Drawer positioned to match CRABS x-alignment, 10% down from chat log top.",
                "Hamburger collapse chip restored to original simple - / + style.",
                "Added /ebc unlock command - removes all non-owner/lover locks from your items.",
            ],
        },
        {
            version: "0.1.32",
            changes: [
                "Fixed action emotes - name now appears correctly as (Name emotes.) using proper BC dictionary tag lookup.",
                "Fixed outfit announce text with same name-substitution fix.",
                "Re-added hamburger collapse toggle chip above sidebar action buttons.",
                "Drawer tab now sits just below CRABS's tab (50px offset from chat log top).",
                "Fixed drawer appearing in the middle of the screen on first room join.",
                "Drawer: added Update button on each outfit row to snapshot current look.",
                "Drawer: added New Outfit inline form with command, name, announce, and restraints toggle.",
            ],
        },
        {
            version: "0.1.31",
            changes: [
                "Removed all non-ASCII characters from source files and bundle to fix Tampermonkey internal error on load.",
                "Action type dictionary poison now uses String.fromCharCode(0x200C) instead of embedded Unicode.",
                "Drawer HTML built imperatively to avoid any template literal encoding issues.",
            ],
        },
        {
            version: "0.1.30",
            changes: [
                "Fixed potential crash: drawer initialisation is now wrapped in try/catch so a DOM error can no longer prevent the rest of the addon from loading.",
                "Drawer DOM queries use safe optional chaining instead of hard assertions.",
            ],
        },
        {
            version: "0.1.29",
            changes: [
                "Restored canvas sidebar action buttons alongside the drawer.",
                "Action buttons now send as (Name action.) using the MBCHC Action type trick instead of * emote *.",
                "Outfit announce text also uses Action type for consistent formatting.",
                "Drawer repositioned to the lower 40% of the chat log and now shows outfit switcher.",
                "Drawer outfit panel: one-click Wear buttons for all saved outfits.",
            ],
        },
        {
            version: "0.1.28",
            changes: [
                "Replaced canvas sidebar action buttons with a CRABS-inspired DOM drawer.",
                "A small EmeryBC icon tab sits beside the chat log - click it to expand your action buttons.",
                "Drawer auto-hides when leaving the chat room and never overlaps the map UI.",
                "Added credit to Sin / CRABS in the README and drawer footer.",
            ],
        },
        {
            version: "0.1.27",
            changes: [
                "Action buttons now collapse behind a small toggle chip (-) to avoid overlapping map build UI.",
                "Click the chip to expand/collapse the button panel at any time.",
            ],
        },
        {
            version: "0.1.26",
            changes: [
                "/ebc release now skips items locked with owner or lover locks, and reports how many were skipped.",
            ],
        },
        {
            version: "0.1.25",
            changes: [
                "Fixed /ebc release - now calls ChatRoomCharacterUpdate so the restraint removal is visible to all room members.",
            ],
        },
        {
            version: "0.1.24",
            changes: [
                "Added /ebc release (alias: /ebc free) - removes all restraints from yourself instantly.",
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
                "Stripped version line from EBC badge - now just a small subtle EBC chip.",
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
                "Removed login screen popup - no more dialog on startup.",
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
                "Fixed outfit page row and editor overlaps - labels, inputs and buttons no longer stack on each other.",
                "Action buttons now use Type:Action so they show as (Name text.) instead of * Name text *.",
                "Default action emotes updated to match the new format.",
                "EBC overhead badge made smaller and drops the version line.",
                "Outfit notice messages bumped to 12px to match other log messages.",
            ],
        },
        {
            version: "0.1.8",
            changes: [
                "Fixed EBC badge visibility - now uses OnlineSharedSettings so all room members can see it.",
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
    function isProtectedLock(item) {
        var _a, _b;
        const lock = ((_b = (_a = item.Property) === null || _a === void 0 ? void 0 : _a.LockedBy) !== null && _b !== void 0 ? _b : "").toLowerCase();
        if (!lock)
            return false;
        return lock.includes("owner") || lock.includes("lover") || lock.includes("family");
    }
    function releaseRestraints() {
        const toRemove = Player.Appearance.filter(item => item.Asset.Group.IsRestraint && !isProtectedLock(item));
        const skipped = Player.Appearance.filter(item => item.Asset.Group.IsRestraint && isProtectedLock(item));
        if (toRemove.length === 0) {
            if (skipped.length > 0) {
                appendLocalLogLine(`[EmeryBC] All restraints are owner/lover locked - none removed.`, UI.textMuted);
            }
            else {
                appendLocalLogLine("[EmeryBC] No restraints found to remove.", UI.textMuted);
            }
            return;
        }
        for (const item of toRemove) {
            InventoryRemove(Player, item.Asset.Group.Name, false);
        }
        if (skipped.length > 0) {
            appendLocalLogLine(`[EmeryBC] Skipped ${skipped.length} owner/lover locked item(s).`, UI.textMuted);
        }
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
        appendLocalLogLine(`[EmeryBC] Released ${toRemove.length} restraint(s).`, UI.gold);
    }
    function unlockItems() {
        var _a;
        let unlocked = 0;
        let skipped = 0;
        for (const item of Player.Appearance) {
            const lock = (_a = item.Property) === null || _a === void 0 ? void 0 : _a.LockedBy;
            if (!lock)
                continue;
            if (isProtectedLock(item)) {
                skipped++;
                continue;
            }
            // Strip all lock-related data from the item
            if (item.Property) {
                delete item.Property["LockedBy"];
                delete item.Property["LockMemberNumber"];
                delete item.Property["CombinationNumber"];
                delete item.Property["Password"];
                delete item.Property["MemberNumberListKeys"];
                delete item.Property["RemoveItem"];
                delete item.Property["ShowTimer"];
                delete item.Property["EnableRandomInput"];
            }
            unlocked++;
        }
        if (unlocked === 0) {
            const msg = skipped > 0
                ? `[EmeryBC] All locks are owner/lover protected - none removed.`
                : `[EmeryBC] No locks found to remove.`;
            appendLocalLogLine(msg, UI.textMuted);
            return;
        }
        if (skipped > 0) {
            appendLocalLogLine(`[EmeryBC] Skipped ${skipped} owner/lover lock(s).`, UI.textMuted);
        }
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
        appendLocalLogLine(`[EmeryBC] Removed ${unlocked} lock(s).`, UI.gold);
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
        if (subcommand === "unlock") {
            unlockItems();
            return true;
        }
        appendLocalLogLine("[EmeryBC] Commands: /ebc version  |  /ebc changelog  |  /ebc release  |  /ebc unlock", UI.gold);
        return true;
    }
    function getSharedPresence(character) {
        var _a, _b;
        if (!character)
            return null;
        // OnlineSharedSettings are broadcast to all room members via ChatRoomSync
        // and CharacterUpdate - this is the reliable cross-client path.
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
        // Write to OnlineSharedSettings - this IS broadcast to all room members
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
        appendLocalLogLine(`- EmeryBC v${MOD_VERSION} loaded successfully.`);
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
        // Canvas sidebar action buttons
        modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
            next(args);
            try {
                drawActionButtons();
            }
            catch ( /* ignore */_a) { /* ignore */ }
        });
        modAPI.hookFunction("ChatRoomClick", 3, (args, next) => {
            try {
                if (handleActionButtonClick())
                    return;
            }
            catch ( /* ignore */_a) { /* ignore */ }
            return next(args);
        });
        // DOM drawer - outfit switcher panel beside the chat log
        let drawer = null;
        try {
            drawer = new EBCDrawer();
        }
        catch (err) {
            console.warn("[EmeryBC] Drawer failed to initialise:", err);
        }
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
            catch ( /* ignore */_a) { /* ignore */ }
            try {
                showRoomLoadNotice();
            }
            catch ( /* ignore */_b) { /* ignore */ }
            try {
                drawer === null || drawer === void 0 ? void 0 : drawer.updateVisibility();
            }
            catch ( /* ignore */_c) { /* ignore */ }
            return result;
        });
        // Keep drawer visibility in sync whenever the BC screen changes
        tryHookFunction(modAPI, "CommonSetScreen", 3, (args, next) => {
            const result = next(args);
            try {
                drawer === null || drawer === void 0 ? void 0 : drawer.updateVisibility();
            }
            catch ( /* ignore */_a) { /* ignore */ }
            return result;
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
