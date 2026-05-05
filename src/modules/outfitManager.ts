// Outfit manager — commands are configured in the extensions settings tab.
// Each outfit gets a custom slash command, e.g. /dom /sub /comfy
// Restraint saving is per-outfit (toggled in settings).

export interface SerializedItem {
    Group:      string;
    Name:       string;
    Color:      string | string[] | undefined;
    Difficulty: number | undefined;
    Property:   Record<string, unknown> | undefined;
    Craft:      CraftingItem | undefined;
}

export interface ConfiguredOutfit {
    id:               string;   // random stable ID
    command:          string;   // e.g. "dom" (user types /dom)
    displayName:      string;   // e.g. "Dom Clothes"
    announceText:     string;   // emote sent when loaded
    includeRestraints: boolean;
    items:            SerializedItem[];
}

const RESTRAINT_GROUPS = new Set([
    "ItemArms", "ItemHands", "ItemLegs", "ItemFeet", "ItemBoots",
    "ItemMouth", "ItemMouthAccessory", "ItemHead", "ItemHood",
    "ItemNeck", "ItemNeckAccessories", "ItemNeckRestraints",
    "ItemPelvis", "ItemVulva", "ItemButt", "ItemBreast", "ItemNipples",
    "ItemTorso", "ItemTorso2", "ItemEars", "ItemNose", "ItemMisc",
]);

// ─── Storage ─────────────────────────────────────────────────────────────────

function getAddon(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) {
        Player.ExtensionSettings.EmeryBC = {};
    }
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

export function getOutfits(): ConfiguredOutfit[] {
    const list = getAddon().outfits;
    return Array.isArray(list) ? (list as ConfiguredOutfit[]) : [];
}

function saveOutfits(list: ConfiguredOutfit[]): void {
    getAddon().outfits = list;
    ServerSend("AccountUpdate", { ExtensionSettings: Player.ExtensionSettings });
}

function uid(): string {
    return Math.random().toString(36).slice(2, 9);
}

// ─── Serialisation ────────────────────────────────────────────────────────────

function captureAppearance(includeRestraints: boolean): SerializedItem[] {
    return Player.Appearance
        .filter(item => includeRestraints || !RESTRAINT_GROUPS.has(item.Asset.Group.Name))
        .map(item => ({
            Group:      item.Asset.Group.Name,
            Name:       item.Asset.Name,
            Color:      item.Color,
            Difficulty: item.Difficulty,
            Property:   item.Property ? { ...item.Property } : undefined,
            Craft:      item.Craft    ? { ...item.Craft }    : undefined,
        }));
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function applyOutfit(outfit: ConfiguredOutfit): void {
    // Remove current items — keep locked restraints we didn't save
    for (const item of [...Player.Appearance]) {
        const group     = item.Asset.Group.Name;
        const isLocked  = !!(item.Property?.LockedBy);
        if (RESTRAINT_GROUPS.has(group) && !outfit.includeRestraints) continue;
        if (isLocked && !outfit.includeRestraints) continue;
        InventoryRemove(Player, group, false);
    }

    for (const saved of outfit.items) {
        const asset = AssetGet(Player.AssetFamily, saved.Group, saved.Name);
        if (!asset) continue;

        InventoryWear(
            Player, saved.Name, saved.Group,
            saved.Color, saved.Difficulty, undefined, saved.Craft
        );

        if (saved.Property) {
            const worn = InventoryGet(Player, saved.Group);
            if (worn) {
                const prop = { ...saved.Property };
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

    if (outfit.announceText?.trim()) {
        ServerSend("ChatRoomChat", { Content: outfit.announceText.trim(), Type: "Emote" });
    }

    localNotice(`Loaded "${outfit.displayName}" (/${outfit.command})`);
}

// ─── Command hook (called from main) ─────────────────────────────────────────

export function handleOutfitCommand(inputValue: string): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;
    const cmd = trimmed.slice(1).toLowerCase();
    const outfit = getOutfits().find(o => o.command.toLowerCase() === cmd);
    if (!outfit) return false;
    if (!outfit.items.length) {
        localNotice(`Outfit "/${outfit.command}" has no saved appearance yet — open Extensions > EmeryBC to save it.`);
        return true;
    }
    applyOutfit(outfit);
    return true;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

function localNotice(msg: string, color = "#c084fc"): void {
    const log = document.getElementById("TextAreaChatLog");
    if (!log) return;
    const div = document.createElement("div");
    div.style.cssText = `color:${color};font-style:italic;padding:2px 4px;`;
    div.textContent = `[EmeryBC] ${msg}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

// ─── Settings screen ─────────────────────────────────────────────────────────

let settingsPage        = 0;
let addIncludeRestraints = false;
const OUTFITS_PER_PAGE  = 4;
const ROW_H             = 100;
const LIST_START_Y      = 175;
const ADD_Y             = 635;

const INPUT_IDS = ["EmeryOF_Cmd", "EmeryOF_Name", "EmeryOF_Announce"] as const;

function ensureInputs(): void {
    if (!document.getElementById("EmeryOF_Cmd")) {
        ElementCreateInput("EmeryOF_Cmd",     "text", "",               "20");
        ElementCreateInput("EmeryOF_Name",    "text", "",               "40");
        ElementCreateInput("EmeryOF_Announce","text", "*changes outfit*","120");
    }
}

export function outfitSettingsRun(): void {
    DrawRect(0, 60, 1000, 940, "#1a0a2e");
    DrawText("Outfit Commands", 500, 105, "White", "Black");

    // How-to hint bar
    DrawRect(55, 112, 890, 22, "#1a0a3a");
    DrawText(
        "Set a command below, dress up, then click Save Current.  Type /command in chat to switch outfits.",
        500, 123, "#8866aa"
    );

    ensureInputs();

    const outfits   = getOutfits();
    const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
    const page       = Math.min(settingsPage, totalPages - 1);
    const visible    = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);

    // Page nav
    DrawButton( 60, 135, 100, 38, "◀ Prev", page > 0 ? "#3a2a5a" : "#1f1435", "", "", page === 0);
    DrawText(`${page + 1} / ${totalPages}`, 500, 154, "#888888");
    DrawButton(840, 135, 100, 38, "Next ▶", page < totalPages - 1 ? "#3a2a5a" : "#1f1435", "", "", page >= totalPages - 1);

    // Column headers
    DrawText("Command",  160, 167, "#7c5cbf");
    DrawText("Name",     350, 167, "#7c5cbf");
    DrawText("Flags",    640, 167, "#7c5cbf");

    // Outfit rows
    for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
        const outfit = visible[i];
        const y      = LIST_START_Y + i * ROW_H;

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
        DrawText(hasSave ? `${outfit.items.length} items` : "⚠ unsaved", 760, y + 31,
            hasSave ? "#668866" : "#cc6622");

        // Update button
        DrawButton(800, y + 10, 130, 38, "Save Current", "#2a5a2a", "", "Overwrite with current appearance");
        // Delete button
        DrawButton(800, y + 54, 130, 32, "Delete", "#5a1515");
    }

    // ── Add New section ──────────────────────────────────────────────────────
    DrawRect(55, ADD_Y, 890, 310, "#160d2a");
    DrawEmptyRect(55, ADD_Y, 890, 310, "#4a3a6a", 2);
    DrawText("Add New Outfit", 260, ADD_Y + 26, "#c084fc");

    DrawText("Command:",  80, ADD_Y + 70,  "#aaaaaa");
    DrawText("/",        227, ADD_Y + 70,  "#7c5cbf");
    ElementPosition("EmeryOF_Cmd",      310, ADD_Y + 70,  200, 42);

    DrawText("Name:",    540, ADD_Y + 70,  "#aaaaaa");
    ElementPosition("EmeryOF_Name",     720, ADD_Y + 70,  220, 42);

    DrawText("Include restraints:", 80, ADD_Y + 140, "#aaaaaa");
    DrawButton(290, ADD_Y + 118, 45, 45,
        addIncludeRestraints ? "✓" : "",
        addIncludeRestraints ? "#6a1a1a" : "#2a1a3a");

    DrawText("Announce text:", 80, ADD_Y + 210, "#aaaaaa");
    ElementPosition("EmeryOF_Announce", 310, ADD_Y + 210, 600, 42);

    DrawButton(280, ADD_Y + 256, 440, 50, "+ Save Current Appearance as New Outfit", "#2a5a2a");
}

export function outfitSettingsClick(): void {
    const outfits    = getOutfits();
    const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
    const page       = Math.min(settingsPage, totalPages - 1);
    const visible    = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);

    // Prev / Next
    if (mouseInRect(60, 135, 100, 38))  { settingsPage = Math.max(0, page - 1); return; }
    if (mouseInRect(840, 135, 100, 38)) { settingsPage = Math.min(totalPages - 1, page + 1); return; }

    // Outfit row buttons
    for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
        const outfit = visible[i];
        if (!outfit) continue;
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
            settingsPage = Math.min(settingsPage,
                Math.max(0, Math.ceil((outfits.length - 1) / OUTFITS_PER_PAGE) - 1));
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
        const cmd  = ElementValue("EmeryOF_Cmd").trim().replace(/\s+/g, "").toLowerCase();
        const name = ElementValue("EmeryOF_Name").trim();
        const announce = ElementValue("EmeryOF_Announce").trim();

        if (!cmd)  { localNotice("Command cannot be empty.", "#ff6666"); return; }
        if (!name) { localNotice("Name cannot be empty.",    "#ff6666"); return; }
        if (outfits.some(o => o.command.toLowerCase() === cmd)) {
            localNotice(`Command "/${cmd}" already exists.`, "#ff6666");
            return;
        }

        const newOutfit: ConfiguredOutfit = {
            id:               uid(),
            command:          cmd,
            displayName:      name,
            announceText:     announce || "*changes outfit*",
            includeRestraints: addIncludeRestraints,
            items:            captureAppearance(addIncludeRestraints),
        };
        saveOutfits([...outfits, newOutfit]);

        // Clear inputs
        (document.getElementById("EmeryOF_Cmd")     as HTMLInputElement).value = "";
        (document.getElementById("EmeryOF_Name")    as HTMLInputElement).value = "";
        (document.getElementById("EmeryOF_Announce") as HTMLInputElement).value = "*changes outfit*";
        addIncludeRestraints = false;

        localNotice(`Created "/${cmd}" with ${newOutfit.items.length} items saved.`);
        settingsPage = Math.floor(outfits.length / OUTFITS_PER_PAGE);
    }
}

export function outfitSettingsExit(): void {
    INPUT_IDS.forEach(id => ElementRemove(id));
}

function mouseInRect(x: number, y: number, w: number, h: number): boolean {
    return MouseX >= x && MouseX <= x + w && MouseY >= y && MouseY <= y + h;
}
