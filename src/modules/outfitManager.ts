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
const ROW_H = 78;
const NAV_Y = 198;
const LIST_Y = 238;
const ADD_Y = LIST_Y + OUTFITS_PER_PAGE * ROW_H + 18;

let settingsPage = 0;
let addIncludeRestraints = false;

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

function captureAppearance(includeRestraints: boolean): SerializedItem[] {
    return Player.Appearance
        .filter(item => includeRestraints || !RESTRAINT_GROUPS.has(item.Asset.Group.Name))
        .map(item => ({
            Group: item.Asset.Group.Name,
            Name: item.Asset.Name,
            Color: item.Color,
            Difficulty: item.Difficulty,
            Property: item.Property ? { ...item.Property } : undefined,
            Craft: item.Craft ? { ...item.Craft } : undefined,
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
        const asset = AssetGet(Player.AssetFamily, saved.Group, saved.Name);
        if (!asset) continue;

        InventoryWear(
            Player,
            saved.Name,
            saved.Group,
            saved.Color,
            saved.Difficulty,
            undefined,
            saved.Craft
        );

        if (saved.Property) {
            const worn = InventoryGet(Player, saved.Group);
            if (worn) {
                const prop = { ...saved.Property };
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

export function outfitSettingsLoad(): void {
    settingsPage = 0;
    addIncludeRestraints = false;
}

export function outfitSettingsRun(): void {
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
        drawPill(
            364,
            y + 16,
            108,
            22,
            outfit.includeRestraints ? "Includes restraints" : "Clothes only",
            outfit.includeRestraints ? UI.dangerDeep : UI.successDeep,
            outfit.includeRestraints ? UI.danger : UI.success
        );
        drawPill(
            364,
            y + 42,
            108,
            18,
            hasSave ? `${outfit.items.length} items saved` : "No save data",
            hasSave ? UI.successDeep : UI.buttonMuted,
            hasSave ? UI.success : UI.textMuted
        );
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
    drawChromeButton(
        458,
        ADD_Y + 74,
        144,
        34,
        addIncludeRestraints ? "Include restraints" : "Clothes only",
        addIncludeRestraints ? "danger" : "success"
    );

    drawInsetLabel("Announce Text", 132, ADD_Y + 128);
    DrawText("/me", 52, ADD_Y + 164, UI.accent);
    ElementPosition("EmeryOF_Announce", 325, ADD_Y + 164, 520, 38);

    drawChromeButton(44, ADD_Y + 206, PANEL_W - 88, 42, "Save Current Appearance as New Outfit", "success");
}

export function outfitSettingsClick(): void {
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
        if (!outfit) continue;

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
            settingsPage = Math.min(
                settingsPage,
                Math.max(0, Math.ceil((outfits.length - 1) / OUTFITS_PER_PAGE) - 1)
            );
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

        const newOutfit: ConfiguredOutfit = {
            id: uid(),
            command: cmd,
            displayName: name,
            announceText: announce || "changes outfit",
            includeRestraints: addIncludeRestraints,
            items: captureAppearance(addIncludeRestraints),
        };

        saveOutfits([...outfits, newOutfit]);
        (document.getElementById("EmeryOF_Cmd") as HTMLInputElement).value = "";
        (document.getElementById("EmeryOF_Name") as HTMLInputElement).value = "";
        (document.getElementById("EmeryOF_Announce") as HTMLInputElement).value = "changes into her outfit";
        addIncludeRestraints = false;
        settingsPage = Math.floor(outfits.length / OUTFITS_PER_PAGE);
        localNotice(`Created "/${cmd}" - ${newOutfit.items.length} items saved.`);
    }
}

export function outfitSettingsExit(): void {
    ElementRemove("EmeryOF_Cmd");
    ElementRemove("EmeryOF_Name");
    ElementRemove("EmeryOF_Announce");
}
