import { UI } from "./ui";

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

const MAX_SERIALIZE_DEPTH = 12;
let outfitApplyPending = false;
let refreshScheduled = false;
let cachedOutfits: ConfiguredOutfit[] | null = null;

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

export function applyOutfit(outfit: ConfiguredOutfit): void {
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
                ServerSend("ChatRoomChat", {
                    Type: "Action",
                    Content: "EBCAnnounce",
                    Dictionary: [
                        { Tag: "EBCAnnounce", Text: "{SourceCharacter} " + outfit.announceText.trim() },
                        { SourceCharacter: Player.MemberNumber },
                    ],
                });
            }
        } finally {
            outfitApplyPending = false;
        }
    }, 80);

    localNotice(`Loaded "${outfit.displayName}" (/${outfit.command})`);
}

// Called from the drawer to snapshot current appearance into an existing outfit slot
export function saveCurrentAppearanceToOutfit(id: string): boolean {
    const outfits = getOutfits();
    const outfit = outfits.find(o => o.id === id);
    if (!outfit) return false;
    outfit.items = captureAppearance(outfit.includeRestraints);
    saveOutfits(outfits);
    localNotice(`Saved current look to "${outfit.displayName}".`);
    return true;
}

// Called from the drawer to create a brand new outfit from current appearance
export function createOutfitFromCurrent(
    command: string,
    displayName: string,
    announceText: string,
    includeRestraints: boolean
): ConfiguredOutfit | null {
    const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
    if (!cmd || !displayName.trim()) return null;
    // Block duplicate commands
    if (getOutfits().some(o => o.command === cmd)) {
        localNotice(`Command "/${cmd}" is already used by another outfit.`, "#ffb7c7");
        return null;
    }
    const outfit: ConfiguredOutfit = {
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

export function handleOutfitCommand(inputValue: string): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;

    const command = trimmed.slice(1).toLowerCase();
    const outfit = getOutfits().find(entry => entry.command.toLowerCase() === command);
    if (!outfit) return false;

    if (!outfit.items.length) {
        localNotice(`Outfit "/${outfit.command}" has no saved appearance yet. Use the EBC drawer to save it.`, "#ffb7c7");
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
        "font-size:12px",
        "padding:2px 8px",
        "margin:1px 0",
    ].join(";");
    div.textContent = `[EmeryBC] ${msg}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

export function deleteOutfit(id: string): void {
    const outfits = getOutfits().filter(o => o.id !== id);
    saveOutfits(outfits);
}
