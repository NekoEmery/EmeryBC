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
    ServerPlayerExtensionSettingsSync("EmeryBC");
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

const PANEL_W          = 650;
const OUTFITS_PER_PAGE = 5;
const ROW_H            = 62;
const LIST_Y           = 180;
const ADD_Y            = LIST_Y + OUTFITS_PER_PAGE * ROW_H + 20;

let settingsPage         = 0;
let addIncludeRestraints = false;

function ensureInputs(): void {
    if (!document.getElementById("EmeryOF_Cmd"))
        ElementCreateInput("EmeryOF_Cmd",      "text", "", "20");
    if (!document.getElementById("EmeryOF_Name"))
        ElementCreateInput("EmeryOF_Name",     "text", "", "40");
    if (!document.getElementById("EmeryOF_Announce"))
        ElementCreateInput("EmeryOF_Announce", "text", "changes into her outfit", "120");
}

export function outfitSettingsLoad(): void {
    settingsPage = 0;
    addIncludeRestraints = false;
}

export function outfitSettingsRun(): void {
    DrawRect(0, 60, PANEL_W, 940, "#130920");
    DrawText("Outfit Commands", PANEL_W / 2, 95, "White");

    // Hint
    DrawRect(0, 108, PANEL_W, 1, "#3a2a5a");
    DrawText("Dress up → Save Current to capture.  Type /command in chat to load.",
        PANEL_W / 2, 125, "#9966cc");
    DrawRect(0, 138, PANEL_W, 1, "#3a2a5a");

    ensureInputs();

    const outfits    = getOutfits();
    const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
    const page       = Math.min(settingsPage, totalPages - 1);
    const visible    = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);

    // Page nav
    DrawButton(20,  152, 80, 28, "◀ Prev", page > 0 ? "#3a2a5a" : "#1a0d2a", "", "", page === 0);
    DrawText(`${page + 1} / ${totalPages}`, PANEL_W / 2, 166, "#666688");
    DrawButton(550, 152, 80, 28, "Next ▶", page < totalPages - 1 ? "#3a2a5a" : "#1a0d2a", "", "", page >= totalPages - 1);

    // Outfit rows
    for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
        const outfit = visible[i];
        const y      = LIST_Y + i * ROW_H;
        const shade  = i % 2 === 0 ? "#1a0d30" : "#160a28";

        DrawRect(0, y, PANEL_W, ROW_H - 2, shade);

        if (!outfit) {
            DrawText("— empty —", PANEL_W / 2, y + ROW_H / 2 - 1, "#333355");
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
        DrawText(hasSave ? `${outfit.items.length} items` : "⚠ empty",
            472, y + 29, hasSave ? "#558855" : "#cc6622");

        // Buttons
        DrawButton(520, y + 8, 58, 22, "Update", "#1a3a1a", "", "Save current appearance");
        DrawButton(520, y + 34, 58, 22, "Delete", "#3a1010");

        DrawRect(0, y + ROW_H - 2, PANEL_W, 2, "#2a1a4a");
    }

    // ── Add New ───────────────────────────────────────────────────────────────
    DrawRect(0, ADD_Y - 2, PANEL_W, 2, "#4a2a7a");
    DrawText("Add New Outfit", 160, ADD_Y + 22, "#c084fc");

    // Row 1: command + name
    DrawText("/",       24, ADD_Y + 60, "#7c5cbf");
    ElementPosition("EmeryOF_Cmd",       60, ADD_Y + 60, 130, 36);
    DrawText("Name:", 220, ADD_Y + 60, "#aaaaaa");
    ElementPosition("EmeryOF_Name",     280, ADD_Y + 60, 220, 36);
    DrawText("Restraints:", 24, ADD_Y + 108, "#aaaaaa");
    DrawButton(120, ADD_Y + 90, 36, 36,
        addIncludeRestraints ? "✓" : "",
        addIncludeRestraints ? "#6a1a1a" : "#2a1a3a");

    // Row 2: announce
    DrawText("/me", 24, ADD_Y + 155, "#7c5cbf");
    ElementPosition("EmeryOF_Announce", 70, ADD_Y + 155, 480, 36);

    // Save button
    DrawButton(20, ADD_Y + 205, PANEL_W - 40, 50, "+ Save Current Appearance as New Outfit", "#1a4a1a");
}

export function outfitSettingsClick(): void {
    const outfits    = getOutfits();
    const totalPages = Math.max(1, Math.ceil(outfits.length / OUTFITS_PER_PAGE));
    const page       = Math.min(settingsPage, totalPages - 1);
    const visible    = outfits.slice(page * OUTFITS_PER_PAGE, (page + 1) * OUTFITS_PER_PAGE);

    if (mouseInRect(20, 152, 80, 28))  { settingsPage = Math.max(0, page - 1); return; }
    if (mouseInRect(550, 152, 80, 28)) { settingsPage = Math.min(totalPages - 1, page + 1); return; }

    for (let i = 0; i < OUTFITS_PER_PAGE; i++) {
        const outfit = visible[i];
        if (!outfit) continue;
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
            settingsPage = Math.min(settingsPage,
                Math.max(0, Math.ceil((outfits.length - 1) / OUTFITS_PER_PAGE) - 1));
            return;
        }
    }

    // Restraints toggle
    if (mouseInRect(120, ADD_Y + 90, 36, 36)) { addIncludeRestraints = !addIncludeRestraints; return; }

    // Add new
    if (mouseInRect(20, ADD_Y + 205, PANEL_W - 40, 50)) {
        const cmd      = ElementValue("EmeryOF_Cmd").trim().replace(/\s+/g, "").toLowerCase();
        const name     = ElementValue("EmeryOF_Name").trim();
        const announce = ElementValue("EmeryOF_Announce").trim();

        if (!cmd)  { localNotice("Command cannot be empty.", "#ff6666"); return; }
        if (!name) { localNotice("Name cannot be empty.",    "#ff6666"); return; }
        if (outfits.some(o => o.command.toLowerCase() === cmd)) {
            localNotice(`"/${cmd}" already exists.`, "#ff6666"); return;
        }

        const newOutfit: ConfiguredOutfit = {
            id: uid(), command: cmd, displayName: name,
            announceText:      announce || "changes outfit",
            includeRestraints: addIncludeRestraints,
            items:             captureAppearance(addIncludeRestraints),
        };
        saveOutfits([...outfits, newOutfit]);

        (document.getElementById("EmeryOF_Cmd")      as HTMLInputElement).value = "";
        (document.getElementById("EmeryOF_Name")     as HTMLInputElement).value = "";
        (document.getElementById("EmeryOF_Announce") as HTMLInputElement).value = "changes into her outfit";
        addIncludeRestraints = false;

        localNotice(`Created "/${cmd}" — ${newOutfit.items.length} items saved.`);
        settingsPage = Math.floor(outfits.length / OUTFITS_PER_PAGE);
    }
}

export function outfitSettingsExit(): void {
    ElementRemove("EmeryOF_Cmd");
    ElementRemove("EmeryOF_Name");
    ElementRemove("EmeryOF_Announce");
}

function mouseInRect(x: number, y: number, w: number, h: number): boolean {
    return MouseX >= x && MouseX <= x + w && MouseY >= y && MouseY <= y + h;
}
