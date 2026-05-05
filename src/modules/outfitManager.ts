import {
    CONTENT_LEFT,
    CONTENT_RIGHT,
    UI,
    drawCard,
    drawChromeButton,
    drawInsetLabel,
    drawPill,
    drawSettingsScaffold,
    mouseInRect,
    styleInput,
} from "./ui";

export interface SerializedItem {
    Group: string;
    Name: string;
    Color: string | string[] | undefined;
    Difficulty: number | undefined;
    Property: Record<string, unknown> | undefined;
    Craft: CraftingItem | undefined;
}

export interface ConfiguredOutfit {
    id: string;
    command: string;
    displayName: string;
    announceText: string;
    includeRestraints: boolean;
    items: SerializedItem[];
}

const RESTRAINT_GROUPS = new Set([
    "ItemArms", "ItemHands", "ItemLegs", "ItemFeet", "ItemBoots",
    "ItemMouth", "ItemMouthAccessory", "ItemHead", "ItemHood",
    "ItemNeck", "ItemNeckAccessories", "ItemNeckRestraints",
    "ItemPelvis", "ItemVulva", "ItemButt", "ItemBreast", "ItemNipples",
    "ItemTorso", "ItemTorso2", "ItemEars", "ItemNose", "ItemMisc",
]);

const OUTFITS_PER_PAGE = 4;
const NAV_Y       = 216;
const LIST_Y      = 270;
const ROW_H       = 86;
const LIST_LEFT   = CONTENT_LEFT;
const LIST_WIDTH  = 538;
const LIST_BTN_W  = 68;
const EDITOR_GAP  = 18;
const EDITOR_LEFT = LIST_LEFT + LIST_WIDTH + EDITOR_GAP;
const EDITOR_WIDTH = CONTENT_RIGHT - EDITOR_LEFT;
const EDITOR_TOP  = NAV_Y;
const EDITOR_HEIGHT = 660;

let settingsPage = 0;
let addIncludeRestraints = false;
let editingOutfitId: string | null = null;
const MAX_SERIALIZE_DEPTH = 12;
let outfitApplyPending = false;
let refreshScheduled = false;
let cachedOutfits: ConfiguredOutfit[] | null = null;

function placeInput(id: string, left: number, y: number, width: number, height: number): void {
    ElementPosition(id, left + width / 2, y + height / 2, width, height);
}

function getAddon(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) {
        Player.ExtensionSettings.EmeryBC = {};
    }
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

function loadOutfitsFromSettings(): ConfiguredOutfit[] {
    const list = getAddon().outfits;
    const outfits = Array.isArray(list) ? (list as ConfiguredOutfit[]).map(sanitizeOutfit) : [];
    cachedOutfits = outfits;
    return outfits;
}

export function getOutfits(): ConfiguredOutfit[] {
    return cachedOutfits ?? loadOutfitsFromSettings();
}

function saveOutfits(list: ConfiguredOutfit[]): void {
    const sanitized = list.map(sanitizeOutfit);
    cachedOutfits = sanitized;
    getAddon().outfits = sanitized;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

function uid(): string {
    return Math.random().toString(36).slice(2, 9);
}

function sanitizeSerializable(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
    if (value == null) return value;
    if (depth > MAX_SERIALIZE_DEPTH) return undefined;

    const valueType = typeof value;
    if (valueType === "string" || valueType === "number" || valueType === "boolean") {
        return value;
    }

    if (Array.isArray(value)) {
        return value
            .map(entry => sanitizeSerializable(entry, seen, depth + 1))
            .filter(entry => entry !== undefined);
    }

    if (valueType !== "object") return undefined;

    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return undefined;
    seen.add(obj);

    const proto = Object.getPrototypeOf(obj);
    if (proto !== Object.prototype && proto !== null) {
        seen.delete(obj);
        return undefined;
    }

    const clone: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(obj)) {
        const sanitized = sanitizeSerializable(entry, seen, depth + 1);
        if (sanitized !== undefined) {
            clone[key] = sanitized;
        }
    }

    seen.delete(obj);
    return clone;
}

function sanitizeColor(color: SerializedItem["Color"]): SerializedItem["Color"] {
    if (typeof color === "string") return color;
    if (Array.isArray(color)) {
        return color.filter((entry): entry is string => typeof entry === "string");
    }
    return undefined;
}

function sanitizeCraft(craft: CraftingItem | undefined): CraftingItem | undefined {
    const sanitized = sanitizeSerializable(craft);
    return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
        ? sanitized as CraftingItem
        : undefined;
}

function sanitizeProperty(property: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    const sanitized = sanitizeSerializable(property);
    return sanitized && typeof sanitized === "object" && !Array.isArray(sanitized)
        ? sanitized as Record<string, unknown>
        : undefined;
}

function sanitizeItem(item: SerializedItem): SerializedItem {
    return {
        Group: item.Group,
        Name: item.Name,
        Color: sanitizeColor(item.Color),
        Difficulty: typeof item.Difficulty === "number" ? item.Difficulty : undefined,
        Property: sanitizeProperty(item.Property),
        Craft: sanitizeCraft(item.Craft),
    };
}

function sanitizeOutfit(outfit: ConfiguredOutfit): ConfiguredOutfit {
    return {
        id: outfit.id,
        command: outfit.command,
        displayName: outfit.displayName,
        announceText: outfit.announceText,
        includeRestraints: !!outfit.includeRestraints,
        items: Array.isArray(outfit.items) ? outfit.items.map(sanitizeItem) : [],
    };
}

function sanitizeLiveAppearance(): void {
    for (const item of Player.Appearance) {
        item.Color = sanitizeColor(item.Color);
        item.Property = sanitizeProperty(item.Property);
        item.Craft = sanitizeCraft(item.Craft);
    }
}

function cloneAppearanceItem(item: Item): Item | null {
    const asset = AssetGet(Player.AssetFamily, item.Asset.Group.Name, item.Asset.Name);
    if (!asset) return null;
    return {
        Asset: asset,
        Color: sanitizeColor(item.Color),
        Difficulty: typeof item.Difficulty === "number" ? item.Difficulty : undefined,
        Property: sanitizeProperty(item.Property),
        Craft: sanitizeCraft(item.Craft),
    };
}

function buildAppearanceItem(saved: SerializedItem): Item | null {
    const asset = AssetGet(Player.AssetFamily, saved.Group, saved.Name);
    if (!asset) return null;

    const property = saved.Property ? { ...saved.Property } : undefined;
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
        Craft: saved.Craft ? { ...saved.Craft } : undefined,
    };
}

function sendRoomAppearanceUpdate(): void {
    if (Player.OnlineID == null) return;
    ServerSend("ChatRoomCharacterUpdate", {
        ID: Player.OnlineID,
        ActivePose: Player.ActivePose ?? null,
        Appearance: ServerAppearanceBundle(Player.Appearance),
    });
}

function scheduleAppearanceRefresh(): void {
    if (refreshScheduled) return;
    refreshScheduled = true;
    window.setTimeout(() => {
        try {
            CharacterRefresh(Player, false, false);
        } finally {
            refreshScheduled = false;
        }
    }, 0);
}

function captureAppearance(includeRestraints: boolean): SerializedItem[] {
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

function applyOutfit(outfit: ConfiguredOutfit): void {
    if (outfitApplyPending) {
        localNotice("An outfit swap is already in progress.", "#ffb7c7");
        return;
    }
    outfitApplyPending = true;

    const nextAppearance: Item[] = [];

    if (!outfit.includeRestraints) {
        for (const currentItem of Player.Appearance) {
            const group = currentItem.Asset.Group.Name;
            if (!RESTRAINT_GROUPS.has(group)) continue;
            const cloned = cloneAppearanceItem(currentItem);
            if (cloned) nextAppearance.push(cloned);
        }
    }

    for (const saved of outfit.items) {
        const built = buildAppearanceItem(saved);
        if (built) nextAppearance.push(built);
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
        } finally {
            outfitApplyPending = false;
        }
    }, 80);

    localNotice(`Loaded "${outfit.displayName}" (/${outfit.command})`);
}

export function handleOutfitCommand(inputValue: string): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;

    const command = trimmed.slice(1).toLowerCase();
    const outfit = getOutfits().find(entry => entry.command.toLowerCase() === command);
    if (!outfit) return false;

    if (!outfit.items.length) {
        localNotice(`Outfit "/${outfit.command}" has no saved appearance yet. Save it from Extensions.`, "#ffb7c7");
        return true;
    }

    applyOutfit(outfit);
    return true;
}

function localNotice(msg: string, color = UI.accent): void {
    const log = document.getElementById("TextAreaChatLog");
    if (!log) return;

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

function ensureInputs(): void {
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

function setEditorValues(command: string, name: string, announce: string, includeRestraints: boolean): void {
    const cmdInput = document.getElementById("EmeryOF_Cmd") as HTMLInputElement | null;
    const nameInput = document.getElementById("EmeryOF_Name") as HTMLInputElement | null;
    const announceInput = document.getElementById("EmeryOF_Announce") as HTMLInputElement | null;
    if (cmdInput) cmdInput.value = command;
    if (nameInput) nameInput.value = name;
    if (announceInput) announceInput.value = announce;
    addIncludeRestraints = includeRestraints;
}

function resetEditor(): void {
    editingOutfitId = null;
    setEditorValues("", "", "changes into her outfit", false);
}

function beginEditing(outfit: ConfiguredOutfit): void {
    editingOutfitId = outfit.id;
    setEditorValues(outfit.command, outfit.displayName, outfit.announceText, outfit.includeRestraints);
}

export function outfitSettingsLoad(): void {
    loadOutfitsFromSettings();
    settingsPage = 0;
    editingOutfitId = null;
    addIncludeRestraints = false;
}

export function outfitSettingsRun(): void {
    ensureInputs();

    const outfits = getOutfits();
    const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
    const page = Math.min(settingsPage, totalPages - 1);
    const visible = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);
    const editingOutfit = editingOutfitId ? outfits.find(outfit => outfit.id === editingOutfitId) ?? null : null;

    drawSettingsScaffold("Outfit Commands", "Capture a look once, then switch with a slash command.", [
        { label: "OUTFITS", value: `${outfits.length}`, tone: "accent" },
        { label: "PAGE", value: `${page + 1}/${totalPages}`, tone: "gold" },
    ]);

    drawChromeButton(LIST_LEFT, NAV_Y, 88, 30, "◀ Prev", "muted", page === 0);
    DrawText("Wardrobe", LIST_LEFT + LIST_WIDTH / 2, NAV_Y + 15, UI.textMuted);
    DrawTextFit(`${page + 1} / ${totalPages}`, LIST_LEFT + LIST_WIDTH / 2, NAV_Y + 35, 100, UI.textSoft);
    drawChromeButton(LIST_LEFT + LIST_WIDTH - 88, NAV_Y, 88, 30, "Next ▶", "muted", page >= totalPages - 1);
    DrawTextFit("Click a row to edit it. Use the row buttons to wear, update, or delete.",
        LIST_LEFT + LIST_WIDTH / 2, NAV_Y + 52, LIST_WIDTH - 20, UI.textSoft);

    for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
        const outfit = visible[i];
        const y = LIST_Y + i * ROW_H;
        const isEditing = editingOutfitId === outfit?.id;

        drawCard(LIST_LEFT, y, LIST_WIDTH, ROW_H - 8, i % 2 === 0 ? "default" : "alt");
        if (isEditing) {
            DrawEmptyRect(LIST_LEFT - 1, y - 1, LIST_WIDTH + 2, ROW_H - 6, UI.accent, 2);
        }

        if (!outfit) {
            DrawText("Empty slot", LIST_LEFT + LIST_WIDTH / 2, y + ROW_H / 2 - 8, UI.textMuted);
            DrawTextFit("Create an outfit using the editor on the right.",
                LIST_LEFT + LIST_WIDTH / 2, y + ROW_H / 2 + 14, LIST_WIDTH - 40, UI.textSoft);
            continue;
        }

        // Button x positions (right-aligned within the row)
        const btnDel    = LIST_LEFT + LIST_WIDTH - LIST_BTN_W - 6;
        const btnUpdate = btnDel - LIST_BTN_W - 6;
        const btnWear   = btnUpdate - LIST_BTN_W - 6;
        const textRight = btnWear - 12;                       // text can go up to here
        const textW     = textRight - LIST_LEFT - 28;         // available text width

        const hasSave = outfit.items.length > 0;

        // Top row: pill + name + buttons
        drawPill(LIST_LEFT + 10, y + 12, 96, 22, `/${outfit.command}`, UI.accentSoft, UI.accent);
        DrawTextFit(outfit.displayName, LIST_LEFT + 120 + textW / 2 - 20, y + 23, textW - 110, UI.text);
        drawChromeButton(btnWear,   y + 10, LIST_BTN_W, 28, "Wear",   "accent");
        drawChromeButton(btnUpdate, y + 10, LIST_BTN_W, 28, "Update", "success", false, "Save current appearance");
        drawChromeButton(btnDel,    y + 10, LIST_BTN_W, 28, "Delete", "danger");

        // Bottom row: item count chip + restraint label + announce text
        const chipLabel = hasSave ? `${outfit.items.length} items` : "⚠ empty";
        const chipColor = hasSave ? UI.success : UI.gold;
        DrawTextFit(chipLabel, LIST_LEFT + 14 + 46, y + 52, 90, chipColor);
        DrawTextFit(outfit.includeRestraints ? "· incl. restraints" : "· clothes only",
            LIST_LEFT + 116 + 72, y + 52, 140, outfit.includeRestraints ? UI.danger : UI.textMuted);
        DrawTextFit(`/me ${outfit.announceText}`,
            LIST_LEFT + 270 + (textRight - LIST_LEFT - 270) / 2, y + 52,
            textRight - LIST_LEFT - 270, UI.textSoft);
    }

    drawCard(EDITOR_LEFT, EDITOR_TOP, EDITOR_WIDTH, EDITOR_HEIGHT, "muted");
    DrawText(editingOutfit ? "Outfit Editor" : "New Outfit Builder", EDITOR_LEFT + 104, EDITOR_TOP + 24, UI.text);
    DrawTextFit(
        editingOutfit
            ? `Editing /${editingOutfit.command}. Save settings here, or refresh its saved look with Update or Save Current Look.`
            : "Dress your character first, then capture that look here into a reusable slash command.",
        EDITOR_LEFT + EDITOR_WIDTH / 2,
        EDITOR_TOP + 24,
        EDITOR_WIDTH - 150,
        UI.textSoft
    );

    drawPill(
        EDITOR_LEFT + 18,
        EDITOR_TOP + 44,
        EDITOR_WIDTH - 36,
        22,
        editingOutfit ? `Currently editing: /${editingOutfit.command}` : "No outfit selected yet",
        UI.cardMuted,
        editingOutfit ? UI.accent : UI.textMuted
    );

    DrawTextFit("Command", EDITOR_LEFT + 90, EDITOR_TOP + 94, 140, UI.textSoft);
    DrawText("/", EDITOR_LEFT + 30, EDITOR_TOP + 126, UI.accent);
    placeInput("EmeryOF_Cmd", EDITOR_LEFT + 56, EDITOR_TOP + 108, 150, 34);

    DrawTextFit("Display Name", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 160, 180, UI.textSoft);
    placeInput("EmeryOF_Name", EDITOR_LEFT + 18, EDITOR_TOP + 174, EDITOR_WIDTH - 36, 36);

    DrawTextFit("Restraint Mode", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 228, 180, UI.textSoft);
    drawChromeButton(
        EDITOR_LEFT + 18,
        EDITOR_TOP + 242,
        EDITOR_WIDTH - 36,
        34,
        addIncludeRestraints ? "Include restraints in the saved outfit" : "Save clothing only and preserve restraints",
        addIncludeRestraints ? "danger" : "success"
    );

    DrawTextFit("Announce Text", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 306, 180, UI.textSoft);
    DrawText("/me", EDITOR_LEFT + 30, EDITOR_TOP + 338, UI.accent);
    placeInput("EmeryOF_Announce", EDITOR_LEFT + 60, EDITOR_TOP + 320, EDITOR_WIDTH - 78, 36);

    drawCard(EDITOR_LEFT + 18, EDITOR_TOP + 384, EDITOR_WIDTH - 36, 128, "default");
    DrawText("Quick Actions", EDITOR_LEFT + 96, EDITOR_TOP + 408, UI.text);
    DrawTextFit("These buttons either save the command settings or capture the look your character is currently wearing.", EDITOR_LEFT + EDITOR_WIDTH / 2, EDITOR_TOP + 408, EDITOR_WIDTH - 90, UI.textSoft);
    drawChromeButton(EDITOR_LEFT + 28, EDITOR_TOP + 434, EDITOR_WIDTH - 56, 36, editingOutfit ? "Save Outfit Settings" : "Create New Outfit From Current Look", "success");
    drawChromeButton(EDITOR_LEFT + 28, EDITOR_TOP + 476, EDITOR_WIDTH - 56, 30, editingOutfit ? "Save Current Look Into This Outfit" : "Capture Current Look Preview", editingOutfit ? "accent" : "muted", !editingOutfit);

    // Notes — large readable lines, no cramped card
    const notesY = EDITOR_TOP + 528;
    DrawRect(EDITOR_LEFT + 18, notesY, EDITOR_WIDTH - 36, 1, UI.panelEdge);
    DrawTextFit("How to use", EDITOR_LEFT + EDITOR_WIDTH / 2, notesY + 18, EDITOR_WIDTH - 36, UI.textMuted);
    DrawTextFit("→  Click a row on the left to open it here for editing.",
        EDITOR_LEFT + EDITOR_WIDTH / 2, notesY + 40, EDITOR_WIDTH - 36, UI.textSoft);
    DrawTextFit("→  Wear applies the outfit to your character right now.",
        EDITOR_LEFT + EDITOR_WIDTH / 2, notesY + 62, EDITOR_WIDTH - 36, UI.textSoft);
    DrawTextFit("→  Update replaces the saved look with what you're wearing.",
        EDITOR_LEFT + EDITOR_WIDTH / 2, notesY + 84, EDITOR_WIDTH - 36, UI.textSoft);
    DrawTextFit("→  Announce text is sent as a /me emote when you load the outfit.",
        EDITOR_LEFT + EDITOR_WIDTH / 2, notesY + 106, EDITOR_WIDTH - 36, UI.textSoft);
    if (editingOutfit) {
        drawChromeButton(EDITOR_LEFT + 28, notesY + 124, EDITOR_WIDTH - 56, 32, "Cancel Edit", "muted");
    }
}

export function outfitSettingsClick(): void {
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

    for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
        const outfit = visible[i];
        if (!outfit) continue;

        const y = LIST_Y + i * ROW_H;
        const btnDel    = LIST_LEFT + LIST_WIDTH - LIST_BTN_W - 6;
        const btnUpdate = btnDel - LIST_BTN_W - 6;
        const btnWear   = btnUpdate - LIST_BTN_W - 6;

        if (mouseInRect(btnWear, y + 10, LIST_BTN_W, 28)) {
            applyOutfit(outfit);
            return;
        }

        if (mouseInRect(btnUpdate, y + 10, LIST_BTN_W, 28)) {
            const idx = outfits.indexOf(outfit);
            outfits[idx].items = captureAppearance(outfit.includeRestraints);
            saveOutfits(outfits);
            localNotice(`Updated "/${outfit.command}"`);
            return;
        }

        if (mouseInRect(btnDel, y + 10, LIST_BTN_W, 28)) {
            saveOutfits(outfits.filter(entry => entry.id !== outfit.id));
            if (editingOutfitId === outfit.id) {
                resetEditor();
            }
            settingsPage = Math.min(
                settingsPage,
                Math.max(0, Math.ceil((outfits.length - 1) / OUTFITS_PER_PAGE) - 1)
            );
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
            outfits[idx] = {
                ...outfits[idx],
                command: cmd,
                displayName: name,
                announceText: announce || "changes outfit",
                includeRestraints: addIncludeRestraints,
            };
            saveOutfits(outfits);
            localNotice(`Updated /${cmd} settings.`);
            resetEditor();
            return;
        }

        const newOutfit: ConfiguredOutfit = {
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

export function outfitSettingsExit(): void {
    editingOutfitId = null;
    ElementRemove("EmeryOF_Cmd");
    ElementRemove("EmeryOF_Name");
    ElementRemove("EmeryOF_Announce");
}
