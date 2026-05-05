import {
    PANEL_W,
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

const OUTFITS_PER_PAGE = 5;
const ROW_H = 70;
const NAV_Y = 186;
const LIST_Y = 224;
const ADD_Y = LIST_Y + OUTFITS_PER_PAGE * ROW_H + 16;
const CARD_LEFT = 24;
const CARD_WIDTH = PANEL_W - 48;

let settingsPage = 0;
let addIncludeRestraints = false;
let editingOutfitId: string | null = null;
const MAX_SERIALIZE_DEPTH = 12;

function placeInput(id: string, left: number, y: number, width: number, height: number): void {
    ElementPosition(id, left + width / 2, y + height / 2, width, height);
}

function getAddon(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) {
        Player.ExtensionSettings.EmeryBC = {};
    }
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

export function getOutfits(): ConfiguredOutfit[] {
    const list = getAddon().outfits;
    return Array.isArray(list) ? (list as ConfiguredOutfit[]).map(sanitizeOutfit) : [];
}

function saveOutfits(list: ConfiguredOutfit[]): void {
    getAddon().outfits = list.map(sanitizeOutfit);
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
    for (const item of [...Player.Appearance]) {
        const group = item.Asset.Group.Name;
        const isLocked = !!item.Property?.LockedBy;
        if (RESTRAINT_GROUPS.has(group) && !outfit.includeRestraints) continue;
        if (isLocked && !outfit.includeRestraints) continue;
        InventoryRemove(Player, group, false);
    }

    for (const saved of outfit.items) {
        const sanitizedItem = sanitizeItem(saved);
        const asset = AssetGet(Player.AssetFamily, saved.Group, saved.Name);
        if (!asset) continue;

        InventoryWear(
            Player,
            sanitizedItem.Name,
            sanitizedItem.Group,
            sanitizedItem.Color,
            sanitizedItem.Difficulty,
            undefined,
            sanitizedItem.Craft
        );

        if (sanitizedItem.Property) {
            const worn = InventoryGet(Player, sanitizedItem.Group);
            if (worn) {
                const prop = sanitizeProperty(sanitizedItem.Property) ?? {};
                delete prop["LockedBy"];
                delete prop["LockMemberNumber"];
                delete prop["CombinationNumber"];
                delete prop["Password"];
                delete prop["MemberNumberListKeys"];
                worn.Property = prop;
            }
        }
    }

    sanitizeLiveAppearance();
    CharacterRefresh(Player, false, false);
    ChatRoomCharacterUpdate(Player);

    if (outfit.announceText.trim()) {
        ServerSend("ChatRoomChat", { Content: outfit.announceText.trim(), Type: "Emote" });
    }

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

    drawChromeButton(34, NAV_Y, 90, 28, "Prev", "muted", page === 0);
    DrawText("Wardrobe", 184, NAV_Y + 16, UI.textMuted);
    DrawText(`${page + 1} of ${totalPages}`, 320, NAV_Y + 16, UI.textSoft);
    drawChromeButton(526, NAV_Y, 90, 28, "Next", "muted", page >= totalPages - 1);
    DrawTextFit("Click an outfit row to edit its command, name, or change text.", PANEL_W / 2, NAV_Y + 40, 520, UI.textSoft);

    for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
        const outfit = visible[i];
        const y = LIST_Y + i * ROW_H;
        const isEditing = editingOutfitId === outfit?.id;

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
        drawPill(
            364,
            y + 14,
            108,
            20,
            outfit.includeRestraints ? "Includes restraints" : "Clothes only",
            outfit.includeRestraints ? UI.dangerDeep : UI.successDeep,
            outfit.includeRestraints ? UI.danger : UI.success
        );
        drawPill(
            364,
            y + 38,
            108,
            18,
            hasSave ? `${outfit.items.length} items saved` : "No save data",
            hasSave ? UI.successDeep : UI.buttonMuted,
            hasSave ? UI.success : UI.textMuted
        );
        drawChromeButton(500, y + 12, 98, 22, "Update", "success", false, "Save current appearance");
        drawChromeButton(500, y + 38, 98, 22, "Delete", "danger");
    }

    drawCard(CARD_LEFT, ADD_Y, CARD_WIDTH, 210, "muted");
    DrawText(editingOutfit ? "Edit Outfit" : "Add New Outfit", 126, ADD_Y + 22, UI.text);
    DrawTextFit(
        editingOutfit ? `Editing /${editingOutfit.command}. Update text here, and use Update on the row to resave the look.` : "Dress your character first, then save the current appearance into a command slot.",
        334,
        ADD_Y + 22,
        410,
        UI.textSoft
    );

    drawInsetLabel("Command", 96, ADD_Y + 48);
    DrawText("/", 56, ADD_Y + 80, UI.accent);
    placeInput("EmeryOF_Cmd", 82, ADD_Y + 62, 120, 34);

    drawInsetLabel("Display Name", 316, ADD_Y + 48);
    placeInput("EmeryOF_Name", 248, ADD_Y + 62, 200, 34);

    drawInsetLabel("Restraint Mode", 522, ADD_Y + 48);
    drawChromeButton(
        470,
        ADD_Y + 56,
        126,
        28,
        addIncludeRestraints ? "Include restraints" : "Clothes only",
        addIncludeRestraints ? "danger" : "success"
    );

    drawInsetLabel("Announce Text", 114, ADD_Y + 108);
    DrawText("/me", 58, ADD_Y + 138, UI.accent);
    placeInput("EmeryOF_Announce", 86, ADD_Y + 120, 470, 34);

    if (editingOutfit) {
        drawChromeButton(44, ADD_Y + 164, 152, 34, "Cancel Edit", "muted");
        drawChromeButton(210, ADD_Y + 164, PANEL_W - 254, 34, "Save Outfit Settings", "success");
    } else {
        drawChromeButton(44, ADD_Y + 164, PANEL_W - 88, 34, "Save Current Appearance as New Outfit", "success");
    }
}

export function outfitSettingsClick(): void {
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
        if (!outfit) continue;

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
            settingsPage = Math.min(
                settingsPage,
                Math.max(0, Math.ceil((outfits.length - 1) / OUTFITS_PER_PAGE) - 1)
            );
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
    }
}

export function outfitSettingsExit(): void {
    editingOutfitId = null;
    ElementRemove("EmeryOF_Cmd");
    ElementRemove("EmeryOF_Name");
    ElementRemove("EmeryOF_Announce");
}
