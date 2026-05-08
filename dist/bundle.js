(function () {
    'use strict';

    const UI = {
        panelEdge: "#4c2537",
        cardMuted: "#190b13",
        textMuted: "#cbaab7",
        accent: "#cf6f98",
        accentDeep: "#91405f",
        accentSoft: "#5b2439",
        gold: "#c9ab72"};

    // Action buttons drawn in the chatroom sidebar below BCAR's buttons.
    const DEFAULT_BUTTONS = [
        { label: "NOD", emote: "nods.", color: "#c2185b", enabled: true, style: "action" },
        { label: "SHAKE", emote: "shakes their head.", color: "#c2185b", enabled: true, style: "action" },
        { label: "WAVE", emote: "waves.", color: "#c2185b", enabled: true, style: "action" },
        { label: "CHEER", emote: "cheers!", color: "#c2185b", enabled: true, style: "action" },
        { label: "POUT", emote: "pouts.", color: "#c2185b", enabled: true, style: "emote" },
        { label: "GIGGLE", emote: "giggles.", color: "#c2185b", enabled: true, style: "emote" },
        { label: "", emote: "", color: "#c2185b", enabled: false, style: "action" },
    ];
    const ABSOLUTE_MAX = 12;
    const DEFAULT_SLOTS = DEFAULT_BUTTONS.length;
    // --- Storage -----------------------------------------------------------------
    function getStore$7() {
        if (!Player.ExtensionSettings.EmeryBC)
            Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC;
    }
    function getButtons() {
        const stored = getStore$7().actionButtons;
        return Array.isArray(stored) ? stored : DEFAULT_BUTTONS;
    }
    function getSlotCount() {
        const store = getStore$7();
        const n = store.actionSlotCount;
        if (typeof n === "number")
            return Math.min(ABSOLUTE_MAX, Math.max(1, n));
        const buttons = getButtons();
        return Math.min(ABSOLUTE_MAX, Math.max(DEFAULT_SLOTS, buttons.length));
    }
    function saveButtons(buttons, slotCount) {
        const store = getStore$7();
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
    // --- Display name helper -----------------------------------------------------
    function getDisplayName() {
        // CharacterNickname is a BC global not always in the type declarations
        const nickFn = window.CharacterNickname;
        if (typeof nickFn === "function")
            return nickFn(Player);
        return Player.Nickname || Player.Name || "Player";
    }
    // --- Sequence runner ----------------------------------------------------------
    // Sequence steps are pipe-separated (|). Each step is one of:
    //   PoseName   – set BC pose (e.g. "HandsUp", "Yoked")
    //   _          – clear all active poses back to neutral
    //   !text      – send as (Name text) action message
    //   *text      – send as * Name text * emote message
    // Steps run 500 ms apart. Original poses are restored when done.
    let seqRunning = false;
    // Sends the current ActivePose to the room without triggering a full re-render on each step.
    // appearanceBundle should be pre-built once before the sequence starts and reused — sending
    // a freshly built bundle every 600ms causes other clients to fully re-render the avatar each
    // time, which looks like flickering/glitching.
    function sendPoseUpdate(appearanceBundle) {
        const activePose = (Player.ActivePose && Player.ActivePose.length > 0)
            ? Player.ActivePose
            : null;
        try {
            if (Player.OnlineID != null) {
                ServerSend("ChatRoomCharacterUpdate", {
                    ID: Player.OnlineID,
                    ActivePose: activePose,
                    Appearance: appearanceBundle,
                });
            }
        }
        catch (_) { }
    }
    function syncPoseToRoom() {
        // Used for one-shot pose syncs (outside of sequences).
        // Capture desired pose BEFORE CharacterRefresh — BC may re-apply item-forced poses
        // during refresh and override what we just set.
        const activePose = (Player.ActivePose && Player.ActivePose.length > 0)
            ? Player.ActivePose
            : null;
        try {
            if (Player.OnlineID != null) {
                ServerSend("ChatRoomCharacterUpdate", {
                    ID: Player.OnlineID,
                    ActivePose: activePose,
                    Appearance: ServerAppearanceBundle(Player.Appearance),
                });
            }
        }
        catch (_) { }
        try {
            CharacterRefresh(Player, false, false);
        }
        catch (_) { }
    }
    // Parses a single raw step token (may have @NNN suffix) into {content, delay}.
    // E.g. "!waves.@1000" -> { content: "!waves.", delay: 1000 }
    //      "HandsUp"      -> { content: "HandsUp", delay: defaultStepMs }
    function parseStep(raw, defaultStepMs) {
        const atIdx = raw.lastIndexOf("@");
        if (atIdx > 0) {
            const maybeMs = raw.slice(atIdx + 1);
            const ms = parseInt(maybeMs, 10);
            if (!isNaN(ms) && ms >= 0 && String(ms) === maybeMs) {
                return { content: raw.slice(0, atIdx), delay: ms };
            }
        }
        return { content: raw, delay: defaultStepMs };
    }
    function runSequence(sequence, defaultStepMs = 600) {
        if (seqRunning)
            return;
        const rawSteps = sequence.split("|").map(s => s.trim()).filter(Boolean);
        if (!rawSteps.length)
            return;
        // Parse each step: strip @NNN suffix for per-step delay, keep content.
        const steps = rawSteps.map(r => parseStep(r, defaultStepMs));
        seqRunning = true;
        // null means "no pose / neutral" in BC — store as null so we restore correctly.
        const originalPoses = (Player.ActivePose && Player.ActivePose.length > 0)
            ? [...Player.ActivePose]
            : null;
        // Build appearance bundle ONCE — reusing it avoids re-render flicker on other clients.
        const appearanceBundle = ServerAppearanceBundle(Player.Appearance);
        let idx = 0;
        const next = () => {
            try {
                if (idx >= steps.length) {
                    // Sequence done — restore original pose, do a full sync + local refresh.
                    Player.ActivePose = originalPoses;
                    syncPoseToRoom();
                    seqRunning = false;
                    return;
                }
                const { content: step, delay } = steps[idx++];
                if (step === "_") {
                    Player.ActivePose = originalPoses;
                    sendPoseUpdate(appearanceBundle);
                }
                else if (step.startsWith("!")) {
                    sendAction(step.slice(1), "action");
                }
                else if (step.startsWith("*")) {
                    sendAction(step.slice(1), "emote");
                }
                else {
                    Player.ActivePose = [step];
                    sendPoseUpdate(appearanceBundle);
                }
                window.setTimeout(next, delay);
            }
            catch (_) {
                seqRunning = false;
            }
        };
        next();
    }
    // --- Label-based animation triggers ------------------------------------------
    // If a button's label matches one of these (case-insensitive), the matching
    // animation plays automatically alongside the normal message. Completely hidden
    // from the user — the emote field is just normal text.
    function isArmRestrained() {
        // Only ItemArms covers actual binding restraints (armbinders, straitjackets, etc.).
        // ItemHands covers paws/mittens/gloves which don't lock arm movement, so we skip it.
        return Player.Appearance.some(item => item.Asset.Group.Name === "ItemArms");
    }
    function localNotice$2(msg) {
        const log = document.getElementById("TextAreaChatLog");
        if (!log)
            return;
        const div = document.createElement("div");
        div.style.cssText = [
            `color:${UI.accent}`,
            `background:${UI.cardMuted}`,
            `border-left:3px solid ${UI.accent}`,
            "font-style:italic",
            "font-size:12px",
            "padding:2px 8px",
            "margin:1px 0",
        ].join(";");
        div.textContent = "[EmeryBC] " + msg;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }
    // Returns true if the animation ran (or will run), false if it was blocked.
    function runCheerAnimation() {
        if (isArmRestrained()) {
            localNotice$2("Your arms are restrained — can't cheer right now!");
            return false;
        }
        // Yoked (arms out) -> OverTheHead (arms fully above head) -> repeat -> neutral
        runSequence("Yoked|OverTheHead|Yoked|OverTheHead|Yoked|OverTheHead|_", 600);
        return true;
    }
    const LABEL_ANIMATIONS = new Map([
        ["CHEER", runCheerAnimation],
        ["CHEERS", runCheerAnimation],
    ]);
    // Returns false if an animation was attempted but blocked — caller should suppress the chat message.
    // Returns true if the animation ran fine, or if there is no animation for this label.
    function triggerLabelAnimation(label) {
        const fn = LABEL_ANIMATIONS.get(label.toUpperCase().trim());
        if (!fn)
            return true; // no animation for this label, proceed normally
        return fn();
    }
    // --- Send chat message --------------------------------------------------------
    // "action" -> (Name text)   "emote" -> * Name text *   "seq" -> runSequence
    function sendAction(emote, style = "action") {
        const text = emote.trim();
        if (!text)
            return;
        if (style === "seq") {
            runSequence(text);
            return;
        }
        if (style === "emote") {
            // BC natively formats Emote as:  * Name text *
            ServerSend("ChatRoomChat", { Type: "Emote", Content: text, Dictionary: [] });
            return;
        }
        // Action style: (Name text)
        // BC can't find the key in Interface.csv so it prepends "MISSING TEXT IN "Interface.csv": ".
        // We include the player's name directly in Content, then use the poison tag to strip the prefix,
        // leaving only the zero-width char + text so it renders as  (​Name text).
        ServerSend("ChatRoomChat", {
            Type: "Action",
            Content: getDisplayName() + " " + text,
            Dictionary: [
                { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                { SourceCharacter: Player.MemberNumber },
            ],
        });
    }
    // --- In-game sidebar ---------------------------------------------------------
    const BTN_X = 0;
    const BTN_START_Y = 320;
    const BTN_SIZE = 45;
    // Collapse toggle - shorter than action buttons so it reads as a control, not a content button
    const CHIP_X = 0;
    const CHIP_Y = 270;
    const CHIP_W = 45;
    const CHIP_H = 28;
    let sidebarCollapsed = false;
    function drawActionButtons() {
        if (CurrentScreen !== "ChatRoom")
            return;
        DrawButton(CHIP_X, CHIP_Y, CHIP_W, CHIP_H, sidebarCollapsed ? "+" : "=", sidebarCollapsed ? UI.accentDeep : UI.accentSoft, "", sidebarCollapsed ? "Show quick actions" : "Hide quick actions");
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
        var _a;
        if (CurrentScreen !== "ChatRoom")
            return false;
        // Collapse toggle
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
                // Check animation first — if it's blocked, suppress the chat message too.
                const animOk = triggerLabelAnimation(btn.label);
                if (animOk)
                    sendAction(btn.emote, (_a = btn.style) !== null && _a !== void 0 ? _a : "action");
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
    function getAddon$1() {
        if (!Player.ExtensionSettings.EmeryBC) {
            Player.ExtensionSettings.EmeryBC = {};
        }
        return Player.ExtensionSettings.EmeryBC;
    }
    function loadOutfitsFromSettings() {
        const list = getAddon$1().outfits;
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
        getAddon$1().outfits = sanitized;
        ServerPlayerExtensionSettingsSync("EmeryBC");
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
            // Default true (preserve) for existing outfits that don't have this field yet
            preserveRestraints: typeof outfit.preserveRestraints === "boolean" ? outfit.preserveRestraints : true,
            // Default false — opt-in; restraints-only imports set this to true automatically
            preserveClothing: typeof outfit.preserveClothing === "boolean" ? outfit.preserveClothing : false,
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
            localNotice$1("An outfit swap is already in progress.", "#ffb7c7");
            return;
        }
        outfitApplyPending = true;
        const nextAppearance = [];
        const outfitGroups = new Set(outfit.items.map(i => i.Group));
        // If preserveClothing is on, carry over all current non-restraint items —
        // but skip any group the outfit itself provides (no conflicts).
        if (outfit.preserveClothing) {
            for (const currentItem of Player.Appearance) {
                const group = currentItem.Asset.Group.Name;
                if (RESTRAINT_GROUPS.has(group) || outfitGroups.has(group))
                    continue;
                const cloned = cloneAppearanceItem(currentItem);
                if (cloned)
                    nextAppearance.push(cloned);
            }
        }
        // If preserveRestraints is on, copy the player's current restraints across —
        // but skip any group that the outfit itself already has an item for (no conflicts).
        if (outfit.preserveRestraints) {
            for (const currentItem of Player.Appearance) {
                const group = currentItem.Asset.Group.Name;
                if (!RESTRAINT_GROUPS.has(group) || outfitGroups.has(group))
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
                    // Poison trick: Content won't be found in Interface.csv, so BC prepends
                    // "MISSING TEXT IN "Interface.csv": ". We strip that prefix with the poison
                    // tag (replaced by a zero-width non-joiner), leaving (​Name text).
                    ServerSend("ChatRoomChat", {
                        Type: "Action",
                        Content: getDisplayName() + " " + outfit.announceText.trim(),
                        Dictionary: [
                            { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                            { SourceCharacter: Player.MemberNumber },
                        ],
                    });
                }
            }
            finally {
                outfitApplyPending = false;
            }
        }, 80);
        localNotice$1(`Loaded "${outfit.displayName}" (/${outfit.command})`);
    }
    // Called from the drawer to snapshot current appearance into an existing outfit slot
    function saveCurrentAppearanceToOutfit(id) {
        const outfits = getOutfits();
        const outfit = outfits.find(o => o.id === id);
        if (!outfit)
            return false;
        outfit.items = captureAppearance(outfit.includeRestraints);
        saveOutfits(outfits);
        localNotice$1(`Saved current look to "${outfit.displayName}".`);
        return true;
    }
    // Called from the drawer to create a brand new outfit from current appearance
    function createOutfitFromCurrent(command, displayName, announceText, includeRestraints, preserveRestraints, preserveClothing = false) {
        const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
        if (!cmd || !displayName.trim())
            return null;
        // Block duplicate commands
        if (getOutfits().some(o => o.command === cmd)) {
            localNotice$1(`Command "/${cmd}" is already used by another outfit.`, "#ffb7c7");
            return null;
        }
        const outfit = {
            id: uid$4(),
            command: cmd,
            displayName: displayName.trim(),
            announceText: announceText.trim(),
            includeRestraints,
            preserveRestraints,
            preserveClothing,
            items: captureAppearance(includeRestraints),
        };
        saveOutfits([...getOutfits(), outfit]);
        localNotice$1(`Created outfit "${outfit.displayName}" (/${outfit.command}).`);
        return outfit;
    }
    // Toggle preserveRestraints on a saved outfit
    function setOutfitPreserveRestraints(id, value) {
        const outfits = getOutfits();
        const outfit = outfits.find(o => o.id === id);
        if (!outfit)
            return;
        outfit.preserveRestraints = value;
        saveOutfits(outfits);
    }
    // Toggle preserveClothing on a saved outfit
    function setOutfitPreserveClothing(id, value) {
        const outfits = getOutfits();
        const outfit = outfits.find(o => o.id === id);
        if (!outfit)
            return;
        outfit.preserveClothing = value;
        saveOutfits(outfits);
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
            localNotice$1(`Outfit "/${outfit.command}" has no saved appearance yet. Use the EBC drawer to save it.`, "#ffb7c7");
            return true;
        }
        applyOutfit(outfit);
        return true;
    }
    function localNotice$1(msg, color = UI.accent) {
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
    function deleteOutfit(id) {
        const outfits = getOutfits().filter(o => o.id !== id);
        saveOutfits(outfits);
    }
    function editOutfit(id, command, displayName, announceText, includeRestraints, preserveRestraints, preserveClothing = false) {
        const outfits = getOutfits();
        const outfit = outfits.find(o => o.id === id);
        if (!outfit)
            return false;
        const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
        if (!cmd || !displayName.trim())
            return false;
        // Block duplicate commands (excluding this outfit itself)
        if (outfits.some(o => o.id !== id && o.command === cmd)) {
            localNotice$1(`Command "/${cmd}" is already used by another outfit.`, "#ffb7c7");
            return false;
        }
        outfit.command = cmd;
        outfit.displayName = displayName.trim();
        outfit.announceText = announceText.trim();
        outfit.includeRestraints = includeRestraints;
        outfit.preserveRestraints = preserveRestraints;
        outfit.preserveClothing = preserveClothing;
        saveOutfits(outfits);
        localNotice$1(`Updated "${outfit.displayName}" (/${outfit.command}).`);
        return true;
    }
    // -- Export / Import -------------------------------------------------------
    function exportOutfitById(id) {
        const outfit = getOutfits().find(o => o.id === id);
        if (!outfit)
            return null;
        return JSON.stringify({ ebc: 1, type: "outfit", outfit: sanitizeOutfit(outfit) });
    }
    function importOutfitFromJSON(json) {
        const data = JSON.parse(json);
        if (data.ebc !== 1 || data.type !== "outfit")
            throw new Error("Not a valid EBC outfit export.");
        const raw = data.outfit;
        if (!(raw === null || raw === void 0 ? void 0 : raw.command) || !(raw === null || raw === void 0 ? void 0 : raw.displayName))
            throw new Error("Missing required outfit fields.");
        // Deduplicate command — append suffix until unique
        const existing = getOutfits();
        const baseCmd = raw.command.toLowerCase().trim().replace(/\s+/g, "");
        let finalCmd = baseCmd;
        let suffix = 2;
        while (existing.some(o => o.command === finalCmd))
            finalCmd = baseCmd + suffix++;
        const outfit = sanitizeOutfit(Object.assign(Object.assign({}, raw), { id: uid$4(), command: finalCmd }));
        saveOutfits([...existing, outfit]);
        localNotice$1(`Imported "${outfit.displayName}" (/${outfit.command}).`);
        return outfit;
    }
    function uid$4() {
        return Math.random().toString(36).slice(2, 9);
    }
    function getSchedules() {
        const list = getAddon$1().outfitSchedules;
        return Array.isArray(list) ? list : [];
    }
    function saveSchedules(schedules) {
        getAddon$1().outfitSchedules = schedules;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    }
    function addSchedule(outfitId, time) {
        const schedule = { id: uid$4(), outfitId, time, enabled: true };
        saveSchedules([...getSchedules(), schedule]);
        return schedule;
    }
    function removeSchedule(id) {
        saveSchedules(getSchedules().filter(s => s.id !== id));
    }
    function toggleSchedule(id) {
        const schedules = getSchedules().map(s => s.id === id ? Object.assign(Object.assign({}, s), { enabled: !s.enabled }) : s);
        saveSchedules(schedules);
    }
    // Map of scheduleId -> last-applied HH:MM to avoid re-applying in the same minute
    const _lastApplied = new Map();
    function checkAndApplySchedules() {
        try {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, "0");
            const mm = String(now.getMinutes()).padStart(2, "0");
            const current = `${hh}:${mm}`;
            for (const schedule of getSchedules()) {
                if (!schedule.enabled)
                    continue;
                if (schedule.time !== current)
                    continue;
                if (_lastApplied.get(schedule.id) === current)
                    continue;
                const outfit = getOutfits().find(o => o.id === schedule.outfitId);
                if (!outfit)
                    continue;
                _lastApplied.set(schedule.id, current);
                applyOutfit(outfit);
            }
        }
        catch ( /* ignore — Player may not be ready */_a) { /* ignore — Player may not be ready */ }
    }
    // Import an outfit from BC's native LZString-compressed appearance bundle.
    // mode: "restraints" = restraint slots only (⛓)
    //       "outfit"     = non-restraint clothing/body slots only
    //       "both"       = entire appearance
    function importOutfitFromBCCode(code, displayName, command, mode = "restraints") {
        const LZ = window.LZString;
        if (!(LZ === null || LZ === void 0 ? void 0 : LZ.decompressFromBase64))
            throw new Error("LZString not found — make sure you are on the BC page.");
        const json = LZ.decompressFromBase64(code.trim());
        if (!json)
            throw new Error("Could not decompress — is this a valid BC outfit code?");
        let raw;
        try {
            raw = JSON.parse(json);
        }
        catch (_a) {
            throw new Error("Decoded data is not valid JSON.");
        }
        if (!Array.isArray(raw))
            throw new Error("Unexpected format — expected an appearance array.");
        const toItem = (i) => {
            var _a, _b;
            return sanitizeItem({
                Group: String((_a = i.Group) !== null && _a !== void 0 ? _a : ""),
                Name: String((_b = i.Name) !== null && _b !== void 0 ? _b : ""),
                Color: i.Color,
                Difficulty: typeof i.Difficulty === "number" ? i.Difficulty : undefined,
                Property: typeof i.Property === "object" && i.Property !== null
                    ? i.Property : undefined,
                Craft: i.Craft,
            });
        };
        const all = raw;
        let items;
        if (mode === "restraints") {
            items = all.filter(i => typeof i.Group === "string" && RESTRAINT_GROUPS.has(i.Group)).map(toItem);
            if (items.length === 0)
                throw new Error("No restraint items found in this BC outfit code.");
        }
        else if (mode === "outfit") {
            items = all.filter(i => typeof i.Group === "string" && !RESTRAINT_GROUPS.has(i.Group)).map(toItem);
            if (items.length === 0)
                throw new Error("No outfit (non-restraint) items found in this BC outfit code.");
        }
        else {
            items = all.filter(i => typeof i.Group === "string").map(toItem);
            if (items.length === 0)
                throw new Error("No items found in this BC outfit code.");
        }
        const existing = getOutfits();
        const baseCmd = command.toLowerCase().trim().replace(/\s+/g, "") || "imported";
        let finalCmd = baseCmd;
        let sfx = 2;
        while (existing.some(o => o.command === finalCmd))
            finalCmd = baseCmd + sfx++;
        const includesRestraints = mode !== "outfit";
        const outfit = sanitizeOutfit({
            id: uid$4(),
            command: finalCmd,
            displayName: displayName.trim() || "Imported Outfit",
            announceText: "",
            includeRestraints: includesRestraints,
            preserveRestraints: mode === "outfit", // outfit-only: keep existing restraints
            preserveClothing: mode === "restraints", // restraints-only: keep existing clothing
            items,
        });
        saveOutfits([...existing, outfit]);
        localNotice$1(`Imported "${outfit.displayName}" (/${outfit.command}) — ${items.length} item(s).`);
        return outfit;
    }

    // Color palette manager — capture the full color map of your current
    // appearance as a named palette and re-apply it later (or to a different outfit).
    function getStore$6() {
        if (!Player.ExtensionSettings.EmeryBC)
            Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC;
    }
    function load$2() {
        const list = getStore$6().palettes;
        if (!Array.isArray(list))
            return [];
        // Backfill `type` for palettes saved before this field existed
        return list.map(p => { var _a; return (Object.assign(Object.assign({}, p), { type: ((_a = p.type) !== null && _a !== void 0 ? _a : "outfit") })); });
    }
    function save(list) {
        getStore$6().palettes = list;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    }
    function uid$3() {
        return Math.random().toString(36).slice(2, 9);
    }
    function getAllPalettes() {
        return load$2();
    }
    function getPalettesByType(type) {
        return load$2().filter(p => p.type === type);
    }
    // Snapshot current appearance colors as a new named palette (all slots).
    function captureCurrentPalette(name) {
        const colorMap = {};
        for (const item of Player.Appearance) {
            if (item.Color !== undefined) {
                colorMap[item.Asset.Group.Name] = item.Color;
            }
        }
        const palette = { id: uid$3(), name: name.trim() || "Palette", type: "outfit", colorMap };
        save([...load$2(), palette]);
        return palette;
    }
    // Snapshot only the colors of active restraint items as a named palette.
    function captureRestraintPalette(name) {
        const colorMap = {};
        for (const item of Player.Appearance) {
            if (item.Asset.Group.IsRestraint && item.Color !== undefined) {
                colorMap[item.Asset.Group.Name] = item.Color;
            }
        }
        const palette = { id: uid$3(), name: name.trim() || "Restraint Palette", type: "restraint", colorMap };
        save([...load$2(), palette]);
        return palette;
    }
    // Locks that block color edits — owner/exclusive/high-security tiers.
    const PROTECTED_LOCKS = new Set([
        "OwnerOnlyPadlock", "ExclusivePadlock", "HighSecurityPadlock",
        "MistressPadlock", "MistressTimerPadlock",
        "LoversPadlock", "LoversTimerPadlock",
    ]);
    function isProtectedLock$1(item) {
        var _a;
        try {
            const lock = (_a = item.Property) === null || _a === void 0 ? void 0 : _a.LockedBy;
            return !!lock && PROTECTED_LOCKS.has(lock);
        }
        catch (_b) {
            return false;
        }
    }
    // Apply a palette to the current live appearance — only groups present in
    // the palette are updated; everything else is left as-is.
    // For restraint palettes, items with owner/exclusive/high-security locks are skipped.
    function applyPalette(id) {
        const palette = load$2().find(p => p.id === id);
        if (!palette)
            return false;
        for (const item of Player.Appearance) {
            const saved = palette.colorMap[item.Asset.Group.Name];
            if (saved === undefined)
                continue;
            if (palette.type === "restraint" && isProtectedLock$1(item))
                continue;
            item.Color = saved;
        }
        try {
            CharacterRefresh(Player, false);
            ChatRoomCharacterUpdate(Player);
            ServerPlayerAppearanceSync();
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return true;
    }
    function deletePalette(id) {
        save(load$2().filter(p => p.id !== id));
    }
    function renamePalette(id, name) {
        const list = load$2();
        const p = list.find(x => x.id === id);
        if (p && name.trim()) {
            p.name = name.trim();
            save(list);
        }
    }

    // BC pose application and user-configurable pose combos.
    // Poses require matching equipped items to visually render — BC handles
    // validation server-side and silently ignores inapplicable poses.
    // Well-known BC pose names grouped by type.
    // Body and arm poses can be freely combined (e.g. Kneel + BackCuffs).
    const KNOWN_POSES = [
        {
            group: "Body",
            poses: [
                { key: "", label: "Stand" },
                { key: "Kneel", label: "Kneel" },
                { key: "KneelingSpread", label: "Kneel Wide" },
                { key: "AllFours", label: "All Fours" },
                { key: "Hogtied", label: "Hogtied" },
                { key: "Spread", label: "Spread" },
            ],
        },
        {
            group: "Arms",
            poses: [
                { key: "OverTheHead", label: "Arms Up" },
                { key: "BackCuffs", label: "Arms Back" },
                { key: "BackBoxTie", label: "Box Tie" },
                { key: "Yoked", label: "Yoked" },
            ],
        },
    ];
    function applyPoses(poses) {
        const filtered = poses.filter(Boolean);
        try {
            Player.ActivePose = filtered;
            CharacterRefresh(Player, false);
            ChatRoomCharacterUpdate(Player);
            ServerPlayerAppearanceSync();
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    // Apply poses one-by-one in the given order with a delay between each step.
    // Respects the exact order provided — the user controls sequencing via the editor.
    // e.g. [Kneel, BackCuffs] → applies [Kneel] first, waits stepDelayMs, then [Kneel, BackCuffs].
    function applyPosesSequential(poses, stepDelayMs = 420) {
        const steps = poses.filter(Boolean);
        if (steps.length <= 1) {
            applyPoses(steps);
            return;
        }
        for (let i = 0; i < steps.length; i++) {
            const subset = steps.slice(0, i + 1);
            window.setTimeout(() => applyPoses(subset), i * stepDelayMs);
        }
    }
    function getCurrentPoses() {
        var _a;
        try {
            return [...((_a = Player.ActivePose) !== null && _a !== void 0 ? _a : [])];
        }
        catch (_b) {
            return [];
        }
    }
    // -- Combo storage -------------------------------------------------------
    function getStore$5() {
        if (!Player.ExtensionSettings.EmeryBC)
            Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC;
    }
    function uid$2() { return Math.random().toString(36).slice(2, 9); }
    function load$1() {
        const list = getStore$5().poseCombos;
        return Array.isArray(list) ? list : [];
    }
    function saveCombos(list) {
        getStore$5().poseCombos = list;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    }
    function getPoseCombos() { return load$1(); }
    function createCombo(name, poses, command = "", announceText = "", stepDelayMs = 420) {
        const combo = {
            id: uid$2(),
            name: name.trim() || "Combo",
            poses: poses.filter(Boolean),
            stepDelayMs: Math.max(50, Math.min(3000, stepDelayMs)),
            command: command.toLowerCase().trim().replace(/\s+/g, "") || undefined,
            announceText: announceText.trim() || undefined,
        };
        saveCombos([...load$1(), combo]);
        return combo;
    }
    function updateCombo(id, name, poses, command = "", announceText = "", stepDelayMs = 420) {
        const list = load$1();
        const combo = list.find(c => c.id === id);
        if (!combo)
            return;
        combo.name = name.trim() || combo.name;
        combo.poses = poses.filter(Boolean);
        combo.stepDelayMs = Math.max(50, Math.min(3000, stepDelayMs));
        combo.command = command.toLowerCase().trim().replace(/\s+/g, "") || undefined;
        combo.announceText = announceText.trim() || undefined;
        saveCombos(list);
    }
    function deleteCombo(id) {
        saveCombos(load$1().filter(c => c.id !== id));
    }
    // Apply a combo (animation + announce text). Used by both the chat command handler
    // and the ▶ apply button in the drawer so announce always fires either way.
    function applyCombo(combo) {
        var _a, _b;
        const delay = (_a = combo.stepDelayMs) !== null && _a !== void 0 ? _a : 420;
        applyPosesSequential(combo.poses, delay);
        const totalMs = combo.poses.length > 1 ? (combo.poses.length - 1) * delay + 80 : 80;
        if ((_b = combo.announceText) === null || _b === void 0 ? void 0 : _b.trim()) {
            window.setTimeout(() => {
                try {
                    ServerSend("ChatRoomChat", {
                        Type: "Action",
                        Content: getDisplayName() + " " + combo.announceText.trim(),
                        Dictionary: [
                            { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                            { SourceCharacter: Player.MemberNumber },
                        ],
                    });
                }
                catch ( /* ignore */_a) { /* ignore */ }
            }, totalMs);
        }
    }
    // Handle a chat command and apply the matching pose combo if found.
    function handlePoseComboCommand(inputValue) {
        const trimmed = inputValue.trim();
        if (!trimmed.startsWith("/"))
            return false;
        const command = trimmed.slice(1).toLowerCase();
        const combo = load$1().find(c => c.command && c.command.toLowerCase() === command);
        if (!combo)
            return false;
        applyCombo(combo);
        return true;
    }

    // Scene sequencer — chain pose changes, item equips/unequips, emotes and
    // waits into a named sequence that plays back step by step with per-step timing.
    function getStore$4() {
        if (!Player.ExtensionSettings.EmeryBC)
            Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC;
    }
    function uid$1() { return Math.random().toString(36).slice(2, 9); }
    function load() {
        const raw = getStore$4().scenes;
        return Array.isArray(raw) ? raw : [];
    }
    function saveScenes(list) {
        getStore$4().scenes = list;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    }
    function getScenes() { return load(); }
    function createScene(name, steps, command = "") {
        const scene = {
            id: uid$1(),
            name: name.trim() || "Scene",
            steps,
            command: command.toLowerCase().trim().replace(/\s+/g, "") || undefined,
        };
        saveScenes([...load(), scene]);
        return scene;
    }
    function updateScene(id, name, steps, command = "") {
        const list = load();
        const scene = list.find(s => s.id === id);
        if (!scene)
            return;
        scene.name = name.trim() || scene.name;
        scene.steps = steps;
        scene.command = command.toLowerCase().trim().replace(/\s+/g, "") || undefined;
        saveScenes(list);
    }
    function deleteScene(id) {
        saveScenes(load().filter(s => s.id !== id));
    }
    function executeStep(step) {
        var _a, _b, _c;
        try {
            switch (step.type) {
                case "pose":
                    applyPoses((_a = step.poses) !== null && _a !== void 0 ? _a : []);
                    break;
                case "equip":
                    if (step.group && step.assetName) {
                        InventoryAdd(Player, step.assetName, step.group, false);
                        if (step.color !== undefined) {
                            const item = InventoryGet(Player, step.group);
                            if (item)
                                item.Color = step.color;
                        }
                        CharacterRefresh(Player, false);
                        ChatRoomCharacterUpdate(Player);
                        ServerPlayerAppearanceSync();
                    }
                    break;
                case "unequip":
                    if (step.group) {
                        InventoryRemove(Player, step.group, false);
                        CharacterRefresh(Player, false);
                        ChatRoomCharacterUpdate(Player);
                        ServerPlayerAppearanceSync();
                    }
                    break;
                case "emote":
                    if ((_b = step.text) === null || _b === void 0 ? void 0 : _b.trim()) {
                        ServerSend("ChatRoomChat", {
                            Type: "Action",
                            Content: getDisplayName() + " " + step.text.trim(),
                            Dictionary: [
                                { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: "‌" },
                                { SourceCharacter: Player.MemberNumber },
                            ],
                        });
                    }
                    break;
                case "chat":
                    if ((_c = step.text) === null || _c === void 0 ? void 0 : _c.trim()) {
                        let msg = step.text.trim();
                        if (step.chatFormat === "*")
                            msg = `*${msg}*`;
                        else if (step.chatFormat === "(")
                            msg = `(${msg})`;
                        ServerSend("ChatRoomChat", { Type: "Chat", Content: msg });
                    }
                    break;
                case "wait":
                    break; // delay alone is the effect
            }
        }
        catch ( /* ignore */_d) { /* ignore */ }
    }
    function runScene(scene) {
        let elapsed = 0;
        for (const step of scene.steps) {
            elapsed += step.delayMs;
            const s = step;
            window.setTimeout(() => executeStep(s), elapsed);
        }
    }
    function handleSceneCommand(inputValue) {
        const trimmed = inputValue.trim();
        if (!trimmed.startsWith("/"))
            return false;
        const command = trimmed.slice(1).toLowerCase();
        const scene = load().find(s => s.command && s.command.toLowerCase() === command);
        if (!scene)
            return false;
        runScene(scene);
        return true;
    }

    // Room and restraint timer — tracks how long you have been in the current
    // room and how long active restraints have been present.
    // Per-item timestamps are persisted in ExtensionSettings so they survive
    // offline sessions and page reloads.
    // Session start: fixed at module load time — "how long have I been online"
    const SESSION_START = Date.now();
    let roomEnterTime = null;
    let restraintStartTime = null; // overall "am I restrained" timer
    let savePending = false;
    function getAddon() {
        try {
            if (!Player.ExtensionSettings.EmeryBC)
                Player.ExtensionSettings.EmeryBC = {};
            return Player.ExtensionSettings.EmeryBC;
        }
        catch (_a) {
            return {};
        }
    }
    // Per-restraint-group timestamps (ms since epoch), keyed by group name (e.g. "ItemArms").
    function loadRestraintTimers() {
        try {
            const v = getAddon().restraintTimers;
            return (v && typeof v === "object" && !Array.isArray(v)) ? Object.assign({}, v) : {};
        }
        catch (_a) {
            return {};
        }
    }
    function saveRestraintTimers(timers) {
        try {
            getAddon().restraintTimers = timers;
        }
        catch ( /* ignore */_a) { /* ignore */ }
        if (!savePending) {
            savePending = true;
            window.setTimeout(() => {
                savePending = false;
                try {
                    ServerPlayerExtensionSettingsSync("EmeryBC");
                }
                catch ( /* ignore */_a) { /* ignore */ }
            }, 3000); // debounce — sync to server 3 s after last change
        }
    }
    function timerOnRoomEnter() {
        roomEnterTime = Date.now();
        restraintStartTime = null; // overall "continuously restrained" timer resets on room change
        // Per-item timers are NOT reset — they persist across rooms and offline
    }
    function timerOnRoomLeave() {
        roomEnterTime = null;
        restraintStartTime = null;
    }
    // Called from DrawCharacter hook. Keeps per-item and overall timers in sync.
    function timerCheckRestraints() {
        try {
            if (!(Player === null || Player === void 0 ? void 0 : Player.Appearance))
                return;
            const currentGroups = new Set(Player.Appearance
                .filter(i => RESTRAINT_GROUPS.has(i.Asset.Group.Name))
                .map(i => i.Asset.Group.Name));
            // Overall restrained timer
            const isBound = currentGroups.size > 0;
            if (isBound) {
                if (restraintStartTime === null)
                    restraintStartTime = Date.now();
            }
            else {
                restraintStartTime = null;
            }
            // Sync per-item timers
            const timers = loadRestraintTimers();
            let changed = false;
            for (const group of currentGroups) {
                if (!(group in timers)) {
                    timers[group] = Date.now();
                    changed = true;
                }
            }
            for (const group of Object.keys(timers)) {
                if (!currentGroups.has(group)) {
                    delete timers[group];
                    changed = true;
                }
            }
            if (changed)
                saveRestraintTimers(timers);
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    function fmt(ms) {
        const s = Math.floor(ms / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0)
            return `${h}h ${m}m`;
        if (m > 0)
            return `${m}m ${sec}s`;
        return `${sec}s`;
    }
    // How long the addon has been loaded (session / "time online").
    function getOnlineTime() {
        return fmt(Date.now() - SESSION_START);
    }
    function getRoomTime() {
        return roomEnterTime !== null ? fmt(Date.now() - roomEnterTime) : null;
    }
    function getRestraintTime() {
        return restraintStartTime !== null ? fmt(Date.now() - restraintStartTime) : null;
    }
    // How long a specific restraint group has been worn (survives offline).
    function getRestraintItemDuration(group) {
        const start = loadRestraintTimers()[group];
        return start !== undefined ? fmt(Date.now() - start) : null;
    }

    // Private character notes — stored locally in Player.ExtensionSettings, never shared.
    function getStore$3() {
        if (!Player.ExtensionSettings.EmeryBC)
            Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC;
    }
    function getNotes() {
        const raw = getStore$3().characterNotes;
        return (raw && typeof raw === "object" && !Array.isArray(raw))
            ? raw
            : {};
    }
    function saveNote(memberNumber, name, note) {
        const notes = getNotes();
        const key = String(memberNumber);
        if (note.trim()) {
            notes[key] = { name, note: note.trim(), updatedAt: Date.now() };
        }
        else {
            delete notes[key];
        }
        getStore$3().characterNotes = notes;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    }

    // Shared restraint/lock removal logic used by both /ebc commands and the drawer.
    // Locks that must never be touched regardless of the operation.
    function isProtectedLock(item) {
        var _a, _b;
        const lock = ((_b = (_a = item.Property) === null || _a === void 0 ? void 0 : _a.LockedBy) !== null && _b !== void 0 ? _b : "").toLowerCase();
        if (!lock)
            return false;
        return lock.includes("owner") || lock.includes("lover") || lock.includes("family");
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
        div.textContent = "[EmeryBC] " + msg;
        log.appendChild(div);
        log.scrollTop = log.scrollHeight;
    }
    // /ebc release - removes restraint items, skips protected locks
    function releaseRestraints() {
        const toRemove = Player.Appearance.filter(item => item.Asset.Group.IsRestraint && !isProtectedLock(item));
        const skipped = Player.Appearance.filter(item => item.Asset.Group.IsRestraint && isProtectedLock(item));
        if (toRemove.length === 0) {
            localNotice(skipped.length > 0
                ? "All restraints are owner/lover/family locked - none removed."
                : "No restraints found to remove.", UI.textMuted);
            return;
        }
        for (const item of toRemove) {
            InventoryRemove(Player, item.Asset.Group.Name, false);
        }
        if (skipped.length > 0) {
            localNotice(`Skipped ${skipped.length} protected item(s).`, UI.textMuted);
        }
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
        localNotice(`Released ${toRemove.length} restraint(s).`, UI.gold);
    }
    // Returns un-protected restraint items currently worn by the player.
    function getPlayerRestraints() {
        return Player.Appearance
            .filter(item => item.Asset.Group.IsRestraint && !isProtectedLock(item))
            .map(item => ({ group: item.Asset.Group.Name, name: item.Asset.Name }));
    }
    // Returns locked (non-protected) items currently worn by the player.
    function getPlayerLockedItems() {
        return Player.Appearance
            .filter(item => { var _a; return !!((_a = item.Property) === null || _a === void 0 ? void 0 : _a.LockedBy) && !isProtectedLock(item); })
            .map(item => ({ group: item.Asset.Group.Name, name: item.Asset.Name }));
    }
    // Removes specific items by group name from the player. Returns count removed.
    function removePlayerSpecificItems(groups) {
        let count = 0;
        for (const group of groups) {
            try {
                InventoryRemove(Player, group, false);
                count++;
            }
            catch ( /* ignore */_a) { /* ignore */ }
        }
        if (count > 0) {
            CharacterRefresh(Player, false);
            ChatRoomCharacterUpdate(Player);
            ServerPlayerAppearanceSync();
        }
        return count;
    }
    // Unlocks specific items by group name on the player. Returns count unlocked.
    function unlockPlayerSpecificItems(groups) {
        let count = 0;
        for (const group of groups) {
            const item = Player.Appearance.find(a => a.Asset.Group.Name === group);
            if (!(item === null || item === void 0 ? void 0 : item.Property) || isProtectedLock(item))
                continue;
            delete item.Property["LockedBy"];
            delete item.Property["LockMemberNumber"];
            delete item.Property["CombinationNumber"];
            delete item.Property["Password"];
            delete item.Property["MemberNumberListKeys"];
            delete item.Property["RemoveItem"];
            delete item.Property["ShowTimer"];
            delete item.Property["EnableRandomInput"];
            count++;
        }
        if (count > 0) {
            CharacterRefresh(Player, false);
            ChatRoomCharacterUpdate(Player);
            ServerPlayerAppearanceSync();
        }
        return count;
    }
    // /ebc unlock - strips lock data from items, skips protected locks
    function unlockItems() {
        var _a;
        let unlocked = 0;
        let skipped = 0;
        for (const item of Player.Appearance) {
            if (!((_a = item.Property) === null || _a === void 0 ? void 0 : _a.LockedBy))
                continue;
            if (isProtectedLock(item)) {
                skipped++;
                continue;
            }
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
            localNotice(skipped > 0
                ? "All locks are owner/lover/family protected - none removed."
                : "No locks found to remove.", UI.textMuted);
            return;
        }
        if (skipped > 0) {
            localNotice(`Skipped ${skipped} protected lock(s).`, UI.textMuted);
        }
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
        localNotice(`Removed ${unlocked} lock(s).`, UI.gold);
    }

    // General EmeryBC settings — lightweight key/value flags stored in ExtensionSettings.
    function getStore$2() {
        try {
            if (!(Player === null || Player === void 0 ? void 0 : Player.ExtensionSettings))
                return null;
            if (!Player.ExtensionSettings.EmeryBC)
                Player.ExtensionSettings.EmeryBC = {};
            return Player.ExtensionSettings.EmeryBC;
        }
        catch (_a) {
            return null;
        }
    }
    // -- Badge visibility ----------------------------------------------------------
    // Controls whether the EBC overhead badge is broadcast to other users.
    // Defaults to true (badge shown). Setting to false clears presence from
    // OnlineSharedSettings so no one else renders the tag above your head.
    function getBadgeEnabled() {
        var _a;
        try {
            return ((_a = getStore$2()) === null || _a === void 0 ? void 0 : _a.badgeEnabled) !== false;
        }
        catch (_b) {
            return true; // safe default
        }
    }
    function setBadgeEnabled(value) {
        try {
            const store = getStore$2();
            if (!store)
                return;
            store.badgeEnabled = value;
            ServerPlayerExtensionSettingsSync("EmeryBC");
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    // -- Version badge visibility --------------------------------------------------
    // When enabled, the overhead EBC badge shows the player's EBC version number.
    // Defaults to false (badge shows just "EBC").
    function getShowVersionBadge() {
        var _a;
        try {
            return ((_a = getStore$2()) === null || _a === void 0 ? void 0 : _a.showVersionBadge) === true;
        }
        catch (_b) {
            return false;
        }
    }
    function setShowVersionBadge(value) {
        try {
            const store = getStore$2();
            if (!store)
                return;
            store.showVersionBadge = value;
            ServerPlayerExtensionSettingsSync("EmeryBC");
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    // -- Anti-restraint -----------------------------------------------------------
    // When enabled, any restraint applied to the player by someone else is
    // immediately removed and a playful emote is sent to the room.
    function getAntiRestraintEnabled() {
        var _a;
        try {
            return ((_a = getStore$2()) === null || _a === void 0 ? void 0 : _a.antiRestraint) === true;
        }
        catch (_b) {
            return false;
        }
    }
    function setAntiRestraintEnabled(value) {
        try {
            const store = getStore$2();
            if (!store)
                return;
            store.antiRestraint = value;
            ServerPlayerExtensionSettingsSync("EmeryBC");
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    // -- Anti-restraint whitelist --------------------------------------------------
    // Group names that auto-escape will never touch, even when applied by others.
    // Populated by the user from the Settings UI while wearing the items.
    function getAntiRestraintWhitelist() {
        var _a;
        try {
            const list = (_a = getStore$2()) === null || _a === void 0 ? void 0 : _a.antiRestraintWhitelist;
            return Array.isArray(list) ? list : [];
        }
        catch (_b) {
            return [];
        }
    }
    function setAntiRestraintWhitelist(groups) {
        try {
            const store = getStore$2();
            if (!store)
                return;
            store.antiRestraintWhitelist = groups;
            ServerPlayerExtensionSettingsSync("EmeryBC");
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    function addToAntiRestraintWhitelist(group) {
        const list = getAntiRestraintWhitelist();
        if (!list.includes(group))
            setAntiRestraintWhitelist([...list, group]);
    }
    function removeFromAntiRestraintWhitelist(group) {
        setAntiRestraintWhitelist(getAntiRestraintWhitelist().filter(g => g !== group));
    }
    // -- Anti-restraint confirm dialog ---------------------------------------------
    // When enabled, shows a confirm() prompt before auto-escaping so the user
    // can choose to accept the restraint instead. Off by default.
    function getAntiRestraintConfirm() {
        var _a;
        try {
            return ((_a = getStore$2()) === null || _a === void 0 ? void 0 : _a.antiRestraintConfirm) === true;
        }
        catch (_b) {
            return false;
        }
    }
    function setAntiRestraintConfirm(value) {
        try {
            const store = getStore$2();
            if (!store)
                return;
            store.antiRestraintConfirm = value;
            ServerPlayerExtensionSettingsSync("EmeryBC");
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    // -- Suppress native beep notification ----------------------------------------
    // When on (default), plain beeps handled by our IM don't also show in BC's
    // main chat log. Game beeps (friend requests etc.) always pass through.
    function getSuppressNativeBeep() {
        var _a;
        try {
            return ((_a = getStore$2()) === null || _a === void 0 ? void 0 : _a.suppressNativeBeep) !== false;
        }
        catch (_b) {
            return true;
        }
    }
    function setSuppressNativeBeep(value) {
        try {
            const store = getStore$2();
            if (!store)
                return;
            store.suppressNativeBeep = value;
            ServerPlayerExtensionSettingsSync("EmeryBC");
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    // -- Beep mute -----------------------------------------------------------------
    function getBeepMuted() {
        var _a;
        try {
            return ((_a = getStore$2()) === null || _a === void 0 ? void 0 : _a.beepMuted) === true;
        }
        catch (_b) {
            return false;
        }
    }
    function setBeepMuted(value) {
        try {
            const store = getStore$2();
            if (!store)
                return;
            store.beepMuted = value;
            ServerPlayerExtensionSettingsSync("EmeryBC");
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }

    // Anti-restraint — when enabled, any restraint applied to the player by
    // another character is immediately removed and a glare emote is sent.
    // Whitelisted groups are always kept even if applied by others.
    // Removal is attempted up to 2 times per group before giving up (locked items).
    // Show a custom in-game overlay rather than window.confirm (which can be
    // suppressed by some browsers / userscript sandboxes).
    function showEscapePrompt(itemName, restrainer, onKeep, onEscape) {
        const overlay = document.createElement("div");
        overlay.style.cssText = [
            "position:fixed", "top:50%", "left:50%",
            "transform:translate(-50%,-50%)",
            "background:#130810", "border:2px solid #cf6f98",
            "border-radius:10px", "padding:18px 22px",
            "z-index:999999", "font-family:'Trebuchet MS',serif",
            "min-width:250px", "max-width:320px",
            "box-shadow:0 6px 32px rgba(0,0,0,0.85)",
            "display:flex", "flex-direction:column", "gap:12px",
        ].join(";");
        const who = restrainer ? `<b style="color:#f7e6ee">${restrainer}</b> is` : "Someone is";
        const msg = document.createElement("div");
        msg.style.cssText = "font-size:12px;color:#cf6f98;line-height:1.55;";
        msg.innerHTML = `${who} applying <b style="color:#f7e6ee">${itemName}</b> on you.<br>What would you like to do?`;
        overlay.appendChild(msg);
        const btns = document.createElement("div");
        btns.style.cssText = "display:flex;gap:8px;";
        const keepBtn = document.createElement("button");
        keepBtn.textContent = "Keep it";
        keepBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #79a885;background:#0f2a1a;color:#79a885;";
        keepBtn.addEventListener("click", () => { overlay.remove(); onKeep(); });
        const escBtn = document.createElement("button");
        escBtn.textContent = "Escape!";
        escBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #cf6f98;background:#3a1020;color:#cf6f98;";
        escBtn.addEventListener("click", () => { overlay.remove(); onEscape(); });
        btns.appendChild(keepBtn);
        btns.appendChild(escBtn);
        overlay.appendChild(btns);
        document.body.appendChild(overlay);
    }
    let lastRestrainerName = null;
    function recordRestrainer(sourceMemberNumber) {
        var _a;
        try {
            const room = window.ChatRoomCharacter;
            const char = room === null || room === void 0 ? void 0 : room.find(c => c.MemberNumber === sourceMemberNumber);
            if (!char)
                return;
            lastRestrainerName =
                ((_a = char.Nickname) === null || _a === void 0 ? void 0 : _a.trim()) ||
                    char.Name ||
                    null;
        }
        catch ( /* ignore */_b) { /* ignore */ }
    }
    let knownRestraints = new Set();
    let escaping = false;
    // Tracks failed removal attempts per group. Items here are NOT merged into
    // knownRestraints so they remain detectable for a retry.
    const failAttempts = new Map();
    function snapshotPlayerRestraints() {
        try {
            knownRestraints = new Set(Player.Appearance
                .filter((i) => i.Asset.Group.IsRestraint)
                .map((i) => i.Asset.Group.Name));
            failAttempts.clear();
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    // Merge currently worn restraint groups into knownRestraints, but skip groups
    // that still have pending retry attempts — they need to stay detectable.
    function mergeCurrentRestraints() {
        try {
            Player.Appearance
                .filter((i) => i.Asset.Group.IsRestraint && !failAttempts.has(i.Asset.Group.Name))
                .forEach((i) => knownRestraints.add(i.Asset.Group.Name));
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    function antiRestraintOnPlayerRefresh() {
        if (escaping)
            return;
        if (!getAntiRestraintEnabled())
            return;
        try {
            const whitelist = getAntiRestraintWhitelist();
            const current = Player.Appearance.filter((i) => i.Asset.Group.IsRestraint);
            const candidates = current.filter((i) => !knownRestraints.has(i.Asset.Group.Name) &&
                !whitelist.includes(i.Asset.Group.Name));
            // Promote items that have hit the retry limit: add to known and drop them.
            for (const item of candidates.filter(i => { var _a; return ((_a = failAttempts.get(i.Asset.Group.Name)) !== null && _a !== void 0 ? _a : 0) >= 2; })) {
                knownRestraints.add(item.Asset.Group.Name);
                failAttempts.delete(item.Asset.Group.Name);
            }
            const newItems = candidates.filter((i) => !knownRestraints.has(i.Asset.Group.Name));
            if (newItems.length === 0)
                return;
            escaping = true;
            const firstItem = newItems[0];
            const itemName = firstItem.Asset.Description
                || firstItem.Asset.Name
                || "restraint";
            const restrainer = lastRestrainerName;
            lastRestrainerName = null;
            // Confirm dialog — show a custom overlay and handle accept/escape via callbacks.
            if (getAntiRestraintConfirm()) {
                showEscapePrompt(itemName, restrainer, () => {
                    // Keep — add to known so anti-escape ignores them
                    for (const item of newItems)
                        knownRestraints.add(item.Asset.Group.Name);
                    escaping = false;
                }, () => {
                    // Escape — proceed with removal
                    doEscape(newItems, restrainer, itemName);
                });
                return; // escaping stays true until one of the callbacks fires
            }
            doEscape(newItems, restrainer, itemName);
        }
        catch (_a) {
            escaping = false;
        }
    }
    function doEscape(newItems, restrainer, itemName) {
        var _a;
        for (const item of newItems) {
            try {
                InventoryRemove(Player, item.Asset.Group.Name, false);
            }
            catch ( /* ignore */_b) { /* ignore */ }
        }
        const stillPresent = new Set(Player.Appearance
            .filter((i) => i.Asset.Group.IsRestraint)
            .map((i) => i.Asset.Group.Name));
        let anySucceeded = false;
        for (const item of newItems) {
            const group = item.Asset.Group.Name;
            if (stillPresent.has(group)) {
                failAttempts.set(group, ((_a = failAttempts.get(group)) !== null && _a !== void 0 ? _a : 0) + 1);
            }
            else {
                anySucceeded = true;
                failAttempts.delete(group);
            }
        }
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
        mergeCurrentRestraints();
        window.setTimeout(() => {
            try {
                if (anySucceeded) {
                    const text = restrainer
                        ? `glares at ${restrainer} as the ${itemName} falls away.`
                        : `glares ahead as the ${itemName} falls away.`;
                    ServerSend("ChatRoomChat", {
                        Type: "Action",
                        Content: Player.Name + " " + text,
                        Dictionary: [
                            { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: "‌" },
                            { SourceCharacter: Player.MemberNumber },
                        ],
                    });
                }
            }
            catch ( /* ignore */_a) { /* ignore */ }
            escaping = false;
        }, 200);
    }

    // Friends system — tags, beep history, name cache.
    // All data stored in Player.ExtensionSettings.EmeryBC and synced to server
    // so it's available across devices on next login.
    function getStore$1() {
        if (!Player.ExtensionSettings.EmeryBC)
            Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC;
    }
    function sync() {
        ServerPlayerExtensionSettingsSync("EmeryBC");
    }
    // -- Name cache ----------------------------------------------------------------
    function getCachedNames() {
        const v = getStore$1().friendNames;
        return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
    }
    function cacheName(memberNumber, name) {
        const store = getStore$1();
        if (!store.friendNames || typeof store.friendNames !== "object")
            store.friendNames = {};
        store.friendNames[String(memberNumber)] = name;
        // Sync is deferred — name cache is saved alongside the next real operation
    }
    function resolveName(memberNumber) {
        var _a, _b;
        try {
            const room = window.ChatRoomCharacter;
            const char = room === null || room === void 0 ? void 0 : room.find(c => c.MemberNumber === memberNumber);
            if (char) {
                const name = ((_a = char.Nickname) === null || _a === void 0 ? void 0 : _a.trim()) || char.Name || String(memberNumber);
                cacheName(memberNumber, name);
                return name;
            }
        }
        catch ( /* ignore */_c) { /* ignore */ }
        return (_b = getCachedNames()[String(memberNumber)]) !== null && _b !== void 0 ? _b : `#${memberNumber}`;
    }
    // -- Friend list ---------------------------------------------------------------
    function getFriendList() {
        try {
            const fl = Player.FriendList;
            return Array.isArray(fl) ? [...fl] : [];
        }
        catch (_a) {
            return [];
        }
    }
    // Set of member numbers BC reports as online (updated via AccountQueryResult hook)
    const onlineSet = new Set();
    const onlineInfo = new Map();
    // Session cache: EBC version for members we've shared a room with this session
    const ebcVersionCache = new Map();
    function cacheEBCVersion(memberNumber, version) {
        ebcVersionCache.set(memberNumber, version);
    }
    function getEBCVersion(memberNumber) {
        var _a;
        return (_a = ebcVersionCache.get(memberNumber)) !== null && _a !== void 0 ? _a : null;
    }
    function updateOnlineFriends(entries) {
        onlineSet.clear();
        onlineInfo.clear();
        for (const r of entries) {
            const n = typeof r.MemberNumber === "number" ? r.MemberNumber : 0;
            if (!n)
                continue;
            onlineSet.add(n);
            onlineInfo.set(n, {
                roomName: typeof r.ChatRoomName === "string" ? r.ChatRoomName : undefined,
                roomSpace: typeof r.ChatRoomSpace === "string" ? r.ChatRoomSpace : undefined,
                roomPrivate: typeof r.Private === "boolean" ? r.Private :
                    typeof r.Type === "string" ? r.Type === "Private" : undefined,
                roomFull: typeof r.ChatRoomFull === "boolean" ? r.ChatRoomFull : undefined,
                roomLocked: typeof r.Locked === "boolean" ? r.Locked : undefined,
            });
        }
    }
    function getFriendOnlineInfo(memberNumber) {
        return onlineInfo.get(memberNumber);
    }
    function getFriendStatus(memberNumber) {
        try {
            const room = window.ChatRoomCharacter;
            if (room === null || room === void 0 ? void 0 : room.some(c => c.MemberNumber === memberNumber))
                return "room";
        }
        catch ( /* ignore */_a) { /* ignore */ }
        if (onlineSet.has(memberNumber))
            return "online";
        return "away";
    }
    // -- Tags ----------------------------------------------------------------------
    function getFriendTags() {
        const v = getStore$1().friendTags;
        return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
    }
    function setFriendTag(memberNumber, tag) {
        const store = getStore$1();
        if (!store.friendTags || typeof store.friendTags !== "object")
            store.friendTags = {};
        const tags = store.friendTags;
        if (tag.trim())
            tags[String(memberNumber)] = tag.trim();
        else
            delete tags[String(memberNumber)];
        sync();
    }
    // -- Beep history --------------------------------------------------------------
    const MAX_ENTRIES$1 = 300;
    function getBeepHistory() {
        const v = getStore$1().beepHistory;
        return Array.isArray(v) ? v : [];
    }
    function addBeepEntry(entry) {
        const store = getStore$1();
        const history = getBeepHistory();
        history.push(entry);
        if (history.length > MAX_ENTRIES$1)
            history.splice(0, history.length - MAX_ENTRIES$1);
        store.beepHistory = history;
        sync();
    }
    function getConversation(memberNumber) {
        var _a;
        const self = (_a = Player.MemberNumber) !== null && _a !== void 0 ? _a : 0;
        return getBeepHistory().filter(e => (e.from === memberNumber && e.to === self) ||
            (e.from === self && e.to === memberNumber));
    }
    // -- Sending -------------------------------------------------------------------
    function sendBeep(memberNumber, message) {
        var _a;
        try {
            ServerSend("AccountBeep", { MemberNumber: memberNumber, Message: message });
        }
        catch ( /* ignore */_b) { /* ignore */ }
        addBeepEntry({
            from: (_a = Player.MemberNumber) !== null && _a !== void 0 ? _a : 0,
            to: memberNumber,
            message,
            ts: Date.now(),
        });
    }

    // DevLog — circular buffer of recent ChatRoomMessage events.
    // Enable logging via the DEV tab toggle; disabled by default so it
    // doesn't accumulate garbage in rooms where the user never opens DEV.
    const MAX_ENTRIES = 60;
    const _log = [];
    let _enabled = false;
    function isDevLogEnabled() { return _enabled; }
    function setDevLogEnabled(v) { _enabled = v; }
    function logMessage(data) {
        var _a, _b;
        if (!_enabled)
            return;
        try {
            _log.push({
                timestamp: new Date(),
                type: String((_a = data.Type) !== null && _a !== void 0 ? _a : "?"),
                content: String((_b = data.Content) !== null && _b !== void 0 ? _b : ""),
                sender: typeof data.Sender === "number" ? data.Sender : undefined,
                dictionary: data.Dictionary,
            });
            if (_log.length > MAX_ENTRIES)
                _log.shift();
        }
        catch ( /* ignore */_c) { /* ignore */ }
    }
    function getDevLog() { return _log; }
    function clearDevLog() { _log.length = 0; }
    // Push a UI test entry directly — bypasses the enabled guard so it works
    // even when logging is off, letting the user verify the log display itself.
    function pushTestEntry() {
        _log.push({
            timestamp: new Date(),
            type: "Test",
            content: "[EBC] Log UI is working — this is a test entry.",
            sender: undefined,
            dictionary: { note: "manually injected, not a real server message" },
        });
        if (_log.length > MAX_ENTRIES)
            _log.shift();
    }

    // Creator-only DOM tools — visible exclusively to member #130267.
    // Supports multiple named restraint sets, each with its own items,
    // chat command, and announce text template.
    const DOM_CREATOR_ID = 130267;
    const DEFAULT_TARGETS = [
        { id: 230466, name: "Lucy" },
        { id: 124264, name: "Lara" },
    ];
    const DEFAULT_ANNOUNCE = "snaps her fingers as {name} appears on {targets}~";
    // ── Internal ─────────────────────────────────────────────────────────────────
    function uid() { return Math.random().toString(36).slice(2, 9); }
    function getStore() {
        if (!Player.ExtensionSettings.EmeryBC)
            Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC;
    }
    function loadConfig() {
        try {
            const v = getStore().domConfig;
            if (v && Array.isArray(v.targets)) {
                return {
                    targets: v.targets,
                    sets: Array.isArray(v.sets) ? v.sets : [],
                };
            }
        }
        catch ( /* ignore */_a) { /* ignore */ }
        return { targets: [...DEFAULT_TARGETS], sets: [] };
    }
    function saveConfig(cfg) {
        try {
            getStore().domConfig = cfg;
            ServerPlayerExtensionSettingsSync("EmeryBC");
        }
        catch ( /* ignore */_a) { /* ignore */ }
    }
    // ── Public API ───────────────────────────────────────────────────────────────
    function isDomEnabled() {
        try {
            return Player.MemberNumber === DOM_CREATOR_ID;
        }
        catch (_a) {
            return false;
        }
    }
    function getDomConfig() { return loadConfig(); }
    // -- Targets --
    function addDomTarget(id, name) {
        const cfg = loadConfig();
        if (cfg.targets.some(t => t.id === id))
            return;
        cfg.targets.push({ id, name });
        saveConfig(cfg);
    }
    function removeDomTarget(id) {
        const cfg = loadConfig();
        cfg.targets = cfg.targets.filter(t => t.id !== id);
        saveConfig(cfg);
    }
    // Room members not already in the target list (excluding self).
    function getRoomAddable() {
        var _a;
        try {
            const existing = new Set(loadConfig().targets.map(t => t.id));
            const room = (_a = window.ChatRoomCharacter) !== null && _a !== void 0 ? _a : [];
            return room
                .filter(c => c.MemberNumber !== Player.MemberNumber && !existing.has(c.MemberNumber))
                .map(c => ({
                id: c.MemberNumber,
                name: c.Nickname
                    || c.Name || `#${c.MemberNumber}`,
            }));
        }
        catch (_b) {
            return [];
        }
    }
    // -- Restraint sets --
    function createDomSet(name, command, announceTemplate) {
        const cfg = loadConfig();
        const set = {
            id: uid(),
            name: name.trim() || "New Set",
            command: command.toLowerCase().trim().replace(/\s+/g, ""),
            announceTemplate: announceTemplate.trim() || DEFAULT_ANNOUNCE,
            items: [],
        };
        cfg.sets.push(set);
        saveConfig(cfg);
        return set;
    }
    function updateDomSet(id, name, command, announceTemplate, items) {
        const cfg = loadConfig();
        const set = cfg.sets.find(s => s.id === id);
        if (!set)
            return;
        set.name = name.trim() || set.name;
        set.command = command.toLowerCase().trim().replace(/\s+/g, "");
        set.announceTemplate = announceTemplate.trim() || DEFAULT_ANNOUNCE;
        set.items = items;
        saveConfig(cfg);
    }
    function deleteDomSet(id) {
        const cfg = loadConfig();
        cfg.sets = cfg.sets.filter(s => s.id !== id);
        saveConfig(cfg);
    }
    function parseBCCodeItems(code) {
        const LZ = window.LZString;
        if (!(LZ === null || LZ === void 0 ? void 0 : LZ.decompressFromBase64))
            throw new Error("LZString not available on this page.");
        const json = LZ.decompressFromBase64(code.trim());
        if (!json)
            throw new Error("Could not decompress — is this a valid BC outfit code?");
        let raw;
        try {
            raw = JSON.parse(json);
        }
        catch (_a) {
            throw new Error("Decoded data is not valid JSON.");
        }
        if (!Array.isArray(raw))
            throw new Error("Unexpected format — expected an appearance array.");
        const items = raw
            .filter(i => typeof i.Group === "string" && typeof i.Name === "string" && i.Name !== "")
            .map(i => {
            var _a;
            return ({
                Group: String(i.Group),
                Name: String((_a = i.Name) !== null && _a !== void 0 ? _a : ""),
                Color: i.Color,
                Difficulty: typeof i.Difficulty === "number" ? i.Difficulty : undefined,
                Property: typeof i.Property === "object" && i.Property !== null
                    ? i.Property : undefined,
                Craft: i.Craft,
                isRestraint: RESTRAINT_GROUPS.has(String(i.Group)),
            });
        });
        if (items.length === 0)
            throw new Error("No items found in this code — is this a valid BC outfit code?");
        return items;
    }
    // Apply a restraint set to every in-room target, then send the announce emote.
    function applyDomSet(setId, targetIds) {
        var _a, _b, _c, _d, _e;
        const cfg = loadConfig();
        const set = cfg.sets.find(s => s.id === setId);
        if (!set)
            return { applied: [], skipped: [] };
        const room = (_a = window.ChatRoomCharacter) !== null && _a !== void 0 ? _a : [];
        const InventoryWearFn = window.InventoryWear;
        const applied = [];
        const skipped = [];
        for (const target of cfg.targets) {
            const char = room.find(c => c.MemberNumber === target.id);
            if (!char) {
                skipped.push(target.name);
                continue;
            }
            if (targetIds && !targetIds.has(target.id)) {
                skipped.push(target.name);
                continue;
            }
            let anyApplied = false;
            for (const item of set.items) {
                try {
                    if (InventoryWearFn) {
                        InventoryWearFn(char, item.Name, item.Group, item.Color, (_b = item.Difficulty) !== null && _b !== void 0 ? _b : 0, Player.AssetFamily, item.Craft);
                        // InventoryWear has no Property parameter — restore it after the call
                        // so states like tight gag, device settings, etc. are preserved.
                        if (item.Property && Object.keys(item.Property).length > 0) {
                            const worn = char.Appearance.find((a) => a.Asset.Group.Name === item.Group);
                            if (worn) {
                                worn.Property = Object.assign(Object.assign({}, ((_c = worn.Property) !== null && _c !== void 0 ? _c : {})), item.Property);
                            }
                        }
                    }
                    else {
                        const asset = AssetGet(Player.AssetFamily, item.Group, item.Name);
                        if (!asset)
                            continue;
                        const idx = char.Appearance.findIndex((a) => a.Asset.Group.Name === item.Group);
                        if (idx >= 0)
                            char.Appearance.splice(idx, 1);
                        char.Appearance.push({
                            Asset: asset,
                            Color: ((_d = item.Color) !== null && _d !== void 0 ? _d : "Default"),
                            Property: ((_e = item.Property) !== null && _e !== void 0 ? _e : {}),
                            Craft: item.Craft,
                        });
                    }
                    anyApplied = true;
                }
                catch ( /* ignore individual item failures */_f) { /* ignore individual item failures */ }
            }
            if (anyApplied) {
                try {
                    syncChar(char);
                    applied.push(target.name);
                }
                catch (_g) {
                    skipped.push(target.name);
                }
            }
            else {
                skipped.push(target.name);
            }
        }
        // Send room announce after items have synced
        if (applied.length > 0 && set.announceTemplate.trim()) {
            window.setTimeout(() => {
                try {
                    const text = set.announceTemplate
                        .replace(/\{name\}/gi, set.name)
                        .replace(/\{targets\}/gi, applied.join(", "));
                    ServerSend("ChatRoomChat", {
                        Type: "Action",
                        Content: getDisplayName() + " " + text,
                        Dictionary: [
                            { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                            { SourceCharacter: Player.MemberNumber },
                        ],
                    });
                }
                catch ( /* ignore */_a) { /* ignore */ }
            }, 200);
        }
        return { applied, skipped };
    }
    // ── Release / rescue helpers ─────────────────────────────────────────────────
    // Shared sync helper for non-player characters.
    function syncChar(char) {
        // Local visual refresh first (no push)
        try {
            CharacterRefresh(char, false, false);
        }
        catch ( /* ignore */_a) { /* ignore */ }
        // Sort layers so the server packet contains the correct layer order
        try {
            const sortFn = window.CharacterAppearanceSortLayers;
            if (sortFn)
                sortFn(char);
        }
        catch ( /* ignore */_b) { /* ignore */ }
        // Push update to server — BC validates relationship permissions server-side
        try {
            const updateFn = window.ChatRoomCharacterUpdate;
            if (updateFn)
                updateFn(char);
            else
                CharacterRefresh(char, true, false);
        }
        catch ( /* ignore */_c) { /* ignore */ }
    }
    // Returns the restraint items currently worn by each in-room target.
    function getTargetRestraints() {
        var _a;
        const cfg = loadConfig();
        const room = (_a = window.ChatRoomCharacter) !== null && _a !== void 0 ? _a : [];
        const out = [];
        for (const target of cfg.targets) {
            const char = room.find(c => c.MemberNumber === target.id);
            if (!char)
                continue;
            const items = char.Appearance
                .filter((a) => a.Asset.Group.IsRestraint)
                .map((a) => ({ group: a.Asset.Group.Name, name: a.Asset.Name }));
            out.push({ target, items });
        }
        return out;
    }
    // Removes items (by group name) from a single in-room character.
    function removeTargetItems(targetId, groups) {
        var _a;
        const room = (_a = window.ChatRoomCharacter) !== null && _a !== void 0 ? _a : [];
        const char = room.find(c => c.MemberNumber === targetId);
        if (!char)
            return { inRoom: false, count: 0 };
        const InventoryRemoveFn = window.InventoryRemove;
        let count = 0;
        for (const group of groups) {
            try {
                if (InventoryRemoveFn) {
                    InventoryRemoveFn(char, group, false);
                }
                else {
                    const idx = char.Appearance.findIndex((a) => a.Asset.Group.Name === group);
                    if (idx >= 0)
                        char.Appearance.splice(idx, 1);
                }
                count++;
            }
            catch ( /* ignore */_b) { /* ignore */ }
        }
        if (count > 0)
            syncChar(char);
        return { inRoom: true, count };
    }
    // Removes ALL restraint items from every in-room target.
    function removeAllTargetRestraints(targetIds) {
        var _a;
        const cfg = loadConfig();
        const room = (_a = window.ChatRoomCharacter) !== null && _a !== void 0 ? _a : [];
        return cfg.targets.map(target => {
            const char = room.find(c => c.MemberNumber === target.id);
            if (!char)
                return { name: target.name, count: 0, inRoom: false };
            if (targetIds && !targetIds.has(target.id))
                return { name: target.name, count: 0, inRoom: false };
            const groups = char.Appearance
                .filter((a) => a.Asset.Group.IsRestraint)
                .map((a) => a.Asset.Group.Name);
            const { count } = removeTargetItems(target.id, groups);
            return { name: target.name, count, inRoom: true };
        });
    }
    // Unlocks ALL locked items on every in-room target.
    function unlockAllTargetItems(targetIds) {
        var _a;
        const cfg = loadConfig();
        const room = (_a = window.ChatRoomCharacter) !== null && _a !== void 0 ? _a : [];
        return cfg.targets.map(target => {
            const char = room.find(c => c.MemberNumber === target.id);
            if (!char)
                return { name: target.name, count: 0, inRoom: false };
            if (targetIds && !targetIds.has(target.id))
                return { name: target.name, count: 0, inRoom: false };
            let count = 0;
            for (const item of char.Appearance) {
                const prop = item.Property;
                if (prop && typeof prop.LockedBy === "string" && prop.LockedBy !== "") {
                    prop.LockedBy = "";
                    if ("Password" in prop)
                        delete prop.Password;
                    count++;
                }
            }
            if (count > 0)
                syncChar(char);
            return { name: target.name, count, inRoom: true };
        });
    }
    // Handle a chat command (e.g. /gag → apply the matching set).
    function handleDomCommand(input) {
        if (!isDomEnabled())
            return false;
        const trimmed = input.trim();
        if (!trimmed.startsWith("/"))
            return false;
        const command = trimmed.slice(1).toLowerCase().trim();
        const set = loadConfig().sets.find(s => s.command && s.command.toLowerCase() === command);
        if (!set)
            return false;
        applyDomSet(set.id);
        return true;
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
    // -- Shared UI helpers ---------------------------------------------------------
    function showQuickConfirm(message, onConfirm) {
        const overlay = document.createElement("div");
        overlay.style.cssText = [
            "position:fixed", "top:50%", "left:50%",
            "transform:translate(-50%,-50%)",
            "background:#130810", "border:2px solid #cf6f98",
            "border-radius:10px", "padding:16px 20px",
            "z-index:999999", "font-family:'Trebuchet MS',serif",
            "min-width:220px", "max-width:300px",
            "box-shadow:0 6px 32px rgba(0,0,0,0.85)",
            "display:flex", "flex-direction:column", "gap:12px",
        ].join(";");
        const msg = document.createElement("div");
        msg.style.cssText = "font-size:12px;color:#f7e6ee;line-height:1.5;text-align:center;";
        msg.textContent = message;
        overlay.appendChild(msg);
        const btns = document.createElement("div");
        btns.style.cssText = "display:flex;gap:8px;";
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = "Cancel";
        cancelBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #3a1928;background:#190b13;color:#7a5a6a;";
        cancelBtn.addEventListener("click", () => overlay.remove());
        const confirmBtn = document.createElement("button");
        confirmBtn.textContent = "Yes";
        confirmBtn.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;font-weight:bold;padding:6px;border-radius:5px;cursor:pointer;border:1px solid #cf6f98;background:#3a1020;color:#cf6f98;";
        confirmBtn.addEventListener("click", () => { overlay.remove(); onConfirm(); });
        btns.appendChild(cancelBtn);
        btns.appendChild(confirmBtn);
        overlay.appendChild(btns);
        document.body.appendChild(overlay);
    }
    // -- Icon ----------------------------------------------------------------------
    const TAB_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 90 90">'
        + '<rect x="8" y="8" width="74" height="74" rx="18" fill="#2a1421" stroke="#cf6f98" stroke-width="4"/>'
        + '<path d="M28 30 L37 18 L45 31 L53 18 L62 30" fill="#cf6f98"/>'
        + '<circle cx="34" cy="43" r="4" fill="#f7e6ee"/>'
        + '<circle cx="56" cy="43" r="4" fill="#f7e6ee"/>'
        + '<path d="M38 56 Q45 63 52 56" stroke="#f7e6ee" stroke-width="4" fill="none" stroke-linecap="round"/>'
        + '</svg>';
    // -- Styles --------------------------------------------------------------------
    const CSS = `
/*
 * Root anchor: zero-width fixed point at the right edge of the chat log.
 * The tab hangs to its left (always visible). The panel slides out to its right.
 * This means the tab is NEVER caught by the panel's transform and never disappears.
 */
#emerybc-root {
    position: fixed;
    z-index: 99;
    width: 0;
    pointer-events: none;
}

/* Tab - always visible, hangs left of the anchor */
#ebc-tab {
    pointer-events: auto;
    width: 44px;
    height: 44px;
    background: rgba(42, 20, 33, 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(207, 111, 152, 0.2);
    border-right: none;
    border-radius: 8px 0 0 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: grab;
    box-shadow: -2px 0 5px rgba(0, 0, 0, 0.5);
    position: absolute;
    left: -44px;
    top: 58px;
    transition: background 0.18s;
}

#ebc-tab:hover { background: rgba(76, 37, 55, 0.97); }
#ebc-tab:active { cursor: grabbing; }

#ebc-tab-unread-dot {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 10px;
    height: 10px;
    background: #cf6f98;
    border-radius: 50%;
    border: 1.5px solid #130810;
    box-shadow: 0 0 6px #cf6f98;
    pointer-events: none;
    animation: ebc-dot-pulse 1.4s ease-in-out infinite;
}

@keyframes ebc-dot-pulse {
    0%, 100% { box-shadow: 0 0 4px #cf6f98; transform: scale(1); }
    50%       { box-shadow: 0 0 10px #e890b8, 0 0 18px #cf6f9855; transform: scale(1.25); }
}

/* Toast notification */
.ebc-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    min-width: 220px;
    max-width: 300px;
    background: #130810;
    border: 1.5px solid #cf6f98;
    border-radius: 10px;
    box-shadow: 0 6px 24px rgba(0,0,0,0.85), 0 0 12px rgba(207,111,152,0.25);
    font-family: "Trebuchet MS", serif;
    z-index: 1000000;
    overflow: hidden;
    cursor: pointer;
    animation: ebc-toast-in 0.22s ease-out;
    transition: opacity 0.3s, transform 0.3s;
}
.ebc-toast.ebc-toast-out {
    opacity: 0;
    transform: translateX(30px);
}
@keyframes ebc-toast-in {
    from { opacity: 0; transform: translateX(30px); }
    to   { opacity: 1; transform: translateX(0); }
}
.ebc-toast-header {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px 12px 5px;
    background: #1e0d1a;
    border-bottom: 1px solid #3a1928;
}
.ebc-toast-icon { font-size: 13px; flex-shrink: 0; }
.ebc-toast-name {
    flex: 1;
    font-size: 11px;
    font-weight: bold;
    color: #cf6f98;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.ebc-toast-body {
    padding: 6px 12px 9px;
    font-size: 10px;
    color: #d0a8b8;
    line-height: 1.45;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* When panel is closed, slide the tab right so only ~10px overlaps the BC
   game canvas. The icon is still fully visible (it's mostly over the chat-log
   column), and the hit area is almost entirely out of the canvas. */
#ebc-tab.ebc-tab-closed {
    left: -10px;
    cursor: pointer;
}

/* Sliding panel - only this element transforms, not the tab */
#emerybc-panel {
    position: absolute;
    right: 44px;   /* leave the 44px tab strip uncovered — tab is to our right */
    top: 0;
    width: 360px;
    height: 100%;  /* full chat log height — no vertical conflict with tab */
    transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: transform;
    pointer-events: none;
}

/* +60px extra so the panel clears the 44px tab offset when closed */
#emerybc-panel.ebc-closed { transform: translateX(calc(100% + 60px)); }
#emerybc-panel.ebc-open   { transform: translateX(0); pointer-events: auto; }

.ebc-panel {
    pointer-events: inherit; /* inherits none/auto from #emerybc-panel so closed panel passes clicks through */
    background: rgba(27, 13, 23, 0.97);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-left: 2px solid #4c2537;
    display: flex;
    flex-direction: column;
    width: 100%;
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

@keyframes ebc-spin { to { transform: rotate(360deg); } }
.ebc-icon-btn.spinning svg { animation: ebc-spin 0.6s linear; }

.ebc-move-handle {
    font-size: 14px;
    color: #cf6f98;
    opacity: 0.55;
    cursor: grab;
    line-height: 1;
    padding: 0 2px;
    user-select: none;
    transition: opacity 0.14s;
}
.ebc-move-handle:hover { opacity: 1; }
.ebc-move-handle:active { cursor: grabbing; }

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
    color: #7a5a6a;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    font-weight: bold;
    letter-spacing: 0.01em;
    padding: 6px 1px;
    transition: color 0.14s, border-color 0.14s;
}

.ebc-tab-btn:hover { color: #b07888; }
.ebc-tab-btn.ebc-tab-active { color: #cf6f98; border-bottom-color: #cf6f98; }

/* -- Body -- */
.ebc-body {
    flex: 1;
    overflow-y: auto;
    padding: 7px;
    scrollbar-width: thin;
    scrollbar-color: #cf6f98 #1a0814;
}

/* Unified scrollbar theme for all EBC scrollable areas */
.ebc-body::-webkit-scrollbar,
.ebc-beep-win-history::-webkit-scrollbar { width: 5px; }
.ebc-body::-webkit-scrollbar-track,
.ebc-beep-win-history::-webkit-scrollbar-track { background: #1a0814; border-radius: 3px; }
.ebc-body::-webkit-scrollbar-thumb,
.ebc-beep-win-history::-webkit-scrollbar-thumb { background: #cf6f98; border-radius: 3px; }
.ebc-body::-webkit-scrollbar-thumb:hover,
.ebc-beep-win-history::-webkit-scrollbar-thumb:hover { background: #e890b8; }
.ebc-beep-win-history { scrollbar-width: thin; scrollbar-color: #cf6f98 #1a0814; }

/* -- Section label -- */
.ebc-section-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.1em;
    color: #8a6070;
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

/* -- Outfit flag chips (preserve bonds / preserve clothes) -- */
.ebc-outfit-flags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-top: 3px;
}

.ebc-flag-chip {
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid #3a1928;
    background: #1b0d17;
    color: #553142;
    cursor: pointer;
    white-space: nowrap;
    letter-spacing: 0.03em;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    user-select: none;
}

.ebc-flag-chip.on {
    border-color: #7a4a5e;
    color: #cf6f98;
    background: #2a1421;
}

.ebc-flag-chip:hover { border-color: #7a4a5e; color: #cf6f98; background: #2a1421; }

.ebc-outfit-del {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    line-height: 1;
    padding: 2px 6px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
}

.ebc-outfit-del:hover    { background: #3a1017; color: #ff6b6b; border-color: #7a2020; }
.ebc-outfit-del.confirm  { background: #3a1017; color: #ff6b6b; border-color: #7a2020; font-size: 10px; }

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

.ebc-slot-del:hover   { background: #3a1017; color: #cf6f98; border-color: #7a4a5e; }
.ebc-slot-del.confirm { background: #3a1017; color: #ff6b6b; border-color: #7a2020; font-size: 9px; }

.ebc-slot-style {
    flex-shrink: 0;
    width: 32px;
    height: 22px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    font-weight: bold;
    letter-spacing: 0.03em;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
}

.ebc-slot-style.emote { background: #1b1117; color: #cf6f98; border-color: #7a4a5e; }
.ebc-slot-style:hover  { border-color: #7a4a5e; color: #967281; }

.ebc-slot-seq-badge {
    flex-shrink: 0;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #7aba55;
    padding: 0 3px;
    user-select: none;
    pointer-events: none;
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
.ebc-btn-footer-btn.confirm  { background: #3a1017; color: #ff6b6b; border-color: #7a2020; }

/* -- Import panel (buttons tab) -- */
.ebc-import-panel {
    display: none;
    margin-top: 4px;
    flex-direction: column;
    gap: 5px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    border-radius: 7px;
    padding: 7px;
}

.ebc-import-panel.open { display: flex; }

.ebc-import-hint {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #967281;
}

.ebc-import-error {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #ff6b6b;
    min-height: 14px;
    word-break: break-word;
}

/* -- Notes tab -- */
.ebc-notes-person {
    border-radius: 7px;
    margin-bottom: 4px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    overflow: hidden;
    transition: border-color 0.14s;
}

.ebc-notes-person:hover { border-color: #6b3048; }

.ebc-notes-person-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 7px;
    cursor: pointer;
    user-select: none;
}

.ebc-notes-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
    background: #3a1928;
    transition: background 0.14s;
}

.ebc-notes-dot.has-note { background: #cf6f98; }

.ebc-notes-person-name {
    font-family: "Trebuchet MS", serif;
    font-size: 12px;
    font-weight: bold;
    color: #f7e6ee;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-notes-member-num {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #553142;
    flex-shrink: 0;
}

.ebc-notes-editor {
    display: none;
    padding: 0 7px 7px;
    flex-direction: column;
    gap: 4px;
}

.ebc-notes-editor.open { display: flex; }

.ebc-notes-textarea {
    width: 100%;
    box-sizing: border-box;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #f7e6ee;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    padding: 4px 5px;
    resize: vertical;
    min-height: 58px;
    outline: none;
    transition: border-color 0.14s;
}

.ebc-notes-textarea:focus { border-color: #cf6f98; }

.ebc-notes-save-hint {
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    color: #553142;
    text-align: right;
}


/* -- Edit button (pencil) -- */
.ebc-edit-btn {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #553142;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 5px;
    line-height: 1;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-edit-btn:hover,
.ebc-edit-btn.open { background: #3a1928; color: #cf6f98; border-color: #7a4a5e; }

/* -- Inline edit panel -- */
.ebc-edit-panel {
    display: none;
    padding: 6px 7px;
    background: #1b0d17;
    border: 1px solid #3a1928;
    border-top: none;
    border-radius: 0 0 6px 6px;
    flex-direction: column;
    gap: 5px;
}

.ebc-edit-panel.open { display: flex; }

/* -- Appearance diff -- */
.ebc-diff-btn {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #553142;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    line-height: 1;
    padding: 2px 5px;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
}

.ebc-diff-btn:hover,
.ebc-diff-btn.open { background: #3a1928; color: #cf6f98; border-color: #7a4a5e; }

.ebc-diff-panel {
    display: none;
    padding: 5px 7px;
    background: #1b0d17;
    border: 1px solid #3a1928;
    border-top: none;
    border-radius: 0 0 6px 6px;
    flex-direction: column;
    gap: 2px;
}

.ebc-diff-panel.open { display: flex; }

.ebc-diff-item {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 1px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-diff-add    { color: #79a885; }
.ebc-diff-remove { color: #cb798c; }
.ebc-diff-change { color: #c9ab72; }
.ebc-diff-none   { color: #553142; font-style: italic; }

/* -- Quick actions -- */
.ebc-quick-actions {
    flex-shrink: 0;
    display: flex;
    gap: 5px;
    padding: 6px 7px;
    border-top: 1px solid #2a1421;
    border-bottom: 1px solid #2a1421;
    background: rgba(20, 8, 16, 0.7);
}

.ebc-action-btn {
    flex: 1;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 6px;
    color: #7a4a5e;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    padding: 5px 4px;
    text-align: center;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    line-height: 1.35;
}

.ebc-action-btn:hover    { background: #3a1928; color: #cf6f98; border-color: #7a4a5e; }
.ebc-action-btn:active   { transform: scale(0.97); }
.ebc-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.ebc-action-btn.danger:hover { background: #3a1017; color: #ff6b6b; border-color: #7a2020; }

/* -- Footer -- */
.ebc-footer {
    flex-shrink: 0;
    padding: 4px 10px;
    border-top: 1px solid #3a1928;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #9a7888;
    text-align: center;
}

/* -- Special Thanks tab -- */
.ebc-thanks-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 11px;
    border-radius: 9px;
    margin-bottom: 6px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    transition: border-color 0.18s;
}

.ebc-thanks-card:hover { border-color: #6b3048; }

.ebc-thanks-avatar {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #2a1421;
    border: 2px solid #4c2537;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    user-select: none;
}

.ebc-thanks-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.ebc-thanks-name {
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    font-weight: bold;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-thanks-reason {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #967281;
    line-height: 1.4;
}

.ebc-thanks-heart {
    flex-shrink: 0;
    font-size: 16px;
    user-select: none;
}

.ebc-thanks-intro {
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    color: #9a7080;
    text-align: center;
    padding: 6px 4px 10px;
    line-height: 1.6;
}

/* -- Timer strip -- */
.ebc-timer {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #e8d07a;
    text-align: center;
    padding: 2px 0 0;
    letter-spacing: 0.04em;
    min-height: 13px;
}

/* -- Restraint info -- */
.ebc-restraint-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 7px;
    border-radius: 6px;
    margin-bottom: 3px;
    background: rgba(42, 20, 33, 0.5);
    border: 1px solid #3a1928;
}

.ebc-restraint-name {
    flex: 1;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-restraint-group {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #8a6070;
    white-space: nowrap;
}

.ebc-restraint-lock {
    flex-shrink: 0;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #cf6f98;
    white-space: nowrap;
    text-align: right;
}

.ebc-restraint-lock.unlocked { color: #7a5a6a; }

.ebc-restraint-duration {
    margin-left: auto;
    font-size: 10px;
    color: #e8d07a;
    white-space: nowrap;
    flex-shrink: 0;
}

/* -- Color palettes -- */
.ebc-palette-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 7px;
    border-radius: 6px;
    margin-bottom: 3px;
    background: rgba(42, 20, 33, 0.5);
    border: 1px solid #3a1928;
}

.ebc-palette-swatch {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
}

.ebc-palette-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid rgba(0,0,0,0.3);
}

.ebc-palette-name {
    flex: 1;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background: transparent;
    border: none;
    outline: none;
    cursor: text;
    padding: 0;
    min-width: 0;
}

.ebc-palette-name:focus {
    border-bottom: 1px solid #cf6f98;
}

/* -- Poses tab -- */
.ebc-pose-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    margin-bottom: 4px;
}

.ebc-pose-btn {
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #967281;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    padding: 5px 3px;
    text-align: center;
    transition: background 0.14s, color 0.12s, border-color 0.12s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-pose-btn:hover  { background: #3a1928; color: #cf6f98; border-color: #7a4a5e; }
.ebc-pose-btn:active { transform: scale(0.96); }
.ebc-pose-btn.active { background: #4c2537; color: #f7e6ee; border-color: #cf6f98; }

.ebc-combo-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 7px;
    border-radius: 6px;
    margin-bottom: 3px;
    background: rgba(42, 20, 33, 0.5);
    border: 1px solid #3a1928;
    transition: border-color 0.14s;
}

.ebc-combo-row:hover { border-color: #6b3048; }

.ebc-combo-name {
    flex: 1;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    font-weight: bold;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-combo-poses {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #8a6070;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 90px;
}

/* -- Combo editor (inline, below combo row) -- */
.ebc-combo-editor {
    display: none;
    padding: 6px 7px;
    background: #1b0d17;
    border: 1px solid #3a1928;
    border-top: none;
    border-radius: 0 0 6px 6px;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 3px;
}

.ebc-combo-editor.open { display: flex; }

/* Save bar at top + bottom of editor */
.ebc-editor-save-bar {
    display: flex;
    gap: 5px;
    align-items: center;
    padding: 2px 0;
}

/* -- Ordered pose step list -- */
.ebc-step-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 4px 0;
}

.ebc-step-row {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #24111d;
    border: 1px solid #3a1828;
    border-radius: 5px;
    padding: 3px 6px;
}

.ebc-step-num {
    font-size: 10px;
    font-weight: 700;
    color: #cf6f98;
    min-width: 14px;
    flex-shrink: 0;
}

.ebc-step-label {
    flex: 1;
    font-size: 11px;
    color: #e8d1dc;
    font-family: "Trebuchet MS", serif;
}

.ebc-step-delay {
    font-size: 10px;
    color: #e8d07a;
    text-align: center;
    padding: 1px 0;
    letter-spacing: 0.03em;
}

.ebc-step-move {
    background: none;
    border: 1px solid #3a1828;
    border-radius: 3px;
    color: #9a6070;
    font-size: 10px;
    padding: 1px 4px;
    cursor: pointer;
    line-height: 1;
    flex-shrink: 0;
}
.ebc-step-move:hover { background: #2e1525; color: #cf6f98; }

.ebc-step-del {
    background: none;
    border: none;
    color: #9a6070;
    font-size: 13px;
    line-height: 1;
    padding: 0 2px;
    cursor: pointer;
    flex-shrink: 0;
}
.ebc-step-del:hover { color: #cf6f98; }

/* -- Quick-add pose buttons (inside editor) -- */
.ebc-pose-add-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin: 3px 0;
}

.ebc-pose-add-btn {
    font-size: 10px;
    padding: 2px 7px;
    border-radius: 4px;
    border: 1px solid #3a1828;
    background: #1b0d17;
    color: #967281;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
}
.ebc-pose-add-btn:hover { background: #2e1525; color: #cf6f98; border-color: #cf6f98; }

.ebc-delay-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 4px 0;
}

.ebc-delay-row input[type="range"] {
    flex: 1;
    accent-color: #cf6f98;
}

.ebc-delay-val {
    font-size: 11px;
    color: #e8d07a;
    font-family: "Trebuchet MS", serif;
    min-width: 44px;
    text-align: right;
}

/* -- Scene step cards -- */
.ebc-scene-step {
    background: #1a0d15;
    border: 1px solid #3a1928;
    border-radius: 6px;
    padding: 6px 8px;
    margin-bottom: 4px;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.ebc-scene-step-header {
    display: flex;
    align-items: center;
    gap: 4px;
}

.ebc-scene-type-sel {
    flex: 0 0 auto;
    width: 76px;
    padding: 2px 4px;
    font-size: 11px;
    background: #130810;
    border: 1px solid #5a2840;
    border-radius: 4px;
    color: #e8d0d8;
    font-family: "Trebuchet MS", serif;
    cursor: pointer;
}

.ebc-scene-delay {
    width: 54px;
    padding: 2px 4px;
    font-size: 11px;
    text-align: right;
    background: #130810;
    border: 1px solid #5a2840;
    border-radius: 4px;
    color: #e8d0d8;
    font-family: "Trebuchet MS", serif;
}

.ebc-scene-ms-lbl {
    font-size: 10px;
    color: #9a6878;
    flex-shrink: 0;
}

.ebc-scene-fields {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.ebc-scene-fields-row {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
}

/* -- Friends section -- */
.ebc-friend-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 4px;
    border-radius: 5px;
    margin-bottom: 2px;
    background: #130810;
}
.ebc-friend-row:hover { background: #1a0d15; }

.ebc-friend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}
.ebc-friend-dot.room   { background: #4caf50; box-shadow: 0 0 4px #4caf50aa; }
.ebc-friend-dot.online { background: #a0cf50; box-shadow: 0 0 4px #a0cf5088; }
.ebc-friend-dot.away   { background: #555; }

.ebc-friend-name {
    flex: 1;
    font-size: 11px;
    color: #e8d0d8;
    font-family: "Trebuchet MS", serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-friend-tag {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 3px;
    background: #3a1928;
    color: #cf6f98;
    flex-shrink: 0;
    max-width: 70px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.ebc-friend-btn {
    background: none;
    border: 1px solid #3a1928;
    border-radius: 4px;
    color: #9a6878;
    font-size: 11px;
    padding: 1px 5px;
    cursor: pointer;
    flex-shrink: 0;
    font-family: "Trebuchet MS", serif;
    line-height: 1.3;
}
.ebc-friend-btn:hover { background: #2e1525; color: #cf6f98; border-color: #cf6f98; }

/* -- Beep window -- */
.ebc-beep-win {
    position: fixed;
    width: 300px;
    height: 380px;
    background: #130810;
    border: 2px solid #cf6f98;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    z-index: 999998;
    box-shadow: 0 8px 32px rgba(0,0,0,0.9);
    font-family: "Trebuchet MS", serif;
    bottom: 80px;
    right: 340px;
    overflow: hidden;
}

.ebc-beep-win-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px 6px;
    background: #1e0d1a;
    border-bottom: 1px solid #3a1928;
    cursor: grab;
    user-select: none;
    flex-shrink: 0;
}
.ebc-beep-win-header:active { cursor: grabbing; }

.ebc-beep-win-title {
    flex: 1;
    font-size: 11px;
    font-weight: bold;
    color: #cf6f98;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-beep-win-hbtn {
    background: #2a0e1e;
    border: 1px solid #4a2035;
    border-radius: 5px;
    color: #9a6878;
    font-size: 13px;
    cursor: pointer;
    line-height: 1;
    padding: 3px 7px;
    flex-shrink: 0;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.ebc-beep-win-hbtn:hover { background: #3a1028; color: #cf6f98; border-color: #cf6f98; }
.ebc-beep-win-close.ebc-beep-win-hbtn:hover { background: #4a1020; color: #ff6080; border-color: #ff6080; }
.ebc-beep-win-mute.muted { color: #4a2a38; border-color: #3a1928; }

.ebc-beep-win-history {
    flex: 1;
    overflow-y: auto;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.ebc-beep-msg {
    font-size: 10px;
    line-height: 1.5;
    padding: 4px 7px;
    border-radius: 6px;
    max-width: 85%;
    word-break: break-word;
}
.ebc-beep-msg.sent {
    align-self: flex-end;
    background: #3a1028;
    color: #f0c8d8;
    border-bottom-right-radius: 2px;
}
.ebc-beep-msg.received {
    align-self: flex-start;
    background: #1e0d1a;
    color: #e0c0cc;
    border: 1px solid #3a1928;
    border-bottom-left-radius: 2px;
}
.ebc-beep-ts {
    font-size: 9px;
    color: #7a5a6a;
    margin-bottom: 1px;
}
.ebc-beep-msg.sent .ebc-beep-ts { text-align: right; }

.ebc-beep-win-footer {
    display: flex;
    gap: 5px;
    padding: 7px 8px;
    border-top: 1px solid #3a1928;
    flex-shrink: 0;
}

.ebc-beep-win-input {
    flex: 1;
    background: #1e0d1a;
    border: 1px solid #5a2840;
    border-radius: 5px;
    color: #e8d0d8;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    padding: 4px 7px;
    outline: none;
}
.ebc-beep-win-input:focus { border-color: #cf6f98; }

.ebc-beep-win-send {
    background: #3a1028;
    border: 1px solid #cf6f98;
    border-radius: 5px;
    color: #cf6f98;
    font-size: 11px;
    font-family: "Trebuchet MS", serif;
    padding: 4px 10px;
    cursor: pointer;
    flex-shrink: 0;
}
.ebc-beep-win-send:hover { background: #cf6f98; color: #fff; }

.ebc-beep-win.minimized {
    height: 44px !important;
    min-height: 0;
    overflow: hidden;
    resize: none;
}
.ebc-beep-win.minimized .ebc-beep-win-history,
.ebc-beep-win.minimized .ebc-beep-reply-bar,
.ebc-beep-win.minimized .ebc-beep-win-footer { display: none !important; }


.ebc-beep-win-unread-dot {
    width: 8px;
    height: 8px;
    background: #cf6f98;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 4px #cf6f98;
    display: none;
}
.ebc-beep-win-unread-dot.visible { display: block; }

.ebc-beep-reply-bar {
    display: flex;
    align-items: center;
    gap: 5px;
    background: #2a0e1e;
    border-top: 1px solid #4a2035;
    border-left: 3px solid #cf6f98;
    padding: 4px 8px;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    color: #c88aa8;
    flex-shrink: 0;
}
.ebc-beep-reply-bar span {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.ebc-beep-reply-cancel {
    background: none;
    border: none;
    color: #7a5a6a;
    cursor: pointer;
    font-size: 11px;
    padding: 0 2px;
    flex-shrink: 0;
}
.ebc-beep-reply-cancel:hover { color: #cf6f98; }

.ebc-beep-quote {
    border-left: 2px solid #cf6f9880;
    padding: 2px 5px;
    margin-bottom: 3px;
    font-size: 9px;
    color: #8a5a78;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
}
.ebc-beep-img {
    max-width: 100%;
    max-height: 160px;
    border-radius: 4px;
    margin-top: 3px;
    display: block;
    cursor: pointer;
}
.ebc-beep-reply-btn {
    background: none;
    border: none;
    color: #5a3a4a;
    cursor: pointer;
    font-size: 9px;
    padding: 1px 3px;
    border-radius: 3px;
    margin-top: 2px;
    align-self: flex-end;
}
.ebc-beep-reply-btn:hover { color: #cf6f98; background: #2a0e1e; }

/* -- Free-float panel mode -- */
#emerybc-panel.ebc-free-mode {
    position: fixed !important;
    right: auto !important;
    top: auto;           /* no !important — inline style.top must win during drag */
    height: min(80vh, 650px) !important;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    transition: opacity 0.18s !important;
    transform: none !important;
}
#emerybc-panel.ebc-free-mode.ebc-closed {
    opacity: 0 !important;
    pointer-events: none !important;
    transform: none !important;
}
#emerybc-panel.ebc-free-mode.ebc-open {
    opacity: 1 !important;
    pointer-events: auto !important;
    transform: none !important;
}
.ebc-free-mode .ebc-header {
    cursor: grab;
    border-radius: 8px 8px 0 0;
}
.ebc-free-mode .ebc-header:active { cursor: grabbing; }
.ebc-reset-loc-btn {
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 5px;
    color: #967281;
    cursor: pointer;
    padding: 2px 6px;
    font-size: 10px;
    font-family: "Trebuchet MS", serif;
    white-space: nowrap;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
}
.ebc-reset-loc-btn:hover { background: #4c2537; color: #f7e6ee; border-color: #cf6f98; }


/* -- Schedule rows (inside outfits tab) -- */
.ebc-schedule-row {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 7px;
    border-radius: 6px;
    margin-bottom: 3px;
    background: rgba(42, 20, 33, 0.5);
    border: 1px solid #3a1928;
}

.ebc-schedule-name {
    flex: 1;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-schedule-time {
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    color: #e8d07a;
    white-space: nowrap;
    flex-shrink: 0;
}

/* -- Seq step builder -- */
.ebc-seq-builder {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 3px;
    padding: 5px;
    background: rgba(27, 13, 23, 0.7);
    border: 1px solid #3a1928;
    border-radius: 5px;
}

.ebc-seq-step-row {
    display: flex;
    align-items: center;
    gap: 3px;
}

.ebc-seq-type-select {
    flex-shrink: 0;
    width: 80px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #cf6f98;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    padding: 2px 3px;
    outline: none;
}

.ebc-seq-text-inp {
    flex: 1;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #f7e6ee;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    padding: 2px 4px;
    outline: none;
    min-width: 0;
}

.ebc-seq-delay-inp {
    flex-shrink: 0;
    width: 50px;
    background: #1b0d17;
    border: 1px solid #4c2537;
    border-radius: 4px;
    color: #e8d07a;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    padding: 2px 3px;
    outline: none;
    text-align: center;
}

.ebc-seq-step-del {
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: #553142;
    font-size: 13px;
    cursor: pointer;
    padding: 0 2px;
    line-height: 1;
}
.ebc-seq-step-del:hover { color: #cf6f98; }

.ebc-seq-add-btn {
    width: 100%;
    background: transparent;
    border: 1px dashed #4c2537;
    border-radius: 4px;
    color: #7a4a5e;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 9px;
    padding: 3px 0;
    margin-top: 2px;
    transition: background 0.14s, color 0.12s;
}
.ebc-seq-add-btn:hover { background: #1b0d17; color: #cf6f98; border-style: solid; }
`;
    // -- VIP members (highlighted in Notes tab when present in the room) -----------
    const VIP_MEMBERS = {
        130267: { label: "creator", color: "#e8d07a" }, // Emery
        143776: { label: "Sin", color: "#cf6f98" },
        124264: { label: "Lara", color: "#f7b8d4" },
        230466: { label: "Lucy", color: "#b8a0f7" },
    };
    class EBCDrawer {
        constructor(version = "") {
            this.rootEl = null; // zero-width anchor (positioned)
            this.panelEl = null; // sliding panel (transforms)
            this.isOpen = false;
            this.currentTab = "outfits";
            this.resizeObserver = null;
            this.positioned = false;
            this.version = "";
            this.refreshBadgeRow = null;
            this.refreshConfirmToggle = null;
            this.beepWins = new Map();
            this.beepUnread = new Map();
            this.lastRect = { top: -1, width: -1, height: -1, right: -1 };
            this.lastCrabsBottom = -1;
            this.crabsPoller = null;
            this.timerEl = null;
            this.timerPoller = null;
            // User-dragged tab position (fixed screen coords {x,y}). null = follow CRABS.
            this.userTabOffset = null;
            // Set to true once we've confirmed no saved position exists, so we stop polling storage.
            this.tabOffsetChecked = false;
            this.tabDragging = false; // true while mouse is held on tab — blocks CRABS poller
            this.domSelectedTargets = new Set();
            // Free-float panel position. null = anchored to chat log (default slide behaviour).
            this.panelPosition = null;
            this.resetLocationBtn = null;
            // DEV tab auto-refresh poller
            this.devLogPoller = null;
            EBCDrawer._instance = this;
            this.version = version;
            if (document.body) {
                this.setup();
            }
            else {
                document.addEventListener("DOMContentLoaded", () => this.setup());
            }
        }
        // -- Setup -----------------------------------------------------------------
        setup() {
            if (this.rootEl)
                return;
            this.injectStyles();
            // Root anchor - zero-width, positioned at chat log right edge.
            // The tab lives here (always visible). The panel is a sibling that slides.
            const root = document.createElement("div");
            root.id = "emerybc-root";
            root.style.display = "none";
            root.style.right = "-9999px"; // off-screen until syncToChat runs
            // Tab button - child of root, OUTSIDE the sliding panel so it never moves.
            const tab = document.createElement("div");
            tab.id = "ebc-tab";
            tab.title = "EmeryBC";
            tab.innerHTML = TAB_ICON;
            // Panel starts closed — clip the tab so it doesn't block the BC canvas.
            tab.classList.add("ebc-tab-closed");
            root.appendChild(tab);
            // Sliding panel container - this is the only thing that transforms
            const slideContainer = document.createElement("div");
            slideContainer.id = "emerybc-panel";
            slideContainer.className = "ebc-closed";
            // Inner panel (visual content)
            const panel = document.createElement("div");
            panel.className = "ebc-panel";
            // Header
            const header = document.createElement("div");
            header.className = "ebc-header";
            const title = document.createElement("span");
            title.className = "ebc-title";
            title.textContent = "EmeryBC" + (this.version ? " v" + this.version : "");
            const headerBtns = document.createElement("div");
            headerBtns.className = "ebc-header-btns";
            const refreshBtn = document.createElement("button");
            refreshBtn.className = "ebc-icon-btn";
            refreshBtn.title = "Refresh";
            refreshBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
            // Drag handle icon — same mousedown behaviour as the header title area.
            const moveHandle = document.createElement("span");
            moveHandle.className = "ebc-move-handle";
            moveHandle.title = "Drag to move";
            moveHandle.textContent = "⠿";
            const resetLocBtn = document.createElement("button");
            resetLocBtn.className = "ebc-reset-loc-btn";
            resetLocBtn.title = "Reset drawer to default position (anchored to chat log)";
            resetLocBtn.textContent = "⌖ Reset pos";
            resetLocBtn.style.display = "none"; // hidden until panel is in free-float mode
            this.resetLocationBtn = resetLocBtn;
            const closeBtn = document.createElement("button");
            closeBtn.className = "ebc-icon-btn";
            closeBtn.title = "Close";
            closeBtn.textContent = "X";
            headerBtns.appendChild(refreshBtn);
            headerBtns.appendChild(moveHandle);
            headerBtns.appendChild(resetLocBtn);
            headerBtns.appendChild(closeBtn);
            header.appendChild(title);
            header.appendChild(headerBtns);
            // Header drag — moves the panel when in free-float mode.
            // In anchored mode it drags to detach the panel; after 5px movement the panel
            // enters free-float mode and follows the cursor from that point.
            header.addEventListener("mousedown", (e) => {
                if (e.button !== 0)
                    return;
                // Don't interfere with button clicks inside the header
                if (e.target.closest("button"))
                    return;
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                // Starting position of the panel
                const panelEl = slideContainer;
                const startRect = panelEl.getBoundingClientRect();
                let inFreeMode = this.panelPosition !== null;
                let startPanelX = inFreeMode ? this.panelPosition.x : startRect.left;
                let startPanelY = inFreeMode ? this.panelPosition.y : startRect.top;
                let hasDragged = false;
                const onMove = (ev) => {
                    const dx = ev.clientX - startX;
                    const dy = ev.clientY - startY;
                    if (!hasDragged && Math.abs(dx) < 5 && Math.abs(dy) < 5)
                        return;
                    if (!hasDragged) {
                        hasDragged = true;
                        // Enter free-float mode on first real movement
                        if (!inFreeMode) {
                            inFreeMode = true;
                            startPanelX = startRect.left;
                            startPanelY = startRect.top;
                            this.enterFreeMode({ x: startPanelX, y: startPanelY });
                        }
                    }
                    const newX = Math.max(0, Math.min(window.innerWidth - 50, startPanelX + dx));
                    const newY = Math.max(0, Math.min(window.innerHeight - 50, startPanelY + dy));
                    panelEl.style.left = `${newX}px`;
                    panelEl.style.top = `${newY}px`;
                };
                const onUp = () => {
                    document.removeEventListener("mousemove", onMove);
                    document.removeEventListener("mouseup", onUp);
                    if (!hasDragged)
                        return;
                    // Save final position
                    const x = parseInt(panelEl.style.left, 10);
                    const y = parseInt(panelEl.style.top, 10);
                    this.panelPosition = { x, y };
                    this.savePanelPosition({ x, y });
                };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
            });
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
            const posesTabBtn = document.createElement("button");
            posesTabBtn.className = "ebc-tab-btn";
            posesTabBtn.id = "ebc-tab-poses";
            posesTabBtn.textContent = "ANIMS";
            const notesTabBtn = document.createElement("button");
            notesTabBtn.className = "ebc-tab-btn";
            notesTabBtn.id = "ebc-tab-notes";
            notesTabBtn.textContent = "USERS";
            const thanksTabBtn = document.createElement("button");
            thanksTabBtn.className = "ebc-tab-btn";
            thanksTabBtn.id = "ebc-tab-thanks";
            thanksTabBtn.textContent = "CREDITS";
            thanksTabBtn.title = "Special Thanks";
            const devTabBtn2 = document.createElement("button");
            devTabBtn2.className = "ebc-tab-btn";
            devTabBtn2.id = "ebc-tab-dev";
            devTabBtn2.textContent = "DEV";
            devTabBtn2.title = "Developer Tools";
            // DOM tools tab — creator only, hidden until open() confirms the member number
            const domTabBtn = document.createElement("button");
            domTabBtn.className = "ebc-tab-btn";
            domTabBtn.id = "ebc-tab-dom";
            domTabBtn.textContent = "DOM";
            domTabBtn.title = "DOM Tools";
            domTabBtn.style.display = "none"; // revealed in open() for creator only
            tabBar.appendChild(outfitTabBtn);
            tabBar.appendChild(buttonsTabBtn);
            tabBar.appendChild(posesTabBtn);
            tabBar.appendChild(notesTabBtn);
            tabBar.appendChild(thanksTabBtn);
            tabBar.appendChild(devTabBtn2);
            tabBar.appendChild(domTabBtn);
            // Quick actions bar (always visible below tabs)
            const quickActions = document.createElement("div");
            quickActions.className = "ebc-quick-actions";
            quickActions.style.cssText = quickActions.style.cssText + ";flex-direction:column;gap:4px;";
            // Row 1: all-at-once danger buttons
            const qaRow1 = document.createElement("div");
            qaRow1.style.cssText = "display:flex;gap:5px;";
            const releaseBtn = document.createElement("button");
            releaseBtn.className = "ebc-action-btn danger";
            releaseBtn.title = "Remove all restraints (skips owner/lover/family locks)";
            releaseBtn.textContent = "Release Restraints";
            const unlockBtn = document.createElement("button");
            unlockBtn.className = "ebc-action-btn danger";
            unlockBtn.title = "Remove all locks (skips owner/lover/family locks)";
            unlockBtn.textContent = "Remove Locks";
            qaRow1.appendChild(releaseBtn);
            qaRow1.appendChild(unlockBtn);
            quickActions.appendChild(qaRow1);
            // Row 1b: confirm-before-escaping (centered, subtle, between danger buttons and picker)
            const qaConfirmRow = document.createElement("div");
            qaConfirmRow.style.cssText = "display:flex;align-items:center;justify-content:center;gap:7px;";
            const qaConfirmLbl = document.createElement("span");
            qaConfirmLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#9a6878;user-select:none;";
            qaConfirmLbl.textContent = "Confirm before escaping";
            const qaConfirmToggle = document.createElement("button");
            const refreshQaConfirm = () => {
                const on = getAntiRestraintConfirm();
                qaConfirmToggle.textContent = on ? "ON" : "OFF";
                qaConfirmToggle.style.cssText = [
                    "font-family:'Trebuchet MS',serif",
                    "font-size:9px",
                    "font-weight:bold",
                    "padding:1px 8px",
                    "border-radius:4px",
                    "cursor:pointer",
                    "flex-shrink:0",
                    "border:1px solid " + (on ? "#cf6f98" : "#3a1928"),
                    "background:" + (on ? "#4a1f30" : "#100508"),
                    "color:" + (on ? "#f7e6ee" : "#4c2537"),
                    "transition:background 0.14s,color 0.14s,border-color 0.14s",
                ].join(";");
            };
            refreshQaConfirm();
            this.refreshConfirmToggle = refreshQaConfirm;
            qaConfirmToggle.addEventListener("click", () => {
                setAntiRestraintConfirm(!getAntiRestraintConfirm());
                refreshQaConfirm();
            });
            qaConfirmRow.appendChild(qaConfirmLbl);
            qaConfirmRow.appendChild(qaConfirmToggle);
            quickActions.appendChild(qaConfirmRow);
            // Row 2: self-picker toggle (full-width, subtle)
            const selfPickToggle = document.createElement("button");
            selfPickToggle.style.cssText = "width:100%;font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 6px;border-radius:5px;border:1px dashed #4c2537;background:transparent;color:#7a4a5e;cursor:pointer;transition:background 0.14s,color 0.12s;text-align:left;";
            selfPickToggle.textContent = "↓ Pick items to remove from yourself";
            selfPickToggle.title = "Choose specific restraints or locks to strip from yourself";
            selfPickToggle.addEventListener("mouseenter", () => { selfPickToggle.style.color = "#cf6f98"; });
            selfPickToggle.addEventListener("mouseleave", () => { if (selfPickPanel.style.display === "none")
                selfPickToggle.style.color = "#7a4a5e"; });
            quickActions.appendChild(selfPickToggle);
            // Self-picker panel (collapsed by default, sits between quickActions and badgeRow)
            const selfPickPanel = document.createElement("div");
            selfPickPanel.style.cssText = "display:none;flex-direction:column;gap:5px;flex-shrink:0;background:rgba(20,8,16,0.85);border-top:1px solid #2a1421;padding:7px 8px;max-height:220px;overflow-y:auto;";
            const selfPickStatus = document.createElement("div");
            selfPickStatus.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#79a885;min-height:13px;";
            // Track selections: group → "restraint" | "lock"
            const selfSelected = new Map();
            const rebuildSelfPicker = () => {
                while (selfPickPanel.firstChild)
                    selfPickPanel.removeChild(selfPickPanel.firstChild);
                selfSelected.clear();
                const restraints = getPlayerRestraints();
                const locks = getPlayerLockedItems();
                if (restraints.length === 0 && locks.length === 0) {
                    const hint = document.createElement("div");
                    hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:2px;";
                    hint.textContent = "Nothing to remove — no restraints or locks found.";
                    selfPickPanel.appendChild(hint);
                    selfPickPanel.appendChild(selfPickStatus);
                    return;
                }
                const makeSection = (title, items, kind) => {
                    if (items.length === 0)
                        return;
                    const hdr = document.createElement("div");
                    hdr.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;";
                    hdr.textContent = title;
                    selfPickPanel.appendChild(hdr);
                    for (const item of items) {
                        const lbl = document.createElement("label");
                        lbl.style.cssText = "display:flex;align-items:center;gap:6px;padding:2px 4px;border-radius:3px;cursor:pointer;";
                        lbl.addEventListener("mouseenter", () => { lbl.style.background = "rgba(42,20,33,0.6)"; });
                        lbl.addEventListener("mouseleave", () => { lbl.style.background = ""; });
                        const cb = document.createElement("input");
                        cb.type = "checkbox";
                        cb.style.cssText = "cursor:pointer;accent-color:#cf6f98;flex-shrink:0;";
                        cb.addEventListener("change", () => {
                            if (cb.checked)
                                selfSelected.set(item.group, kind);
                            else
                                selfSelected.delete(item.group);
                        });
                        const nm = document.createElement("span");
                        nm.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;color:#f7e6ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
                        nm.textContent = item.name;
                        const gr = document.createElement("span");
                        gr.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;white-space:nowrap;flex-shrink:0;";
                        gr.textContent = item.group.replace("Item", "");
                        lbl.appendChild(cb);
                        lbl.appendChild(nm);
                        lbl.appendChild(gr);
                        selfPickPanel.appendChild(lbl);
                    }
                };
                makeSection("Restraints", restraints, "restraint");
                makeSection("Locks", locks, "lock");
                // Two action buttons
                const btnRow = document.createElement("div");
                btnRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:3px;";
                const removeSelBtn = document.createElement("button");
                removeSelBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 3px;border-radius:5px;border:1px solid #7a3a50;background:#3a1020;color:#cf6f98;cursor:pointer;transition:background 0.14s;";
                removeSelBtn.textContent = "↑ Remove Selected";
                removeSelBtn.addEventListener("mouseenter", () => { removeSelBtn.style.background = "#5a1c30"; });
                removeSelBtn.addEventListener("mouseleave", () => { removeSelBtn.style.background = "#3a1020"; });
                removeSelBtn.addEventListener("click", () => {
                    const groups = [...selfSelected.entries()].filter(([, k]) => k === "restraint").map(([g]) => g);
                    if (groups.length === 0) {
                        selfPickStatus.textContent = "Select restraints first.";
                        return;
                    }
                    const n = removePlayerSpecificItems(groups);
                    selfPickStatus.textContent = n > 0 ? ("✓ Removed " + n + " item(s).") : "Nothing removed.";
                    rebuildSelfPicker();
                    window.setTimeout(() => { selfPickStatus.textContent = ""; }, 3000);
                });
                const unlockSelBtn = document.createElement("button");
                unlockSelBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 3px;border-radius:5px;border:1px solid #3a6a50;background:#0f2a1a;color:#79a885;cursor:pointer;transition:background 0.14s;";
                unlockSelBtn.textContent = "🔓 Unlock Selected";
                unlockSelBtn.addEventListener("mouseenter", () => { unlockSelBtn.style.background = "#1a4a2a"; });
                unlockSelBtn.addEventListener("mouseleave", () => { unlockSelBtn.style.background = "#0f2a1a"; });
                unlockSelBtn.addEventListener("click", () => {
                    const groups = [...selfSelected.entries()].filter(([, k]) => k === "lock").map(([g]) => g);
                    if (groups.length === 0) {
                        selfPickStatus.textContent = "Select locks first.";
                        return;
                    }
                    const n = unlockPlayerSpecificItems(groups);
                    selfPickStatus.textContent = n > 0 ? ("✓ Unlocked " + n + " item(s).") : "Nothing unlocked.";
                    rebuildSelfPicker();
                    window.setTimeout(() => { selfPickStatus.textContent = ""; }, 3000);
                });
                btnRow.appendChild(removeSelBtn);
                btnRow.appendChild(unlockSelBtn);
                selfPickPanel.appendChild(btnRow);
                selfPickPanel.appendChild(selfPickStatus);
            };
            selfPickToggle.addEventListener("click", () => {
                const isOpen = selfPickPanel.style.display !== "none";
                selfPickPanel.style.display = isOpen ? "none" : "flex";
                selfPickToggle.style.borderStyle = isOpen ? "dashed" : "solid";
                selfPickToggle.style.color = isOpen ? "#7a4a5e" : "#cf6f98";
                if (!isOpen)
                    rebuildSelfPicker();
            });
            releaseBtn.addEventListener("click", () => {
                if (getAntiRestraintConfirm()) {
                    showQuickConfirm("Release all restraints?", () => {
                        releaseBtn.disabled = true;
                        releaseRestraints();
                        if (selfPickPanel.style.display !== "none")
                            rebuildSelfPicker();
                        window.setTimeout(() => { releaseBtn.disabled = false; }, 1500);
                    });
                    return;
                }
                releaseBtn.disabled = true;
                releaseRestraints();
                if (selfPickPanel.style.display !== "none")
                    rebuildSelfPicker();
                window.setTimeout(() => { releaseBtn.disabled = false; }, 1500);
            });
            unlockBtn.addEventListener("click", () => {
                if (getAntiRestraintConfirm()) {
                    showQuickConfirm("Remove all locks?", () => {
                        unlockBtn.disabled = true;
                        unlockItems();
                        if (selfPickPanel.style.display !== "none")
                            rebuildSelfPicker();
                        window.setTimeout(() => { unlockBtn.disabled = false; }, 1500);
                    });
                    return;
                }
                unlockBtn.disabled = true;
                unlockItems();
                if (selfPickPanel.style.display !== "none")
                    rebuildSelfPicker();
                window.setTimeout(() => { unlockBtn.disabled = false; }, 1500);
            });
            // Badge visibility toggle row (below the danger buttons)
            const badgeRow = document.createElement("div");
            badgeRow.style.cssText = "display:flex;align-items:center;gap:6px;padding:5px 7px;border-top:1px solid #2a1421;background:rgba(20,8,16,0.5);flex-shrink:0;";
            const badgeLbl = document.createElement("span");
            badgeLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;flex:1;user-select:none;";
            badgeLbl.textContent = "Show EBC tags";
            const badgeToggle = document.createElement("button");
            const updateBadgeToggle = () => {
                const on = getBadgeEnabled();
                badgeToggle.textContent = on ? "ON" : "OFF";
                badgeToggle.style.cssText = [
                    "font-family:'Trebuchet MS',serif",
                    "font-size:10px",
                    "font-weight:bold",
                    "padding:2px 10px",
                    "border-radius:4px",
                    "cursor:pointer",
                    "border:1px solid " + (on ? "#cf6f98" : "#4c2537"),
                    "background:" + (on ? "#6b3048" : "#1b0d17"),
                    "color:" + (on ? "#f7e6ee" : "#553142"),
                    "transition:background 0.14s,color 0.14s,border-color 0.14s",
                ].join(";");
                badgeToggle.title = on
                    ? "EBC tags visible — click to hide them on your screen"
                    : "EBC tags hidden — click to show them on your screen";
            };
            this.refreshBadgeRow = updateBadgeToggle;
            try {
                updateBadgeToggle();
            }
            catch ( /* Player may not be ready yet — synced on first open */_a) { /* Player may not be ready yet — synced on first open */ }
            badgeToggle.addEventListener("click", () => {
                // Client-side only — toggle just controls what YOU see locally.
                // Your own presence is always broadcast regardless of this setting.
                setBadgeEnabled(!getBadgeEnabled());
                updateBadgeToggle();
            });
            badgeRow.appendChild(badgeLbl);
            badgeRow.appendChild(badgeToggle);
            // Body
            const body = document.createElement("div");
            body.className = "ebc-body";
            body.id = "ebc-body";
            // Footer: version + credit line + live timer
            const footer = document.createElement("div");
            footer.className = "ebc-footer";
            footer.textContent = `EmeryBC v${this.version} · UI inspired by CRABS by Sin`;
            const timerEl = document.createElement("div");
            timerEl.className = "ebc-timer";
            footer.appendChild(timerEl);
            this.timerEl = timerEl;
            panel.appendChild(header);
            panel.appendChild(tabBar);
            panel.appendChild(quickActions);
            panel.appendChild(selfPickPanel);
            panel.appendChild(badgeRow);
            panel.appendChild(body);
            panel.appendChild(footer);
            slideContainer.appendChild(panel);
            root.appendChild(slideContainer);
            document.body.appendChild(root);
            this.rootEl = root;
            this.panelEl = slideContainer;
            // Events — tab supports both click (toggle) and drag (reposition anywhere on screen).
            // We distinguish the two by tracking how far the mouse moved (5px dead-zone).
            tab.addEventListener("mousedown", (e) => {
                if (e.button !== 0)
                    return; // left-click only
                e.preventDefault();
                // Block CRABS poller from overwriting style.top while dragging.
                // The poller uses absolute (chat-log-relative) coords; once the tab
                // switches to position:fixed those coords are in the wrong system.
                this.tabDragging = true;
                const startX = e.clientX;
                const startY = e.clientY;
                // Starting screen-space position of the tab
                const tabRect = tab.getBoundingClientRect();
                const startTabX = tabRect.left;
                const startTabY = tabRect.top;
                let dragged = false;
                const onMove = (ev) => {
                    const dx = ev.clientX - startX;
                    const dy = ev.clientY - startY;
                    if (!dragged && Math.abs(dx) < 5 && Math.abs(dy) < 5)
                        return; // dead-zone
                    dragged = true;
                    tab.style.cursor = "grabbing";
                    // Switch to fixed positioning the moment the user starts dragging
                    if (tab.style.position !== "fixed") {
                        tab.style.position = "fixed";
                    }
                    const newX = Math.max(0, Math.min(window.innerWidth - 44, startTabX + dx));
                    const newY = Math.max(0, Math.min(window.innerHeight - 44, startTabY + dy));
                    tab.style.left = `${newX}px`;
                    tab.style.top = `${newY}px`;
                };
                const onUp = () => {
                    document.removeEventListener("mousemove", onMove);
                    document.removeEventListener("mouseup", onUp);
                    tab.style.cursor = "";
                    this.tabDragging = false; // re-enable CRABS poller
                    if (!dragged) {
                        // No significant movement — treat as a plain click
                        this.toggle();
                        return;
                    }
                    // Save new position as screen-space fixed coords
                    const pos = {
                        x: parseInt(tab.style.left, 10),
                        y: parseInt(tab.style.top, 10),
                    };
                    this.userTabOffset = pos;
                    this.lastCrabsBottom = -1; // force CRABS re-read next poll
                    this.saveTabOffset(pos);
                };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
            });
            // Right-click on tab resets to auto-position (follow CRABS / default)
            tab.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                this.userTabOffset = null;
                this.tabOffsetChecked = true; // no need to re-poll — user explicitly reset
                this.lastCrabsBottom = -1;
                // Clear inline fixed-position overrides so CSS absolute layout takes over
                tab.style.position = "";
                tab.style.left = "";
                tab.style.top = "";
                this.saveTabOffset(null); // null = reset to auto
                this.updateCrabsPosition();
            });
            resetLocBtn.addEventListener("click", () => {
                // Reset panel to anchored mode
                this.panelPosition = null;
                this.savePanelPosition(null);
                this.exitFreeMode();
                // Also reset the hamburger tab to auto-position (follow CRABS)
                this.userTabOffset = null;
                this.lastCrabsBottom = -1;
                tab.style.position = "";
                tab.style.left = "";
                tab.style.top = "";
                this.saveTabOffset(null);
                this.updateCrabsPosition();
            });
            closeBtn.addEventListener("click", () => this.close());
            refreshBtn.addEventListener("click", () => {
                refreshBtn.classList.add("spinning");
                refreshBtn.addEventListener("animationend", () => refreshBtn.classList.remove("spinning"), { once: true });
                this.renderCurrentTab();
            });
            outfitTabBtn.addEventListener("click", () => this.switchTab("outfits"));
            buttonsTabBtn.addEventListener("click", () => this.switchTab("buttons"));
            posesTabBtn.addEventListener("click", () => this.switchTab("anims"));
            notesTabBtn.addEventListener("click", () => this.switchTab("notes"));
            thanksTabBtn.addEventListener("click", () => this.switchTab("thanks"));
            devTabBtn2.addEventListener("click", () => this.switchTab("dev"));
            domTabBtn.addEventListener("click", () => this.switchTab("dom"));
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
        // Aligned to the right edge of TextAreaChatLog.
        // Our tab is positioned dynamically just below CRABS's tab (#drawer-tab).
        // Because both addons respond to the same layout events the read order is
        // non-deterministic, so we poll CRABS's position every 200 ms instead of
        // relying on a one-shot read during syncToChat().
        syncToChat() {
            const chatLog = document.getElementById("TextAreaChatLog");
            if (!chatLog || !this.rootEl)
                return false;
            const rect = chatLog.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0)
                return false;
            const rightOffset = document.documentElement.clientWidth - rect.right;
            // Only write to the DOM when the chat log actually moved or resized —
            // eliminates layout thrashing on every animation frame (pattern from CRABS).
            if (this.lastRect.top !== rect.top ||
                this.lastRect.width !== rect.width ||
                this.lastRect.height !== rect.height ||
                this.lastRect.right !== rightOffset) {
                // Cap height so the panel never extends below the visible viewport.
                const maxH = Math.max(100, window.innerHeight - rect.top - 8);
                const panelH = Math.min(rect.height, maxH);
                this.rootEl.style.top = `${rect.top}px`;
                this.rootEl.style.right = `${rightOffset}px`;
                this.rootEl.style.height = `${panelH}px`;
                this.lastRect = { top: rect.top, width: rect.width, height: rect.height, right: rightOffset };
                this.positioned = true;
                // Chat log moved — force a fresh CRABS position read next tick
                this.lastCrabsBottom = -1;
                // Re-apply user's saved tab position (if any) after layout changes
                if (this.userTabOffset !== null) {
                    const tabEl = this.rootEl.querySelector("#ebc-tab");
                    if (tabEl)
                        this.applyTabOffset(tabEl, this.userTabOffset);
                }
            }
            // Load saved tab offset once on first successful position sync
            if (this.userTabOffset === null) {
                const saved = this.loadTabOffset();
                if (saved !== null) {
                    this.userTabOffset = saved;
                    const tabEl = this.rootEl.querySelector("#ebc-tab");
                    if (tabEl)
                        this.applyTabOffset(tabEl, saved);
                }
            }
            // Do an immediate CRABS position read (poller may not have fired yet).
            this.updateCrabsPosition();
            return true;
        }
        // -- Tab position persistence -----------------------------------------------
        saveTabOffset(pos) {
            try {
                if (!Player.ExtensionSettings.EmeryBC)
                    Player.ExtensionSettings.EmeryBC = {};
                Player.ExtensionSettings.EmeryBC.tabPos = pos !== null && pos !== void 0 ? pos : null;
                ServerPlayerExtensionSettingsSync("EmeryBC");
            }
            catch ( /* ignore */_a) { /* ignore */ }
        }
        loadTabOffset() {
            try {
                const store = Player.ExtensionSettings.EmeryBC;
                // New tabPos format: {x, y}
                const v = store === null || store === void 0 ? void 0 : store.tabPos;
                if (v && typeof v.x === "number" && typeof v.y === "number")
                    return { x: v.x, y: v.y };
                return null;
            }
            catch (_a) {
                return null;
            }
        }
        // Apply a saved/dragged fixed-screen position to the tab element immediately.
        applyTabOffset(tabEl, pos) {
            const x = Math.max(0, Math.min(window.innerWidth - 44, pos.x));
            const y = Math.max(0, Math.min(window.innerHeight - 44, pos.y));
            tabEl.style.position = "fixed";
            tabEl.style.left = `${x}px`;
            tabEl.style.top = `${y}px`;
        }
        // -- Panel free-float mode -------------------------------------------------
        savePanelPosition(pos) {
            try {
                if (!Player.ExtensionSettings.EmeryBC)
                    Player.ExtensionSettings.EmeryBC = {};
                Player.ExtensionSettings.EmeryBC.panelPos = pos !== null && pos !== void 0 ? pos : null;
                ServerPlayerExtensionSettingsSync("EmeryBC");
            }
            catch ( /* ignore */_a) { /* ignore */ }
        }
        loadPanelPosition() {
            try {
                const store = Player.ExtensionSettings.EmeryBC;
                const v = store === null || store === void 0 ? void 0 : store.panelPos;
                if (v && typeof v.x === "number" && typeof v.y === "number")
                    return { x: v.x, y: v.y };
                return null;
            }
            catch (_a) {
                return null;
            }
        }
        enterFreeMode(pos) {
            if (!this.panelEl)
                return;
            const w = window.innerWidth;
            const h = window.innerHeight;
            const x = Math.max(0, Math.min(w - 100, pos.x));
            const y = Math.max(0, Math.min(h - 100, pos.y));
            this.panelEl.classList.add("ebc-free-mode");
            this.panelEl.style.left = `${x}px`;
            this.panelEl.style.top = `${y}px`;
            if (this.resetLocationBtn)
                this.resetLocationBtn.style.display = "";
        }
        exitFreeMode() {
            if (!this.panelEl)
                return;
            this.panelEl.classList.remove("ebc-free-mode");
            this.panelEl.style.left = "";
            this.panelEl.style.top = "";
            if (this.resetLocationBtn)
                this.resetLocationBtn.style.display = "none";
        }
        // Reads CRABS's #drawer-tab position and updates our tab's top accordingly.
        // Skipped entirely when the user has pinned a custom position via drag.
        // Safe to call at any frequency — writes the DOM only when the value changes.
        updateCrabsPosition() {
            if (!this.rootEl || !this.positioned)
                return;
            if (this.tabDragging)
                return; // don't interfere with an active drag
            const tabEl = this.rootEl.querySelector("#ebc-tab");
            if (!tabEl)
                return;
            // Once a saved position is confirmed or absent, skip polling storage.
            if (this.userTabOffset !== null)
                return; // user has pinned a position — don't override
            // Keep retrying storage until we either load a value or confirm none exists.
            // ExtensionSettings is restored from the server asynchronously after ChatRoomSync,
            // so the first few polls may see an empty store even if a position was saved.
            if (!this.tabOffsetChecked) {
                const saved = this.loadTabOffset();
                if (saved !== null) {
                    this.userTabOffset = saved;
                    this.applyTabOffset(tabEl, saved);
                    return;
                }
                // Only stop polling once ExtensionSettings has fully loaded (EmeryBC key exists)
                try {
                    if (Player.ExtensionSettings.EmeryBC !== undefined)
                        this.tabOffsetChecked = true;
                }
                catch ( /* ignore */_a) { /* ignore */ }
            }
            const crabsTab = document.getElementById("drawer-tab");
            if (!crabsTab)
                return; // CRABS absent — CSS default (top:58px) stays
            const crabsRect = crabsTab.getBoundingClientRect();
            if (crabsRect.bottom === this.lastCrabsBottom)
                return; // nothing changed
            const chatLog = document.getElementById("TextAreaChatLog");
            if (!chatLog)
                return;
            const chatRect = chatLog.getBoundingClientRect();
            const tabTop = Math.max(4, crabsRect.bottom + 8 - chatRect.top);
            tabEl.style.top = `${tabTop}px`;
            this.lastCrabsBottom = crabsRect.bottom;
        }
        // Poll CRABS's tab position while in a chat room so we stay in sync even
        // if CRABS repositions itself after our ResizeObserver already fired.
        startCrabsPoller() {
            if (this.crabsPoller !== null)
                return;
            this.crabsPoller = window.setInterval(() => this.updateCrabsPosition(), 200);
        }
        stopCrabsPoller() {
            if (this.crabsPoller === null)
                return;
            window.clearInterval(this.crabsPoller);
            this.crabsPoller = null;
            this.lastCrabsBottom = -1;
        }
        // -- Visibility ------------------------------------------------------------
        updateVisibility() {
            var _a, _b;
            if (!this.rootEl || !this.panelEl)
                return;
            const inRoom = typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatRoom";
            if (!inRoom) {
                this.rootEl.style.display = "none";
                this.isOpen = false;
                this.panelEl.className = "ebc-closed";
                const tabEl2 = this.rootEl.querySelector("#ebc-tab");
                if (tabEl2)
                    tabEl2.classList.add("ebc-tab-closed");
                this.positioned = false;
                this.lastRect = { top: -1, width: -1, height: -1, right: -1 };
                this.tabOffsetChecked = false; // re-check on next room enter in case settings changed
                (_a = this.resizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
                this.resizeObserver = null;
                this.stopCrabsPoller();
                this.stopTimerPoller();
                return;
            }
            // Try to position; if the chat log isn't laid out yet, retry next frame
            const synced = this.syncToChat();
            if (synced) {
                this.rootEl.style.display = "block";
            }
            else {
                requestAnimationFrame(() => {
                    if (this.syncToChat() && this.rootEl) {
                        this.rootEl.style.display = "block";
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
            // Keep EBC tab locked below CRABS regardless of who repositions first.
            this.startCrabsPoller();
            this.startTimerPoller();
            // Re-read persisted settings — BC may restore ExtensionSettings after the
            // drawer is first built, so we refresh any toggles that depend on them.
            try {
                (_b = this.refreshConfirmToggle) === null || _b === void 0 ? void 0 : _b.call(this);
            }
            catch ( /* ignore */_c) { /* ignore */ }
        }
        // -- Tab switching ---------------------------------------------------------
        stopDevLogPoller() {
            if (this.devLogPoller !== null) {
                window.clearInterval(this.devLogPoller);
                this.devLogPoller = null;
            }
        }
        switchTab(tab) {
            var _a;
            this.stopDevLogPoller();
            this.currentTab = tab;
            for (const [id, name] of [
                ["ebc-tab-outfits", "outfits"],
                ["ebc-tab-buttons", "buttons"],
                ["ebc-tab-poses", "anims"],
                ["ebc-tab-notes", "notes"],
                ["ebc-tab-thanks", "thanks"],
                ["ebc-tab-dev", "dev"],
                ["ebc-tab-dom", "dom"],
            ]) {
                const el = (_a = this.rootEl) === null || _a === void 0 ? void 0 : _a.querySelector(`#${id}`);
                if (el)
                    el.className = "ebc-tab-btn" + (tab === name ? " ebc-tab-active" : "");
            }
            this.renderCurrentTab();
        }
        renderCurrentTab() {
            if (this.currentTab === "outfits")
                this.renderOutfits();
            else if (this.currentTab === "buttons")
                this.renderButtons();
            else if (this.currentTab === "anims")
                this.renderPoses();
            else if (this.currentTab === "notes")
                this.renderNotes();
            else if (this.currentTab === "thanks")
                this.renderThanks();
            else if (this.currentTab === "dev")
                this.renderDev();
            else if (this.currentTab === "dom")
                this.renderDomTools();
        }
        // -- Timer -----------------------------------------------------------------
        updateTimer() {
            if (!this.timerEl)
                return;
            const online = getOnlineTime();
            const room = getRoomTime();
            const bound = getRestraintTime();
            let text = `🌐 Online: ${online}`;
            if (room)
                text += `  🕒 Room: ${room}`;
            if (bound)
                text += `  ⛓ Bound: ${bound}`;
            this.timerEl.textContent = text;
            try {
                checkAndApplySchedules();
            }
            catch ( /* ignore */_a) { /* ignore */ }
        }
        startTimerPoller() {
            if (this.timerPoller !== null)
                return;
            this.updateTimer();
            this.timerPoller = window.setInterval(() => this.updateTimer(), 10000);
        }
        stopTimerPoller() {
            if (this.timerPoller === null)
                return;
            window.clearInterval(this.timerPoller);
            this.timerPoller = null;
        }
        // -- Outfits tab -----------------------------------------------------------
        renderOutfits() {
            var _a;
            const body = (_a = this.rootEl) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-body");
            if (!body)
                return;
            while (body.firstChild)
                body.removeChild(body.firstChild);
            this.renderRestraintInfo(body);
            this.renderPalettes(body);
            const outfits = getOutfits();
            const outfitLbl = document.createElement("div");
            outfitLbl.className = "ebc-section-label";
            outfitLbl.textContent = "Saved Outfits";
            body.appendChild(outfitLbl);
            if (outfits.length > 0) {
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
            this.buildScheduleSection(body);
        }
        // -- Outfit Schedule section ------------------------------------------------
        buildScheduleSection(body) {
            const divEl = document.createElement("div");
            divEl.className = "ebc-divider";
            body.appendChild(divEl);
            const lbl = document.createElement("div");
            lbl.className = "ebc-section-label";
            lbl.textContent = "Outfit Schedule";
            body.appendChild(lbl);
            const scheduleList = document.createElement("div");
            body.appendChild(scheduleList);
            const renderScheduleList = () => {
                while (scheduleList.firstChild)
                    scheduleList.removeChild(scheduleList.firstChild);
                const schedules = getSchedules();
                const outfits = getOutfits();
                if (schedules.length === 0) {
                    const empty = document.createElement("div");
                    empty.className = "ebc-empty";
                    empty.style.padding = "4px 4px 8px";
                    empty.textContent = "No schedules set.";
                    scheduleList.appendChild(empty);
                }
                for (const sched of schedules) {
                    const outfit = outfits.find(o => o.id === sched.outfitId);
                    const row = document.createElement("div");
                    row.className = "ebc-schedule-row";
                    // Enabled toggle
                    const togBtn = document.createElement("button");
                    togBtn.className = "ebc-slot-toggle" + (sched.enabled ? " on" : "");
                    togBtn.textContent = sched.enabled ? "ON" : "OFF";
                    togBtn.title = sched.enabled ? "Click to disable" : "Click to enable";
                    togBtn.addEventListener("click", () => {
                        toggleSchedule(sched.id);
                        renderScheduleList();
                    });
                    // Outfit name
                    const nameEl = document.createElement("span");
                    nameEl.className = "ebc-schedule-name";
                    nameEl.textContent = outfit ? outfit.displayName : "(deleted)";
                    nameEl.title = outfit ? ("/" + outfit.command) : "";
                    // Time
                    const timeEl = document.createElement("span");
                    timeEl.className = "ebc-schedule-time";
                    timeEl.textContent = sched.time;
                    // Delete button
                    const delBtn = document.createElement("button");
                    delBtn.className = "ebc-outfit-del";
                    delBtn.textContent = "×";
                    delBtn.title = "Remove schedule";
                    delBtn.addEventListener("click", () => {
                        removeSchedule(sched.id);
                        renderScheduleList();
                    });
                    row.appendChild(togBtn);
                    row.appendChild(nameEl);
                    row.appendChild(timeEl);
                    row.appendChild(delBtn);
                    scheduleList.appendChild(row);
                }
            };
            renderScheduleList();
            // Add schedule row
            const addRow = document.createElement("div");
            addRow.style.cssText = "display:flex;gap:5px;align-items:center;margin-top:5px;";
            const outfits = getOutfits();
            const outfitSelect = document.createElement("select");
            outfitSelect.className = "ebc-form-input";
            outfitSelect.style.flex = "1";
            if (outfits.length === 0) {
                const opt = document.createElement("option");
                opt.textContent = "No outfits";
                opt.disabled = true;
                outfitSelect.appendChild(opt);
            }
            else {
                for (const o of outfits) {
                    const opt = document.createElement("option");
                    opt.value = o.id;
                    opt.textContent = o.displayName;
                    outfitSelect.appendChild(opt);
                }
            }
            const timeInput = Object.assign(document.createElement("input"), {
                type: "text",
                placeholder: "HH:MM",
                maxLength: 5,
                title: "24-hour time (e.g. 08:30, 14:00)",
            });
            timeInput.className = "ebc-form-input";
            timeInput.style.width = "72px";
            timeInput.style.flexShrink = "0";
            // Auto-insert colon after two digits
            timeInput.addEventListener("input", () => {
                let v = timeInput.value.replace(/[^0-9]/g, "");
                if (v.length > 2)
                    v = v.slice(0, 2) + ":" + v.slice(2, 4);
                timeInput.value = v;
            });
            const addBtn = document.createElement("button");
            addBtn.className = "ebc-wear-btn";
            addBtn.textContent = "+ Add";
            addBtn.title = "Add schedule";
            addBtn.addEventListener("click", () => {
                const raw = timeInput.value.trim();
                if (!outfitSelect.value)
                    return;
                if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(raw)) {
                    timeInput.style.borderColor = "#cf6f98";
                    timeInput.title = "Use HH:MM (00:00–23:59)";
                    return;
                }
                timeInput.style.borderColor = "";
                addSchedule(outfitSelect.value, raw);
                timeInput.value = "";
                renderScheduleList();
            });
            addRow.appendChild(outfitSelect);
            addRow.appendChild(timeInput);
            addRow.appendChild(addBtn);
            body.appendChild(addRow);
        }
        // -- Restraint info --------------------------------------------------------
        renderRestraintInfo(body) {
            const label = document.createElement("div");
            label.className = "ebc-section-label";
            label.style.cursor = "pointer";
            label.style.userSelect = "none";
            const container = document.createElement("div");
            container.style.marginBottom = "6px";
            let collapsed = false;
            const render = () => {
                while (container.firstChild)
                    container.removeChild(container.firstChild);
                if (collapsed)
                    return;
                try {
                    const restraints = Player.Appearance.filter(i => RESTRAINT_GROUPS.has(i.Asset.Group.Name));
                    if (restraints.length === 0) {
                        const none = document.createElement("div");
                        none.className = "ebc-empty";
                        none.style.padding = "4px 4px 8px";
                        none.textContent = "No active restraints";
                        container.appendChild(none);
                        return;
                    }
                    for (const item of restraints) {
                        const prop = item.Property;
                        const lockedBy = prop === null || prop === void 0 ? void 0 : prop.LockedBy;
                        const group = item.Asset.Group.Name;
                        const row = document.createElement("div");
                        row.className = "ebc-restraint-row";
                        const nameEl = document.createElement("span");
                        nameEl.className = "ebc-restraint-name";
                        nameEl.textContent = item.Asset.Name;
                        nameEl.title = item.Asset.Name;
                        const groupEl = document.createElement("span");
                        groupEl.className = "ebc-restraint-group";
                        groupEl.textContent = group.replace("Item", "");
                        const lockEl = document.createElement("span");
                        if (lockedBy !== undefined) {
                            lockEl.className = "ebc-restraint-lock";
                            const lockType = (prop === null || prop === void 0 ? void 0 : prop.CombinationNumber) ? "Combo"
                                : (prop === null || prop === void 0 ? void 0 : prop.Password) ? "Pwd"
                                    : (prop === null || prop === void 0 ? void 0 : prop.MemberNumberListKeys) ? "Key"
                                        : "Lock";
                            const chars = window.ChatRoomCharacter;
                            const locker = chars === null || chars === void 0 ? void 0 : chars.find(c => c.MemberNumber === lockedBy);
                            const lockerNick = locker ? locker.Nickname : undefined;
                            const lockerName = locker ? (lockerNick || locker.Name) : `#${lockedBy}`;
                            lockEl.textContent = `🔒 ${lockType} · ${lockerName}`;
                        }
                        else {
                            lockEl.className = "ebc-restraint-lock unlocked";
                            lockEl.textContent = "Unlocked";
                        }
                        // Duration badge — how long this item has been worn
                        const dur = getRestraintItemDuration(group);
                        const durEl = document.createElement("span");
                        durEl.className = "ebc-restraint-duration";
                        durEl.textContent = dur ? `⏱ ${dur}` : "";
                        durEl.title = "Time worn (persists offline)";
                        row.appendChild(nameEl);
                        row.appendChild(groupEl);
                        row.appendChild(lockEl);
                        row.appendChild(durEl);
                        container.appendChild(row);
                    }
                }
                catch ( /* Player not ready */_a) { /* Player not ready */ }
            };
            const updateLabel = () => {
                label.textContent = collapsed ? "▶ ACTIVE RESTRAINTS" : "▼ ACTIVE RESTRAINTS";
            };
            label.addEventListener("click", () => {
                collapsed = !collapsed;
                updateLabel();
                render();
            });
            updateLabel();
            render();
            body.appendChild(label);
            body.appendChild(container);
        }
        // -- Color palettes --------------------------------------------------------
        renderPalettes(body) {
            const label = document.createElement("div");
            label.className = "ebc-section-label";
            label.style.cursor = "pointer";
            label.style.userSelect = "none";
            const container = document.createElement("div");
            container.style.marginBottom = "6px";
            let collapsed = true; // collapsed by default — outfits are the primary view
            // Shared helper: build one palette row
            const buildPaletteRow = (p, rerender) => {
                const row = document.createElement("div");
                row.className = "ebc-palette-row";
                const swatch = document.createElement("div");
                swatch.className = "ebc-palette-swatch";
                const colors = [].concat(...Object.values(p.colorMap).map(c => Array.isArray(c) ? c : [c])).filter(Boolean).slice(0, 8);
                for (const c of colors) {
                    const dot = document.createElement("div");
                    dot.className = "ebc-palette-dot";
                    dot.style.background = c;
                    swatch.appendChild(dot);
                }
                const nameInp = document.createElement("input");
                nameInp.className = "ebc-palette-name";
                nameInp.value = p.name;
                nameInp.maxLength = 30;
                nameInp.title = "Click to rename";
                nameInp.addEventListener("change", () => renamePalette(p.id, nameInp.value));
                const applyBtn = document.createElement("button");
                applyBtn.className = "ebc-wear-btn";
                applyBtn.textContent = "Apply";
                applyBtn.title = p.type === "restraint"
                    ? "Apply these restraint colours to your current look"
                    : "Apply this colour palette to your current look";
                applyBtn.addEventListener("click", () => {
                    applyPalette(p.id);
                    applyBtn.textContent = "Done!";
                    window.setTimeout(() => { applyBtn.textContent = "Apply"; }, 1200);
                });
                let delPending = false;
                let delTimer = null;
                const delBtn = document.createElement("button");
                delBtn.className = "ebc-outfit-del";
                delBtn.textContent = "×";
                delBtn.title = "Delete palette";
                delBtn.addEventListener("click", () => {
                    if (!delPending) {
                        delPending = true;
                        delBtn.classList.add("confirm");
                        delBtn.textContent = "Sure?";
                        delTimer = window.setTimeout(() => {
                            delPending = false;
                            delBtn.classList.remove("confirm");
                            delBtn.textContent = "×";
                        }, 2500);
                    }
                    else {
                        if (delTimer)
                            window.clearTimeout(delTimer);
                        deletePalette(p.id);
                        rerender();
                    }
                });
                row.appendChild(swatch);
                row.appendChild(nameInp);
                row.appendChild(applyBtn);
                row.appendChild(delBtn);
                return row;
            };
            // Shared helper: build a "Save current" save row
            const buildSaveRow = (placeholder, btnLabel, btnTitle, onSave, rerender) => {
                const wrap = document.createElement("div");
                wrap.style.cssText = "display:flex;gap:5px;align-items:center;margin-top:4px;";
                const inp = document.createElement("input");
                inp.className = "ebc-form-input";
                inp.style.flex = "1";
                inp.placeholder = placeholder;
                inp.maxLength = 30;
                const btn = document.createElement("button");
                btn.className = "ebc-wear-btn";
                btn.textContent = btnLabel;
                btn.title = btnTitle;
                btn.addEventListener("click", () => {
                    onSave(inp.value.trim());
                    inp.value = "";
                    rerender();
                });
                wrap.appendChild(inp);
                wrap.appendChild(btn);
                return wrap;
            };
            const render = () => {
                while (container.firstChild)
                    container.removeChild(container.firstChild);
                if (collapsed)
                    return;
                // ── Outfit palettes ──────────────────────────────────────────────
                const outfitLbl = document.createElement("div");
                outfitLbl.className = "ebc-import-hint";
                outfitLbl.style.cssText = "font-weight:600;margin-bottom:3px;";
                outfitLbl.textContent = "OUTFIT";
                container.appendChild(outfitLbl);
                const outfitPalettes = getPalettesByType("outfit");
                for (const p of outfitPalettes) {
                    container.appendChild(buildPaletteRow(p, render));
                }
                if (outfitPalettes.length === 0) {
                    const none = document.createElement("div");
                    none.className = "ebc-empty";
                    none.style.padding = "2px 4px 4px";
                    none.textContent = "No outfit palettes saved";
                    container.appendChild(none);
                }
                container.appendChild(buildSaveRow("Palette name…", "Save Outfit", "Snapshot all current appearance colours", name => captureCurrentPalette(name || "Palette"), render));
                // ── Divider ──────────────────────────────────────────────────────
                const divEl = document.createElement("div");
                divEl.className = "ebc-divider";
                divEl.style.margin = "8px 0 4px";
                container.appendChild(divEl);
                // ── Restraint palettes ───────────────────────────────────────────
                const restraintLbl = document.createElement("div");
                restraintLbl.className = "ebc-import-hint";
                restraintLbl.style.cssText = "font-weight:600;margin-bottom:3px;";
                restraintLbl.textContent = "RESTRAINTS ⛓";
                container.appendChild(restraintLbl);
                const restraintPalettes = getPalettesByType("restraint");
                for (const p of restraintPalettes) {
                    container.appendChild(buildPaletteRow(p, render));
                }
                if (restraintPalettes.length === 0) {
                    const none = document.createElement("div");
                    none.className = "ebc-empty";
                    none.style.padding = "2px 4px 4px";
                    none.textContent = "No restraint palettes saved";
                    container.appendChild(none);
                }
                container.appendChild(buildSaveRow("Restraint palette name…", "Save Restraints", "Snapshot colours of all currently worn restraints", name => captureRestraintPalette(name || "Restraint Palette"), render));
            };
            const updateLabel = () => {
                const count = getAllPalettes().length;
                label.textContent = (collapsed ? "▶" : "▼") + ` COLOUR PALETTES${count > 0 ? ` (${count})` : ""}`;
            };
            label.addEventListener("click", () => {
                collapsed = !collapsed;
                updateLabel();
                render();
            });
            updateLabel();
            render();
            body.appendChild(label);
            body.appendChild(container);
        }
        buildOutfitRow(o, body) {
            // Wrapper holds the visual row + collapsible diff panel
            const wrapper = document.createElement("div");
            wrapper.style.marginBottom = "4px";
            const row = document.createElement("div");
            row.className = "ebc-outfit-row";
            row.style.marginBottom = "0";
            row.style.borderRadius = "7px 7px 7px 7px";
            const info = document.createElement("div");
            info.className = "ebc-outfit-info";
            const nameEl = document.createElement("span");
            nameEl.className = "ebc-outfit-name";
            nameEl.textContent = o.displayName;
            const cmdEl = document.createElement("span");
            cmdEl.className = "ebc-outfit-cmd";
            cmdEl.textContent = "/" + o.command;
            const isPreserving = o.preserveRestraints !== false;
            const isPreservingClothing = !!o.preserveClothing;
            // Labeled toggle chips — live inside the info column so they're readable without hover
            const flagsRow = document.createElement("div");
            flagsRow.className = "ebc-outfit-flags";
            const preserveBtn = document.createElement("button");
            preserveBtn.className = "ebc-flag-chip" + (isPreserving ? " on" : "");
            preserveBtn.textContent = isPreserving ? "⛓ Keep bonds" : "⛓ Swap bonds";
            const preserveClothingBtn = document.createElement("button");
            preserveClothingBtn.className = "ebc-flag-chip" + (isPreservingClothing ? " on" : "");
            preserveClothingBtn.textContent = isPreservingClothing ? "👗 Keep clothes" : "👗 Swap clothes";
            flagsRow.appendChild(preserveBtn);
            flagsRow.appendChild(preserveClothingBtn);
            info.appendChild(nameEl);
            info.appendChild(cmdEl);
            info.appendChild(flagsRow);
            const updateBtn = document.createElement("button");
            updateBtn.className = "ebc-update-btn";
            updateBtn.textContent = "Update";
            updateBtn.title = "Save current appearance to this outfit";
            const wearBtn = document.createElement("button");
            wearBtn.className = "ebc-wear-btn";
            wearBtn.textContent = "Wear";
            const diffBtn = document.createElement("button");
            diffBtn.className = "ebc-diff-btn";
            diffBtn.textContent = "~";
            diffBtn.title = "Preview appearance changes";
            const PENCIL_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
            const editBtn = document.createElement("button");
            editBtn.className = "ebc-edit-btn";
            editBtn.innerHTML = PENCIL_SVG;
            editBtn.title = "Edit outfit name, command and settings";
            const delBtn = document.createElement("button");
            delBtn.className = "ebc-outfit-del";
            delBtn.textContent = "×";
            delBtn.title = "Delete this outfit";
            row.appendChild(info);
            row.appendChild(diffBtn);
            row.appendChild(editBtn);
            row.appendChild(updateBtn);
            row.appendChild(wearBtn);
            row.appendChild(delBtn);
            // Helper: determine which sub-panel (if any) is open
            const closeAllPanels = () => {
                editPanel.classList.remove("open");
                diffPanel.classList.remove("open");
                editBtn.classList.remove("open");
                diffBtn.classList.remove("open");
                row.style.borderRadius = "7px";
            };
            // Edit panel
            const editPanel = document.createElement("div");
            editPanel.className = "ebc-edit-panel";
            // Build form fields inside editPanel
            const makeEditRow = (labelText, input) => {
                const r = document.createElement("div");
                r.className = "ebc-form-row";
                const lbl = document.createElement("span");
                lbl.className = "ebc-form-label";
                lbl.textContent = labelText;
                r.appendChild(lbl);
                r.appendChild(input);
                return r;
            };
            const eCmdInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", value: o.command, maxLength: 20,
            });
            const eNameInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", value: o.displayName, maxLength: 40,
            });
            const eAnnounceInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", value: o.announceText, maxLength: 120,
            });
            editPanel.appendChild(makeEditRow("Command", eCmdInput));
            editPanel.appendChild(makeEditRow("Name", eNameInput));
            editPanel.appendChild(makeEditRow("Announce", eAnnounceInput));
            const eInclRow = document.createElement("label");
            eInclRow.className = "ebc-form-check-row";
            const eInclCheck = document.createElement("input");
            eInclCheck.type = "checkbox";
            eInclCheck.checked = !!o.includeRestraints;
            const eInclLbl = document.createElement("span");
            eInclLbl.className = "ebc-form-check-label";
            eInclLbl.textContent = "Include restraints in outfit";
            eInclRow.appendChild(eInclCheck);
            eInclRow.appendChild(eInclLbl);
            editPanel.appendChild(eInclRow);
            const ePreserveRow = document.createElement("label");
            ePreserveRow.className = "ebc-form-check-row";
            const ePreserveCheck = document.createElement("input");
            ePreserveCheck.type = "checkbox";
            ePreserveCheck.checked = isPreserving;
            const ePreserveLbl = document.createElement("span");
            ePreserveLbl.className = "ebc-form-check-label";
            ePreserveLbl.textContent = "Keep existing restraints when worn";
            ePreserveRow.appendChild(ePreserveCheck);
            ePreserveRow.appendChild(ePreserveLbl);
            editPanel.appendChild(ePreserveRow);
            const ePreserveClothingRow = document.createElement("label");
            ePreserveClothingRow.className = "ebc-form-check-row";
            const ePreserveClothingCheck = document.createElement("input");
            ePreserveClothingCheck.type = "checkbox";
            ePreserveClothingCheck.checked = isPreservingClothing;
            const ePreserveClothingLbl = document.createElement("span");
            ePreserveClothingLbl.className = "ebc-form-check-label";
            ePreserveClothingLbl.textContent = "Keep existing clothing when worn";
            ePreserveClothingRow.appendChild(ePreserveClothingCheck);
            ePreserveClothingRow.appendChild(ePreserveClothingLbl);
            editPanel.appendChild(ePreserveClothingRow);
            const eSaveBtn = document.createElement("button");
            eSaveBtn.className = "ebc-create-btn";
            eSaveBtn.textContent = "Save Changes";
            editPanel.appendChild(eSaveBtn);
            // Export button inside edit panel (keeps the main row uncluttered)
            const eExportBtn = document.createElement("button");
            eExportBtn.className = "ebc-btn-footer-btn";
            eExportBtn.style.cssText = "margin-top:2px;font-size:10px;";
            eExportBtn.textContent = "↑ Copy to Clipboard";
            eExportBtn.title = "Export this outfit as JSON to share with others";
            editPanel.appendChild(eExportBtn);
            // Diff panel
            const diffPanel = document.createElement("div");
            diffPanel.className = "ebc-diff-panel";
            wrapper.appendChild(row);
            wrapper.appendChild(editPanel);
            wrapper.appendChild(diffPanel);
            const setAllDisabled = (v) => {
                body.querySelectorAll(".ebc-wear-btn, .ebc-update-btn").forEach(b => { b.disabled = v; });
            };
            preserveBtn.addEventListener("click", () => {
                const next = !preserveBtn.classList.contains("on");
                preserveBtn.className = "ebc-flag-chip" + (next ? " on" : "");
                preserveBtn.textContent = next ? "⛓ Keep bonds" : "⛓ Swap bonds";
                setOutfitPreserveRestraints(o.id, next);
                ePreserveCheck.checked = next;
            });
            preserveClothingBtn.addEventListener("click", () => {
                const next = !preserveClothingBtn.classList.contains("on");
                preserveClothingBtn.className = "ebc-flag-chip" + (next ? " on" : "");
                preserveClothingBtn.textContent = next ? "👗 Keep clothes" : "👗 Swap clothes";
                setOutfitPreserveClothing(o.id, next);
                ePreserveClothingCheck.checked = next;
            });
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
            editBtn.addEventListener("click", () => {
                const willOpen = !editPanel.classList.contains("open");
                closeAllPanels();
                if (willOpen) {
                    editPanel.classList.add("open");
                    editBtn.classList.add("open");
                    row.style.borderRadius = "7px 7px 0 0";
                    eCmdInput.focus();
                }
            });
            eSaveBtn.addEventListener("click", () => {
                eCmdInput.style.borderColor = eCmdInput.value.trim() ? "" : "#cf6f98";
                eNameInput.style.borderColor = eNameInput.value.trim() ? "" : "#cf6f98";
                if (!eCmdInput.value.trim() || !eNameInput.value.trim())
                    return;
                const ok = editOutfit(o.id, eCmdInput.value, eNameInput.value, eAnnounceInput.value, eInclCheck.checked, ePreserveCheck.checked, ePreserveClothingCheck.checked);
                if (ok)
                    this.renderOutfits();
            });
            eExportBtn.addEventListener("click", () => {
                var _a;
                const json = exportOutfitById(o.id);
                if (!json)
                    return;
                const showFallback = () => {
                    // Can't write clipboard — show in a temporary tooltip-style input
                    const tmp = document.createElement("input");
                    tmp.value = json;
                    tmp.style.cssText = "position:fixed;top:-9999px;";
                    document.body.appendChild(tmp);
                    tmp.select();
                    document.execCommand("copy");
                    document.body.removeChild(tmp);
                    eExportBtn.textContent = "Copied!";
                    window.setTimeout(() => { eExportBtn.textContent = "↑ Copy to Clipboard"; }, 1500);
                };
                if ((_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText) {
                    navigator.clipboard.writeText(json)
                        .then(() => {
                        eExportBtn.textContent = "Copied!";
                        window.setTimeout(() => { eExportBtn.textContent = "↑ Copy to Clipboard"; }, 1500);
                    })
                        .catch(showFallback);
                }
                else {
                    showFallback();
                }
            });
            diffBtn.addEventListener("click", () => {
                const willOpen = !diffPanel.classList.contains("open");
                closeAllPanels();
                if (willOpen) {
                    diffPanel.classList.add("open");
                    diffBtn.classList.add("open");
                    row.style.borderRadius = "7px 7px 0 0";
                    this.renderDiff(diffPanel, o);
                }
            });
            let delPending = false;
            let delTimer = null;
            delBtn.addEventListener("click", () => {
                if (!delPending) {
                    delPending = true;
                    delBtn.classList.add("confirm");
                    delBtn.textContent = "Sure?";
                    delBtn.title = "Click again to confirm deletion";
                    delTimer = window.setTimeout(() => {
                        delPending = false;
                        delBtn.classList.remove("confirm");
                        delBtn.textContent = "×";
                        delBtn.title = "Delete this outfit";
                    }, 2500);
                }
                else {
                    if (delTimer !== null)
                        window.clearTimeout(delTimer);
                    deleteOutfit(o.id);
                    this.renderOutfits();
                }
            });
            return wrapper;
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
            checkLbl.textContent = "Include restraints in outfit";
            checkRow.appendChild(checkbox);
            checkRow.appendChild(checkLbl);
            form.appendChild(checkRow);
            const preserveRow = document.createElement("label");
            preserveRow.className = "ebc-form-check-row";
            const preserveCheckbox = document.createElement("input");
            preserveCheckbox.type = "checkbox";
            preserveCheckbox.checked = true; // default: preserve existing restraints
            const preserveLbl = document.createElement("span");
            preserveLbl.className = "ebc-form-check-label";
            preserveLbl.textContent = "Keep existing restraints when worn";
            preserveRow.appendChild(preserveCheckbox);
            preserveRow.appendChild(preserveLbl);
            form.appendChild(preserveRow);
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
                const result = createOutfitFromCurrent(cmdInput.value, nameInput.value, announceInput.value, checkbox.checked, preserveCheckbox.checked);
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
            // -- Import outfit section --
            const impDiv = document.createElement("div");
            impDiv.className = "ebc-divider";
            body.appendChild(impDiv);
            const impToggleBtn = document.createElement("button");
            impToggleBtn.className = "ebc-new-outfit-btn";
            impToggleBtn.textContent = "↓ Import Outfit";
            body.appendChild(impToggleBtn);
            const impPanel = document.createElement("div");
            impPanel.className = "ebc-import-panel";
            body.appendChild(impPanel);
            const impHint = document.createElement("div");
            impHint.className = "ebc-import-hint";
            impHint.textContent = "Paste EBC outfit JSON or a BC outfit code:";
            impPanel.appendChild(impHint);
            const impTextarea = document.createElement("textarea");
            impTextarea.className = "ebc-notes-textarea";
            impTextarea.placeholder = 'EBC JSON: {"ebc":1,...}  –OR–  BC code: NobwRAcgh...';
            impTextarea.rows = 3;
            impPanel.appendChild(impTextarea);
            // Extra fields shown only when a BC code is detected (auto-shown on paste)
            const bcFields = document.createElement("div");
            bcFields.style.cssText = "display:none;flex-direction:column;gap:4px;margin-top:4px;";
            const bcNameInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "Outfit name (e.g. Rope Set)",
            });
            const bcCmdInput = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "Command (e.g. ropeset)",
                maxLength: 20,
            });
            const mkRow = (label, el) => {
                const row = document.createElement("div");
                row.style.cssText = "display:flex;align-items:center;gap:6px;";
                const lbl = Object.assign(document.createElement("span"), {
                    className: "ebc-form-label",
                    textContent: label,
                });
                lbl.style.minWidth = "58px";
                row.appendChild(lbl);
                row.appendChild(el);
                return row;
            };
            // Mode selector: restraints / outfit / both
            const bcModeSelect = document.createElement("select");
            bcModeSelect.className = "ebc-form-input";
            [
                { value: "restraints", label: "⛓ Restraints only" },
                { value: "outfit", label: "👗 Outfit only (no restraints)" },
                { value: "both", label: "✦ Everything (full appearance)" },
            ].forEach(opt => {
                const o = document.createElement("option");
                o.value = opt.value;
                o.textContent = opt.label;
                bcModeSelect.appendChild(o);
            });
            bcFields.appendChild(mkRow("Name", bcNameInput));
            bcFields.appendChild(mkRow("Command", bcCmdInput));
            bcFields.appendChild(mkRow("Import", bcModeSelect));
            impPanel.appendChild(bcFields);
            // Detect BC vs EBC format on paste/input
            let isBCCode = false;
            const detectFormat = () => {
                const v = impTextarea.value.trim();
                isBCCode = v.length > 0 && !v.startsWith("{");
                bcFields.style.display = isBCCode ? "flex" : "none";
            };
            impTextarea.addEventListener("input", detectFormat);
            impTextarea.addEventListener("paste", () => window.setTimeout(detectFormat, 0));
            const impError = document.createElement("div");
            impError.className = "ebc-import-error";
            impPanel.appendChild(impError);
            const impActionRow = document.createElement("div");
            impActionRow.style.cssText = "display:flex;gap:5px;";
            const impLoadBtn = document.createElement("button");
            impLoadBtn.className = "ebc-create-btn";
            impLoadBtn.style.marginTop = "0";
            impLoadBtn.textContent = "Import";
            const impCancelBtn = document.createElement("button");
            impCancelBtn.className = "ebc-btn-footer-btn";
            impCancelBtn.textContent = "Cancel";
            impActionRow.appendChild(impLoadBtn);
            impActionRow.appendChild(impCancelBtn);
            impPanel.appendChild(impActionRow);
            const closeImpPanel = () => {
                impPanel.classList.remove("open");
                impToggleBtn.textContent = "↓ Import Outfit";
                impTextarea.value = "";
                impError.textContent = "";
                bcNameInput.value = "";
                bcCmdInput.value = "";
                bcModeSelect.value = "restraints";
                bcFields.style.display = "none";
                isBCCode = false;
            };
            impToggleBtn.addEventListener("click", () => {
                const open = impPanel.classList.contains("open");
                impPanel.classList.toggle("open", !open);
                impToggleBtn.textContent = open ? "↓ Import Outfit" : "- Cancel Import";
                if (!open) {
                    impTextarea.value = "";
                    impError.textContent = "";
                    impTextarea.focus();
                }
            });
            impCancelBtn.addEventListener("click", closeImpPanel);
            impLoadBtn.addEventListener("click", () => {
                impError.textContent = "";
                try {
                    if (isBCCode) {
                        importOutfitFromBCCode(impTextarea.value.trim(), bcNameInput.value.trim() || "Imported Outfit", bcCmdInput.value.trim() || "imported", bcModeSelect.value);
                    }
                    else {
                        importOutfitFromJSON(impTextarea.value.trim());
                    }
                    closeImpPanel();
                    this.renderOutfits();
                }
                catch (err) {
                    impError.textContent = err instanceof Error ? err.message : "Invalid format.";
                }
            });
        }
        // -- Boop friends ----------------------------------------------------------
        boopFriendsInRoom() {
            var _a, _b, _c, _d, _e;
            try {
                const friendList = Player.FriendList;
                if (!Array.isArray(friendList) || friendList.length === 0)
                    return 0;
                const friendSet = new Set(friendList);
                const room = (_a = window.ChatRoomCharacter) !== null && _a !== void 0 ? _a : [];
                const friends = room.filter(c => c.MemberNumber !== Player.MemberNumber && friendSet.has(c.MemberNumber));
                if (friends.length === 0)
                    return 0;
                let booped = 0;
                for (const friend of friends) {
                    const delay = booped * 1800;
                    const nickFn = window.CharacterNickname;
                    const targetName = (_d = (_c = (_b = (typeof nickFn === "function"
                        ? nickFn(friend)
                        : null)) !== null && _b !== void 0 ? _b : friend.Nickname) !== null && _c !== void 0 ? _c : friend.Name) !== null && _d !== void 0 ? _d : "someone";
                    const senderName = (_e = (typeof nickFn === "function"
                        ? nickFn(Player)
                        : null)) !== null && _e !== void 0 ? _e : Player.Name;
                    // "Boop" is not a native BC activity so Type:"Activity" produces
                    // "MISSING ACTIVITY DESCRIPTION" errors. Use Type:"Action" with the
                    // standard BC possessive format — displays as (Emery boops Lucy's nose.)
                    // and text-based addon reaction rules (LSCG, BCX, etc.) can match it.
                    const text = `${senderName} boops ${targetName}'s nose.`;
                    window.setTimeout(() => {
                        try {
                            ServerSend("ChatRoomChat", {
                                Type: "Action",
                                Content: text,
                                Dictionary: [
                                    { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                                    { SourceCharacter: Player.MemberNumber },
                                ],
                            });
                        }
                        catch ( /* ignore */_a) { /* ignore */ }
                    }, delay);
                    booped++;
                }
                return booped;
            }
            catch (_f) {
                return 0;
            }
        }
        // -- Seq step builder helper -----------------------------------------------
        // Builds a step-builder UI for a seq button and wires it to btns[idx].emote.
        buildSeqStepBuilder(btns, idx) {
            const DEFAULT_DELAY = 600;
            const parseSteps = (raw) => {
                if (!raw.trim())
                    return [];
                return raw.split("|").map(r => r.trim()).filter(Boolean).map(r => {
                    const { content, delay } = parseStep(r, DEFAULT_DELAY);
                    if (content === "_")
                        return { type: "reset", text: "", delay };
                    if (content.startsWith("!"))
                        return { type: "action", text: content.slice(1), delay };
                    if (content.startsWith("*"))
                        return { type: "emote", text: content.slice(1), delay };
                    return { type: "pose", text: content, delay };
                });
            };
            const serializeSteps = (steps) => {
                return steps.map(s => {
                    let content = "";
                    if (s.type === "reset")
                        content = "_";
                    else if (s.type === "action")
                        content = "!" + s.text;
                    else if (s.type === "emote")
                        content = "*" + s.text;
                    else
                        content = s.text;
                    return `${content}@${s.delay}`;
                }).join("|");
            };
            let steps = parseSteps(btns[idx].emote);
            const wrapper = document.createElement("div");
            wrapper.className = "ebc-seq-builder";
            const stepList = document.createElement("div");
            stepList.style.cssText = "display:flex;flex-direction:column;gap:3px;";
            wrapper.appendChild(stepList);
            const renderSteps = () => {
                while (stepList.firstChild)
                    stepList.removeChild(stepList.firstChild);
                for (let si = 0; si < steps.length; si++) {
                    const step = steps[si];
                    const stepRow = document.createElement("div");
                    stepRow.className = "ebc-seq-step-row";
                    // Type dropdown
                    const typeSelect = document.createElement("select");
                    typeSelect.className = "ebc-seq-type-select";
                    [
                        { value: "action", label: "Action !" },
                        { value: "emote", label: "Emote *" },
                        { value: "pose", label: "Pose" },
                        { value: "reset", label: "Reset _" },
                    ].forEach(opt => {
                        const o = document.createElement("option");
                        o.value = opt.value;
                        o.textContent = opt.label;
                        if (opt.value === step.type)
                            o.selected = true;
                        typeSelect.appendChild(o);
                    });
                    // Text input
                    const textInp = document.createElement("input");
                    textInp.className = "ebc-seq-text-inp";
                    textInp.type = "text";
                    textInp.value = step.text;
                    textInp.placeholder = step.type === "pose" ? "e.g. HandsUp" : "text...";
                    textInp.disabled = step.type === "reset";
                    textInp.maxLength = 200;
                    // Delay input (ms)
                    const delayInp = document.createElement("input");
                    delayInp.className = "ebc-seq-delay-inp";
                    delayInp.type = "number";
                    delayInp.min = "0";
                    delayInp.max = "60000";
                    delayInp.step = "100";
                    delayInp.value = String(step.delay);
                    delayInp.title = "Delay after this step (ms)";
                    // Delete button
                    const delBtn = document.createElement("button");
                    delBtn.className = "ebc-seq-step-del";
                    delBtn.textContent = "×";
                    delBtn.title = "Remove step";
                    stepRow.appendChild(typeSelect);
                    stepRow.appendChild(textInp);
                    stepRow.appendChild(delayInp);
                    stepRow.appendChild(delBtn);
                    stepList.appendChild(stepRow);
                    // Events (capture si)
                    const sidx = si;
                    typeSelect.addEventListener("change", () => {
                        const t = typeSelect.value;
                        steps[sidx].type = t;
                        textInp.disabled = t === "reset";
                        if (t === "reset") {
                            steps[sidx].text = "";
                            textInp.value = "";
                        }
                        btns[idx].emote = serializeSteps(steps);
                    });
                    textInp.addEventListener("input", () => {
                        steps[sidx].text = textInp.value;
                        btns[idx].emote = serializeSteps(steps);
                    });
                    delayInp.addEventListener("input", () => {
                        const v = parseInt(delayInp.value, 10);
                        steps[sidx].delay = isNaN(v) ? DEFAULT_DELAY : Math.max(0, v);
                        btns[idx].emote = serializeSteps(steps);
                    });
                    delBtn.addEventListener("click", () => {
                        steps.splice(sidx, 1);
                        btns[idx].emote = serializeSteps(steps);
                        renderSteps();
                    });
                }
            };
            renderSteps();
            // + Add step button
            const addBtn = document.createElement("button");
            addBtn.className = "ebc-seq-add-btn";
            addBtn.textContent = "+ Add step";
            addBtn.addEventListener("click", () => {
                steps.push({ type: "action", text: "", delay: DEFAULT_DELAY });
                btns[idx].emote = serializeSteps(steps);
                renderSteps();
            });
            wrapper.appendChild(addBtn);
            return wrapper;
        }
        // -- Buttons tab -----------------------------------------------------------
        renderButtons() {
            var _a;
            const body = (_a = this.rootEl) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-body");
            if (!body)
                return;
            while (body.firstChild)
                body.removeChild(body.firstChild);
            // Working copies so we don't mutate storage until Save is clicked
            let btns = getButtons().map(b => (Object.assign({}, b)));
            let slotCount = getSlotCount();
            // Ensure array has slotCount entries
            while (btns.length < slotCount) {
                btns.push({ label: "", emote: "", color: "#c2185b", enabled: false, style: "action" });
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
                // Always ensure btns has a real object for every slot — prevents "undefined" crashes
                while (btns.length < slotCount) {
                    btns.push({ label: "", emote: "", color: "#c2185b", enabled: false, style: "action" });
                }
                while (slotList.firstChild)
                    slotList.removeChild(slotList.firstChild);
                for (let i = 0; i < slotCount; i++) {
                    const btn = btns[i];
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
                    // Bottom line: style toggle (hidden for seq) | emote/seq input
                    const botLine = document.createElement("div");
                    botLine.className = "ebc-slot-bottom";
                    const currentStyle = (_a = btn.style) !== null && _a !== void 0 ? _a : "action";
                    const isSeq = currentStyle === "seq";
                    const styleBtn = document.createElement("button");
                    styleBtn.className = "ebc-slot-style" + (currentStyle === "emote" ? " emote" : "");
                    styleBtn.textContent = currentStyle === "emote" ? "* *" : "( )";
                    styleBtn.title = currentStyle === "emote"
                        ? "Style: * emote * — click to switch"
                        : "Style: ( action ) — click to switch";
                    // Seq buttons don't show the style toggle — animation is internal
                    styleBtn.style.display = isSeq ? "none" : "";
                    // For seq buttons, show a small non-interactive badge instead
                    const seqBadge = document.createElement("span");
                    seqBadge.className = "ebc-slot-seq-badge";
                    seqBadge.textContent = "✨";
                    seqBadge.title = "Animation button — edit the sequence below";
                    seqBadge.style.display = isSeq ? "inline" : "none";
                    const emoteInp = document.createElement("input");
                    emoteInp.className = "ebc-slot-emote";
                    emoteInp.type = "text";
                    emoteInp.maxLength = 240;
                    emoteInp.placeholder = "e.g. nods.";
                    emoteInp.value = btn.emote;
                    emoteInp.title = currentStyle === "emote" ? "Text sent as * Name text *" : "Text sent as ( Name text )";
                    emoteInp.style.display = isSeq ? "none" : "";
                    botLine.appendChild(styleBtn);
                    botLine.appendChild(seqBadge);
                    botLine.appendChild(emoteInp);
                    row.appendChild(topLine);
                    row.appendChild(botLine);
                    slotList.appendChild(row);
                    // -- Seq step builder (only for seq style) --
                    if (isSeq) {
                        const builderEl = this.buildSeqStepBuilder(btns, i);
                        slotList.appendChild(builderEl);
                    }
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
                    styleBtn.addEventListener("click", () => {
                        var _a;
                        const cur = (_a = btns[idx].style) !== null && _a !== void 0 ? _a : "action";
                        if (cur === "seq")
                            return; // seq buttons don't cycle through styles
                        const next = cur === "action" ? "emote" : "action";
                        btns[idx].style = next;
                        styleBtn.className = "ebc-slot-style" + (next === "emote" ? " emote" : "");
                        styleBtn.textContent = next === "emote" ? "* *" : "( )";
                        styleBtn.title = next === "emote"
                            ? "Style: * emote * — click to switch"
                            : "Style: ( action ) — click to switch";
                        emoteInp.title = next === "emote"
                            ? "Text sent as * Name text *"
                            : "Text sent as ( Name text )";
                    });
                    let slotDelPending = false;
                    let slotDelTimer = null;
                    delBtn.addEventListener("click", () => {
                        if (!slotDelPending) {
                            slotDelPending = true;
                            delBtn.classList.add("confirm");
                            delBtn.textContent = "?";
                            delBtn.title = "Click again to remove this slot";
                            slotDelTimer = window.setTimeout(() => {
                                slotDelPending = false;
                                delBtn.classList.remove("confirm");
                                delBtn.textContent = "x";
                                delBtn.title = "Remove this slot";
                            }, 2500);
                        }
                        else {
                            if (slotDelTimer !== null)
                                window.clearTimeout(slotDelTimer);
                            btns.splice(idx, 1);
                            btns.push({ label: "", emote: "", color: "#c2185b", enabled: false, style: "action" });
                            slotCount = Math.max(1, slotCount - 1);
                            renderSlots();
                            updateFooterState();
                        }
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
            // Export / Import row
            const ioRow = document.createElement("div");
            ioRow.className = "ebc-btn-footer";
            ioRow.style.marginTop = "3px";
            const exportBtn = document.createElement("button");
            exportBtn.className = "ebc-btn-footer-btn";
            exportBtn.textContent = "↑ Export";
            exportBtn.title = "Copy button config to clipboard to share with others";
            const importToggleBtn = document.createElement("button");
            importToggleBtn.className = "ebc-btn-footer-btn";
            importToggleBtn.textContent = "↓ Import";
            importToggleBtn.title = "Load a shared button config";
            ioRow.appendChild(exportBtn);
            ioRow.appendChild(importToggleBtn);
            body.appendChild(ioRow);
            // Import panel (collapsible)
            const importPanel = document.createElement("div");
            importPanel.className = "ebc-import-panel";
            body.appendChild(importPanel);
            const importHint = document.createElement("div");
            importHint.className = "ebc-import-hint";
            importHint.textContent = "Paste exported config here:";
            importPanel.appendChild(importHint);
            const importTextarea = document.createElement("textarea");
            importTextarea.className = "ebc-notes-textarea";
            importTextarea.placeholder = '{"ebc":1,"slotCount":3,"buttons":[...]}';
            importTextarea.rows = 3;
            importPanel.appendChild(importTextarea);
            const importError = document.createElement("div");
            importError.className = "ebc-import-error";
            importPanel.appendChild(importError);
            const importActionRow = document.createElement("div");
            importActionRow.style.cssText = "display:flex;gap:5px;";
            const loadBtn = document.createElement("button");
            loadBtn.className = "ebc-create-btn";
            loadBtn.style.marginTop = "0";
            loadBtn.textContent = "Load";
            const cancelImportBtn = document.createElement("button");
            cancelImportBtn.className = "ebc-btn-footer-btn";
            cancelImportBtn.textContent = "Cancel";
            importActionRow.appendChild(loadBtn);
            importActionRow.appendChild(cancelImportBtn);
            importPanel.appendChild(importActionRow);
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
                    // Skip emote flush for seq buttons — seq builder keeps btns[i].emote in sync directly
                    if (eInp && btns[i].style !== "seq")
                        btns[i].emote = eInp.value;
                });
                saveButtons([...btns], slotCount);
                saveBtn.textContent = "Saved!";
                window.setTimeout(() => { saveBtn.textContent = "Save"; }, 1200);
            });
            let resetPending = false;
            let resetTimer = null;
            resetBtn.addEventListener("click", () => {
                if (!resetPending) {
                    resetPending = true;
                    resetBtn.classList.add("confirm");
                    resetBtn.textContent = "Sure?";
                    resetBtn.title = "Click again to restore defaults";
                    resetTimer = window.setTimeout(() => {
                        resetPending = false;
                        resetBtn.classList.remove("confirm");
                        resetBtn.textContent = "Reset";
                        resetBtn.title = "Reset to defaults";
                    }, 2500);
                }
                else {
                    if (resetTimer !== null)
                        window.clearTimeout(resetTimer);
                    resetPending = false;
                    resetBtn.classList.remove("confirm");
                    resetBtn.textContent = "Reset";
                    resetBtn.title = "Reset to defaults";
                    importPanel.classList.remove("open");
                    importToggleBtn.classList.remove("open");
                    btns = DEFAULT_BUTTONS.map(b => (Object.assign({}, b)));
                    slotCount = DEFAULT_BUTTONS.length;
                    saveButtons([...btns], slotCount);
                    renderSlots();
                    updateFooterState();
                }
            });
            // -- Export ---------------------------------------------------------------
            exportBtn.addEventListener("click", () => {
                var _a;
                const payload = JSON.stringify({
                    ebc: 1,
                    slotCount,
                    buttons: btns.slice(0, slotCount).map(b => {
                        var _a;
                        return ({
                            label: b.label,
                            emote: b.emote,
                            color: b.color,
                            enabled: b.enabled,
                            style: (_a = b.style) !== null && _a !== void 0 ? _a : "action",
                        });
                    }),
                });
                const showInPanel = () => {
                    importTextarea.value = payload;
                    importError.textContent = "";
                    importPanel.classList.add("open");
                    importToggleBtn.classList.add("open");
                    importTextarea.select();
                };
                if ((_a = navigator.clipboard) === null || _a === void 0 ? void 0 : _a.writeText) {
                    navigator.clipboard.writeText(payload).then(() => {
                        exportBtn.textContent = "Copied!";
                        window.setTimeout(() => { exportBtn.textContent = "↑ Export"; }, 1500);
                    }).catch(showInPanel);
                }
                else {
                    showInPanel();
                }
            });
            // -- Import ---------------------------------------------------------------
            importToggleBtn.addEventListener("click", () => {
                const willOpen = !importPanel.classList.contains("open");
                importPanel.classList.toggle("open", willOpen);
                importToggleBtn.classList.toggle("open", willOpen);
                if (willOpen) {
                    importTextarea.value = "";
                    importError.textContent = "";
                    importTextarea.focus();
                }
            });
            cancelImportBtn.addEventListener("click", () => {
                importPanel.classList.remove("open");
                importToggleBtn.classList.remove("open");
                importTextarea.value = "";
                importError.textContent = "";
            });
            loadBtn.addEventListener("click", () => {
                importError.textContent = "";
                try {
                    const raw = importTextarea.value.trim();
                    if (!raw) {
                        importError.textContent = "Nothing to import.";
                        return;
                    }
                    const data = JSON.parse(raw);
                    if (data.ebc !== 1)
                        throw new Error("Not a valid EBC button export (missing version tag).");
                    if (!Array.isArray(data.buttons))
                        throw new Error("Missing buttons array.");
                    const imported = data.buttons.map((item) => {
                        const b = item;
                        const style = (["action", "emote", "seq"].includes(b.style)
                            ? b.style : "action");
                        return {
                            label: typeof b.label === "string" ? b.label.slice(0, 6) : "",
                            emote: typeof b.emote === "string" ? b.emote.slice(0, 240) : "",
                            color: typeof b.color === "string" ? normalizeHex(b.color) : "#c2185b",
                            enabled: !!b.enabled,
                            style,
                        };
                    });
                    const newCount = typeof data.slotCount === "number"
                        ? Math.min(Math.max(1, Math.round(data.slotCount)), ABSOLUTE_MAX)
                        : Math.min(imported.length, ABSOLUTE_MAX);
                    btns = imported;
                    slotCount = newCount;
                    while (btns.length < slotCount) {
                        btns.push({ label: "", emote: "", color: "#c2185b", enabled: false, style: "action" });
                    }
                    saveButtons([...btns], slotCount);
                    importPanel.classList.remove("open");
                    importToggleBtn.classList.remove("open");
                    importTextarea.value = "";
                    renderSlots();
                    updateFooterState();
                    loadBtn.textContent = "Loaded!";
                    window.setTimeout(() => { loadBtn.textContent = "Load"; }, 1200);
                }
                catch (err) {
                    importError.textContent = err instanceof Error ? err.message : "Invalid format — check the pasted text.";
                }
            });
            // -- Fun Actions --------------------------------------------------------
            const funLbl = document.createElement("div");
            funLbl.className = "ebc-section-label";
            funLbl.style.marginTop = "10px";
            funLbl.textContent = "Fun Actions";
            body.appendChild(funLbl);
            const boopBtn = document.createElement("button");
            boopBtn.className = "ebc-create-btn";
            boopBtn.style.cssText = "margin:4px 0 0; width:100%;";
            boopBtn.title = "Send a unique boop message to every friend currently in the room";
            boopBtn.textContent = "🐾 Boop all friends in room";
            boopBtn.addEventListener("click", () => {
                const booped = this.boopFriendsInRoom();
                if (booped === 0) {
                    boopBtn.textContent = "No friends here~";
                }
                else {
                    boopBtn.textContent = `Booped ${booped}!`;
                }
                window.setTimeout(() => { boopBtn.textContent = "🐾 Boop all friends in room"; }, 2000);
            });
            body.appendChild(boopBtn);
        }
        // -- Appearance diff -------------------------------------------------------
        renderDiff(panel, outfit) {
            while (panel.firstChild)
                panel.removeChild(panel.firstChild);
            const currentMap = new Map();
            for (const item of Player.Appearance) {
                currentMap.set(item.Asset.Group.Name, item);
            }
            const outfitMap = new Map();
            for (const saved of outfit.items) {
                outfitMap.set(saved.Group, saved);
            }
            const adding = [];
            const removing = [];
            const changing = [];
            for (const [group, saved] of outfitMap) {
                const current = currentMap.get(group);
                if (!current) {
                    adding.push(`${group}: ${saved.Name}`);
                }
                else if (current.Asset.Name !== saved.Name) {
                    changing.push({ from: `${group}: ${current.Asset.Name}`, to: saved.Name });
                }
            }
            for (const [group, item] of currentMap) {
                if (!outfitMap.has(group)) {
                    const isRestraint = RESTRAINT_GROUPS.has(group);
                    if (!isRestraint || !outfit.preserveRestraints) {
                        removing.push(`${group}: ${item.Asset.Name}`);
                    }
                }
            }
            const addLine = (text, cls) => {
                const el = document.createElement("div");
                el.className = `ebc-diff-item ${cls}`;
                el.textContent = text;
                panel.appendChild(el);
            };
            if (adding.length === 0 && removing.length === 0 && changing.length === 0) {
                addLine("No changes from current look.", "ebc-diff-none");
                return;
            }
            for (const c of changing)
                addLine(`~ ${c.from} → ${c.to}`, "ebc-diff-change");
            for (const t of adding)
                addLine(`+ ${t}`, "ebc-diff-add");
            for (const t of removing)
                addLine(`− ${t}`, "ebc-diff-remove");
        }
        // -- Poses tab -------------------------------------------------------------
        renderPoses() {
            var _a, _b, _c, _d;
            const body = (_a = this.rootEl) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-body");
            if (!body)
                return;
            while (body.firstChild)
                body.removeChild(body.firstChild);
            const currentPoses = getCurrentPoses();
            // ── POSES ─────────────────────────────────────────────────────────────
            // Helper: true when a pose key is currently active
            const isPoseActive = (key) => currentPoses.includes(key);
            // Helper: build an ordered pose step editor.
            // Returns { getPoses, getDelay } so the caller reads values at save-time.
            const buildPoseOrderEditor = (parent, initialPoses, initialDelay = 420) => {
                const poses = initialPoses.filter(Boolean).slice();
                // -- Step list --------------------------------------------------------
                const listEl = document.createElement("div");
                listEl.className = "ebc-step-list";
                parent.appendChild(listEl);
                const poseLabel = (key) => {
                    for (const g of KNOWN_POSES) {
                        const found = g.poses.find(x => x.key === key);
                        if (found)
                            return found.label;
                    }
                    return key; // custom key
                };
                const renderList = () => {
                    while (listEl.firstChild)
                        listEl.removeChild(listEl.firstChild);
                    if (poses.length === 0) {
                        const empty = document.createElement("div");
                        empty.className = "ebc-import-hint";
                        empty.style.textAlign = "center";
                        empty.textContent = "No steps yet — add poses below";
                        listEl.appendChild(empty);
                        return;
                    }
                    for (let idx = 0; idx < poses.length; idx++) {
                        const key = poses[idx];
                        const row = document.createElement("div");
                        row.className = "ebc-step-row";
                        const num = document.createElement("span");
                        num.className = "ebc-step-num";
                        num.textContent = `${idx + 1}.`;
                        const lbl = document.createElement("span");
                        lbl.className = "ebc-step-label";
                        lbl.textContent = poseLabel(key);
                        if (key !== poseLabel(key))
                            lbl.title = key; // show raw key for custom poses
                        const upBtn = document.createElement("button");
                        upBtn.className = "ebc-step-move";
                        upBtn.textContent = "↑";
                        upBtn.title = "Move earlier";
                        upBtn.disabled = idx === 0;
                        upBtn.addEventListener("click", () => {
                            if (idx > 0) {
                                [poses[idx - 1], poses[idx]] = [poses[idx], poses[idx - 1]];
                                renderList();
                            }
                        });
                        const downBtn = document.createElement("button");
                        downBtn.className = "ebc-step-move";
                        downBtn.textContent = "↓";
                        downBtn.title = "Move later";
                        downBtn.disabled = idx === poses.length - 1;
                        downBtn.addEventListener("click", () => {
                            if (idx < poses.length - 1) {
                                [poses[idx], poses[idx + 1]] = [poses[idx + 1], poses[idx]];
                                renderList();
                            }
                        });
                        const delBtn = document.createElement("button");
                        delBtn.className = "ebc-step-del";
                        delBtn.textContent = "×";
                        delBtn.title = "Remove step";
                        delBtn.addEventListener("click", () => { poses.splice(idx, 1); renderList(); });
                        row.appendChild(num);
                        row.appendChild(lbl);
                        row.appendChild(upBtn);
                        row.appendChild(downBtn);
                        row.appendChild(delBtn);
                        listEl.appendChild(row);
                        // Delay indicator between steps
                        if (idx < poses.length - 1) {
                            const delayEl = document.createElement("div");
                            delayEl.className = "ebc-step-delay";
                            delayEl.id = `ebc-step-delay-${idx}`;
                            delayEl.textContent = `↓ ${delayInp.value} ms`;
                            listEl.appendChild(delayEl);
                        }
                    }
                };
                // -- Delay slider (defined before renderList so the label ref works) --
                const delayRowEl = document.createElement("div");
                delayRowEl.className = "ebc-delay-row";
                const delayLblEl = document.createElement("span");
                delayLblEl.className = "ebc-form-label";
                delayLblEl.textContent = "Step delay";
                const delayInp = Object.assign(document.createElement("input"), {
                    type: "range", min: "50", max: "2000", step: "50",
                    value: String(Math.max(50, Math.min(2000, initialDelay))),
                });
                const delayValEl = document.createElement("span");
                delayValEl.className = "ebc-delay-val";
                delayValEl.textContent = `${delayInp.value} ms`;
                delayInp.addEventListener("input", () => {
                    delayValEl.textContent = `${delayInp.value} ms`;
                    // Update all the ↓ X ms labels between steps
                    listEl.querySelectorAll(".ebc-step-delay").forEach((el, i) => {
                        el.textContent = `↓ ${delayInp.value} ms`;
                    });
                });
                delayRowEl.appendChild(delayLblEl);
                delayRowEl.appendChild(delayInp);
                delayRowEl.appendChild(delayValEl);
                // Render list now (after delayInp is created so delay labels work)
                renderList();
                // -- Quick-add from known poses ---------------------------------------
                const addHint = document.createElement("div");
                addHint.className = "ebc-import-hint";
                addHint.style.marginTop = "4px";
                addHint.textContent = "Add a step:";
                parent.appendChild(addHint);
                for (const group of KNOWN_POSES) {
                    const groupLbl = document.createElement("div");
                    groupLbl.style.cssText = "font-size:9px;color:#8a4460;margin:3px 0 2px;font-family:'Trebuchet MS',serif;";
                    groupLbl.textContent = group.group.toUpperCase();
                    parent.appendChild(groupLbl);
                    const btnRow = document.createElement("div");
                    btnRow.className = "ebc-pose-add-grid";
                    for (const p of group.poses) {
                        if (!p.key)
                            continue;
                        const btn = document.createElement("button");
                        btn.className = "ebc-pose-add-btn";
                        btn.textContent = `+ ${p.label}`;
                        btn.title = `Add "${p.label}" as next step`;
                        btn.addEventListener("click", () => { poses.push(p.key); renderList(); });
                        btnRow.appendChild(btn);
                    }
                    parent.appendChild(btnRow);
                }
                // Custom pose add
                const customHint = document.createElement("div");
                customHint.className = "ebc-import-hint";
                customHint.style.marginTop = "3px";
                customHint.textContent = "Custom pose key:";
                parent.appendChild(customHint);
                const customRow = document.createElement("div");
                customRow.style.cssText = "display:flex;gap:5px;";
                const customInp = Object.assign(document.createElement("input"), {
                    className: "ebc-form-input", type: "text", placeholder: "e.g. Hogtied",
                    maxLength: 40,
                });
                customInp.style.flex = "1";
                const addCustomBtn = document.createElement("button");
                addCustomBtn.className = "ebc-update-btn";
                addCustomBtn.textContent = "+ Add";
                addCustomBtn.addEventListener("click", () => {
                    const val = customInp.value.trim();
                    if (val) {
                        poses.push(val);
                        customInp.value = "";
                        renderList();
                    }
                });
                customRow.appendChild(customInp);
                customRow.appendChild(addCustomBtn);
                parent.appendChild(customRow);
                // Add delay row after the custom row
                parent.appendChild(delayRowEl);
                return {
                    getPoses: () => poses.filter(Boolean),
                    getDelay: () => Number(delayInp.value),
                };
            };
            // Helper: build command + announce rows into a parent element
            // Returns getters for the current values
            const buildComboOptions = (parent, initCommand = "", initAnnounce = "") => {
                // Command row (optional)
                const cmdRow = document.createElement("div");
                cmdRow.className = "ebc-form-row";
                const cmdLbl = document.createElement("span");
                cmdLbl.className = "ebc-form-label";
                cmdLbl.textContent = "Command";
                const cmdPrefix = document.createElement("span");
                cmdPrefix.style.cssText = "color:#cf6f98;font-weight:600;margin-right:2px;";
                cmdPrefix.textContent = "/";
                const cmdInp = Object.assign(document.createElement("input"), {
                    className: "ebc-form-input", type: "text",
                    value: initCommand, placeholder: "optional",
                    maxLength: 30, title: "Chat command to apply this combo (optional)",
                });
                cmdInp.style.flex = "1";
                const cmdWrap = document.createElement("div");
                cmdWrap.style.cssText = "display:flex;align-items:center;flex:1;";
                cmdWrap.appendChild(cmdPrefix);
                cmdWrap.appendChild(cmdInp);
                cmdRow.appendChild(cmdLbl);
                cmdRow.appendChild(cmdWrap);
                parent.appendChild(cmdRow);
                // Announce text (optional)
                const annRow = document.createElement("div");
                annRow.className = "ebc-form-row";
                const annLbl = document.createElement("span");
                annLbl.className = "ebc-form-label";
                annLbl.textContent = "Announce";
                const annInp = Object.assign(document.createElement("input"), {
                    className: "ebc-form-input", type: "text",
                    value: initAnnounce, placeholder: "Room action (optional)",
                    maxLength: 100, title: "Action emote shown to room when combo is applied (leave blank to skip)",
                });
                annInp.style.flex = "1";
                annRow.appendChild(annLbl);
                annRow.appendChild(annInp);
                parent.appendChild(annRow);
                return {
                    getCommand: () => cmdInp.value,
                    getAnnounce: () => annInp.value,
                };
            };
            // ── Active pose status bar ─────────────────────────────────────────────
            const statusBar = document.createElement("div");
            statusBar.style.cssText = [
                "background:#190b13",
                "border-radius:6px",
                "padding:5px 8px",
                "margin-bottom:8px",
                "display:flex",
                "align-items:center",
                "gap:6px",
                "flex-wrap:wrap",
            ].join(";");
            const statusLbl = document.createElement("span");
            statusLbl.style.cssText = "color:#cbaab7;font-size:10px;font-weight:600;";
            statusLbl.textContent = "NOW:";
            statusBar.appendChild(statusLbl);
            if (currentPoses.length === 0) {
                const pill = document.createElement("span");
                pill.style.cssText = "background:#cf6f98;color:#fff;border-radius:4px;padding:1px 7px;font-size:11px;";
                pill.textContent = "Standing";
                statusBar.appendChild(pill);
            }
            else {
                for (const p of currentPoses) {
                    const pill = document.createElement("span");
                    pill.style.cssText = "background:#cf6f98;color:#fff;border-radius:4px;padding:1px 7px;font-size:11px;";
                    // Find the human label for this key
                    let label = p;
                    for (const g of KNOWN_POSES) {
                        const found = g.poses.find(x => x.key === p);
                        if (found) {
                            label = found.label;
                            break;
                        }
                    }
                    pill.textContent = label;
                    statusBar.appendChild(pill);
                }
            }
            // Clear all button
            if (currentPoses.length > 0) {
                const clearBtn = document.createElement("button");
                clearBtn.style.cssText = "margin-left:auto;font-size:10px;padding:2px 7px;";
                clearBtn.className = "ebc-outfit-del";
                clearBtn.textContent = "Stand";
                clearBtn.title = "Clear all poses";
                clearBtn.addEventListener("click", () => {
                    applyPoses([]);
                    window.setTimeout(() => this.renderPoses(), 150);
                });
                statusBar.appendChild(clearBtn);
            }
            body.appendChild(statusBar);
            // ── Hint ──────────────────────────────────────────────────────────────
            const hint = document.createElement("div");
            hint.className = "ebc-import-hint";
            hint.style.marginBottom = "6px";
            hint.textContent = "Pick one Body pose and one Arm pose — they stack!";
            body.appendChild(hint);
            // ── Preset grids ──────────────────────────────────────────────────────
            for (const group of KNOWN_POSES) {
                const lbl = document.createElement("div");
                lbl.className = "ebc-section-label";
                lbl.textContent = group.group.toUpperCase();
                body.appendChild(lbl);
                const grid = document.createElement("div");
                grid.className = "ebc-pose-grid";
                body.appendChild(grid);
                for (const preset of group.poses) {
                    const btn = document.createElement("button");
                    preset.key ? [preset.key] : [];
                    const isActive = preset.key === ""
                        ? currentPoses.length === 0
                        : isPoseActive(preset.key);
                    btn.className = "ebc-pose-btn" + (isActive ? " active" : "");
                    btn.textContent = preset.label;
                    btn.title = preset.key
                        ? `Set ${group.group.toLowerCase()} pose: ${preset.key}`
                        : "Clear all poses";
                    btn.addEventListener("click", () => {
                        if (preset.key === "") {
                            // "Stand" clears everything
                            applyPoses([]);
                        }
                        else if (group.group === "Body") {
                            // Replace body pose but keep existing arm poses
                            const armPoses = currentPoses.filter(p => { var _a; return (_a = KNOWN_POSES.find(g => g.group === "Arms")) === null || _a === void 0 ? void 0 : _a.poses.some(x => x.key === p); });
                            applyPoses([preset.key, ...armPoses]);
                        }
                        else {
                            // Replace arm pose but keep existing body poses
                            const bodyPoses = currentPoses.filter(p => { var _a; return (_a = KNOWN_POSES.find(g => g.group === "Body")) === null || _a === void 0 ? void 0 : _a.poses.some(x => x.key === p); });
                            applyPoses([...bodyPoses, preset.key]);
                        }
                        window.setTimeout(() => this.renderPoses(), 150);
                    });
                    grid.appendChild(btn);
                }
            }
            // ── Saved Combos ──────────────────────────────────────────────────────
            const divEl = document.createElement("div");
            divEl.className = "ebc-divider";
            body.appendChild(divEl);
            const combosLbl = document.createElement("div");
            combosLbl.className = "ebc-section-label";
            combosLbl.textContent = "SAVED COMBOS";
            body.appendChild(combosLbl);
            const combos = getPoseCombos();
            if (combos.length === 0) {
                const none = document.createElement("div");
                none.className = "ebc-empty";
                none.style.padding = "4px 0 6px";
                none.textContent = "No combos yet — create one below.";
                body.appendChild(none);
            }
            for (const combo of combos) {
                const wrapper = document.createElement("div");
                wrapper.style.marginBottom = "3px";
                const row = document.createElement("div");
                row.className = "ebc-combo-row";
                row.style.borderRadius = "6px";
                row.style.marginBottom = "0";
                const nameEl = document.createElement("span");
                nameEl.className = "ebc-combo-name";
                nameEl.textContent = combo.name;
                if (combo.command) {
                    nameEl.title = `/${combo.command}`;
                }
                // Show poses as "Body → Arms" with arrow separator
                const posesEl = document.createElement("span");
                posesEl.className = "ebc-combo-poses";
                const poseLabels = combo.poses.map(k => {
                    for (const g of KNOWN_POSES) {
                        const found = g.poses.find(x => x.key === k);
                        if (found)
                            return found.label;
                    }
                    return k;
                });
                posesEl.textContent = poseLabels.join(" → ") || "(none)";
                if (combo.command) {
                    const cmdBadge = document.createElement("span");
                    cmdBadge.style.cssText = "margin-left:4px;color:#cf6f98;font-size:10px;";
                    cmdBadge.textContent = `/${combo.command}`;
                    posesEl.appendChild(cmdBadge);
                }
                const applyBtn = document.createElement("button");
                applyBtn.className = "ebc-wear-btn";
                applyBtn.textContent = "▶";
                applyBtn.title = "Apply this combo (animates step by step)";
                applyBtn.style.padding = "3px 8px";
                applyBtn.addEventListener("click", () => {
                    var _a;
                    const steps = combo.poses.filter(Boolean);
                    const delay = (_a = combo.stepDelayMs) !== null && _a !== void 0 ? _a : 420;
                    applyBtn.disabled = true;
                    applyBtn.textContent = "…";
                    // applyCombo handles both the sequential animation AND the announce text
                    applyCombo(combo);
                    const totalMs = steps.length > 1 ? (steps.length - 1) * delay + 200 : 200;
                    window.setTimeout(() => {
                        applyBtn.disabled = false;
                        applyBtn.textContent = "▶";
                        this.renderPoses();
                    }, totalMs);
                });
                const editBtn = document.createElement("button");
                editBtn.className = "ebc-edit-btn";
                editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
                editBtn.title = "Edit combo";
                let delPending = false;
                let delTimer = null;
                const delBtn = document.createElement("button");
                delBtn.className = "ebc-outfit-del";
                delBtn.textContent = "×";
                delBtn.title = "Delete combo";
                delBtn.addEventListener("click", () => {
                    if (!delPending) {
                        delPending = true;
                        delBtn.classList.add("confirm");
                        delBtn.textContent = "Sure?";
                        delTimer = window.setTimeout(() => {
                            delPending = false;
                            delBtn.classList.remove("confirm");
                            delBtn.textContent = "×";
                        }, 2500);
                    }
                    else {
                        if (delTimer)
                            window.clearTimeout(delTimer);
                        deleteCombo(combo.id);
                        this.renderPoses();
                    }
                });
                row.appendChild(nameEl);
                row.appendChild(posesEl);
                row.appendChild(applyBtn);
                row.appendChild(editBtn);
                row.appendChild(delBtn);
                // ── Inline editor ─────────────────────────────────────────────────
                const editor = document.createElement("div");
                editor.className = "ebc-combo-editor";
                // Name
                const eNameRow = document.createElement("div");
                eNameRow.className = "ebc-form-row";
                const eNameLbl = document.createElement("span");
                eNameLbl.className = "ebc-form-label";
                eNameLbl.textContent = "Name";
                const eNameInp = Object.assign(document.createElement("input"), {
                    className: "ebc-form-input", type: "text", value: combo.name, maxLength: 30,
                });
                eNameInp.style.flex = "1";
                eNameRow.appendChild(eNameLbl);
                eNameRow.appendChild(eNameInp);
                editor.appendChild(eNameRow);
                // Quick-save at top so it's always reachable without scrolling
                const topSaveBar = document.createElement("div");
                topSaveBar.className = "ebc-editor-save-bar";
                const topSaveBtn = document.createElement("button");
                topSaveBtn.className = "ebc-update-btn";
                topSaveBtn.textContent = "✓ Save Changes";
                topSaveBtn.style.cssText = "flex:1;font-size:11px;";
                editor.appendChild(topSaveBar); // appended before we have getPoses/getDelay — wired below
                // Ordered pose step editor
                const poseSectionLbl = document.createElement("div");
                poseSectionLbl.className = "ebc-import-hint";
                poseSectionLbl.textContent = "Sequence:";
                editor.appendChild(poseSectionLbl);
                const { getPoses, getDelay } = buildPoseOrderEditor(editor, combo.poses, (_b = combo.stepDelayMs) !== null && _b !== void 0 ? _b : 420);
                // Command + Announce
                const { getCommand, getAnnounce } = buildComboOptions(editor, (_c = combo.command) !== null && _c !== void 0 ? _c : "", (_d = combo.announceText) !== null && _d !== void 0 ? _d : "");
                // Wire top save button now that getPoses/getDelay/getCommand/getAnnounce exist
                topSaveBtn.addEventListener("click", () => {
                    updateCombo(combo.id, eNameInp.value, getPoses(), getCommand(), getAnnounce(), getDelay());
                    this.renderPoses();
                });
                topSaveBar.appendChild(topSaveBtn);
                // Full save button at the bottom too
                const saveBar = document.createElement("div");
                saveBar.className = "ebc-editor-save-bar";
                saveBar.style.marginTop = "2px";
                const savComboBtn = document.createElement("button");
                savComboBtn.className = "ebc-create-btn";
                savComboBtn.textContent = "Save Changes";
                savComboBtn.addEventListener("click", () => {
                    updateCombo(combo.id, eNameInp.value, getPoses(), getCommand(), getAnnounce(), getDelay());
                    this.renderPoses();
                });
                saveBar.appendChild(savComboBtn);
                editor.appendChild(saveBar);
                editBtn.addEventListener("click", () => {
                    const open = editor.classList.contains("open");
                    editor.classList.toggle("open", !open);
                    editBtn.classList.toggle("open", !open);
                    row.style.borderRadius = open ? "6px" : "6px 6px 0 0";
                    // Scroll the editor top into view so user sees the start of the form
                    if (!open)
                        window.setTimeout(() => row.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
                });
                wrapper.appendChild(row);
                wrapper.appendChild(editor);
                body.appendChild(wrapper);
            }
            // ── New combo form ────────────────────────────────────────────────────
            const div2 = document.createElement("div");
            div2.className = "ebc-divider";
            body.appendChild(div2);
            const newComboToggle = document.createElement("button");
            newComboToggle.className = "ebc-new-outfit-btn";
            newComboToggle.textContent = "+ New Pose Combo";
            body.appendChild(newComboToggle);
            const newComboForm = document.createElement("div");
            newComboForm.className = "ebc-new-form";
            body.appendChild(newComboForm);
            // Name
            const ncNameRow = document.createElement("div");
            ncNameRow.className = "ebc-form-row";
            const ncNameLbl = document.createElement("span");
            ncNameLbl.className = "ebc-form-label";
            ncNameLbl.textContent = "Name";
            const ncNameInp = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "e.g. Kneel Arms Back", maxLength: 30,
            });
            ncNameInp.style.flex = "1";
            ncNameRow.appendChild(ncNameLbl);
            ncNameRow.appendChild(ncNameInp);
            newComboForm.appendChild(ncNameRow);
            // Quick-save at top — always visible without scrolling
            const ncTopSaveBar = document.createElement("div");
            ncTopSaveBar.className = "ebc-editor-save-bar";
            const ncTopSaveBtn = document.createElement("button");
            ncTopSaveBtn.className = "ebc-update-btn";
            ncTopSaveBtn.textContent = "✓ Save Combo";
            ncTopSaveBtn.style.cssText = "flex:1;font-size:11px;";
            newComboForm.appendChild(ncTopSaveBar); // wired below after getters exist
            // Ordered pose step editor
            const ncPoseLbl = document.createElement("div");
            ncPoseLbl.className = "ebc-import-hint";
            ncPoseLbl.style.marginTop = "3px";
            ncPoseLbl.textContent = "Sequence:";
            newComboForm.appendChild(ncPoseLbl);
            const { getPoses: ncGetPoses, getDelay: ncGetDelay } = buildPoseOrderEditor(newComboForm, []);
            // Command + Announce
            const { getCommand: ncGetCommand, getAnnounce: ncGetAnnounce } = buildComboOptions(newComboForm);
            // Wire the top save button
            const doSave = () => {
                const name = ncNameInp.value.trim();
                if (!name) {
                    ncNameInp.style.borderColor = "#cf6f98";
                    return;
                }
                createCombo(name, ncGetPoses(), ncGetCommand(), ncGetAnnounce(), ncGetDelay());
                this.renderPoses();
            };
            ncTopSaveBtn.addEventListener("click", doSave);
            ncTopSaveBar.appendChild(ncTopSaveBtn);
            // Full save button at the bottom too
            const ncSaveBar = document.createElement("div");
            ncSaveBar.className = "ebc-editor-save-bar";
            ncSaveBar.style.marginTop = "2px";
            const ncSaveBtn = document.createElement("button");
            ncSaveBtn.className = "ebc-create-btn";
            ncSaveBtn.textContent = "Save Combo";
            ncSaveBtn.addEventListener("click", doSave);
            ncSaveBar.appendChild(ncSaveBtn);
            newComboForm.appendChild(ncSaveBar);
            newComboToggle.addEventListener("click", () => {
                const open = newComboForm.style.display !== "none";
                newComboForm.style.display = open ? "none" : "flex";
                newComboToggle.textContent = open ? "+ New Pose Combo" : "- Cancel";
                if (!open) {
                    ncNameInp.focus();
                    window.setTimeout(() => newComboToggle.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
                }
            });
            // ── SCENES ────────────────────────────────────────────────────────────
            this.renderScenes(body);
        }
        renderScenes(body) {
            var _a, _b, _c, _d, _e;
            const STEP_TYPE_LABELS = {
                pose: "Pose", equip: "Equip", unequip: "Unequip", emote: "Emote", chat: "Chat", wait: "Wait",
            };
            const ALL_STEP_TYPES = ["pose", "equip", "unequip", "emote", "chat", "wait"];
            const bodyPoses = (_b = (_a = KNOWN_POSES.find(g => g.group === "Body")) === null || _a === void 0 ? void 0 : _a.poses) !== null && _b !== void 0 ? _b : [];
            const armPoses = (_d = (_c = KNOWN_POSES.find(g => g.group === "Arms")) === null || _c === void 0 ? void 0 : _c.poses) !== null && _d !== void 0 ? _d : [];
            const getAllGroups = () => {
                var _a, _b;
                try {
                    const bcAsset = window.Asset;
                    if (!Array.isArray(bcAsset))
                        return [];
                    const family = (_a = Player.AssetFamily) !== null && _a !== void 0 ? _a : "Female3DCG";
                    const seen = new Set();
                    const out = [];
                    for (const a of bcAsset) {
                        const g = a.Group;
                        if ((g.Family === family || !g.Family) && !seen.has(g.Name)) {
                            seen.add(g.Name);
                            const desc = ((_b = g.Description) === null || _b === void 0 ? void 0 : _b.trim()) || g.Name;
                            out.push({ name: g.Name, desc });
                        }
                    }
                    return out.sort((a, b) => a.desc.localeCompare(b.desc));
                }
                catch (_c) {
                    return [];
                }
            };
            const getGroupAssets = (groupName) => {
                var _a, _b;
                try {
                    const bcAsset = window.Asset;
                    if (!Array.isArray(bcAsset))
                        return [];
                    const family = (_a = Player.AssetFamily) !== null && _a !== void 0 ? _a : "Female3DCG";
                    const out = [];
                    for (const a of bcAsset) {
                        if (a.Group.Name === groupName && (a.Group.Family === family || !a.Group.Family)) {
                            const desc = ((_b = a.Description) === null || _b === void 0 ? void 0 : _b.trim()) || a.Name;
                            out.push({ name: a.Name, desc });
                        }
                    }
                    return out.sort((a, b) => a.desc.localeCompare(b.desc));
                }
                catch (_c) {
                    return [];
                }
            };
            // Build a live step card — returns getStep() which always reads current field state
            const buildStepCard = (initStep, onMoveUp, onMoveDown, onDelete, onDuplicate) => {
                var _a, _b, _c, _d, _e, _f, _g, _h;
                const card = document.createElement("div");
                card.className = "ebc-scene-step";
                // Header: type select, delay input, move/delete buttons
                const header = document.createElement("div");
                header.className = "ebc-scene-step-header";
                const typeSelect = document.createElement("select");
                typeSelect.className = "ebc-scene-type-sel";
                for (const t of ALL_STEP_TYPES) {
                    const opt = document.createElement("option");
                    opt.value = t;
                    opt.textContent = STEP_TYPE_LABELS[t];
                    opt.selected = t === initStep.type;
                    typeSelect.appendChild(opt);
                }
                const delayInp = document.createElement("input");
                delayInp.type = "number";
                delayInp.className = "ebc-scene-delay";
                delayInp.min = "0";
                delayInp.max = "30000";
                delayInp.value = String(initStep.delayMs);
                delayInp.title = "Milliseconds to wait before this step fires";
                const msLbl = document.createElement("span");
                msLbl.className = "ebc-scene-ms-lbl";
                msLbl.textContent = "ms delay";
                const upBtn = document.createElement("button");
                upBtn.className = "ebc-step-move";
                upBtn.textContent = "↑";
                upBtn.disabled = onMoveUp === null;
                if (onMoveUp)
                    upBtn.addEventListener("click", onMoveUp);
                const downBtn = document.createElement("button");
                downBtn.className = "ebc-step-move";
                downBtn.textContent = "↓";
                downBtn.disabled = onMoveDown === null;
                if (onMoveDown)
                    downBtn.addEventListener("click", onMoveDown);
                const dupBtn = document.createElement("button");
                dupBtn.className = "ebc-step-move";
                dupBtn.textContent = "⧉";
                dupBtn.title = "Duplicate step";
                dupBtn.addEventListener("click", onDuplicate);
                const delBtn = document.createElement("button");
                delBtn.className = "ebc-step-del";
                delBtn.textContent = "×";
                delBtn.addEventListener("click", onDelete);
                header.appendChild(typeSelect);
                header.appendChild(delayInp);
                header.appendChild(msLbl);
                header.appendChild(upBtn);
                header.appendChild(downBtn);
                header.appendChild(dupBtn);
                header.appendChild(delBtn);
                card.appendChild(header);
                // Fields area — rebuilt when type changes
                const fieldsEl = document.createElement("div");
                fieldsEl.className = "ebc-scene-fields";
                card.appendChild(fieldsEl);
                // Per-type mutable state (seeded from initStep)
                let posePoses = (_b = (_a = initStep.poses) === null || _a === void 0 ? void 0 : _a.slice()) !== null && _b !== void 0 ? _b : [];
                let equipGroup = (_c = initStep.group) !== null && _c !== void 0 ? _c : "";
                let equipAsset = (_d = initStep.assetName) !== null && _d !== void 0 ? _d : "";
                let equipColorRaw = Array.isArray(initStep.color)
                    ? initStep.color.join(",")
                    : ((_e = initStep.color) !== null && _e !== void 0 ? _e : "");
                let unequipGroup = (_f = initStep.group) !== null && _f !== void 0 ? _f : "";
                let emoteText = (_g = initStep.text) !== null && _g !== void 0 ? _g : "";
                let chatFormat = (_h = initStep.chatFormat) !== null && _h !== void 0 ? _h : "";
                // Colour input reference for the capture button to update
                let colorInpRef = null;
                const renderFields = (type) => {
                    var _a, _b;
                    while (fieldsEl.firstChild)
                        fieldsEl.removeChild(fieldsEl.firstChild);
                    if (type === "pose") {
                        const row = document.createElement("div");
                        row.className = "ebc-scene-fields-row";
                        const makeAxisDropdown = (label, poses, currentKey, dataAttr) => {
                            const wrap = document.createElement("div");
                            wrap.style.cssText = "display:flex;align-items:center;gap:4px;";
                            const lbl = document.createElement("span");
                            lbl.style.cssText = "font-size:10px;color:#9a6878;";
                            lbl.textContent = label + ":";
                            const sel = document.createElement("select");
                            sel.className = "ebc-scene-type-sel";
                            sel.style.width = "90px";
                            sel.dataset.axis = dataAttr;
                            // "None" option for arms axis
                            if (dataAttr === "arms") {
                                const none = document.createElement("option");
                                none.value = "";
                                none.textContent = "None";
                                none.selected = currentKey === "";
                                sel.appendChild(none);
                            }
                            for (const p of poses) {
                                if (dataAttr === "body" || p.key !== "") {
                                    const opt = document.createElement("option");
                                    opt.value = p.key;
                                    opt.textContent = p.label;
                                    opt.selected = p.key === currentKey;
                                    sel.appendChild(opt);
                                }
                            }
                            sel.addEventListener("change", () => {
                                var _a, _b, _c, _d;
                                const bKey = (_b = (_a = fieldsEl.querySelector("[data-axis='body']")) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : "";
                                const aKey = (_d = (_c = fieldsEl.querySelector("[data-axis='arms']")) === null || _c === void 0 ? void 0 : _c.value) !== null && _d !== void 0 ? _d : "";
                                posePoses = [bKey, aKey].filter(Boolean);
                            });
                            wrap.appendChild(lbl);
                            wrap.appendChild(sel);
                            row.appendChild(wrap);
                            return sel;
                        };
                        const curBody = (_a = posePoses.find(k => bodyPoses.some(p => p.key === k))) !== null && _a !== void 0 ? _a : "";
                        const curArms = (_b = posePoses.find(k => armPoses.some(p => p.key === k && p.key !== ""))) !== null && _b !== void 0 ? _b : "";
                        makeAxisDropdown("Body", bodyPoses, curBody, "body");
                        makeAxisDropdown("Arms", armPoses, curArms, "arms");
                        fieldsEl.appendChild(row);
                    }
                    else if (type === "equip") {
                        const groups = getAllGroups();
                        const row1 = document.createElement("div");
                        row1.className = "ebc-scene-fields-row";
                        // Asset dropdown (created first so updateAssetSel can reference it)
                        const assetSel = document.createElement("select");
                        assetSel.className = "ebc-scene-type-sel";
                        assetSel.style.cssText = "flex:1;width:auto;max-width:120px;";
                        assetSel.title = "Item to equip";
                        assetSel.addEventListener("change", () => { equipAsset = assetSel.value; });
                        const updateAssetSel = (preserveValue) => {
                            while (assetSel.firstChild)
                                assetSel.removeChild(assetSel.firstChild);
                            const assets = getGroupAssets(groupSel.value);
                            if (assets.length === 0) {
                                const opt = document.createElement("option");
                                opt.value = "";
                                opt.textContent = groupSel.value ? "— no items —" : "— pick slot first —";
                                assetSel.appendChild(opt);
                                equipAsset = "";
                                return;
                            }
                            let found = false;
                            for (const a of assets) {
                                const opt = document.createElement("option");
                                opt.value = a.name;
                                opt.textContent = a.desc;
                                opt.selected = a.name === preserveValue;
                                if (a.name === preserveValue)
                                    found = true;
                                assetSel.appendChild(opt);
                            }
                            if (!found) {
                                assetSel.selectedIndex = 0;
                            }
                            equipAsset = assetSel.value;
                        };
                        // Group dropdown
                        const groupSel = document.createElement("select");
                        groupSel.className = "ebc-scene-type-sel";
                        groupSel.style.cssText = "flex:1;width:auto;max-width:130px;";
                        groupSel.title = "Item slot";
                        {
                            const ph = document.createElement("option");
                            ph.value = "";
                            ph.textContent = "— pick slot —";
                            ph.disabled = true;
                            ph.selected = !equipGroup;
                            groupSel.appendChild(ph);
                        }
                        for (const g of groups) {
                            const opt = document.createElement("option");
                            opt.value = g.name;
                            opt.textContent = g.desc;
                            opt.selected = g.name === equipGroup;
                            groupSel.appendChild(opt);
                        }
                        groupSel.addEventListener("change", () => {
                            equipGroup = groupSel.value;
                            updateAssetSel(equipAsset);
                        });
                        updateAssetSel(equipAsset); // populate initial asset list
                        const captureBtn = document.createElement("button");
                        captureBtn.className = "ebc-update-btn";
                        captureBtn.textContent = "📷";
                        captureBtn.title = "Fill from currently worn item in selected slot";
                        captureBtn.style.cssText = "flex:0 0 auto;font-size:12px;padding:2px 6px;";
                        captureBtn.addEventListener("click", () => {
                            try {
                                const g = groupSel.value;
                                if (!g)
                                    return;
                                const item = InventoryGet(Player, g);
                                if (!item)
                                    return;
                                equipAsset = item.Asset.Name;
                                updateAssetSel(equipAsset);
                                const c = item.Color;
                                if (c !== undefined && colorInpRef) {
                                    const s = Array.isArray(c) ? c.join(",") : String(c);
                                    colorInpRef.value = s;
                                    equipColorRaw = s;
                                }
                            }
                            catch ( /* ignore */_a) { /* ignore */ }
                        });
                        row1.appendChild(groupSel);
                        row1.appendChild(assetSel);
                        row1.appendChild(captureBtn);
                        fieldsEl.appendChild(row1);
                        const colorInp = Object.assign(document.createElement("input"), {
                            className: "ebc-form-input", type: "text",
                            placeholder: "Color — optional, e.g. Default or #ff0000,Default",
                            value: equipColorRaw, maxLength: 200,
                        });
                        colorInp.addEventListener("input", () => { equipColorRaw = colorInp.value; });
                        colorInpRef = colorInp;
                        fieldsEl.appendChild(colorInp);
                    }
                    else if (type === "unequip") {
                        const groups = getAllGroups();
                        const slotSel = document.createElement("select");
                        slotSel.className = "ebc-scene-type-sel";
                        slotSel.style.cssText = "width:100%;max-width:100%;";
                        slotSel.title = "Slot to clear — removes whatever is worn there when the scene plays";
                        {
                            const ph = document.createElement("option");
                            ph.value = "";
                            ph.textContent = "— pick slot —";
                            ph.disabled = true;
                            ph.selected = !unequipGroup;
                            slotSel.appendChild(ph);
                        }
                        for (const g of groups) {
                            const opt = document.createElement("option");
                            opt.value = g.name;
                            opt.textContent = g.desc;
                            opt.selected = g.name === unequipGroup;
                            slotSel.appendChild(opt);
                        }
                        slotSel.addEventListener("change", () => { unequipGroup = slotSel.value; });
                        fieldsEl.appendChild(slotSel);
                    }
                    else if (type === "emote") {
                        const textInp = Object.assign(document.createElement("input"), {
                            className: "ebc-form-input", type: "text",
                            placeholder: "Action text (e.g. slowly removes her shirt...)",
                            value: emoteText, maxLength: 200,
                        });
                        textInp.addEventListener("input", () => { emoteText = textInp.value; });
                        fieldsEl.appendChild(textInp);
                    }
                    else if (type === "chat") {
                        const row = document.createElement("div");
                        row.className = "ebc-scene-fields-row";
                        const makeToggle = (label, val) => {
                            const btn = document.createElement("button");
                            btn.textContent = label;
                            btn.style.cssText = [
                                "flex:0 0 auto", "padding:2px 9px", "font-size:11px",
                                "font-family:'Trebuchet MS',serif", "border-radius:4px", "cursor:pointer",
                                "border:1px solid #5a2840", "transition:background 0.12s,color 0.12s",
                            ].join(";");
                            const setActive = (active) => {
                                btn.style.background = active ? "#cf6f98" : "#1b0d17";
                                btn.style.color = active ? "#fff" : "#9a6878";
                            };
                            setActive(chatFormat === val);
                            btn.addEventListener("click", () => {
                                chatFormat = val;
                                row.querySelectorAll("[data-fmt]").forEach(b => {
                                    const bVal = b.dataset.fmt;
                                    b.style.background = bVal === val ? "#cf6f98" : "#1b0d17";
                                    b.style.color = bVal === val ? "#fff" : "#9a6878";
                                });
                            });
                            btn.dataset.fmt = val;
                            return btn;
                        };
                        const textInp = Object.assign(document.createElement("input"), {
                            className: "ebc-form-input", type: "text",
                            placeholder: "message text...",
                            value: emoteText, maxLength: 1000,
                        });
                        textInp.style.flex = "1";
                        textInp.addEventListener("input", () => { emoteText = textInp.value; });
                        row.appendChild(makeToggle("* *", "*"));
                        row.appendChild(makeToggle("( )", "("));
                        row.appendChild(textInp);
                        fieldsEl.appendChild(row);
                    }
                    // wait: no extra fields — delay IS the step
                };
                let currentType = initStep.type;
                renderFields(currentType);
                typeSelect.addEventListener("change", () => {
                    currentType = typeSelect.value;
                    renderFields(currentType);
                });
                const getStep = () => {
                    const delay = Math.max(0, Math.min(30000, Number(delayInp.value) || 0));
                    const step = { type: currentType, delayMs: delay };
                    switch (currentType) {
                        case "pose":
                            step.poses = posePoses.filter(Boolean);
                            break;
                        case "equip":
                            step.group = equipGroup.trim();
                            step.assetName = equipAsset.trim();
                            if (equipColorRaw.trim()) {
                                const parts = equipColorRaw.split(",").map(s => s.trim()).filter(Boolean);
                                step.color = parts.length === 1 ? parts[0] : parts;
                            }
                            break;
                        case "unequip":
                            step.group = unequipGroup.trim();
                            break;
                        case "emote":
                            step.text = emoteText.trim();
                            break;
                        case "chat":
                            step.text = emoteText.trim();
                            step.chatFormat = chatFormat;
                            break;
                    }
                    return step;
                };
                return { el: card, getStep };
            };
            // Build a full step list editor — returns getSteps()
            const buildSceneEditor = (parent, initSteps) => {
                const steps = initSteps.map(s => (Object.assign({}, s)));
                const entries = [];
                const stepsContainer = document.createElement("div");
                parent.appendChild(stepsContainer);
                const syncFromEntries = () => {
                    for (let i = 0; i < entries.length; i++) {
                        steps[i] = entries[i].getStep();
                    }
                };
                const fullRebuild = () => {
                    entries.length = 0;
                    while (stepsContainer.firstChild)
                        stepsContainer.removeChild(stepsContainer.firstChild);
                    if (steps.length === 0) {
                        const empty = document.createElement("div");
                        empty.className = "ebc-import-hint";
                        empty.style.cssText = "text-align:center;padding:5px 0 3px;";
                        empty.textContent = "No steps yet — add one below.";
                        stepsContainer.appendChild(empty);
                        return;
                    }
                    for (let i = 0; i < steps.length; i++) {
                        const idx = i;
                        const entry = buildStepCard(steps[i], idx > 0 ? () => {
                            syncFromEntries();
                            [steps[idx - 1], steps[idx]] = [steps[idx], steps[idx - 1]];
                            fullRebuild();
                        } : null, idx < steps.length - 1 ? () => {
                            syncFromEntries();
                            [steps[idx], steps[idx + 1]] = [steps[idx + 1], steps[idx]];
                            fullRebuild();
                        } : null, () => {
                            syncFromEntries();
                            steps.splice(idx, 1);
                            fullRebuild();
                        }, () => {
                            syncFromEntries();
                            steps.splice(idx + 1, 0, Object.assign({}, steps[idx]));
                            fullRebuild();
                        });
                        entries.push(entry);
                        stepsContainer.appendChild(entry.el);
                    }
                };
                fullRebuild();
                // Add step row
                const addRow = document.createElement("div");
                addRow.style.cssText = "display:flex;gap:5px;margin-top:4px;align-items:center;";
                const addTypeSel = document.createElement("select");
                addTypeSel.className = "ebc-scene-type-sel";
                addTypeSel.style.width = "80px";
                for (const t of ALL_STEP_TYPES) {
                    const opt = document.createElement("option");
                    opt.value = t;
                    opt.textContent = STEP_TYPE_LABELS[t];
                    addTypeSel.appendChild(opt);
                }
                const addBtn = document.createElement("button");
                addBtn.className = "ebc-update-btn";
                addBtn.textContent = "+ Add Step";
                addBtn.addEventListener("click", () => {
                    syncFromEntries();
                    const defDelays = {
                        pose: 500, equip: 800, unequip: 600, emote: 100, chat: 100, wait: 1000,
                    };
                    steps.push({ type: addTypeSel.value, delayMs: defDelays[addTypeSel.value] });
                    fullRebuild();
                    window.setTimeout(() => { var _a; return (_a = stepsContainer.lastElementChild) === null || _a === void 0 ? void 0 : _a.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 30);
                });
                addRow.appendChild(addTypeSel);
                addRow.appendChild(addBtn);
                parent.appendChild(addRow);
                return { getSteps: () => entries.map(e => e.getStep()) };
            };
            // ── Scene list ─────────────────────────────────────────────────────────
            const sceneDivider = document.createElement("div");
            sceneDivider.className = "ebc-divider";
            body.appendChild(sceneDivider);
            const scenesLbl = document.createElement("div");
            scenesLbl.className = "ebc-section-label";
            scenesLbl.textContent = "SCENES";
            body.appendChild(scenesLbl);
            const scenesHint = document.createElement("div");
            scenesHint.className = "ebc-import-hint";
            scenesHint.style.marginBottom = "6px";
            scenesHint.textContent = "Chain poses, item changes, emotes and pauses into a timed sequence.";
            body.appendChild(scenesHint);
            const scenes = getScenes();
            if (scenes.length === 0) {
                const none = document.createElement("div");
                none.className = "ebc-empty";
                none.style.padding = "4px 0 6px";
                none.textContent = "No scenes yet — create one below.";
                body.appendChild(none);
            }
            for (const scene of scenes) {
                const wrapper = document.createElement("div");
                wrapper.style.marginBottom = "3px";
                const row = document.createElement("div");
                row.className = "ebc-combo-row";
                row.style.cssText += ";border-radius:6px;margin-bottom:0;";
                const nameEl = document.createElement("span");
                nameEl.className = "ebc-combo-name";
                nameEl.textContent = scene.name;
                if (scene.command)
                    nameEl.title = `/${scene.command}`;
                const stepCountEl = document.createElement("span");
                stepCountEl.className = "ebc-combo-poses";
                stepCountEl.textContent = `${scene.steps.length} step${scene.steps.length !== 1 ? "s" : ""}`;
                if (scene.command) {
                    const badge = document.createElement("span");
                    badge.style.cssText = "margin-left:4px;color:#cf6f98;font-size:10px;";
                    badge.textContent = `/${scene.command}`;
                    stepCountEl.appendChild(badge);
                }
                const playBtn = document.createElement("button");
                playBtn.className = "ebc-wear-btn";
                playBtn.textContent = "▶";
                playBtn.title = "Play this scene";
                playBtn.style.padding = "3px 8px";
                playBtn.addEventListener("click", () => {
                    playBtn.disabled = true;
                    playBtn.textContent = "…";
                    runScene(scene);
                    const totalMs = scene.steps.reduce((s, st) => s + st.delayMs, 0) + 500;
                    window.setTimeout(() => {
                        playBtn.disabled = false;
                        playBtn.textContent = "▶";
                        this.renderPoses();
                    }, totalMs);
                });
                const editBtn = document.createElement("button");
                editBtn.className = "ebc-edit-btn";
                editBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
                editBtn.title = "Edit scene";
                let delPending = false;
                let delTimer = null;
                const delBtn = document.createElement("button");
                delBtn.className = "ebc-outfit-del";
                delBtn.textContent = "×";
                delBtn.title = "Delete scene";
                delBtn.addEventListener("click", () => {
                    if (!delPending) {
                        delPending = true;
                        delBtn.classList.add("confirm");
                        delBtn.textContent = "Sure?";
                        delTimer = window.setTimeout(() => {
                            delPending = false;
                            delBtn.classList.remove("confirm");
                            delBtn.textContent = "×";
                        }, 2500);
                    }
                    else {
                        if (delTimer)
                            window.clearTimeout(delTimer);
                        deleteScene(scene.id);
                        this.renderPoses();
                    }
                });
                row.appendChild(nameEl);
                row.appendChild(stepCountEl);
                row.appendChild(playBtn);
                row.appendChild(editBtn);
                row.appendChild(delBtn);
                // Inline editor
                const editor = document.createElement("div");
                editor.className = "ebc-combo-editor";
                const eNameRow = document.createElement("div");
                eNameRow.className = "ebc-form-row";
                const eNameLbl = document.createElement("span");
                eNameLbl.className = "ebc-form-label";
                eNameLbl.textContent = "Name";
                const eNameInp = Object.assign(document.createElement("input"), {
                    className: "ebc-form-input", type: "text", value: scene.name, maxLength: 40,
                });
                eNameInp.style.flex = "1";
                eNameRow.appendChild(eNameLbl);
                eNameRow.appendChild(eNameInp);
                editor.appendChild(eNameRow);
                const eCmdRow = document.createElement("div");
                eCmdRow.className = "ebc-form-row";
                const eCmdLbl = document.createElement("span");
                eCmdLbl.className = "ebc-form-label";
                eCmdLbl.textContent = "Command";
                const eCmdPrefix = document.createElement("span");
                eCmdPrefix.style.cssText = "color:#cf6f98;font-weight:600;margin-right:2px;";
                eCmdPrefix.textContent = "/";
                const eCmdInp = Object.assign(document.createElement("input"), {
                    className: "ebc-form-input", type: "text",
                    value: (_e = scene.command) !== null && _e !== void 0 ? _e : "", placeholder: "optional", maxLength: 30,
                });
                eCmdInp.style.flex = "1";
                const eCmdWrap = document.createElement("div");
                eCmdWrap.style.cssText = "display:flex;align-items:center;flex:1;";
                eCmdWrap.appendChild(eCmdPrefix);
                eCmdWrap.appendChild(eCmdInp);
                eCmdRow.appendChild(eCmdLbl);
                eCmdRow.appendChild(eCmdWrap);
                editor.appendChild(eCmdRow);
                const topSaveBar = document.createElement("div");
                topSaveBar.className = "ebc-editor-save-bar";
                const topSaveBtn = document.createElement("button");
                topSaveBtn.className = "ebc-update-btn";
                topSaveBtn.textContent = "✓ Save Changes";
                topSaveBtn.style.cssText = "flex:1;font-size:11px;";
                topSaveBar.appendChild(topSaveBtn);
                editor.appendChild(topSaveBar);
                const stepsLbl = document.createElement("div");
                stepsLbl.className = "ebc-import-hint";
                stepsLbl.textContent = "Steps:";
                editor.appendChild(stepsLbl);
                const { getSteps } = buildSceneEditor(editor, scene.steps);
                topSaveBtn.addEventListener("click", () => {
                    updateScene(scene.id, eNameInp.value, getSteps(), eCmdInp.value);
                    this.renderPoses();
                });
                const botSaveBar = document.createElement("div");
                botSaveBar.className = "ebc-editor-save-bar";
                botSaveBar.style.marginTop = "2px";
                const botSaveBtn = document.createElement("button");
                botSaveBtn.className = "ebc-create-btn";
                botSaveBtn.textContent = "Save Changes";
                botSaveBtn.addEventListener("click", () => {
                    updateScene(scene.id, eNameInp.value, getSteps(), eCmdInp.value);
                    this.renderPoses();
                });
                botSaveBar.appendChild(botSaveBtn);
                editor.appendChild(botSaveBar);
                editBtn.addEventListener("click", () => {
                    const open = editor.classList.contains("open");
                    editor.classList.toggle("open", !open);
                    editBtn.classList.toggle("open", !open);
                    row.style.borderRadius = open ? "6px" : "6px 6px 0 0";
                    if (!open)
                        window.setTimeout(() => row.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
                });
                wrapper.appendChild(row);
                wrapper.appendChild(editor);
                body.appendChild(wrapper);
            }
            // ── New scene form ─────────────────────────────────────────────────────
            const sceneDivider2 = document.createElement("div");
            sceneDivider2.className = "ebc-divider";
            body.appendChild(sceneDivider2);
            const newSceneToggle = document.createElement("button");
            newSceneToggle.className = "ebc-new-outfit-btn";
            newSceneToggle.textContent = "+ New Scene";
            body.appendChild(newSceneToggle);
            const newSceneForm = document.createElement("div");
            newSceneForm.className = "ebc-new-form";
            body.appendChild(newSceneForm);
            const nsNameRow = document.createElement("div");
            nsNameRow.className = "ebc-form-row";
            const nsNameLbl = document.createElement("span");
            nsNameLbl.className = "ebc-form-label";
            nsNameLbl.textContent = "Name";
            const nsNameInp = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "e.g. Striptease", maxLength: 40,
            });
            nsNameInp.style.flex = "1";
            nsNameRow.appendChild(nsNameLbl);
            nsNameRow.appendChild(nsNameInp);
            newSceneForm.appendChild(nsNameRow);
            const nsCmdRow = document.createElement("div");
            nsCmdRow.className = "ebc-form-row";
            const nsCmdLbl = document.createElement("span");
            nsCmdLbl.className = "ebc-form-label";
            nsCmdLbl.textContent = "Command";
            const nsCmdPrefix = document.createElement("span");
            nsCmdPrefix.style.cssText = "color:#cf6f98;font-weight:600;margin-right:2px;";
            nsCmdPrefix.textContent = "/";
            const nsCmdInp = Object.assign(document.createElement("input"), {
                className: "ebc-form-input", type: "text", placeholder: "optional", maxLength: 30,
            });
            nsCmdInp.style.flex = "1";
            const nsCmdWrap = document.createElement("div");
            nsCmdWrap.style.cssText = "display:flex;align-items:center;flex:1;";
            nsCmdWrap.appendChild(nsCmdPrefix);
            nsCmdWrap.appendChild(nsCmdInp);
            nsCmdRow.appendChild(nsCmdLbl);
            nsCmdRow.appendChild(nsCmdWrap);
            newSceneForm.appendChild(nsCmdRow);
            const nsTopSaveBar = document.createElement("div");
            nsTopSaveBar.className = "ebc-editor-save-bar";
            const nsTopSaveBtn = document.createElement("button");
            nsTopSaveBtn.className = "ebc-update-btn";
            nsTopSaveBtn.textContent = "✓ Save Scene";
            nsTopSaveBtn.style.cssText = "flex:1;font-size:11px;";
            nsTopSaveBar.appendChild(nsTopSaveBtn);
            newSceneForm.appendChild(nsTopSaveBar);
            const nsStepsLbl = document.createElement("div");
            nsStepsLbl.className = "ebc-import-hint";
            nsStepsLbl.style.marginTop = "3px";
            nsStepsLbl.textContent = "Steps:";
            newSceneForm.appendChild(nsStepsLbl);
            const { getSteps: nsGetSteps } = buildSceneEditor(newSceneForm, []);
            const doSaveScene = () => {
                const name = nsNameInp.value.trim();
                if (!name) {
                    nsNameInp.style.borderColor = "#cf6f98";
                    return;
                }
                createScene(name, nsGetSteps(), nsCmdInp.value);
                this.renderPoses();
            };
            nsTopSaveBtn.addEventListener("click", doSaveScene);
            const nsBotSaveBar = document.createElement("div");
            nsBotSaveBar.className = "ebc-editor-save-bar";
            nsBotSaveBar.style.marginTop = "2px";
            const nsBotSaveBtn = document.createElement("button");
            nsBotSaveBtn.className = "ebc-create-btn";
            nsBotSaveBtn.textContent = "Save Scene";
            nsBotSaveBtn.addEventListener("click", doSaveScene);
            nsBotSaveBar.appendChild(nsBotSaveBtn);
            newSceneForm.appendChild(nsBotSaveBar);
            newSceneToggle.addEventListener("click", () => {
                const open = newSceneForm.style.display !== "none";
                newSceneForm.style.display = open ? "none" : "flex";
                newSceneToggle.textContent = open ? "+ New Scene" : "- Cancel";
                if (!open) {
                    nsNameInp.focus();
                    window.setTimeout(() => newSceneToggle.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
                }
            });
        }
        // -- Beep window -----------------------------------------------------------
        refreshTabDot() {
            var _a;
            const tab = (_a = this.rootEl) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-tab");
            if (!tab)
                return;
            const hasUnread = this.beepUnread.size > 0;
            let dot = tab.querySelector("#ebc-tab-unread-dot");
            if (hasUnread && !dot) {
                dot = document.createElement("div");
                dot.id = "ebc-tab-unread-dot";
                tab.style.position = "relative";
                tab.appendChild(dot);
            }
            else if (!hasUnread && dot) {
                dot.remove();
            }
        }
        openBeepWindow(memberNumber) {
            var _a;
            // If window already open for this member, refresh history and focus
            const existing = this.beepWins.get(memberNumber);
            if (existing) {
                const refresh = existing.el._refresh;
                refresh === null || refresh === void 0 ? void 0 : refresh();
                (_a = existing.el.querySelector(".ebc-beep-win-input")) === null || _a === void 0 ? void 0 : _a.focus();
                return;
            }
            this.beepUnread.delete(memberNumber);
            this.refreshTabDot();
            // Offset each new window slightly so they don't all stack at the same position
            const offset = this.beepWins.size * 28;
            const win = document.createElement("div");
            win.className = "ebc-beep-win";
            win.style.bottom = `${80 + offset}px`;
            win.style.right = `${340 + offset}px`;
            this.beepWins.set(memberNumber, { el: win, minimized: false });
            // Header
            const header = document.createElement("div");
            header.className = "ebc-beep-win-header";
            const dot = document.createElement("span");
            dot.className = "ebc-friend-dot " + getFriendStatus(memberNumber);
            const title = document.createElement("span");
            title.className = "ebc-beep-win-title";
            title.textContent = resolveName(memberNumber);
            // Unread dot (shown on minimized bar)
            const unreadDot = document.createElement("div");
            unreadDot.className = "ebc-beep-win-unread-dot";
            const muteBtn = document.createElement("button");
            muteBtn.className = "ebc-beep-win-hbtn ebc-beep-win-mute";
            const refreshMuteBtn = () => {
                const muted = getBeepMuted();
                muteBtn.textContent = muted ? "🔕" : "🔔";
                muteBtn.title = muted ? "Unmute notifications" : "Mute notifications";
                muteBtn.classList.toggle("muted", muted);
            };
            refreshMuteBtn();
            muteBtn.addEventListener("click", () => { setBeepMuted(!getBeepMuted()); refreshMuteBtn(); });
            const minimizeBtn = document.createElement("button");
            minimizeBtn.className = "ebc-beep-win-hbtn";
            minimizeBtn.textContent = "–";
            minimizeBtn.title = "Minimize";
            minimizeBtn.addEventListener("click", () => {
                const entry = this.beepWins.get(memberNumber);
                if (!entry)
                    return;
                entry.minimized = !entry.minimized;
                win.classList.toggle("minimized", entry.minimized);
                minimizeBtn.textContent = entry.minimized ? "▲" : "–";
                minimizeBtn.title = entry.minimized ? "Restore" : "Minimize";
                if (!entry.minimized) {
                    unreadDot.classList.remove("visible");
                    this.beepUnread.delete(memberNumber);
                    this.refreshTabDot();
                    if (this.currentTab === "notes")
                        try {
                            this.renderNotes();
                        }
                        catch ( /* ignore */_a) { /* ignore */ }
                }
            });
            const closeBtn = document.createElement("button");
            closeBtn.className = "ebc-beep-win-hbtn ebc-beep-win-close";
            closeBtn.textContent = "×";
            closeBtn.addEventListener("click", () => {
                win.remove();
                this.beepWins.delete(memberNumber);
            });
            header.appendChild(dot);
            header.appendChild(title);
            header.appendChild(unreadDot);
            header.appendChild(muteBtn);
            header.appendChild(minimizeBtn);
            header.appendChild(closeBtn);
            win.appendChild(header);
            // Make header draggable — anchored by bottom so expanding grows upward
            header.addEventListener("mousedown", (e) => {
                if (e.target === closeBtn)
                    return;
                e.preventDefault();
                const rect = win.getBoundingClientRect();
                const ox = e.clientX - rect.left;
                const vh = window.innerHeight;
                const oyFromBottom = rect.bottom - e.clientY;
                const onMove = (ev) => {
                    win.style.left = `${ev.clientX - ox}px`;
                    win.style.bottom = `${vh - ev.clientY - oyFromBottom}px`;
                    win.style.right = "";
                    win.style.top = "";
                };
                const onUp = () => {
                    document.removeEventListener("mousemove", onMove);
                    document.removeEventListener("mouseup", onUp);
                };
                document.addEventListener("mousemove", onMove);
                document.addEventListener("mouseup", onUp);
            });
            // History
            const history = document.createElement("div");
            history.className = "ebc-beep-win-history";
            win.appendChild(history);
            // Reply state
            let replyText = "";
            const clearReply = () => {
                replyText = "";
                replyBar.style.display = "none";
            };
            const setReply = (text) => {
                replyText = text;
                replyBarSpan.textContent = text;
                replyBar.style.display = "flex";
                input.focus();
            };
            const IMAGE_RE = /https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg)(\?\S*)?/i;
            const renderHistory = () => {
                var _a, _b;
                while (history.firstChild)
                    history.removeChild(history.firstChild);
                const entries = getConversation(memberNumber);
                const self = (_a = Player.MemberNumber) !== null && _a !== void 0 ? _a : 0;
                if (entries.length === 0) {
                    const hint = document.createElement("div");
                    hint.style.cssText = "text-align:center;color:#5a3a4a;font-size:10px;padding:20px 0;";
                    hint.textContent = "No messages yet. Say hi!";
                    history.appendChild(hint);
                }
                for (const e of entries) {
                    const isSent = e.from === self;
                    const wrap = document.createElement("div");
                    wrap.style.cssText = "display:flex;flex-direction:column;align-items:" + (isSent ? "flex-end" : "flex-start") + ";";
                    const nameLabel = document.createElement("div");
                    nameLabel.textContent = resolveName(isSent ? self : e.from);
                    nameLabel.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#7a5a6a;margin-bottom:2px;padding:0 3px;";
                    wrap.appendChild(nameLabel);
                    const bubble = document.createElement("div");
                    bubble.className = "ebc-beep-msg " + (isSent ? "sent" : "received");
                    const ts = document.createElement("div");
                    ts.className = "ebc-beep-ts";
                    const d = new Date(e.ts);
                    ts.textContent = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
                    bubble.appendChild(ts);
                    // Parse message — may start with "> quote\n" reply prefix
                    let msgBody = e.message;
                    if (e.message.startsWith("> ") && e.message.includes("\n")) {
                        const nl = e.message.indexOf("\n");
                        const quoteEl = document.createElement("div");
                        quoteEl.className = "ebc-beep-quote";
                        quoteEl.textContent = e.message.slice(2, nl);
                        bubble.appendChild(quoteEl);
                        msgBody = e.message.slice(nl + 1);
                    }
                    // Text content
                    const text = document.createElement("div");
                    text.textContent = msgBody;
                    bubble.appendChild(text);
                    // Image embed — detect image URL in the message body
                    const imgUrl = (_b = IMAGE_RE.exec(msgBody)) === null || _b === void 0 ? void 0 : _b[0];
                    if (imgUrl) {
                        const img = document.createElement("img");
                        img.className = "ebc-beep-img";
                        img.src = imgUrl;
                        img.alt = "image";
                        img.addEventListener("click", () => window.open(imgUrl, "_blank"));
                        img.addEventListener("error", () => { img.style.display = "none"; });
                        bubble.appendChild(img);
                    }
                    wrap.appendChild(bubble);
                    // Reply button — only show on received messages
                    if (!isSent) {
                        const replyBtn = document.createElement("button");
                        replyBtn.className = "ebc-beep-reply-btn";
                        replyBtn.textContent = "↩ reply";
                        replyBtn.addEventListener("click", () => setReply(msgBody.slice(0, 80)));
                        wrap.appendChild(replyBtn);
                    }
                    history.appendChild(wrap);
                }
                requestAnimationFrame(() => { history.scrollTop = history.scrollHeight; });
            };
            renderHistory();
            // Reply bar (shown above footer when replying)
            const replyBar = document.createElement("div");
            replyBar.className = "ebc-beep-reply-bar";
            replyBar.style.display = "none";
            const replyBarLabel = document.createElement("span");
            replyBarLabel.style.cssText = "color:#cf6f98;font-weight:bold;flex-shrink:0;";
            replyBarLabel.textContent = "↩";
            const replyBarSpan = document.createElement("span");
            const replyCancel = document.createElement("button");
            replyCancel.className = "ebc-beep-reply-cancel";
            replyCancel.textContent = "×";
            replyCancel.addEventListener("click", clearReply);
            replyBar.appendChild(replyBarLabel);
            replyBar.appendChild(replyBarSpan);
            replyBar.appendChild(replyCancel);
            win.appendChild(replyBar);
            // Footer
            const footer = document.createElement("div");
            footer.className = "ebc-beep-win-footer";
            const input = document.createElement("input");
            input.className = "ebc-beep-win-input";
            input.type = "text";
            input.placeholder = "Type a message...";
            input.maxLength = 300;
            const sendBtn = document.createElement("button");
            sendBtn.className = "ebc-beep-win-send";
            sendBtn.textContent = "Send";
            const doSend = () => {
                const msg = input.value.trim();
                if (!msg)
                    return;
                const full = replyText ? `> ${replyText}\n${msg}` : msg;
                clearReply();
                sendBeep(memberNumber, full);
                input.value = "";
                renderHistory();
            };
            sendBtn.addEventListener("click", doSend);
            input.addEventListener("keydown", (e) => { if (e.key === "Enter")
                doSend(); });
            footer.appendChild(input);
            footer.appendChild(sendBtn);
            win.appendChild(footer);
            document.body.appendChild(win);
            input.focus();
            // Store renderHistory so incoming beeps can trigger a refresh
            win._refresh = renderHistory;
        }
        refreshBeepWindow(memberNumber) {
            const entry = this.beepWins.get(memberNumber);
            if (!entry)
                return;
            const refresh = entry.el._refresh;
            refresh === null || refresh === void 0 ? void 0 : refresh();
        }
        onIncomingBeep(fromNum) {
            var _a;
            const entry = this.beepWins.get(fromNum);
            const winVisible = entry && !entry.minimized;
            if (winVisible) {
                this.refreshBeepWindow(fromNum);
            }
            else {
                this.beepUnread.set(fromNum, ((_a = this.beepUnread.get(fromNum)) !== null && _a !== void 0 ? _a : 0) + 1);
                this.refreshTabDot();
                if (this.currentTab === "notes") {
                    try {
                        this.renderNotes();
                    }
                    catch ( /* ignore */_b) { /* ignore */ }
                }
                // Show dot on the minimized bar if window exists but is minimized
                if (entry) {
                    const dot = entry.el.querySelector(".ebc-beep-win-unread-dot");
                    if (dot)
                        dot.classList.add("visible");
                }
            }
            // Toast popup — always shown so the user notices the new message
            this.showBeepToast(fromNum);
        }
        showBeepToast(fromNum) {
            try {
                const msgs = getConversation(fromNum);
                const last = msgs[msgs.length - 1];
                const preview = last ? last.message.replace(/^> .+\n/, "").slice(0, 80) : "";
                const name = resolveName(fromNum);
                const toast = document.createElement("div");
                toast.className = "ebc-toast";
                const header = document.createElement("div");
                header.className = "ebc-toast-header";
                const icon = document.createElement("span");
                icon.className = "ebc-toast-icon";
                icon.textContent = "💬";
                const nameEl = document.createElement("span");
                nameEl.className = "ebc-toast-name";
                nameEl.textContent = name;
                header.appendChild(icon);
                header.appendChild(nameEl);
                const body = document.createElement("div");
                body.className = "ebc-toast-body";
                body.textContent = preview || "…";
                toast.appendChild(header);
                toast.appendChild(body);
                toast.addEventListener("click", () => {
                    this.openBeepWindow(fromNum);
                    dismiss();
                });
                document.body.appendChild(toast);
                // Stack toasts if multiple arrive — offset each one upward
                const existing = document.querySelectorAll(".ebc-toast");
                let offset = 0;
                existing.forEach(t => { if (t !== toast)
                    offset += (t.offsetHeight || 72) + 8; });
                if (offset > 0)
                    toast.style.bottom = `${24 + offset}px`;
                let gone = false;
                const dismiss = () => {
                    if (gone)
                        return;
                    gone = true;
                    toast.classList.add("ebc-toast-out");
                    setTimeout(() => toast.remove(), 320);
                };
                const timer = setTimeout(dismiss, 5000);
                toast.addEventListener("click", () => clearTimeout(timer), { once: true });
            }
            catch ( /* ignore */_a) { /* ignore */ }
        }
        // -- Notes tab -------------------------------------------------------------
        renderNotes() {
            var _a, _b, _c, _d, _e;
            const body = (_a = this.rootEl) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-body");
            if (!body)
                return;
            while (body.firstChild)
                body.removeChild(body.firstChild);
            const notes = getNotes();
            const roomChars = (_b = window.ChatRoomCharacter) !== null && _b !== void 0 ? _b : [];
            // ── You ──────────────────────────────────────────────────────────────
            const selfLbl = document.createElement("div");
            selfLbl.className = "ebc-section-label";
            selfLbl.textContent = "You";
            body.appendChild(selfLbl);
            body.appendChild(this.buildNoteRow(Player.MemberNumber, this.charDisplayName(Player), "", true));
            // ── In This Room ─────────────────────────────────────────────────────
            const roomOthers = roomChars.filter(c => c.MemberNumber !== Player.MemberNumber);
            if (roomOthers.length > 0) {
                const div = document.createElement("div");
                div.className = "ebc-divider";
                body.appendChild(div);
                const lbl = document.createElement("div");
                lbl.className = "ebc-section-label";
                lbl.textContent = "In This Room";
                body.appendChild(lbl);
                for (const char of roomOthers) {
                    const displayName = this.charDisplayName(char);
                    const existing = notes[String(char.MemberNumber)];
                    body.appendChild(this.buildNoteRow(char.MemberNumber, displayName, (_c = existing === null || existing === void 0 ? void 0 : existing.note) !== null && _c !== void 0 ? _c : ""));
                }
            }
            // ── Saved (offline) ──────────────────────────────────────────────────
            const roomNums = new Set(roomChars.map(c => String(c.MemberNumber)));
            const offlineEntries = Object.entries(notes).filter(([k]) => !roomNums.has(k));
            if (offlineEntries.length > 0) {
                const div = document.createElement("div");
                div.className = "ebc-divider";
                body.appendChild(div);
                const lbl = document.createElement("div");
                lbl.className = "ebc-section-label";
                lbl.textContent = "Saved";
                body.appendChild(lbl);
                for (const [key, data] of offlineEntries) {
                    body.appendChild(this.buildNoteRow(parseInt(key), data.name, data.note));
                }
            }
            if (roomOthers.length === 0 && offlineEntries.length === 0) {
                const empty = document.createElement("div");
                empty.className = "ebc-empty";
                empty.innerHTML = "No other players in this room yet.";
                body.appendChild(empty);
            }
            // ── Friends ──────────────────────────────────────────────────────────
            const friendList = getFriendList();
            if (friendList.length > 0) {
                const divF = document.createElement("div");
                divF.className = "ebc-divider";
                body.appendChild(divF);
                const onlineCount = friendList.filter(n => getFriendStatus(n) !== "away").length;
                const lblF = document.createElement("div");
                lblF.className = "ebc-section-label";
                lblF.style.cssText = "display:flex;align-items:center;gap:6px;";
                const lblFText = document.createElement("span");
                lblFText.textContent = "Friends";
                const lblFCount = document.createElement("span");
                lblFCount.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:normal;flex:1;";
                lblFCount.textContent = `${onlineCount} online · ${friendList.length} total`;
                const suppressBtn = document.createElement("button");
                const refreshSuppressBtn = () => {
                    const on = getSuppressNativeBeep();
                    suppressBtn.textContent = on ? "💬 hide in chat" : "💬 show in chat";
                    suppressBtn.title = on ? "Beep messages are hidden from BC's main chat — click to show them" : "Beep messages show in BC's main chat — click to hide them";
                    suppressBtn.style.cssText = [
                        "font-family:'Trebuchet MS',serif",
                        "font-size:8px",
                        "padding:1px 5px",
                        "border-radius:4px",
                        "cursor:pointer",
                        "flex-shrink:0",
                        "border:1px solid " + (on ? "#3a1928" : "#cf6f98"),
                        "background:transparent",
                        "color:" + (on ? "#5a3a4a" : "#cf6f98"),
                    ].join(";");
                };
                refreshSuppressBtn();
                suppressBtn.addEventListener("click", () => { setSuppressNativeBeep(!getSuppressNativeBeep()); refreshSuppressBtn(); });
                lblF.appendChild(lblFText);
                lblF.appendChild(lblFCount);
                lblF.appendChild(suppressBtn);
                body.appendChild(lblF);
                const tags = getFriendTags();
                // Sort: room first, online second, away last, then alphabetical
                const statusOrder = (n) => ({ room: 0, online: 1, away: 2 }[getFriendStatus(n)]);
                const sorted = [...friendList].sort((a, b) => {
                    const diff = statusOrder(a) - statusOrder(b);
                    if (diff !== 0)
                        return diff;
                    return resolveName(a).localeCompare(resolveName(b));
                });
                for (const num of sorted) {
                    const status = getFriendStatus(num);
                    const name = resolveName(num);
                    const tag = (_d = tags[String(num)]) !== null && _d !== void 0 ? _d : "";
                    const row = document.createElement("div");
                    row.className = "ebc-friend-row";
                    const dot = document.createElement("div");
                    dot.className = "ebc-friend-dot " + status;
                    const nameEl = document.createElement("span");
                    nameEl.className = "ebc-friend-name";
                    nameEl.textContent = name;
                    const numEl = document.createElement("span");
                    numEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a9ab8;margin-left:3px;flex-shrink:0;";
                    numEl.textContent = "#" + num;
                    // Tag badge — click to edit inline
                    const tagEl = document.createElement("span");
                    tagEl.className = "ebc-friend-tag";
                    tagEl.textContent = tag || "+tag";
                    tagEl.style.opacity = tag ? "1" : "0.4";
                    tagEl.title = "Click to edit tag";
                    tagEl.addEventListener("click", () => {
                        var _a;
                        const cur = (_a = tags[String(num)]) !== null && _a !== void 0 ? _a : "";
                        const input = document.createElement("input");
                        input.type = "text";
                        input.value = cur;
                        input.maxLength = 30;
                        input.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;background:#1b0d17;color:#e8b4c8;border:1px solid #cf6f98;border-radius:3px;padding:1px 4px;width:80px;outline:none;";
                        tagEl.replaceWith(input);
                        input.focus();
                        const commit = () => {
                            setFriendTag(num, input.value);
                            tags[String(num)] = input.value.trim();
                            tagEl.textContent = input.value.trim() || "+tag";
                            tagEl.style.opacity = input.value.trim() ? "1" : "0.4";
                            input.replaceWith(tagEl);
                        };
                        input.addEventListener("blur", commit);
                        input.addEventListener("keydown", e => { if (e.key === "Enter") {
                            e.preventDefault();
                            commit();
                        } });
                    });
                    const unread = (_e = this.beepUnread.get(num)) !== null && _e !== void 0 ? _e : 0;
                    const beepBtn = document.createElement("button");
                    beepBtn.className = "ebc-friend-btn";
                    beepBtn.style.position = "relative";
                    beepBtn.textContent = "💬";
                    beepBtn.title = unread ? `${unread} unread message${unread > 1 ? "s" : ""}` : "Open beep chat";
                    if (unread > 0) {
                        const badge = document.createElement("span");
                        badge.textContent = unread > 9 ? "9+" : String(unread);
                        badge.style.cssText = "position:absolute;top:-4px;right:-4px;background:#cf6f98;color:#fff;border-radius:8px;font-size:8px;font-family:'Trebuchet MS',serif;padding:0 3px;min-width:12px;text-align:center;line-height:12px;pointer-events:none;";
                        beepBtn.appendChild(badge);
                    }
                    beepBtn.addEventListener("click", () => {
                        this.beepUnread.delete(num);
                        this.openBeepWindow(num);
                        // Re-render friends to remove the badge
                        if (this.currentTab === "notes")
                            try {
                                this.renderNotes();
                            }
                            catch ( /* ignore */_a) { /* ignore */ }
                    });
                    row.appendChild(dot);
                    row.appendChild(nameEl);
                    row.appendChild(numEl);
                    // Room info tag for online/in-room friends
                    const info = status !== "away" ? getFriendOnlineInfo(num) : undefined;
                    if (info === null || info === void 0 ? void 0 : info.roomName) {
                        const isPrivate = info.roomPrivate;
                        const isLocked = info.roomLocked;
                        const isFull = info.roomFull;
                        let icon = isLocked ? "🔐" : isPrivate ? "🔒" : "📢";
                        let bg = "#1e0d1a";
                        let color = "#9a6878";
                        let border = "#3a1928";
                        if (isLocked) {
                            bg = "#1a100d";
                            color = "#c8905a";
                            border = "#5a3020";
                        }
                        else if (isPrivate) {
                            bg = "#1a0d20";
                            color = "#b07ab8";
                            border = "#4a2060";
                        }
                        else {
                            bg = "#0d1a18";
                            color = "#60a898";
                            border = "#1e4038";
                        }
                        const roomTag = document.createElement("span");
                        roomTag.textContent = icon + " " + (isFull ? "full · " : "") + info.roomName;
                        roomTag.title = info.roomName + (isPrivate ? " (private)" : " (public)") + (isFull ? " · full" : "");
                        roomTag.style.cssText = `font-family:'Trebuchet MS',serif;font-size:8px;border-radius:3px;padding:1px 4px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;background:${bg};color:${color};border:1px solid ${border};`;
                        row.appendChild(roomTag);
                    }
                    // EBC version badge — only shown if we've seen them run EBC this session
                    const ebcVer = getEBCVersion(num);
                    if (ebcVer) {
                        const ebcBadge = document.createElement("span");
                        ebcBadge.textContent = "EBC " + ebcVer;
                        ebcBadge.title = "Uses EmeryBC v" + ebcVer;
                        ebcBadge.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;border-radius:3px;padding:1px 5px;flex-shrink:0;white-space:nowrap;background:#2a0e1e;color:#cf6f98;border:1px solid #6b3048;";
                        row.appendChild(ebcBadge);
                    }
                    row.appendChild(tagEl);
                    row.appendChild(beepBtn);
                    body.appendChild(row);
                }
            }
        }
        charDisplayName(char) {
            const nickFn = window.CharacterNickname;
            if (typeof nickFn === "function") {
                try {
                    return nickFn(char);
                }
                catch ( /* ignore */_a) { /* ignore */ }
            }
            return char.Nickname || char.Name || "Unknown";
        }
        buildNoteRow(memberNumber, displayName, currentNote, isSelf = false) {
            const hasNote = !!currentNote.trim();
            const vip = VIP_MEMBERS[memberNumber];
            const container = document.createElement("div");
            container.className = "ebc-notes-person";
            if (vip) {
                container.style.borderColor = vip.color;
                container.style.boxShadow = `0 0 6px ${vip.color}40`;
            }
            const header = document.createElement("div");
            header.className = "ebc-notes-person-header";
            const dot = document.createElement("div");
            dot.className = "ebc-notes-dot" + (hasNote ? " has-note" : "");
            const name = document.createElement("span");
            name.className = "ebc-notes-person-name";
            name.textContent = displayName;
            if (vip) {
                name.style.color = vip.color;
            }
            const num = document.createElement("span");
            num.className = "ebc-notes-member-num";
            num.textContent = "#" + memberNumber;
            header.appendChild(dot);
            header.appendChild(name);
            if (vip) {
                // VIP star badge with tooltip showing their role
                const badge = document.createElement("span");
                badge.textContent = "★";
                badge.title = vip.label;
                badge.style.cssText = `font-size:10px;color:${vip.color};flex-shrink:0;margin-right:2px;`;
                header.appendChild(badge);
            }
            header.appendChild(num);
            container.appendChild(header);
            if (isSelf) {
                const selfNote = document.createElement("div");
                selfNote.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#c8a84b;padding:2px 4px 4px 18px;";
                selfNote.textContent = "That's you — notes on yourself are not supported.";
                container.appendChild(selfNote);
                return container;
            }
            const editor = document.createElement("div");
            editor.className = "ebc-notes-editor";
            const textarea = document.createElement("textarea");
            textarea.className = "ebc-notes-textarea";
            textarea.placeholder = "Notes about this person...";
            textarea.value = currentNote;
            textarea.rows = 3;
            const hint = document.createElement("div");
            hint.className = "ebc-notes-save-hint";
            hint.textContent = "saves automatically";
            editor.appendChild(textarea);
            editor.appendChild(hint);
            container.appendChild(editor);
            header.addEventListener("click", () => {
                const open = editor.classList.toggle("open");
                if (open)
                    textarea.focus();
            });
            let saveTimer = null;
            textarea.addEventListener("input", () => {
                if (saveTimer)
                    window.clearTimeout(saveTimer);
                hint.textContent = "saving...";
                saveTimer = window.setTimeout(() => {
                    saveNote(memberNumber, displayName, textarea.value);
                    dot.className = "ebc-notes-dot" + (textarea.value.trim() ? " has-note" : "");
                    hint.textContent = textarea.value.trim() ? "saved" : "saves automatically";
                    window.setTimeout(() => { hint.textContent = "saves automatically"; }, 1500);
                }, 800);
            });
            return container;
        }
        // -- Developer Tools tab ---------------------------------------------------
        renderDev() {
            var _a;
            const body = (_a = this.rootEl) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-body");
            if (!body)
                return;
            while (body.firstChild)
                body.removeChild(body.firstChild);
            const devLbl = document.createElement("div");
            devLbl.className = "ebc-section-label";
            devLbl.textContent = "Developer Tools";
            body.appendChild(devLbl);
            // -- Toggle: show EBC version in overhead badge --
            const verRow = document.createElement("div");
            verRow.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:6px;background:rgba(42,20,33,0.4);border:1px solid #3a1928;margin-bottom:4px;";
            const verLbl = document.createElement("span");
            verLbl.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;";
            verLbl.textContent = "Show version in overhead badge";
            const verHint = document.createElement("span");
            verHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;";
            verHint.textContent = "Shows EBC version above room members";
            const verInfo = document.createElement("div");
            verInfo.style.cssText = "flex:1;min-width:0;";
            verInfo.appendChild(verLbl);
            verInfo.appendChild(document.createElement("br"));
            verInfo.appendChild(verHint);
            const verToggle = document.createElement("button");
            const refreshVerToggle = () => {
                const on = getShowVersionBadge();
                verToggle.textContent = on ? "ON" : "OFF";
                verToggle.style.cssText = [
                    "font-family:'Trebuchet MS',serif",
                    "font-size:10px",
                    "font-weight:bold",
                    "padding:2px 10px",
                    "border-radius:4px",
                    "cursor:pointer",
                    "flex-shrink:0",
                    "border:1px solid " + (on ? "#cf6f98" : "#4c2537"),
                    "background:" + (on ? "#6b3048" : "#1b0d17"),
                    "color:" + (on ? "#f7e6ee" : "#553142"),
                    "transition:background 0.14s,color 0.14s,border-color 0.14s",
                ].join(";");
            };
            refreshVerToggle();
            verToggle.addEventListener("click", () => {
                setShowVersionBadge(!getShowVersionBadge());
                refreshVerToggle();
            });
            verRow.appendChild(verInfo);
            verRow.appendChild(verToggle);
            body.appendChild(verRow);
            // -- Room EBC presence list --
            const presLbl = document.createElement("div");
            presLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin:8px 0 4px;";
            presLbl.textContent = "EBC users in this room";
            body.appendChild(presLbl);
            const presListEl = document.createElement("div");
            body.appendChild(presListEl);
            const refreshPresence = () => {
                var _a, _b, _c, _d, _e;
                while (presListEl.firstChild)
                    presListEl.removeChild(presListEl.firstChild);
                const room = (_a = window.ChatRoomCharacter) !== null && _a !== void 0 ? _a : [];
                const found = [];
                for (const c of room) {
                    const memberNum = c.MemberNumber;
                    const isSelf = memberNum === Player.MemberNumber;
                    if (isSelf) {
                        found.push({ name: String((_b = c.Name) !== null && _b !== void 0 ? _b : "You"), id: memberNum !== null && memberNum !== void 0 ? memberNum : 0, version: "self", isSelf: true });
                        continue;
                    }
                    const shared = (_c = c.OnlineSharedSettings) === null || _c === void 0 ? void 0 : _c["EmeryBC"];
                    const presence = shared === null || shared === void 0 ? void 0 : shared["presence"];
                    if ((presence === null || presence === void 0 ? void 0 : presence["marker"]) === "EBC") {
                        found.push({ name: String((_d = c.Name) !== null && _d !== void 0 ? _d : "?"), id: memberNum !== null && memberNum !== void 0 ? memberNum : 0, version: String((_e = presence["version"]) !== null && _e !== void 0 ? _e : "?"), isSelf: false });
                    }
                }
                if (found.length === 0) {
                    const hint = document.createElement("div");
                    hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:4px 2px;";
                    hint.textContent = "No other EBC users detected in this room.";
                    presListEl.appendChild(hint);
                    return;
                }
                for (const p of found) {
                    const row = document.createElement("div");
                    row.style.cssText = "display:flex;align-items:center;gap:6px;padding:4px 7px;border-radius:5px;margin-bottom:2px;background:rgba(42,20,33,0.4);border:1px solid #3a1928;";
                    const nameEl = document.createElement("span");
                    nameEl.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;";
                    nameEl.textContent = p.isSelf ? "You" : p.name;
                    const idEl = document.createElement("span");
                    idEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;";
                    idEl.textContent = "#" + p.id;
                    const verEl = document.createElement("span");
                    verEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:4px;" +
                        (p.isSelf ? "color:#7a5a6a;background:#1b0d17;border:1px solid #3a1928;" : "color:#cf6f98;background:#2a1421;border:1px solid #6b3048;");
                    verEl.textContent = p.isSelf ? "you" : ("v" + p.version);
                    row.appendChild(nameEl);
                    row.appendChild(idEl);
                    row.appendChild(verEl);
                    presListEl.appendChild(row);
                }
            };
            refreshPresence();
            const refreshBtn = document.createElement("button");
            refreshBtn.style.cssText = "width:100%;background:transparent;border:1px dashed #4c2537;border-radius:5px;color:#7a4a5e;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 0;transition:background 0.14s,color 0.12s;margin-top:3px;";
            refreshBtn.textContent = "↻ Refresh list";
            refreshBtn.addEventListener("click", () => { refreshPresence(); });
            body.appendChild(refreshBtn);
            // ── Character Inspector ──────────────────────────────────────────────────
            const charLbl = document.createElement("div");
            charLbl.className = "ebc-section-label";
            charLbl.style.marginTop = "12px";
            charLbl.textContent = "Character Inspector";
            body.appendChild(charLbl);
            const charHint = document.createElement("div");
            charHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:4px;";
            charHint.textContent = "Dump raw appearance + property data for any room member.";
            body.appendChild(charHint);
            const charPickRow = document.createElement("div");
            charPickRow.style.cssText = "display:flex;gap:4px;margin-bottom:4px;";
            const charSelect = document.createElement("select");
            charSelect.style.cssText = "flex:1;background:#1b0d17;border:1px solid #4c2537;color:#f7e6ee;border-radius:4px;font-family:'Trebuchet MS',serif;font-size:10px;padding:2px 4px;";
            const charInspBtn = document.createElement("button");
            charInspBtn.className = "ebc-create-btn";
            charInspBtn.style.cssText = "margin:0;padding:2px 10px;font-size:10px;";
            charInspBtn.textContent = "Inspect";
            charPickRow.appendChild(charSelect);
            charPickRow.appendChild(charInspBtn);
            body.appendChild(charPickRow);
            const charDump = document.createElement("pre");
            charDump.style.cssText = [
                "background:#100810", "border:1px solid #3a1928", "border-radius:4px",
                "padding:6px", "font-size:8.5px", "color:#cf6f98",
                "max-height:220px", "overflow-y:auto", "white-space:pre-wrap",
                "word-break:break-all", "margin:0", "display:none",
                "font-family:'Courier New',monospace",
            ].join(";");
            body.appendChild(charDump);
            const populateCharSelect = () => {
                var _a;
                while (charSelect.firstChild)
                    charSelect.removeChild(charSelect.firstChild);
                const room = (_a = window.ChatRoomCharacter) !== null && _a !== void 0 ? _a : [];
                for (const c of room) {
                    const opt = document.createElement("option");
                    opt.value = String(c.MemberNumber);
                    opt.textContent = `${c.Nickname || c.Name} (#${c.MemberNumber})`;
                    charSelect.appendChild(opt);
                }
            };
            populateCharSelect();
            charInspBtn.addEventListener("click", () => {
                var _a;
                const room = (_a = window.ChatRoomCharacter) !== null && _a !== void 0 ? _a : [];
                const num = parseInt(charSelect.value, 10);
                const char = room.find(c => c.MemberNumber === num);
                if (!char) {
                    charDump.textContent = "Character not found in room.";
                    charDump.style.display = "";
                    return;
                }
                try {
                    const snapshot = {
                        Name: char.Name,
                        Nickname: char.Nickname,
                        MemberNumber: char.MemberNumber,
                        ActivePose: char.ActivePose,
                        Appearance: char.Appearance.map((a) => ({
                            Group: a.Asset.Group.Name,
                            Name: a.Asset.Name,
                            Color: a.Color,
                            Difficulty: a.Difficulty,
                            Property: a.Property,
                            Craft: a.Craft,
                        })),
                    };
                    charDump.textContent = JSON.stringify(snapshot, null, 2);
                    charDump.style.display = "";
                }
                catch (e) {
                    charDump.textContent = "Error: " + String(e);
                    charDump.style.display = "";
                }
            });
            // ── Hook Inspector ───────────────────────────────────────────────────────
            const hookLbl = document.createElement("div");
            hookLbl.className = "ebc-section-label";
            hookLbl.style.marginTop = "12px";
            hookLbl.textContent = "Hook Inspector";
            body.appendChild(hookLbl);
            const hookList = document.createElement("div");
            body.appendChild(hookList);
            const renderHooks = () => {
                var _a, _b;
                while (hookList.firstChild)
                    hookList.removeChild(hookList.firstChild);
                try {
                    const sdk = window.bcModSdk;
                    const getModsInfo = sdk === null || sdk === void 0 ? void 0 : sdk.getModsInfo;
                    const mods = getModsInfo ? getModsInfo.call(sdk) : [];
                    if (!Array.isArray(mods) || mods.length === 0) {
                        const hint = document.createElement("div");
                        hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:4px 2px;";
                        hint.textContent = "bcModSdk not available or no mods loaded.";
                        hookList.appendChild(hint);
                        return;
                    }
                    for (const mod of mods) {
                        const m = mod;
                        const hooks = Array.isArray(m.hooks) ? m.hooks : [];
                        const row = document.createElement("div");
                        row.style.cssText = "padding:4px 7px;border-radius:5px;margin-bottom:2px;background:rgba(42,20,33,0.4);border:1px solid #3a1928;";
                        const topLine = document.createElement("div");
                        topLine.style.cssText = "display:flex;align-items:center;gap:6px;";
                        const nameEl = document.createElement("span");
                        nameEl.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;";
                        nameEl.textContent = String((_a = m.name) !== null && _a !== void 0 ? _a : "?");
                        const verEl = document.createElement("span");
                        verEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#cf6f98;";
                        verEl.textContent = "v" + String((_b = m.version) !== null && _b !== void 0 ? _b : "?");
                        const hookCount = document.createElement("span");
                        hookCount.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;";
                        hookCount.textContent = hooks.length > 0 ? `${hooks.length} hooks` : "no hooks listed";
                        topLine.appendChild(nameEl);
                        topLine.appendChild(verEl);
                        topLine.appendChild(hookCount);
                        row.appendChild(topLine);
                        if (hooks.length > 0) {
                            const hookDetail = document.createElement("div");
                            hookDetail.style.cssText = "font-family:'Courier New',monospace;font-size:8px;color:#7a5a6a;margin-top:2px;word-break:break-all;";
                            hookDetail.textContent = hooks.join(", ");
                            row.appendChild(hookDetail);
                        }
                        hookList.appendChild(row);
                    }
                }
                catch (e) {
                    const err = document.createElement("div");
                    err.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#ff6b6b;padding:4px 2px;";
                    err.textContent = "Error reading hooks: " + String(e);
                    hookList.appendChild(err);
                }
            };
            renderHooks();
            const hookRefreshBtn = document.createElement("button");
            hookRefreshBtn.style.cssText = "width:100%;background:transparent;border:1px dashed #4c2537;border-radius:5px;color:#7a4a5e;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 0;transition:background 0.14s,color 0.12s;margin-top:3px;";
            hookRefreshBtn.textContent = "↻ Refresh hooks";
            hookRefreshBtn.addEventListener("click", renderHooks);
            body.appendChild(hookRefreshBtn);
            // ── Message Logger ───────────────────────────────────────────────────────
            const msgLblRow = document.createElement("div");
            msgLblRow.style.cssText = "display:flex;align-items:center;gap:6px;margin-top:12px;margin-bottom:2px;";
            const msgLbl = document.createElement("div");
            msgLbl.className = "ebc-section-label";
            msgLbl.style.margin = "0";
            msgLbl.textContent = "Message Log";
            const logStatusDot = document.createElement("span");
            logStatusDot.style.cssText = "font-size:9px;font-family:'Trebuchet MS',serif;padding:1px 6px;border-radius:3px;flex-shrink:0;";
            const updateStatusDot = () => {
                if (isDevLogEnabled()) {
                    logStatusDot.textContent = "● CAPTURING";
                    logStatusDot.style.cssText += "background:#1a3a1a;color:#6bd478;border:1px solid #2a6a2a;";
                }
                else {
                    logStatusDot.textContent = "○ OFF";
                    logStatusDot.style.cssText += "background:#1a0a10;color:#7a4050;border:1px solid #3a1020;";
                }
            };
            updateStatusDot();
            msgLblRow.appendChild(msgLbl);
            msgLblRow.appendChild(logStatusDot);
            body.appendChild(msgLblRow);
            const msgCtrlRow = document.createElement("div");
            msgCtrlRow.style.cssText = "display:flex;gap:4px;margin-bottom:4px;align-items:center;";
            const msgRefreshBtn2 = document.createElement("button");
            msgRefreshBtn2.className = "ebc-icon-btn";
            msgRefreshBtn2.style.cssText = "font-size:10px;padding:2px 8px;";
            msgRefreshBtn2.textContent = "↻";
            msgRefreshBtn2.title = "Refresh log";
            const msgClearBtn = document.createElement("button");
            msgClearBtn.className = "ebc-icon-btn";
            msgClearBtn.style.cssText = "font-size:10px;padding:2px 8px;";
            msgClearBtn.textContent = "Clear";
            const logToggleWrap = document.createElement("label");
            logToggleWrap.style.cssText = "display:flex;align-items:center;gap:4px;font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5a6a;cursor:pointer;margin-left:auto;user-select:none;";
            const logToggleChk = document.createElement("input");
            logToggleChk.type = "checkbox";
            logToggleChk.checked = isDevLogEnabled();
            logToggleChk.addEventListener("change", () => {
                setDevLogEnabled(logToggleChk.checked);
                updateStatusDot();
                renderMsgLog();
            });
            logToggleWrap.appendChild(logToggleChk);
            logToggleWrap.appendChild(document.createTextNode(" Live logging"));
            const msgTestBtn = document.createElement("button");
            msgTestBtn.className = "ebc-icon-btn";
            msgTestBtn.style.cssText = "font-size:10px;padding:2px 8px;";
            msgTestBtn.textContent = "Test";
            msgTestBtn.title = "Inject a test entry to verify the log UI is working";
            msgTestBtn.addEventListener("click", () => {
                pushTestEntry();
                renderMsgLog();
            });
            msgCtrlRow.appendChild(msgRefreshBtn2);
            msgCtrlRow.appendChild(msgClearBtn);
            msgCtrlRow.appendChild(msgTestBtn);
            msgCtrlRow.appendChild(logToggleWrap);
            body.appendChild(msgCtrlRow);
            // Hint row — shown when logging is off
            const logOffHint = document.createElement("div");
            logOffHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#8a5060;background:#1a080f;border:1px dashed #4c2537;border-radius:4px;padding:6px 8px;display:flex;align-items:center;justify-content:space-between;gap:8px;";
            logOffHint.style.display = isDevLogEnabled() ? "none" : "";
            logOffHint.innerHTML = "<span>Logging is off — enable it to capture messages.</span>";
            const enableBtn = document.createElement("button");
            enableBtn.className = "ebc-wear-btn";
            enableBtn.textContent = "Enable";
            enableBtn.style.flexShrink = "0";
            enableBtn.addEventListener("click", () => {
                setDevLogEnabled(true);
                logToggleChk.checked = true;
                logOffHint.style.display = "none";
                updateStatusDot();
                renderMsgLog();
            });
            logOffHint.appendChild(enableBtn);
            body.appendChild(logOffHint);
            const msgLogEl = document.createElement("div");
            msgLogEl.style.cssText = "background:#100810;border:1px solid #3a1928;border-radius:4px;max-height:260px;overflow-y:auto;";
            body.appendChild(msgLogEl);
            const msgTypeColor = (type) => {
                switch (type) {
                    case "Chat": return "#6bd478";
                    case "Emote": return "#78a4d4";
                    case "Activity": return "#d4a478";
                    case "Action": return "#d478c4";
                    case "Whisper": return "#78d4c4";
                    case "Hidden": return "#a0a0a0";
                    default: return "#cf6f98";
                }
            };
            const renderMsgLog = () => {
                while (msgLogEl.firstChild)
                    msgLogEl.removeChild(msgLogEl.firstChild);
                const entries = [...getDevLog()].reverse();
                if (entries.length === 0) {
                    const hint = document.createElement("div");
                    hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:8px 6px;";
                    hint.textContent = isDevLogEnabled()
                        ? "No messages yet. Must be in a room — chat, emote, or have someone do an action. Click Test above to verify the UI works."
                        : "Logging is off. Click Enable above, then do something in a room.";
                    msgLogEl.appendChild(hint);
                    return;
                }
                for (const entry of entries) {
                    const row = document.createElement("div");
                    row.style.cssText = "border-bottom:1px solid #1a0e17;padding:4px 6px;cursor:pointer;";
                    const headerLine = document.createElement("div");
                    headerLine.style.cssText = "display:flex;gap:5px;align-items:baseline;";
                    const typeTag = document.createElement("span");
                    typeTag.style.cssText = `font-family:'Courier New',monospace;font-size:9px;font-weight:bold;color:${msgTypeColor(entry.type)};`;
                    typeTag.textContent = entry.type;
                    const timeTag = document.createElement("span");
                    timeTag.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#553142;margin-left:auto;";
                    timeTag.textContent = entry.timestamp.toLocaleTimeString();
                    headerLine.appendChild(typeTag);
                    if (entry.sender !== undefined) {
                        const senderTag = document.createElement("span");
                        senderTag.style.cssText = "font-family:'Trebuchet MS',serif;font-size:8px;color:#7a5a6a;";
                        senderTag.textContent = "from #" + entry.sender;
                        headerLine.appendChild(senderTag);
                    }
                    headerLine.appendChild(timeTag);
                    const contentLine = document.createElement("div");
                    contentLine.style.cssText = "font-family:'Courier New',monospace;font-size:8.5px;color:#cf6f98;word-break:break-all;margin-top:1px;";
                    contentLine.textContent = entry.content.length > 150 ? entry.content.slice(0, 150) + "…" : entry.content;
                    // Clicking a row expands/collapses the full dictionary JSON
                    let dictEl = null;
                    row.addEventListener("click", () => {
                        if (dictEl) {
                            dictEl.remove();
                            dictEl = null;
                            return;
                        }
                        dictEl = document.createElement("pre");
                        dictEl.style.cssText = "font-family:'Courier New',monospace;font-size:7.5px;color:#7a5a6a;margin:3px 0 0;white-space:pre-wrap;word-break:break-all;";
                        try {
                            dictEl.textContent = JSON.stringify(entry.dictionary, null, 2);
                        }
                        catch (_a) {
                            dictEl.textContent = String(entry.dictionary);
                        }
                        row.appendChild(dictEl);
                    });
                    row.appendChild(headerLine);
                    row.appendChild(contentLine);
                    msgLogEl.appendChild(row);
                }
            };
            renderMsgLog();
            msgRefreshBtn2.addEventListener("click", renderMsgLog);
            msgClearBtn.addEventListener("click", () => { clearDevLog(); renderMsgLog(); });
            // Auto-refresh every 1.5 s while the DEV tab is open
            this.stopDevLogPoller();
            this.devLogPoller = window.setInterval(() => {
                if (this.currentTab === "dev" && isDevLogEnabled())
                    renderMsgLog();
            }, 1500);
        }
        // -- Special Thanks tab ----------------------------------------------------
        renderThanks() {
            var _a;
            const body = (_a = this.rootEl) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-body");
            if (!body)
                return;
            while (body.firstChild)
                body.removeChild(body.firstChild);
            const credLbl = document.createElement("div");
            credLbl.className = "ebc-section-label";
            credLbl.textContent = "Special Thanks";
            body.appendChild(credLbl);
            const intro = document.createElement("div");
            intro.className = "ebc-thanks-intro";
            intro.textContent = "People who made EmeryBC possible.";
            body.appendChild(intro);
            const people = [
                {
                    emoji: "🎀",
                    name: "Sin",
                    memberId: 143776,
                    reason: "Creator of CRABS — the UI inspiration behind this whole drawer. Open design, open heart.",
                    heart: "💗",
                },
                {
                    emoji: "🌸",
                    name: "Lara",
                    memberId: 124264,
                    reason: "Keeping my bratty side in check, endless support and inspiration, and simply being the best friend anyone could ask for around here~",
                    heart: "💖",
                },
                {
                    emoji: "🌙",
                    name: "Lucy",
                    memberId: 230466,
                    reason: "Stayed up nearly 19 hours with me while this came to life, sharing ideas and keeping the energy going the whole way through.",
                    heart: "💜",
                },
                {
                    emoji: "✨",
                    name: "Sybil",
                    memberId: 80,
                    reason: "Brilliant ideas, patient testing, and a genuinely kind presence — Sybil has shaped this addon in more ways than one, and her beautiful contributions to the club make it a richer place for everyone. Big thanks~",
                    heart: "💛",
                },
            ];
            for (const p of people) {
                const card = document.createElement("div");
                card.className = "ebc-thanks-card";
                const avatar = document.createElement("div");
                avatar.className = "ebc-thanks-avatar";
                avatar.textContent = p.emoji;
                const info = document.createElement("div");
                info.className = "ebc-thanks-info";
                const nameRow = document.createElement("div");
                nameRow.style.cssText = "display:flex;align-items:baseline;gap:5px;";
                const namEl = document.createElement("span");
                namEl.className = "ebc-thanks-name";
                namEl.textContent = p.name;
                const idEl2 = document.createElement("span");
                idEl2.style.cssText = "font-size:9px;color:#7a5a6a;font-family:'Trebuchet MS',serif;flex-shrink:0;";
                idEl2.textContent = "#" + p.memberId;
                idEl2.title = "BC Member Number";
                nameRow.appendChild(namEl);
                nameRow.appendChild(idEl2);
                const reason = document.createElement("span");
                reason.className = "ebc-thanks-reason";
                reason.textContent = p.reason;
                info.appendChild(nameRow);
                info.appendChild(reason);
                const heart = document.createElement("span");
                heart.className = "ebc-thanks-heart";
                heart.textContent = p.heart;
                card.appendChild(avatar);
                card.appendChild(info);
                card.appendChild(heart);
                body.appendChild(card);
            }
        }
        // -- DOM Tools tab (creator-only) ------------------------------------------
        renderDomTools() {
            var _a;
            const body = (_a = this.rootEl) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-body");
            if (!body)
                return;
            while (body.firstChild)
                body.removeChild(body.firstChild);
            // ── Auto-Escape (visible to all, not gated behind isDomEnabled) ───────
            const aeLbl = document.createElement("div");
            aeLbl.className = "ebc-section-label";
            aeLbl.textContent = "Auto-Escape";
            body.appendChild(aeLbl);
            const antiRow = document.createElement("div");
            antiRow.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 7px;border-radius:6px;background:rgba(42,20,33,0.4);border:1px solid #3a1928;margin-bottom:8px;";
            const antiInfo = document.createElement("div");
            antiInfo.style.cssText = "flex:1;min-width:0;";
            const antiTitle = document.createElement("span");
            antiTitle.style.cssText = "display:block;font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;";
            antiTitle.textContent = "Auto-escape incoming restraints";
            const antiHint = document.createElement("span");
            antiHint.style.cssText = "display:block;font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-top:1px;";
            antiHint.textContent = "Removes any restraint put on you and sends a playful room emote";
            antiInfo.appendChild(antiTitle);
            antiInfo.appendChild(antiHint);
            const antiToggle = document.createElement("button");
            const refreshAntiToggle = () => {
                const on = getAntiRestraintEnabled();
                antiToggle.textContent = on ? "ON" : "OFF";
                antiToggle.style.cssText = [
                    "font-family:'Trebuchet MS',serif",
                    "font-size:10px",
                    "font-weight:bold",
                    "padding:2px 10px",
                    "border-radius:4px",
                    "cursor:pointer",
                    "flex-shrink:0",
                    "border:1px solid " + (on ? "#cf6f98" : "#4c2537"),
                    "background:" + (on ? "#6b3048" : "#1b0d17"),
                    "color:" + (on ? "#f7e6ee" : "#553142"),
                    "transition:background 0.14s,color 0.14s,border-color 0.14s",
                ].join(";");
            };
            refreshAntiToggle();
            antiToggle.addEventListener("click", () => {
                const next = !getAntiRestraintEnabled();
                setAntiRestraintEnabled(next);
                if (next)
                    try {
                        snapshotPlayerRestraints();
                    }
                    catch ( /* ignore */_a) { /* ignore */ }
                refreshAntiToggle();
            });
            antiRow.appendChild(antiInfo);
            antiRow.appendChild(antiToggle);
            body.appendChild(antiRow);
            // -- Whitelist --
            const whitelistSection = document.createElement("div");
            whitelistSection.style.cssText = "margin-bottom:10px;";
            const wlTitle = document.createElement("span");
            wlTitle.style.cssText = "display:block;font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;";
            wlTitle.textContent = "Escape whitelist — items auto-escape will keep";
            whitelistSection.appendChild(wlTitle);
            const domFriendlyGroup = (g) => g.replace(/^Item/, "").replace(/([A-Z])/g, " $1").trim();
            const domMakeChip = (label, onRemove) => {
                const chip = document.createElement("div");
                chip.style.cssText = "display:inline-flex;align-items:center;gap:3px;background:#3a1928;border:1px solid #6b3048;border-radius:10px;padding:2px 7px 2px 8px;font-family:'Trebuchet MS',serif;font-size:9px;color:#f7e6ee;margin:2px 2px 2px 0;";
                const txt = document.createElement("span");
                txt.textContent = label;
                const x = document.createElement("button");
                x.textContent = "×";
                x.title = "Remove from whitelist";
                x.style.cssText = "background:none;border:none;cursor:pointer;color:#cf6f98;font-size:11px;line-height:1;padding:0 0 0 2px;";
                x.addEventListener("click", onRemove);
                chip.appendChild(txt);
                chip.appendChild(x);
                return chip;
            };
            const wlChips = document.createElement("div");
            wlChips.style.cssText = "min-height:18px;margin-bottom:4px;";
            const wlAddRow = document.createElement("div");
            wlAddRow.style.cssText = "display:flex;flex-wrap:wrap;gap:3px;";
            const refreshWhitelistUI = () => {
                wlChips.innerHTML = "";
                wlAddRow.innerHTML = "";
                const whitelist = getAntiRestraintWhitelist();
                if (whitelist.length === 0) {
                    const empty = document.createElement("span");
                    empty.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#4c2537;";
                    empty.textContent = "Nothing whitelisted — all restraints will be escaped";
                    wlChips.appendChild(empty);
                }
                else {
                    for (const group of whitelist) {
                        wlChips.appendChild(domMakeChip(domFriendlyGroup(group), () => {
                            removeFromAntiRestraintWhitelist(group);
                            refreshWhitelistUI();
                        }));
                    }
                }
                try {
                    const wornGroups = Player.Appearance
                        .filter((i) => i.Asset.Group.IsRestraint && !whitelist.includes(i.Asset.Group.Name))
                        .map((i) => i.Asset.Group.Name);
                    if (wornGroups.length > 0) {
                        const addLabel = document.createElement("span");
                        addLabel.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-right:4px;align-self:center;";
                        addLabel.textContent = "Currently wearing:";
                        wlAddRow.appendChild(addLabel);
                        for (const group of wornGroups) {
                            const btn = document.createElement("button");
                            btn.textContent = "+ " + domFriendlyGroup(group);
                            btn.title = "Add to whitelist — auto-escape will keep this";
                            btn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;background:#1b0d17;border:1px solid #4c2537;border-radius:10px;color:#7a5a6a;padding:2px 8px;cursor:pointer;";
                            btn.addEventListener("click", () => {
                                addToAntiRestraintWhitelist(group);
                                refreshWhitelistUI();
                            });
                            wlAddRow.appendChild(btn);
                        }
                    }
                }
                catch ( /* ignore */_a) { /* ignore */ }
            };
            refreshWhitelistUI();
            whitelistSection.appendChild(wlChips);
            whitelistSection.appendChild(wlAddRow);
            body.appendChild(whitelistSection);
            // ── DOM Tools (creator-only below this point) ─────────────────────────
            if (!isDomEnabled()) {
                const msg = document.createElement("div");
                msg.className = "ebc-empty";
                msg.textContent = "Not available.";
                body.appendChild(msg);
                return;
            }
            // Sync selected targets: add any new targets that aren't tracked yet
            const allTargetIds = getDomConfig().targets.map(t => t.id);
            if (this.domSelectedTargets.size === 0) {
                allTargetIds.forEach(id => this.domSelectedTargets.add(id));
            }
            // Remove stale IDs
            for (const id of this.domSelectedTargets) {
                if (!allTargetIds.includes(id))
                    this.domSelectedTargets.delete(id);
            }
            // Helper: labelled text input row
            const makeField = (label, value, prefix = "", placeholder = "") => {
                const row = document.createElement("div");
                row.style.cssText = "margin-bottom:5px;";
                const lbl = document.createElement("label");
                lbl.style.cssText = "display:block;font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.05em;";
                lbl.textContent = label;
                row.appendChild(lbl);
                const wrap = document.createElement("div");
                wrap.style.cssText = "display:flex;align-items:center;";
                if (prefix) {
                    const pre = document.createElement("span");
                    pre.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5a6a;background:#1b0d17;border:1px solid #4c2537;border-right:none;border-radius:4px 0 0 4px;padding:3px 5px;flex-shrink:0;";
                    pre.textContent = prefix;
                    wrap.appendChild(pre);
                }
                const input = document.createElement("input");
                input.type = "text";
                input.value = value;
                if (placeholder)
                    input.placeholder = placeholder;
                input.style.cssText = `flex:1;min-width:0;background:#1b0d17;border:1px solid #4c2537;${prefix ? "border-radius:0 4px 4px 0;" : "border-radius:4px;"}color:#f7e6ee;font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 6px;outline:none;transition:border-color 0.14s;`;
                input.addEventListener("focus", () => { input.style.borderColor = "#91405f"; });
                input.addEventListener("blur", () => { input.style.borderColor = "#4c2537"; });
                wrap.appendChild(input);
                row.appendChild(wrap);
                return { row, input };
            };
            // ── Targets ──────────────────────────────────────────────────────────
            const targLbl = document.createElement("div");
            targLbl.className = "ebc-section-label";
            targLbl.textContent = "Targets";
            body.appendChild(targLbl);
            const targList = document.createElement("div");
            body.appendChild(targList);
            const rebuildTargets = () => {
                while (targList.firstChild)
                    targList.removeChild(targList.firstChild);
                for (const t of getDomConfig().targets) {
                    const row = document.createElement("div");
                    row.style.cssText = "display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:6px;margin-bottom:3px;background:rgba(42,20,33,0.5);border:1px solid #3a1928;";
                    const cb = document.createElement("input");
                    cb.type = "checkbox";
                    cb.checked = this.domSelectedTargets.has(t.id);
                    cb.style.cssText = "cursor:pointer;accent-color:#cf6f98;flex-shrink:0;";
                    cb.addEventListener("change", () => {
                        if (cb.checked)
                            this.domSelectedTargets.add(t.id);
                        else
                            this.domSelectedTargets.delete(t.id);
                    });
                    row.appendChild(cb);
                    const nameEl = document.createElement("span");
                    nameEl.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;";
                    nameEl.textContent = t.name;
                    const numEl = document.createElement("span");
                    numEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#7a5a6a;";
                    numEl.textContent = "#" + t.id;
                    const delBtn = document.createElement("button");
                    delBtn.style.cssText = "background:transparent;border:1px solid #4c2537;border-radius:4px;color:#553142;cursor:pointer;font-size:11px;padding:1px 6px;transition:background 0.14s,color 0.12s;";
                    delBtn.textContent = "×";
                    delBtn.addEventListener("mouseenter", () => { delBtn.style.background = "#3a1017"; delBtn.style.color = "#ff6b6b"; });
                    delBtn.addEventListener("mouseleave", () => { delBtn.style.background = ""; delBtn.style.color = "#553142"; });
                    delBtn.addEventListener("click", () => { removeDomTarget(t.id); rebuildTargets(); rebuildAddable(); });
                    row.appendChild(nameEl);
                    row.appendChild(numEl);
                    row.appendChild(delBtn);
                    targList.appendChild(row);
                }
            };
            rebuildTargets();
            const addableWrap = document.createElement("div");
            addableWrap.style.cssText = "margin-top:4px;margin-bottom:2px;";
            body.appendChild(addableWrap);
            const rebuildAddable = () => {
                while (addableWrap.firstChild)
                    addableWrap.removeChild(addableWrap.firstChild);
                const addable = getRoomAddable();
                if (addable.length === 0) {
                    const hint = document.createElement("div");
                    hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:3px 2px;";
                    hint.textContent = "No new people in room to add.";
                    addableWrap.appendChild(hint);
                    return;
                }
                const addLbl = document.createElement("div");
                addLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#967281;margin-bottom:4px;";
                addLbl.textContent = "Add from room:";
                addableWrap.appendChild(addLbl);
                const chipRow = document.createElement("div");
                chipRow.style.cssText = "display:flex;flex-wrap:wrap;gap:4px;";
                for (const p of addable) {
                    const chip = document.createElement("button");
                    chip.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 8px;border-radius:4px;border:1px solid #4c2537;background:#1b0d17;color:#967281;cursor:pointer;transition:background 0.14s,color 0.12s,border-color 0.12s;";
                    chip.textContent = "+ " + p.name + " #" + p.id;
                    chip.addEventListener("mouseenter", () => { chip.style.background = "#2a1421"; chip.style.color = "#cf6f98"; chip.style.borderColor = "#7a4a5e"; });
                    chip.addEventListener("mouseleave", () => { chip.style.background = "#1b0d17"; chip.style.color = "#967281"; chip.style.borderColor = "#4c2537"; });
                    chip.addEventListener("click", () => { addDomTarget(p.id, p.name); rebuildTargets(); rebuildAddable(); });
                    chipRow.appendChild(chip);
                }
                addableWrap.appendChild(chipRow);
            };
            rebuildAddable();
            // ── Release / Rescue ─────────────────────────────────────────────────
            const divRelease = document.createElement("div");
            divRelease.className = "ebc-divider";
            divRelease.style.margin = "10px 0 7px";
            body.appendChild(divRelease);
            const releaseLbl = document.createElement("div");
            releaseLbl.className = "ebc-section-label";
            releaseLbl.textContent = "Release / Rescue";
            body.appendChild(releaseLbl);
            // Quick-action row: two wide buttons
            const quickRow = document.createElement("div");
            quickRow.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;";
            const makeQuickBtn = (label, title) => {
                const b = document.createElement("button");
                b.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:6px 4px;border-radius:6px;border:1px solid #7a3a50;background:#3a1020;color:#cf6f98;cursor:pointer;transition:background 0.14s;";
                b.textContent = label;
                b.title = title;
                b.addEventListener("mouseenter", () => { b.style.background = "#5a1c30"; });
                b.addEventListener("mouseleave", () => { b.style.background = "#3a1020"; });
                return b;
            };
            const removeAllBtn = makeQuickBtn("↑ All Restraints", "Remove all restraint items from every target in the room");
            const unlockAllBtn = makeQuickBtn("🔓 All Locks", "Unlock all locked items on every target in the room");
            quickRow.appendChild(removeAllBtn);
            quickRow.appendChild(unlockAllBtn);
            body.appendChild(quickRow);
            const releaseStatus = document.createElement("div");
            releaseStatus.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#79a885;min-height:13px;margin-bottom:4px;";
            body.appendChild(releaseStatus);
            const showReleaseStatus = (results) => {
                const done = results.filter(r => r.inRoom && r.count > 0).map(r => r.name + " (" + r.count + ")");
                const skip = results.filter(r => !r.inRoom).map(r => r.name);
                const parts = [];
                if (done.length)
                    parts.push("✓ " + done.join(", "));
                if (skip.length)
                    parts.push("⟳ not in room: " + skip.join(", "));
                releaseStatus.textContent = parts.join("  ·  ") || "Nothing to do.";
                window.setTimeout(() => { releaseStatus.textContent = ""; }, 4000);
            };
            removeAllBtn.addEventListener("click", () => {
                removeAllBtn.disabled = true;
                showReleaseStatus(removeAllTargetRestraints(this.domSelectedTargets));
                window.setTimeout(() => { removeAllBtn.disabled = false; }, 2000);
            });
            unlockAllBtn.addEventListener("click", () => {
                unlockAllBtn.disabled = true;
                showReleaseStatus(unlockAllTargetItems(this.domSelectedTargets));
                window.setTimeout(() => { unlockAllBtn.disabled = false; }, 2000);
            });
            // ── "Pick items to remove" picker ─────────────────────────────────────
            const pickToggle = document.createElement("button");
            pickToggle.style.cssText = "width:100%;background:transparent;border:1px dashed #4c2537;border-radius:5px;color:#7a4a5e;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 0;transition:background 0.14s,color 0.12s;margin-bottom:4px;";
            pickToggle.textContent = "↓ Pick items to remove";
            body.appendChild(pickToggle);
            const pickPanel = document.createElement("div");
            pickPanel.style.cssText = "display:none;flex-direction:column;gap:6px;background:rgba(42,20,33,0.5);border:1px solid #3a1928;border-radius:6px;padding:7px;margin-bottom:6px;";
            body.appendChild(pickPanel);
            // selection state: targetId → Set of group names
            const pendingRemove = new Map();
            const rebuildPickPanel = () => {
                while (pickPanel.firstChild)
                    pickPanel.removeChild(pickPanel.firstChild);
                pendingRemove.clear();
                const sections = getTargetRestraints();
                if (sections.length === 0) {
                    const hint = document.createElement("div");
                    hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:3px 2px;";
                    hint.textContent = "No targets are in the room right now.";
                    pickPanel.appendChild(hint);
                    return;
                }
                for (const { target, items } of sections) {
                    pendingRemove.set(target.id, new Set());
                    const targHdr = document.createElement("div");
                    targHdr.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#cf6f98;font-weight:bold;margin-bottom:3px;";
                    targHdr.textContent = target.name;
                    pickPanel.appendChild(targHdr);
                    if (items.length === 0) {
                        const none = document.createElement("div");
                        none.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:1px 4px 4px;";
                        none.textContent = "No restraints worn.";
                        pickPanel.appendChild(none);
                        continue;
                    }
                    const itemsWrap = document.createElement("div");
                    itemsWrap.style.cssText = "display:flex;flex-direction:column;gap:1px;margin-bottom:2px;";
                    for (const item of items) {
                        const lbl3 = document.createElement("label");
                        lbl3.style.cssText = "display:flex;align-items:center;gap:6px;padding:3px 4px;border-radius:3px;cursor:pointer;";
                        lbl3.addEventListener("mouseenter", () => { lbl3.style.background = "rgba(42,20,33,0.6)"; });
                        lbl3.addEventListener("mouseleave", () => { lbl3.style.background = ""; });
                        const cb2 = document.createElement("input");
                        cb2.type = "checkbox";
                        cb2.style.cssText = "cursor:pointer;accent-color:#cf6f98;flex-shrink:0;";
                        cb2.addEventListener("change", () => {
                            const sel = pendingRemove.get(target.id);
                            if (cb2.checked)
                                sel.add(item.group);
                            else
                                sel.delete(item.group);
                        });
                        const cbN = document.createElement("span");
                        cbN.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;color:#f7e6ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
                        cbN.textContent = item.name;
                        const cbG = document.createElement("span");
                        cbG.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;white-space:nowrap;flex-shrink:0;";
                        cbG.textContent = item.group.replace("Item", "");
                        lbl3.appendChild(cb2);
                        lbl3.appendChild(cbN);
                        lbl3.appendChild(cbG);
                        itemsWrap.appendChild(lbl3);
                    }
                    pickPanel.appendChild(itemsWrap);
                }
                // Remove selected button
                const removeSelBtn = document.createElement("button");
                removeSelBtn.style.cssText = "width:100%;background:#3a1020;border:1px solid #91405f;border-radius:5px;color:#cf6f98;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:5px 0;transition:background 0.14s;margin-top:3px;";
                removeSelBtn.textContent = "Remove Selected";
                removeSelBtn.addEventListener("click", () => {
                    var _a;
                    const results = [];
                    const cfg5 = getDomConfig();
                    for (const [targetId, groups] of pendingRemove) {
                        if (groups.size === 0)
                            continue;
                        const target = cfg5.targets.find(t => t.id === targetId);
                        const res = removeTargetItems(targetId, [...groups]);
                        results.push(Object.assign({ name: (_a = target === null || target === void 0 ? void 0 : target.name) !== null && _a !== void 0 ? _a : String(targetId) }, res));
                    }
                    if (results.length === 0) {
                        releaseStatus.textContent = "Nothing selected.";
                    }
                    else {
                        showReleaseStatus(results);
                    }
                    // Refresh picker to reflect new state
                    rebuildPickPanel();
                });
                pickPanel.appendChild(removeSelBtn);
            };
            pickToggle.addEventListener("click", () => {
                const isOpenNow = pickPanel.style.display === "none";
                pickPanel.style.display = isOpenNow ? "flex" : "none";
                pickToggle.style.borderStyle = isOpenNow ? "solid" : "dashed";
                pickToggle.style.color = isOpenNow ? "#cf6f98" : "#7a4a5e";
                if (isOpenNow)
                    rebuildPickPanel();
            });
            // ── Restraint Sets ───────────────────────────────────────────────────
            const div1 = document.createElement("div");
            div1.className = "ebc-divider";
            div1.style.margin = "10px 0 7px";
            body.appendChild(div1);
            const setsHeader = document.createElement("div");
            setsHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;";
            const setsLbl = document.createElement("div");
            setsLbl.className = "ebc-section-label";
            setsLbl.style.margin = "0";
            setsLbl.textContent = "Restraint Sets";
            const newSetBtn = document.createElement("button");
            newSetBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 10px;border-radius:5px;border:1px solid #91405f;background:#2a1421;color:#cf6f98;cursor:pointer;transition:background 0.14s;";
            newSetBtn.textContent = "+ New Set";
            newSetBtn.addEventListener("mouseenter", () => { newSetBtn.style.background = "#3a1828"; });
            newSetBtn.addEventListener("mouseleave", () => { newSetBtn.style.background = "#2a1421"; });
            setsHeader.appendChild(setsLbl);
            setsHeader.appendChild(newSetBtn);
            body.appendChild(setsHeader);
            const setsContainer = document.createElement("div");
            body.appendChild(setsContainer);
            let activeEditorId = null;
            const rebuildSets = () => {
                while (setsContainer.firstChild)
                    setsContainer.removeChild(setsContainer.firstChild);
                const cfg = getDomConfig();
                if (cfg.sets.length === 0) {
                    const hint = document.createElement("div");
                    hint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:4px 2px;margin-bottom:4px;";
                    hint.textContent = "No sets yet — create one with + New Set.";
                    setsContainer.appendChild(hint);
                }
                for (const set of cfg.sets) {
                    // ── Row ──────────────────────────────────────────────────────
                    const setRow = document.createElement("div");
                    setRow.style.cssText = "display:flex;align-items:center;gap:5px;padding:5px 7px;border-radius:6px;margin-bottom:2px;background:rgba(42,20,33,0.5);border:1px solid #3a1928;";
                    const setInfo = document.createElement("div");
                    setInfo.style.cssText = "flex:1;min-width:0;";
                    const setNameEl = document.createElement("div");
                    setNameEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:11px;color:#f7e6ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
                    setNameEl.textContent = set.name;
                    const setCmdEl = document.createElement("div");
                    setCmdEl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;";
                    setCmdEl.textContent = set.command ? ("/" + set.command) : (set.items.length + " item(s)");
                    setInfo.appendChild(setNameEl);
                    setInfo.appendChild(setCmdEl);
                    const applyBtn = document.createElement("button");
                    applyBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 8px;border-radius:5px;border:1px solid #91405f;background:#6b3048;color:#f7e6ee;cursor:pointer;transition:background 0.14s;white-space:nowrap;flex-shrink:0;";
                    applyBtn.textContent = "▶ Apply";
                    applyBtn.title = "Apply to targets in room";
                    applyBtn.addEventListener("mouseenter", () => { applyBtn.style.background = "#91405f"; });
                    applyBtn.addEventListener("mouseleave", () => { applyBtn.style.background = "#6b3048"; });
                    const editBtn = document.createElement("button");
                    editBtn.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;padding:3px 7px;border-radius:5px;border:1px solid #4c2537;background:transparent;color:#967281;cursor:pointer;transition:background 0.14s,color 0.12s;flex-shrink:0;";
                    editBtn.textContent = "✎";
                    editBtn.title = "Edit set";
                    editBtn.addEventListener("mouseenter", () => { editBtn.style.background = "#2a1421"; editBtn.style.color = "#cf6f98"; });
                    editBtn.addEventListener("mouseleave", () => { editBtn.style.background = ""; editBtn.style.color = "#967281"; });
                    setRow.appendChild(setInfo);
                    setRow.appendChild(applyBtn);
                    setRow.appendChild(editBtn);
                    setsContainer.appendChild(setRow);
                    // Apply status (shown briefly below the row)
                    const applyStatus = document.createElement("div");
                    applyStatus.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#79a885;padding:1px 7px 3px;display:none;";
                    setsContainer.appendChild(applyStatus);
                    applyBtn.addEventListener("click", () => {
                        applyBtn.disabled = true;
                        const { applied, skipped } = applyDomSet(set.id, this.domSelectedTargets);
                        const parts = [];
                        if (applied.length)
                            parts.push("✓ " + applied.join(", "));
                        if (skipped.length)
                            parts.push("⟳ not in room: " + skipped.join(", "));
                        applyStatus.textContent = parts.join("  ·  ") || "Nothing done.";
                        applyStatus.style.display = "block";
                        window.setTimeout(() => { applyBtn.disabled = false; applyStatus.style.display = "none"; }, 3000);
                    });
                    // ── Inline editor ─────────────────────────────────────────────
                    const editor = document.createElement("div");
                    editor.className = "ebc-dom-editor";
                    editor.style.cssText = "display:none;background:rgba(27,13,23,0.95);border:1px solid #4c2537;border-radius:7px;padding:8px;margin-bottom:6px;";
                    // Fields
                    const { row: nameRow, input: nameInput } = makeField("Name", set.name);
                    editor.appendChild(nameRow);
                    const { row: cmdRow, input: cmdInput } = makeField("Chat command", set.command, "/");
                    editor.appendChild(cmdRow);
                    const { row: annRow, input: annInput } = makeField("Announce", set.announceTemplate, "", "{name} appears on {targets}~");
                    editor.appendChild(annRow);
                    const tokenHint = document.createElement("div");
                    tokenHint.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#553142;padding:0 0 6px;";
                    tokenHint.textContent = "{name} = set name  ·  {targets} = names of restrained";
                    editor.appendChild(tokenHint);
                    const saveBtn = document.createElement("button");
                    saveBtn.style.cssText = "width:100%;background:#2a1421;border:1px solid #91405f;border-radius:5px;color:#cf6f98;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 0;transition:background 0.14s;margin-bottom:8px;";
                    saveBtn.textContent = "Save";
                    saveBtn.addEventListener("mouseenter", () => { saveBtn.style.background = "#3a1828"; });
                    saveBtn.addEventListener("mouseleave", () => { saveBtn.style.background = "#2a1421"; });
                    saveBtn.addEventListener("click", () => {
                        var _a, _b;
                        const currentItems = (_b = (_a = getDomConfig().sets.find(s => s.id === set.id)) === null || _a === void 0 ? void 0 : _a.items) !== null && _b !== void 0 ? _b : [];
                        updateDomSet(set.id, nameInput.value, cmdInput.value, annInput.value, currentItems);
                        activeEditorId = set.id;
                        rebuildSets();
                    });
                    editor.appendChild(saveBtn);
                    // Items sub-section
                    const itemsLbl = document.createElement("div");
                    itemsLbl.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#967281;font-weight:bold;margin-bottom:4px;letter-spacing:0.04em;text-transform:uppercase;";
                    editor.appendChild(itemsLbl);
                    const itemListEl = document.createElement("div");
                    itemListEl.style.cssText = "margin-bottom:6px;max-height:100px;overflow-y:auto;";
                    editor.appendChild(itemListEl);
                    const rebuildEditorItems = () => {
                        var _a;
                        while (itemListEl.firstChild)
                            itemListEl.removeChild(itemListEl.firstChild);
                        const currentSet = getDomConfig().sets.find(s => s.id === set.id);
                        const items = (_a = currentSet === null || currentSet === void 0 ? void 0 : currentSet.items) !== null && _a !== void 0 ? _a : [];
                        itemsLbl.textContent = "Items (" + items.length + ")";
                        if (items.length === 0) {
                            const hint2 = document.createElement("div");
                            hint2.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;color:#553142;padding:3px 2px;";
                            hint2.textContent = "No items yet — import from a BC code below.";
                            itemListEl.appendChild(hint2);
                            return;
                        }
                        for (let idx = 0; idx < items.length; idx++) {
                            const item = items[idx];
                            const irow = document.createElement("div");
                            irow.style.cssText = "display:flex;align-items:center;gap:5px;padding:2px 5px;border-radius:4px;margin-bottom:2px;background:rgba(42,20,33,0.4);";
                            const iname = document.createElement("span");
                            iname.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;color:#f7e6ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
                            iname.textContent = item.Name;
                            const igrp = document.createElement("span");
                            igrp.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;white-space:nowrap;";
                            igrp.textContent = item.Group.replace("Item", "");
                            const iDel = document.createElement("button");
                            iDel.style.cssText = "background:transparent;border:none;color:#553142;cursor:pointer;font-size:12px;padding:0 3px;line-height:1;";
                            iDel.textContent = "×";
                            iDel.addEventListener("click", () => {
                                const cfg2 = getDomConfig();
                                const s2 = cfg2.sets.find(s => s.id === set.id);
                                if (!s2)
                                    return;
                                s2.items.splice(idx, 1);
                                updateDomSet(set.id, s2.name, s2.command, s2.announceTemplate, s2.items);
                                rebuildEditorItems();
                            });
                            irow.appendChild(iname);
                            irow.appendChild(igrp);
                            irow.appendChild(iDel);
                            itemListEl.appendChild(irow);
                        }
                    };
                    rebuildEditorItems();
                    // Import sub-panel
                    const importToggle = document.createElement("button");
                    importToggle.style.cssText = "width:100%;background:transparent;border:1px dashed #4c2537;border-radius:5px;color:#7a4a5e;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 0;transition:background 0.14s,color 0.12s;margin-bottom:4px;";
                    importToggle.textContent = "↓ Import from BC Code";
                    editor.appendChild(importToggle);
                    const importPanel = document.createElement("div");
                    importPanel.style.cssText = "display:none;flex-direction:column;gap:5px;background:rgba(42,20,33,0.5);border:1px solid #3a1928;border-radius:6px;padding:7px;margin-bottom:5px;";
                    const importTA = document.createElement("textarea");
                    importTA.style.cssText = "width:100%;box-sizing:border-box;background:#1b0d17;border:1px solid #4c2537;border-radius:4px;color:#f7e6ee;font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 5px;resize:vertical;min-height:46px;outline:none;";
                    importTA.placeholder = "Paste BC outfit code…";
                    const importMsg = document.createElement("div");
                    importMsg.style.cssText = "font-family:'Trebuchet MS',serif;font-size:10px;min-height:14px;";
                    const checklistEl = document.createElement("div");
                    checklistEl.style.cssText = "display:none;max-height:120px;overflow-y:auto;border:1px solid #3a1928;border-radius:5px;background:rgba(27,13,23,0.6);padding:4px;";
                    let parsedItems = [];
                    const parseBtn = document.createElement("button");
                    parseBtn.style.cssText = "width:100%;background:#2a1421;border:1px solid #7a4a5e;border-radius:5px;color:#cf6f98;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 0;transition:background 0.14s;";
                    parseBtn.textContent = "Parse Code";
                    parseBtn.addEventListener("click", () => {
                        var _a;
                        importMsg.textContent = "";
                        importMsg.style.color = "#ff6b6b";
                        checklistEl.style.display = "none";
                        parsedItems = [];
                        const code = importTA.value.trim();
                        if (!code) {
                            importMsg.textContent = "Paste a code first.";
                            return;
                        }
                        try {
                            parsedItems = parseBCCodeItems(code);
                        }
                        catch (e) {
                            importMsg.textContent = String((_a = e.message) !== null && _a !== void 0 ? _a : e);
                            return;
                        }
                        while (checklistEl.firstChild)
                            checklistEl.removeChild(checklistEl.firstChild);
                        // Group: restraints first (pre-checked), then clothing (unchecked)
                        const restraints = parsedItems.filter(p => p.isRestraint);
                        const clothing = parsedItems.filter(p => !p.isRestraint);
                        const addSectionHeader = (text) => {
                            const sh = document.createElement("div");
                            sh.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#7a5a6a;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;padding:3px 2px 1px;";
                            sh.textContent = text;
                            checklistEl.appendChild(sh);
                        };
                        const addCheckRow = (pItem, defaultChecked) => {
                            const lbl2 = document.createElement("label");
                            lbl2.style.cssText = "display:flex;align-items:center;gap:6px;padding:3px 4px;border-radius:3px;cursor:pointer;";
                            lbl2.addEventListener("mouseenter", () => { lbl2.style.background = "rgba(42,20,33,0.5)"; });
                            lbl2.addEventListener("mouseleave", () => { lbl2.style.background = ""; });
                            const cb = document.createElement("input");
                            cb.type = "checkbox";
                            cb.checked = defaultChecked;
                            cb.style.cssText = "cursor:pointer;accent-color:#cf6f98;flex-shrink:0;";
                            const cbName = document.createElement("span");
                            cbName.style.cssText = "flex:1;font-family:'Trebuchet MS',serif;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" + (defaultChecked ? "color:#f7e6ee;" : "color:#7a5a6a;");
                            cbName.textContent = pItem.Name;
                            const cbGrp = document.createElement("span");
                            cbGrp.style.cssText = "font-family:'Trebuchet MS',serif;font-size:9px;color:#8a6070;white-space:nowrap;flex-shrink:0;";
                            cbGrp.textContent = pItem.Group.replace("Item", "");
                            lbl2.appendChild(cb);
                            lbl2.appendChild(cbName);
                            lbl2.appendChild(cbGrp);
                            checklistEl.appendChild(lbl2);
                        };
                        if (restraints.length > 0) {
                            addSectionHeader("Restraints (" + restraints.length + ")");
                            restraints.forEach(p => addCheckRow(p, true));
                        }
                        if (clothing.length > 0) {
                            addSectionHeader("Clothing / Other (" + clothing.length + ")");
                            clothing.forEach(p => addCheckRow(p, false));
                        }
                        checklistEl.style.display = "block";
                        importMsg.style.color = "#79a885";
                        const rCount = restraints.length;
                        const cCount = clothing.length;
                        importMsg.textContent = rCount + " restraint(s), " + cCount + " clothing — check what to add:";
                    });
                    const useSelectedBtn = document.createElement("button");
                    useSelectedBtn.style.cssText = "width:100%;background:#1b3021;border:1px solid #3a7a50;border-radius:5px;color:#79a885;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;font-weight:bold;padding:4px 0;transition:background 0.14s;";
                    useSelectedBtn.textContent = "Use Selected";
                    useSelectedBtn.addEventListener("click", () => {
                        const checks = checklistEl.querySelectorAll("input[type=checkbox]");
                        // Map checkboxes back to parsedItems — order matches DOM insertion order:
                        // restraints first, then clothing (same as rendering above).
                        const ordered = [
                            ...parsedItems.filter(p => p.isRestraint),
                            ...parsedItems.filter(p => !p.isRestraint),
                        ];
                        const selected = ordered.filter((_, i) => { var _a; return (_a = checks[i]) === null || _a === void 0 ? void 0 : _a.checked; });
                        if (selected.length === 0) {
                            importMsg.style.color = "#ff6b6b";
                            importMsg.textContent = "Select at least one item.";
                            return;
                        }
                        const cfg3 = getDomConfig();
                        const s3 = cfg3.sets.find(s => s.id === set.id);
                        if (!s3)
                            return;
                        for (const newItem of selected) {
                            const existIdx = s3.items.findIndex(x => x.Group === newItem.Group);
                            if (existIdx >= 0)
                                s3.items[existIdx] = newItem;
                            else
                                s3.items.push(newItem);
                        }
                        updateDomSet(set.id, s3.name, s3.command, s3.announceTemplate, s3.items);
                        importTA.value = "";
                        checklistEl.style.display = "none";
                        parsedItems = [];
                        importMsg.style.color = "#79a885";
                        importMsg.textContent = "✓ " + selected.length + " item(s) added.";
                        rebuildEditorItems();
                        window.setTimeout(() => { importMsg.textContent = ""; }, 2500);
                    });
                    importPanel.appendChild(importTA);
                    importPanel.appendChild(importMsg);
                    importPanel.appendChild(parseBtn);
                    importPanel.appendChild(checklistEl);
                    importPanel.appendChild(useSelectedBtn);
                    importToggle.addEventListener("click", () => {
                        const isOpenNow = importPanel.style.display === "none";
                        importPanel.style.display = isOpenNow ? "flex" : "none";
                        importToggle.style.borderStyle = isOpenNow ? "solid" : "dashed";
                        importToggle.style.color = isOpenNow ? "#cf6f98" : "#7a4a5e";
                        if (isOpenNow)
                            importTA.focus();
                    });
                    editor.appendChild(importPanel);
                    // Delete set
                    const delSetBtn = document.createElement("button");
                    delSetBtn.style.cssText = "width:100%;background:transparent;border:1px solid #4c2537;border-radius:5px;color:#553142;cursor:pointer;font-family:'Trebuchet MS',serif;font-size:10px;padding:4px 0;transition:background 0.14s,color 0.12s;margin-top:5px;";
                    delSetBtn.textContent = "Delete Set";
                    let delConfirm = false;
                    delSetBtn.addEventListener("click", () => {
                        if (!delConfirm) {
                            delConfirm = true;
                            delSetBtn.textContent = "Confirm Delete?";
                            delSetBtn.style.color = "#ff6b6b";
                            delSetBtn.style.borderColor = "#8a2020";
                            window.setTimeout(() => {
                                if (!delConfirm)
                                    return;
                                delConfirm = false;
                                delSetBtn.textContent = "Delete Set";
                                delSetBtn.style.color = "#553142";
                                delSetBtn.style.borderColor = "#4c2537";
                            }, 3000);
                        }
                        else {
                            deleteDomSet(set.id);
                            activeEditorId = null;
                            rebuildSets();
                        }
                    });
                    editor.appendChild(delSetBtn);
                    setsContainer.appendChild(editor);
                    // Toggle editor on edit button click
                    editBtn.addEventListener("click", () => {
                        const isNowOpen = editor.style.display !== "none";
                        // Close all other editors
                        setsContainer.querySelectorAll(".ebc-dom-editor").forEach(e => { e.style.display = "none"; });
                        if (!isNowOpen) {
                            editor.style.display = "block";
                            activeEditorId = set.id;
                        }
                        else {
                            activeEditorId = null;
                        }
                    });
                    // Restore open editor after rebuild
                    if (activeEditorId === set.id) {
                        editor.style.display = "block";
                    }
                }
            };
            rebuildSets();
            newSetBtn.addEventListener("click", () => {
                const s = createDomSet("New Set", "", "");
                activeEditorId = s.id;
                rebuildSets();
                body.scrollTop = body.scrollHeight;
            });
        }
        // -- Open / Close / Toggle -------------------------------------------------
        toggle() { this.isOpen ? this.close() : this.open(); }
        open() {
            var _a, _b, _c;
            if (!this.panelEl)
                return;
            this.isOpen = true;
            // Panel is opening — restore full tab hit area
            const tabEl = (_a = this.rootEl) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-tab");
            if (tabEl)
                tabEl.classList.remove("ebc-tab-closed");
            // On first open, check for a saved free-float position
            if (this.panelPosition === null) {
                const saved = this.loadPanelPosition();
                if (saved !== null) {
                    this.panelPosition = saved;
                    this.enterFreeMode(saved);
                }
            }
            if (this.panelPosition !== null) {
                // Free-float: just make visible at saved spot, no slide animation
                this.panelEl.classList.add("ebc-free-mode", "ebc-open");
                this.panelEl.classList.remove("ebc-closed");
            }
            else {
                // Anchored: normal slide-in
                this.panelEl.className = "ebc-open";
            }
            if (!this.positioned)
                this.syncToChat();
            try {
                (_b = this.refreshBadgeRow) === null || _b === void 0 ? void 0 : _b.call(this);
            }
            catch ( /* ignore */_d) { /* ignore */ }
            // Show the DOM tab only for the creator
            const domTabEl = (_c = this.rootEl) === null || _c === void 0 ? void 0 : _c.querySelector("#ebc-tab-dom");
            if (domTabEl)
                domTabEl.style.display = isDomEnabled() ? "" : "none";
            this.updateTimer();
            this.renderCurrentTab();
        }
        close() {
            var _a;
            if (!this.panelEl)
                return;
            this.stopDevLogPoller();
            this.isOpen = false;
            // Panel is closing — clip tab so it no longer blocks the BC canvas
            const tabEl = (_a = this.rootEl) === null || _a === void 0 ? void 0 : _a.querySelector("#ebc-tab");
            if (tabEl)
                tabEl.classList.add("ebc-tab-closed");
            if (this.panelPosition !== null) {
                // Free-float: keep mode class, just swap open→closed for opacity fade
                this.panelEl.classList.remove("ebc-open");
                this.panelEl.classList.add("ebc-closed", "ebc-free-mode");
            }
            else {
                this.panelEl.className = "ebc-closed";
            }
        }
        // -- Lifecycle -------------------------------------------------------------
        destroy() {
            var _a, _b;
            (_a = this.resizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
            this.stopCrabsPoller();
            this.stopTimerPoller();
            (_b = this.rootEl) === null || _b === void 0 ? void 0 : _b.remove();
            this.rootEl = null;
            this.panelEl = null;
            EBCDrawer._instance = null;
        }
        static getInstance() {
            return EBCDrawer._instance;
        }
    }
    EBCDrawer._instance = null;

    const MOD_NAME = "EmeryBC";
    const MOD_VERSION = "0.6.3";
    let noticeShown = false;
    const CHANGELOG = [
        {
            version: "0.6.3",
            changes: [
                "Fix: drawer icon position now reliably restores after reload — previously it could be lost if BC finished loading ExtensionSettings after the first room sync.",
            ],
        },
        {
            version: "0.6.2",
            changes: [
                "Beep windows now expand upward — dragging anchors to the bottom edge so windows near the bottom of the screen open toward the top instead of disappearing off screen.",
            ],
        },
        {
            version: "0.6.1",
            changes: [
                "Friends: EBC users now show a pink 'EBC vX.X.X' badge next to their name — populated the first time you share a room with them.",
                "Credits: added Sybil #80.",
            ],
        },
        {
            version: "0.6.0",
            changes: [
                "Beep chat: multiple windows can now be open simultaneously, each staggered so they don't overlap.",
                "Scrollbars throughout EBC now match the pink/dark theme instead of the default browser style.",
            ],
        },
        {
            version: "0.5.9",
            changes: [
                "Friends: member numbers now shown in a distinct blue-gray (#7a9ab8) instead of near-invisible dark pink.",
                "Friends: online friends show a room tag — 🔒 private (purple), 📢 public (teal), 🔐 locked (orange); 'full' shown if room is full.",
            ],
        },
        {
            version: "0.5.8",
            changes: [
                "Beep window: close, minimize, and mute buttons are now styled as proper pill buttons — larger and easier to hit.",
                "Beep window: opening an already-open window now immediately refreshes the message history.",
                "Beep window: drag is now fully free — no viewport clamping, move it anywhere on screen.",
            ],
        },
        {
            version: "0.5.7",
            changes: [
                "Beep messages no longer spam BC's main chat log (suppressed by default). Toggle '💬 hide/show in chat' button in the Friends section header to restore the native notification.",
            ],
        },
        {
            version: "0.5.6",
            changes: [
                "Drawer tab: pink unread dot appears when you have any unread beep messages.",
                "Beep window: minimize button collapses the chat to a title bar at the bottom of the screen.",
                "Beep window: unread dot on the minimized bar when a new message arrives while minimized.",
                "Beep window: mute toggle (bell icon) silences the sound notification; state saved across sessions.",
            ],
        },
        {
            version: "0.5.5",
            changes: [
                "Fix: incoming beeps now hooked via ServerAccountBeep (the real BC function name, confirmed from WCE source).",
                "Fix: outgoing beeps now use ServerSend('AccountBeep') instead of 'Beep' — messages were not being delivered.",
                "Fix: AccountQueryResult handled via ServerSocket.on (socket event, not a patchable global).",
            ],
        },
        {
            version: "0.5.4",
            changes: [
                "Fix: Friends online count and status dots now reflect BC's full online list (not just your current room) — hooks AccountQueryResult OnlineFriends query.",
                "Friends list sorted: room (bright green) → online elsewhere (yellow-green) → offline (gray).",
                "Sound notification on incoming beep — short descending tone via Web Audio API.",
            ],
        },
        {
            version: "0.5.3",
            changes: [
                "Beep chat: reply system — click '↩ reply' on any received message to quote it; reply bar shows above the input and can be dismissed with ×.",
                "Beep chat: image auto-embed — image URLs (png/jpg/gif/webp/svg) render as inline thumbnails; click to open full size.",
                "Removed 'Beep All In Room' button.",
            ],
        },
        {
            version: "0.5.2",
            changes: [
                "Fix: Confirm before escaping toggle now re-reads saved state when entering a room, so it no longer resets to OFF on every script reload.",
                "Fix: Friend names now populated from FriendListBeep hook and ChatRoomSync — friends you've been in a room with will show their name instead of their ID.",
                "Fix: Incoming beep names cached from AccountBeep socket payload (MemberName field).",
                "Fix: Unread badge on the 💬 button — red dot with count appears for any friend who messaged you while the window was closed.",
            ],
        },
        {
            version: "0.5.1",
            changes: [
                "Friends section in Users tab: lists all BC friends with green (in room) / gray (away) status dot, tag system (click to edit inline), and per-friend beep chat window.",
                "Beep chat window: floating draggable overlay with conversation history, synced across devices via ExtensionSettings.",
                "Beep All In Room button: send one message to every friend currently in your room.",
                "Incoming beeps are recorded to history automatically so the chat window stays up to date.",
            ],
        },
        {
            version: "0.5.0",
            changes: [
                "Scene equip/unequip steps now use dropdowns populated from BC's asset data — no need to know group names.",
                "Scene unequip targets a slot (removes whatever is worn there) instead of a specific item — scenes work with any outfit.",
                "Scene: added Chat step type for sending chat messages with * emotes, ( OOC, or plain dialogue.",
            ],
        },
        {
            version: "0.4.9",
            changes: [
                "New: Scene sequencer in the ANIMS tab — chain pose changes, item equips/unequips, emotes and waits into timed sequences with optional chat commands.",
            ],
        },
        {
            version: "0.4.8",
            changes: [
                "Removed Front Cuffs and Elbow Cuffs from the Arms pose list.",
                "Fix: restraint palette capture now uses BC's IsRestraint flag instead of a hardcoded group list — all binds are captured correctly.",
                "Fix: 'That's you' label in Users tab is now readable gold instead of invisible pink-on-pink.",
            ],
        },
        {
            version: "0.4.7",
            changes: [
                "Removed floating expression panel and its toggle entirely — all expression UI is gone.",
            ],
        },
        {
            version: "0.4.6",
            changes: [
                "Removed face/expression picker from ANIMS tab — poses and combos only.",
                "Confirm before escaping now also gates Release Restraints and Remove Locks buttons — shows Cancel / Yes overlay before acting.",
            ],
        },
        {
            version: "0.4.5",
            changes: [
                "Fix: confirm-before-escaping now uses a custom in-game overlay (Keep it / Escape!) instead of window.confirm — shows reliably in all browser environments.",
                "Fix: body and arm pose buttons now apply and sync correctly (CharacterRefresh + ChatRoomCharacterUpdate + ServerPlayerAppearanceSync).",
                "Restraint palette apply now skips items with owner/exclusive/high-security/mistress/lover locks — protected items are never recolored.",
                "Confirm before escaping label is now more readable in the quick-action bar.",
            ],
        },
        {
            version: "0.4.4",
            changes: [
                "Removed expression sequence creator and button — expression tab now shows picker and presets only.",
                "Notes tab renamed to Users; your own character now appears at the top (name + member number, no note editor).",
                "Room section shows all other players in the room; Saved section shows offline notes.",
            ],
        },
        {
            version: "0.4.3",
            changes: [
                "Fix: expression face rows now scroll properly — min-width:0 added so overflow-x:auto actually constrains buttons.",
                "Fix: asset query now only checks Group.Family (where BC stores it) so all expression options are found correctly.",
            ],
        },
        {
            version: "0.4.2",
            changes: [
                "Confirm before escaping moved to the quick-action bar between Release/Remove Locks and the item picker — always visible.",
                "Expressions tab redesigned: presets as a quick-apply pill strip at top, face groups in a clean box, emoticons in their own wrap grid, sequences section with inline + New button.",
                "Preset apply now syncs picker highlights immediately.",
                "Floating expression button toggle moved to bottom of ANIMS tab.",
            ],
        },
        {
            version: "0.4.1",
            changes: [
                "Auto-escape toggle and whitelist moved to the DOM tab (visible to all, DOM tools below remain creator-only).",
                "Emoticons now shown in a wrapping grid instead of a horizontal scroll row — no more cut-off options.",
                "Expanded emoticon list with all known BC options (BecomeLeader, Bed, Captured, CollaredPickup, LostLeader, Meditate, Obey, Orgasm, Pain, Snow, Whisper, XP, and more).",
                "Fixed asset query for expression options: now checks Group.Family as well so expressions are never missed.",
            ],
        },
        {
            version: "0.4.0",
            changes: [
                "ANIMS: full expression picker — every BC facial expression shown per group as clickable buttons; click to apply instantly.",
                "Picker reads available options from BC's runtime Asset array so it always matches the character's actual options.",
                "Sequences redesigned: steps now embed the full face state directly (no preset reference). Set expressions in the picker, enter a hold time, click '+ Add Step' to build each frame.",
                "Saved presets kept as a quick-apply shortcut (separate 'Saved Presets' section below the picker).",
            ],
        },
        {
            version: "0.3.13",
            changes: [
                "Auto-escape (toggle, confirm, whitelist) moved from DOM tab to Buttons tab — accessible to everyone regardless of DOM tools.",
            ],
        },
        {
            version: "0.3.12",
            changes: [
                "Fix: expression presets now use CharacterSetFacialExpression (BC's own API) so apply actually works; direct-push fallback kept for safety.",
                "Fix: expression store is now null-safe so saving no longer silently fails before Player.ExtensionSettings is ready.",
                "Auto-escape: 'Confirm before escaping' toggle (off by default) — shows OK/Cancel; OK accepts the restraint, Cancel escapes it.",
            ],
        },
        {
            version: "0.3.11",
            changes: [
                "Auto-escape whitelist: mark specific restraint slots as 'keep' — they'll never be escaped even when applied by others.",
                "Whitelist UI in Settings shows your currently worn restraints with one-click add buttons and × to remove.",
                "Auto-escape now retries up to 2 times before giving up on a locked/unclearable item, then stops attempting.",
            ],
        },
        {
            version: "0.3.10",
            changes: [
                "DEV log: logging is OFF by default and only starts when you explicitly enable it — no background accumulation.",
                "DEV log: status indicator (● CAPTURING / ○ OFF) shows current state at a glance.",
                "DEV log: Test button now works even when logging is disabled so you can verify the UI independently.",
                "Removed auto room-sync log entry — the log stays completely silent until you turn it on.",
            ],
        },
        {
            version: "0.3.9",
            changes: [
                "EXP button is now draggable — same drag/click logic as the main drawer icon.",
                "EXP button position saved to ExtensionSettings and restored on next load.",
                "Right-click EXP button to reset it back to its default position.",
            ],
        },
        {
            version: "0.3.8",
            changes: [
                "DEV log: Test button — injects a dummy entry so you can verify the log UI is working independently of room activity.",
                "DEV log: Room sync now writes a System entry ([EBC] Room synced) so you can confirm the logging hook is active as soon as you enter a room.",
                "DEV log: clearer empty-state text.",
            ],
        },
        {
            version: "0.3.7",
            changes: [
                "Fix: expression preset apply now uses AssetGet + direct Appearance manipulation instead of InventoryWear, which was silently rejected for cosmetic groups.",
                "ANIMS tab: Expression Sequences — chain saved presets into an animated sequence with per-step hold durations; play button runs the sequence live.",
            ],
        },
        {
            version: "0.3.6",
            changes: [
                "DEV log: auto-refreshes every 1.5 s while the DEV tab is open — no more manual ↻.",
                "DEV log: prominent 'Enable' banner when logging is off so the toggle is hard to miss.",
                "DEV log: toggling the checkbox now immediately refreshes the list.",
            ],
        },
        {
            version: "0.3.5",
            changes: [
                "EXP button now shows a face icon instead of text.",
                "Expression panel is now draggable via the ⠿ handle on its header.",
                "Expression panel position is saved to ExtensionSettings and restored on next open.",
            ],
        },
        {
            version: "0.3.4",
            changes: [
                "Fix: expression preset apply was silently bailing due to unnecessary window-wrapping guard; rewrote to call BC globals directly.",
                "Fix: missing ChatRoomCharacterUpdate meant expression changes were invisible to others in the room.",
                "Fix: captureCurrentExpression now has error handling so a bad Appearance state can't silently swallow a save.",
            ],
        },
        {
            version: "0.3.3",
            changes: [
                "Outfit schedule: time input now uses military time (HH:MM, 24h) with auto-colon and validation.",
            ],
        },
        {
            version: "0.3.2",
            changes: [
                "ANIMS tab: Expression Presets section added at the top — capture, apply, and delete face presets without leaving the panel.",
                "ANIMS tab: Toggle to show/hide the EXP floating quick-panel button.",
                "EXP floating panel: drag handle on header for free repositioning.",
            ],
        },
        {
            version: "0.3.1",
            changes: [
                "DEV: Character Inspector — pick any room member, dump their full appearance + property data as JSON.",
                "DEV: Hook Inspector — lists all mods loaded via bcModSdk with version and hook count.",
                "DEV: Message Log — toggle-enabled circular buffer of the last 60 ChatRoomMessages. Click any entry to expand its full dictionary.",
            ],
        },
        {
            version: "0.3.0",
            changes: [
                "Sequence builder: each step now has its own delay — edit sequences as individual step rows with type/text/delay instead of raw text.",
                "Outfit schedule: auto-wear an outfit at a set time (HH:MM). Schedule section at the bottom of the Outfits tab.",
                "Expression presets: save and apply face/expression state (eyes, mouth, blush, etc.) separately from outfits. Toggle the Expressions panel with the new floating button below the main tab.",
            ],
        },
        {
            version: "0.2.9",
            changes: [
                "Boop: fixed 'MISSING ACTIVITY DESCRIPTION' error — Boop is not a native BC activity so reverted to Type:Action with standard possessive format (Emery boops Lucy's nose.).",
            ],
        },
        {
            version: "0.2.8",
            changes: [
                "Fixed: closed panel no longer blocks clicks on BC UI behind it (pointer-events inherit fix).",
                "Fixed: tab icon now stays visible when drawer is closed (slide instead of clip-path).",
                "Boop: nose boops only.",
            ],
        },
        {
            version: "0.2.7",
            changes: [
                "Fixed: panel tab no longer blocks BC canvas clicks when the drawer is closed (clip-path hit area).",
                "Header: move-handle icon (⠿) added beside refresh for an explicit drag target.",
                "Buttons tab: 'Boop all friends in room' — sends a unique playful emote to each friend in the room with a small delay between each boop.",
            ],
        },
        {
            version: "0.2.6",
            changes: [
                "Anti-Restraint: toggle in the DOM tab. When on, any restraint applied to you is instantly removed and a playful room emote is sent.",
            ],
        },
        {
            version: "0.2.5",
            changes: [
                "DEV and CREDITS are now separate tabs — DEV holds developer tools, CREDITS holds special thanks cards.",
                "DOM Tools restraint picker fix — all BC restraint groups (including gags) now appear correctly in the removal picker.",
            ],
        },
        {
            version: "0.2.4",
            changes: [
                "DOM Tools: target checkboxes — tick which targets to include before hitting Apply, All Restraints, or All Locks.",
                "DOM Tools: sync fix — CharacterAppearanceSortLayers now called before ChatRoomCharacterUpdate so the appearance packet is properly ordered.",
                "DEV tab (was CREDITS): developer tools section shows EBC version badge toggle and a live list of EBC users in the room with their versions.",
                "Version badge toggle — when on, the overhead badge shows 'v0.2.4' instead of 'EBC' so you can see what version everyone is running.",
            ],
        },
        {
            version: "0.2.3",
            changes: [
                "Fixed 'No restraint items found' error: parser now returns ALL items from a BC outfit code and lets you pick. Restraints are pre-checked; clothing items show unchecked so you can ignore them.",
                "Checklist groups items into Restraints and Clothing / Other sections with a count per section.",
            ],
        },
        {
            version: "0.2.2",
            changes: [
                "Fixed restraint states not being preserved when applying DOM sets: Property (tight gag, device settings, etc.) is now restored after InventoryWear since BC's function does not accept it as a parameter.",
                "Self item picker: 'Pick items to remove from yourself' toggle in the quick-actions bar expands a panel showing your own restraints and locks as checkboxes, with Remove Selected and Unlock Selected buttons.",
                "Quick 'Release Restraints' and 'Remove Locks' buttons now also refresh the self-picker panel if it is open.",
            ],
        },
        {
            version: "0.2.1",
            changes: [
                "DOM Tools: Release / Rescue section with quick 'All Restraints' and 'All Locks' buttons to strip or unlock targets.",
                "DOM Tools: Per-item picker to choose exactly which restraints to remove from each in-room target.",
            ],
        },
        {
            version: "0.2.0",
            changes: [
                "DOM Tools tab renamed from bowtie emoji to DOM for clarity.",
                "Multiple named restraint sets: each set has its own name, chat command, and announce template.",
                "Per-set item picker: paste a BC outfit code, tick which restraints to include, then Use Selected.",
                "Per-set announce template with {name} (set name) and {targets} (restrained players) tokens.",
                "Inline set editor: expand any set with the pencil button to edit name, command, announce, items, or delete it.",
                "Chat command handler wired into main hooks so /command applies the matching restraint set.",
                "Improved server sync: ChatRoomCharacterUpdate called explicitly after item application.",
            ],
        },
        {
            version: "0.1.76",
            changes: [
                "Active Restraints panel in Outfits tab: see every equipped restraint, lock type, and who locked it at a glance.",
                "Outfit Export / Import: copy any outfit to clipboard from its edit panel; import via paste form at the bottom of Outfits.",
                "Colour Palettes: snapshot your full appearance colour map as a named palette and reapply it any time.",
                "Poses tab: one-click preset poses (Kneel, All Fours, Arms Up, etc.) and saveable custom pose combos with multiple poses combined.",
                "Room & Restraint Timer: footer now shows how long you have been in the room and how long you have been restrained.",
            ],
        },
        {
            version: "0.1.75",
            changes: [
                "Added Export / Import to the Buttons tab — export copies a JSON string to clipboard; import accepts a pasted string and loads it instantly.",
            ],
        },
        {
            version: "0.1.74",
            changes: [
                "Reset button and slot delete button in the Buttons tab now require a two-click confirm before acting.",
            ],
        },
        {
            version: "0.1.73",
            changes: [
                "Added pencil (edit) button to outfit rows — expand inline form to rename, change command, announce text, and restraint flags without deleting and recreating.",
            ],
        },
        {
            version: "0.1.72",
            changes: [
                "Increased gap between CRABS tab and EBC tab from 4 px to 8 px to clear the visual overlap.",
            ],
        },
        {
            version: "0.1.71",
            changes: [
                "Fixed EBC tab position sometimes overlapping CRABS: now polls CRABS's tab position every 200 ms instead of reading it once at layout time, eliminating the race condition.",
            ],
        },
        {
            version: "0.1.70",
            changes: [
                "Clean rebuild to resolve stale build artifact from v0.1.69.",
                "Updated credits text for Lara and Lucy in the Special Thanks tab.",
            ],
        },
        {
            version: "0.1.55",
            changes: [
                "Fixed drawer not appearing: badge toggle called Player.ExtensionSettings during setup() before Player was ready, crashing the whole panel construction.",
            ],
        },
        {
            version: "0.1.54",
            changes: [
                "Added EBC overhead tag toggle in the drawer — hide or show your EBC badge from other users at any time.",
            ],
        },
        {
            version: "0.1.53",
            changes: [
                "Removed Room Auto-Announce feature.",
                "Added Special Thanks tab (heart tab) crediting Lara, Lucy, and Sin.",
            ],
        },
        {
            version: "0.1.43",
            changes: [
                "Fixed cheer animation returning to neutral: BC requires null (not []) for neutral pose — empty array was being silently ignored so character stayed Yoked.",
                "Removed BOW from default buttons; added GIGGLE (* giggles. *) default button.",
            ],
        },
        {
            version: "0.1.42",
            changes: [
                "Cheer animation check now runs BEFORE the chat message — if arms are restrained, the message is suppressed too.",
                "Fixed false positive: ItemHands (paws, mittens, gloves) no longer counts as restrained; only ItemArms (armbinders, straitjackets) blocks cheering.",
            ],
        },
        {
            version: "0.1.41",
            changes: [
                "Outfit rows now have a × delete button — click once to arm (turns red), click again to confirm.",
                "Added POUT default button (emote style: * pouts. *).",
            ],
        },
        {
            version: "0.1.40",
            changes: [
                "Cheer animation now checks if arms are restrained (ItemArms/ItemHands) — blocked with a chat log notice if tied up.",
                "CHEER/CHEERS label-based animation is purely internal; no UI change needed.",
            ],
        },
        {
            version: "0.1.39",
            changes: [
                "Hamburger collapse button is now shorter (28px) so it reads as a control rather than a content button.",
                "CHEER default button: triggers automatic cheer pose animation (Yoked cycling) when label matches CHEER or CHEERS.",
                "Animation is label-driven and fully internal — no extra UI or style options exposed.",
            ],
        },
        {
            version: "0.1.38",
            changes: [
                "Per-outfit restraint preservation toggle: lock icon in outfit row controls whether existing restraints are kept or cleared when the outfit is worn.",
                "New outfits default to preserving restraints (safe default). Toggle persists per outfit.",
                "Smart conflict resolution: if the outfit itself has an item for a restraint slot, it takes priority over preserved restraints.",
            ],
        },
        {
            version: "0.1.37",
            changes: [
                "Fixed action emotes showing MISSING TEXT prefix — now uses poison trick with player name directly in Content.",
                "Fixed outfit announce text with same poison trick fix.",
                "Added per-button style choice: ( ) action or * * emote, toggled in the Buttons drawer tab.",
            ],
        },
        {
            version: "0.1.36",
            changes: [
                "Fixed drawer tab disappearing when panel is closed: tab now lives outside the sliding element and never transforms.",
                "Fixed drawer not appearing when addon loads while already in a chat room (initial visibility check on startup).",
                "Restructured drawer DOM: zero-width anchor holds the always-visible tab, only the panel slides.",
            ],
        },
        {
            version: "0.1.35",
            changes: [
                "Drawer widened to 300px for more comfortable reading.",
                "Version number shown in drawer header beside EmeryBC.",
                "Quick Actions bar added below tabs: Release Restraints and Remove Locks buttons always visible.",
                "Restraint/lock logic moved to shared module so commands and drawer use identical code.",
            ],
        },
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
    function playBeepSound() {
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
            osc.onended = () => ctx.close();
        }
        catch ( /* ignore — AudioContext may not be available */_a) { /* ignore — AudioContext may not be available */ }
    }
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
        const shared = ((_a = Player.OnlineSharedSettings) !== null && _a !== void 0 ? _a : (Player.OnlineSharedSettings = {}));
        // Always broadcast presence regardless of local display toggle —
        // the toggle only controls what YOU see, not what others see.
        const presence = { version: MOD_VERSION, marker: "EBC" };
        // Write to ExtensionSettings for local persistence
        const settings = getAddonSettings(Player, true);
        if (settings)
            settings.presence = presence;
        ServerPlayerExtensionSettingsSync(MOD_NAME);
        // Write to OnlineSharedSettings - this IS broadcast to all room members
        // via ChatRoomSync and CharacterUpdate packets, making the badge visible
        // to every other EmeryBC user in the room.
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
        var _a;
        if (CurrentScreen !== "ChatRoom")
            return;
        // Local display toggle — if off, skip drawing badges on everyone (client-side only)
        if (!getBadgeEnabled())
            return;
        const character = args[0];
        const left = typeof args[1] === "number" ? args[1] : null;
        const top = typeof args[2] === "number" ? args[2] : null;
        const zoom = typeof args[3] === "number" ? args[3] : 1;
        if (!character || left == null || top == null)
            return;
        const isSelf = character.MemberNumber === Player.MemberNumber;
        if (!isSelf && !hasEmeryBC(character))
            return;
        const presence = getSharedPresence(character);
        const showVer = getShowVersionBadge();
        const verStr = (_a = presence === null || presence === void 0 ? void 0 : presence.version) !== null && _a !== void 0 ? _a : MOD_VERSION;
        const label = showVer ? ("v" + verStr) : "EBC";
        const width = showVer ? Math.max(44, 50 * zoom) : Math.max(30, 34 * zoom);
        const height = Math.max(12, 14 * zoom);
        const x = left + 197 * zoom;
        const y = top + 26 * zoom;
        const badgeLeft = x - width / 2;
        const badgeTop = y - height / 2;
        DrawRect(badgeLeft + 1, badgeTop + 1, width, height, "rgba(0, 0, 0, 0.28)");
        DrawRect(badgeLeft, badgeTop, width, height, UI.cardMuted);
        DrawEmptyRect(badgeLeft, badgeTop, width, height, UI.panelEdge, 1);
        DrawTextFit(label, badgeLeft + width / 2, badgeTop + height / 2 + 1, width - 6, UI.accent);
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
            drawer = new EBCDrawer(MOD_VERSION);
            // Fire an initial visibility check in case the addon loads while the
            // player is already in a chat room (ChatRoomSync won't fire again).
            window.setTimeout(() => { try {
                drawer === null || drawer === void 0 ? void 0 : drawer.updateVisibility();
            }
            catch ( /* ignore */_a) { /* ignore */ } }, 400);
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
            var _a, _b;
            const result = next(args);
            try {
                syncPresenceMarker();
            }
            catch ( /* ignore */_c) { /* ignore */ }
            try {
                showRoomLoadNotice();
            }
            catch ( /* ignore */_d) { /* ignore */ }
            try {
                timerOnRoomEnter();
            }
            catch ( /* ignore */_e) { /* ignore */ }
            try {
                drawer === null || drawer === void 0 ? void 0 : drawer.updateVisibility();
            }
            catch ( /* ignore */_f) { /* ignore */ }
            try {
                snapshotPlayerRestraints();
            }
            catch ( /* ignore */_g) { /* ignore */ }
            // Cache names and EBC presence for everyone currently in the room.
            try {
                const chars = window.ChatRoomCharacter;
                if (chars)
                    for (const c of chars) {
                        if (!c.MemberNumber)
                            continue;
                        cacheName(c.MemberNumber, ((_a = c.Nickname) === null || _a === void 0 ? void 0 : _a.trim()) || c.Name || String(c.MemberNumber));
                        const shared = (_b = c.OnlineSharedSettings) === null || _b === void 0 ? void 0 : _b[MOD_NAME];
                        if (shared && typeof shared === "object") {
                            const p = shared.presence;
                            if (p && typeof p === "object") {
                                const v = p.version;
                                if (p.marker === "EBC" && typeof v === "string")
                                    cacheEBCVersion(c.MemberNumber, v);
                            }
                        }
                    }
            }
            catch ( /* ignore */_h) { /* ignore */ }
            return result;
        });
        // Anti-restraint: record who last acted on the player so the escape emote
        // can name them. BC sends an Action message with SourceCharacter / TargetCharacter
        // in the Dictionary whenever someone uses an item on another character.
        tryHookFunction(modAPI, "ChatRoomMessage", 3, (args, next) => {
            const result = next(args);
            try {
                const [data] = args;
                logMessage(data);
                if (data.Type !== "Action")
                    return result;
                const dict = data.Dictionary;
                if (!dict)
                    return result;
                // Dictionary entries can use either {Tag, MemberNumber} or direct keys.
                let sourceNum;
                let targetNum;
                for (const entry of dict) {
                    if (entry.Tag === "SourceCharacter" && typeof entry.MemberNumber === "number")
                        sourceNum = entry.MemberNumber;
                    if (entry.Tag === "TargetCharacter" && typeof entry.MemberNumber === "number")
                        targetNum = entry.MemberNumber;
                    // Alternative flat format
                    if (typeof entry.SourceCharacter === "number")
                        sourceNum = entry.SourceCharacter;
                    if (typeof entry.TargetCharacter === "number")
                        targetNum = entry.TargetCharacter;
                }
                if (typeof targetNum === "number" && targetNum === Player.MemberNumber &&
                    typeof sourceNum === "number" && sourceNum !== Player.MemberNumber) {
                    recordRestrainer(sourceNum);
                }
            }
            catch ( /* ignore */_a) { /* ignore */ }
            return result;
        });
        // Anti-restraint: detect new restraints on the player after any refresh
        tryHookFunction(modAPI, "CharacterRefresh", 3, (args, next) => {
            const result = next(args);
            try {
                const [C] = args;
                if (C === Player)
                    antiRestraintOnPlayerRefresh();
            }
            catch ( /* ignore */_a) { /* ignore */ }
            return result;
        });
        // Keep drawer visibility in sync whenever the BC screen changes
        tryHookFunction(modAPI, "CommonSetScreen", 3, (args, next) => {
            const result = next(args);
            try {
                const screen = typeof CurrentScreen !== "undefined" ? CurrentScreen : "";
                if (screen !== "ChatRoom")
                    timerOnRoomLeave();
            }
            catch ( /* ignore */_a) { /* ignore */ }
            try {
                drawer === null || drawer === void 0 ? void 0 : drawer.updateVisibility();
            }
            catch ( /* ignore */_b) { /* ignore */ }
            return result;
        });
        // Keep restraint timer up to date on every draw tick (lightweight check)
        tryHookFunction(modAPI, "DrawCharacter", 1, (args, next) => {
            try {
                timerCheckRestraints();
            }
            catch ( /* ignore */_a) { /* ignore */ }
            return next(args);
        });
        // Record incoming beeps. The real BC function is ServerAccountBeep (a patchable global).
        // Only handle plain beeps (BeepType === "" or undefined) — skip game/friend-request beeps.
        tryHookFunction(modAPI, "ServerAccountBeep", 3, (args, next) => {
            var _a;
            try {
                const [beep] = args;
                // Non-chat beeps (friend requests, etc.) always pass through unchanged.
                if (beep.BeepType)
                    return next(args);
                const fromNum = typeof beep.MemberNumber === "number" ? beep.MemberNumber : 0;
                const msg = typeof beep.Message === "string" ? beep.Message : "";
                if (!fromNum || !msg)
                    return next(args);
                const name = typeof beep.MemberName === "string" ? beep.MemberName : null;
                if (name)
                    cacheName(fromNum, name);
                addBeepEntry({ from: fromNum, to: (_a = Player.MemberNumber) !== null && _a !== void 0 ? _a : 0, message: msg, ts: Date.now() });
                if (!getBeepMuted()) {
                    try {
                        playBeepSound();
                    }
                    catch ( /* ignore */_b) { /* ignore */ }
                }
                try {
                    drawer === null || drawer === void 0 ? void 0 : drawer.onIncomingBeep(fromNum);
                }
                catch ( /* ignore */_c) { /* ignore */ }
                // Suppress BC's native chat-log notification when our IM handles it.
                if (getSuppressNativeBeep())
                    return;
            }
            catch ( /* ignore */_d) { /* ignore */ }
            return next(args);
        });
        // Cache friend names whenever BC notifies us a friend came online.
        // FriendListBeep is a real BC global called with {MemberNumber, MemberName, ...}.
        tryHookFunction(modAPI, "FriendListBeep", 1, (args, next) => {
            try {
                const [data] = args;
                const num = typeof data.MemberNumber === "number" ? data.MemberNumber : 0;
                const name = typeof data.MemberName === "string" ? data.MemberName : null;
                if (num && name)
                    cacheName(num, name);
            }
            catch ( /* ignore */_a) { /* ignore */ }
            return next(args);
        });
        // Track which friends BC considers online (not just in our room).
        // AccountQueryResult is a socket event, not a patchable global.
        try {
            const socket2 = window.ServerSocket;
            socket2 === null || socket2 === void 0 ? void 0 : socket2.on("AccountQueryResult", (raw) => {
                try {
                    const data = raw;
                    if (data.Query !== "OnlineFriends")
                        return;
                    const results = data.Result;
                    if (!Array.isArray(results))
                        return;
                    for (const r of results) {
                        const n = typeof r.MemberNumber === "number" ? r.MemberNumber : 0;
                        const name = typeof r.MemberName === "string" ? r.MemberName : null;
                        if (n && name)
                            cacheName(n, name);
                    }
                    updateOnlineFriends(results);
                }
                catch ( /* ignore */_a) { /* ignore */ }
            });
        }
        catch ( /* ignore */_a) { /* ignore */ }
        modAPI.hookFunction("ChatRoomKeyDown", 10, (args, next) => {
            try {
                if (typeof KeyPress !== "undefined" && KeyPress === 13) {
                    const input = document.getElementById("InputChat");
                    if (input && (handleMetaCommand(input.value) || handleOutfitCommand(input.value) || handlePoseComboCommand(input.value) || handleSceneCommand(input.value) || handleDomCommand(input.value))) {
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
                if (input && (handleMetaCommand(input.value) || handleOutfitCommand(input.value) || handlePoseComboCommand(input.value) || handleSceneCommand(input.value) || handleDomCommand(input.value))) {
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
        catch (_b) {
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
