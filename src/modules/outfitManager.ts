import { UI } from "./ui";
import { getDisplayName } from "./actionButtons";

export interface SerializedItem {
    Group: string;
    Name: string;
    Color: string | string[] | undefined;
    Difficulty: number | undefined;
    Property: Record<string, unknown> | undefined;
    Craft: CraftingItem | undefined;
}

export interface OutfitTag {
    id: string;
    name: string;
    color: string; // chip background color, e.g. "#cf6f98"
}

export interface ConfiguredOutfit {
    id: string;
    command: string;
    displayName: string;
    announceText: string;
    nickname: string | null;     // optional nickname to set when outfit is worn (null = no change)
    tagIds: string[];
    includeRestraints: boolean;
    preserveRestraints: boolean; // keep existing restraints when applying (default: true)
    preserveClothing: boolean;   // keep existing clothing (non-restraint) when applying (default: false)
    items: SerializedItem[];
}

export const RESTRAINT_GROUPS = new Set([
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

export function getDefaultNickname(): string {
    const raw = getAddon().defaultNickname;
    return typeof raw === "string" ? raw : "";
}

export function setDefaultNickname(nick: string): void {
    getAddon().defaultNickname = nick.trim();
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

function saveOutfits(list: ConfiguredOutfit[]): void {
    const sanitized = list.map(sanitizeOutfit);
    cachedOutfits = sanitized;
    getAddon().outfits = sanitized;
    ServerPlayerExtensionSettingsSync("EmeryBC");
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
        nickname: typeof outfit.nickname === "string" ? outfit.nickname.trim() || null : null,
        tagIds: Array.isArray(outfit.tagIds) ? outfit.tagIds.filter((t: unknown) => typeof t === "string") : [],
        includeRestraints: !!outfit.includeRestraints,
        // Default true (preserve) for existing outfits that don't have this field yet
        preserveRestraints: typeof outfit.preserveRestraints === "boolean" ? outfit.preserveRestraints : true,
        // Default false — opt-in; restraints-only imports set this to true automatically
        preserveClothing: typeof outfit.preserveClothing === "boolean" ? outfit.preserveClothing : false,
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
    const outfitGroups = new Set(outfit.items.map(i => i.Group));

    // If preserveClothing is on, carry over all current non-restraint items —
    // but skip any group the outfit itself provides (no conflicts).
    if (outfit.preserveClothing) {
        for (const currentItem of Player.Appearance) {
            const group = currentItem.Asset.Group.Name;
            if (RESTRAINT_GROUPS.has(group) || outfitGroups.has(group)) continue;
            const cloned = cloneAppearanceItem(currentItem);
            if (cloned) nextAppearance.push(cloned);
        }
    }

    // If preserveRestraints is on, copy the player's current restraints across —
    // but skip any group that the outfit itself already has an item for (no conflicts).
    if (outfit.preserveRestraints) {
        for (const currentItem of Player.Appearance) {
            const group = currentItem.Asset.Group.Name;
            if (!RESTRAINT_GROUPS.has(group) || outfitGroups.has(group)) continue;
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

    // Apply nickname — outfit-specific takes priority, falls back to default
    const nickToApply = outfit.nickname || getDefaultNickname();
    if (nickToApply) {
        try {
            (Player as unknown as Record<string, unknown>).Nickname = nickToApply;
            type AccountUpdater = { QueueData(data: Record<string, unknown>): void };
            const updater = (window as unknown as Record<string, unknown>).ServerAccountUpdate as AccountUpdater | undefined;
            if (updater?.QueueData) updater.QueueData({ Nickname: nickToApply });
        } catch { /* ignore */ }
    }

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
    includeRestraints: boolean,
    preserveRestraints: boolean,
    preserveClothing = false,
    nickname = "",
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
        nickname: nickname.trim() || null,
        tagIds: [],
        includeRestraints,
        preserveRestraints,
        preserveClothing,
        items: captureAppearance(includeRestraints),
    };
    saveOutfits([...getOutfits(), outfit]);
    localNotice(`Created outfit "${outfit.displayName}" (/${outfit.command}).`);
    return outfit;
}

// Toggle preserveRestraints on a saved outfit
export function setOutfitPreserveRestraints(id: string, value: boolean): void {
    const outfits = getOutfits();
    const outfit = outfits.find(o => o.id === id);
    if (!outfit) return;
    outfit.preserveRestraints = value;
    saveOutfits(outfits);
}

// Toggle preserveClothing on a saved outfit
export function setOutfitPreserveClothing(id: string, value: boolean): void {
    const outfits = getOutfits();
    const outfit = outfits.find(o => o.id === id);
    if (!outfit) return;
    outfit.preserveClothing = value;
    saveOutfits(outfits);
}

export function getOutfitTags(): OutfitTag[] {
    const raw = getAddon().outfitTags;
    return Array.isArray(raw) ? (raw as OutfitTag[]) : [];
}

function saveOutfitTags(tags: OutfitTag[]): void {
    getAddon().outfitTags = tags;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

export function createOutfitTag(name: string, color: string): OutfitTag {
    const tag: OutfitTag = { id: uid(), name: name.trim() || "Tag", color: color || "#cf6f98" };
    saveOutfitTags([...getOutfitTags(), tag]);
    return tag;
}

export function deleteOutfitTag(tagId: string): void {
    saveOutfitTags(getOutfitTags().filter(t => t.id !== tagId));
    // Remove from all outfits
    const outfits = getOutfits().map(o => ({ ...o, tagIds: (o.tagIds ?? []).filter(id => id !== tagId) }));
    saveOutfits(outfits);
}

export function updateOutfitTag(tagId: string, name: string, color: string): void {
    const tags = getOutfitTags().map(t =>
        t.id === tagId ? { ...t, name: name.trim() || t.name, color: color || t.color } : t
    );
    saveOutfitTags(tags);
}

export function setOutfitTagIds(outfitId: string, tagIds: string[]): void {
    const outfits = getOutfits();
    const outfit = outfits.find(o => o.id === outfitId);
    if (!outfit) return;
    outfit.tagIds = tagIds;
    saveOutfits(outfits);
}

export function moveOutfit(id: string, direction: "up" | "down"): void {
    const outfits = getOutfits();
    const idx = outfits.findIndex(o => o.id === id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= outfits.length) return;
    [outfits[idx], outfits[newIdx]] = [outfits[newIdx], outfits[idx]];
    saveOutfits(outfits);
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
    div.textContent = `[EBC] ${msg}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

export function deleteOutfit(id: string): void {
    const outfits = getOutfits().filter(o => o.id !== id);
    saveOutfits(outfits);
}

export function editOutfit(
    id: string,
    command: string,
    displayName: string,
    announceText: string,
    includeRestraints: boolean,
    preserveRestraints: boolean,
    preserveClothing = false,
    nickname = "",
): boolean {
    const outfits = getOutfits();
    const outfit = outfits.find(o => o.id === id);
    if (!outfit) return false;

    const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
    if (!cmd || !displayName.trim()) return false;

    // Block duplicate commands (excluding this outfit itself)
    if (outfits.some(o => o.id !== id && o.command === cmd)) {
        localNotice(`Command "/${cmd}" is already used by another outfit.`, "#ffb7c7");
        return false;
    }

    outfit.command            = cmd;
    outfit.displayName        = displayName.trim();
    outfit.announceText       = announceText.trim();
    outfit.nickname           = nickname.trim() || null;
    outfit.includeRestraints  = includeRestraints;
    outfit.preserveRestraints = preserveRestraints;
    outfit.preserveClothing   = preserveClothing;

    saveOutfits(outfits);
    localNotice(`Updated "${outfit.displayName}" (/${outfit.command}).`);
    return true;
}

// -- Export / Import -------------------------------------------------------

export function exportOutfitById(id: string): string | null {
    const outfit = getOutfits().find(o => o.id === id);
    if (!outfit) return null;
    return JSON.stringify({ ebc: 1, type: "outfit", outfit: sanitizeOutfit(outfit) });
}

export function importOutfitFromJSON(json: string): ConfiguredOutfit {
    const data = JSON.parse(json) as Record<string, unknown>;
    if (data.ebc !== 1 || data.type !== "outfit") throw new Error("Not a valid EBC outfit export.");
    const raw = data.outfit as ConfiguredOutfit;
    if (!raw?.command || !raw?.displayName) throw new Error("Missing required outfit fields.");

    // Deduplicate command — append suffix until unique
    const existing = getOutfits();
    const baseCmd = raw.command.toLowerCase().trim().replace(/\s+/g, "");
    let finalCmd = baseCmd;
    let suffix = 2;
    while (existing.some(o => o.command === finalCmd)) finalCmd = baseCmd + suffix++;

    const outfit = sanitizeOutfit({ ...raw, id: uid(), command: finalCmd });
    saveOutfits([...existing, outfit]);
    localNotice(`Imported "${outfit.displayName}" (/${outfit.command}).`);
    return outfit;
}

// -- Outfit Schedules ---------------------------------------------------------

export interface OutfitSchedule {
    id: string;
    outfitId: string;
    time: string;   // "HH:MM" 24h
    enabled: boolean;
}

function uid(): string {
    return Math.random().toString(36).slice(2, 9);
}

export function getSchedules(): OutfitSchedule[] {
    const list = getAddon().outfitSchedules;
    return Array.isArray(list) ? (list as OutfitSchedule[]) : [];
}

function saveSchedules(schedules: OutfitSchedule[]): void {
    getAddon().outfitSchedules = schedules;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

export function addSchedule(outfitId: string, time: string): OutfitSchedule {
    const schedule: OutfitSchedule = { id: uid(), outfitId, time, enabled: true };
    saveSchedules([...getSchedules(), schedule]);
    return schedule;
}

export function removeSchedule(id: string): void {
    saveSchedules(getSchedules().filter(s => s.id !== id));
}

export function toggleSchedule(id: string): void {
    const schedules = getSchedules().map(s =>
        s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    saveSchedules(schedules);
}

// Map of scheduleId -> last-applied HH:MM to avoid re-applying in the same minute
const _lastApplied = new Map<string, string>();

export function checkAndApplySchedules(): void {
    try {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const current = `${hh}:${mm}`;

        for (const schedule of getSchedules()) {
            if (!schedule.enabled) continue;
            if (schedule.time !== current) continue;
            if (_lastApplied.get(schedule.id) === current) continue;

            const outfit = getOutfits().find(o => o.id === schedule.outfitId);
            if (!outfit) continue;

            _lastApplied.set(schedule.id, current);
            applyOutfit(outfit);
        }
    } catch { /* ignore — Player may not be ready */ }
}

export type BCImportMode = "restraints" | "outfit" | "both";

// Import an outfit from BC's native LZString-compressed appearance bundle.
// mode: "restraints" = restraint slots only (⛓)
//       "outfit"     = non-restraint clothing/body slots only
//       "both"       = entire appearance
// -- Restraint Sets -----------------------------------------------------------
let cachedRestraints: ConfiguredOutfit[] | null = null;

function loadRestraintsFromSettings(): ConfiguredOutfit[] {
    const list = getAddon().restraints;
    const restraints = Array.isArray(list) ? (list as ConfiguredOutfit[]).map(sanitizeOutfit) : [];
    cachedRestraints = restraints;
    return restraints;
}

export function getRestraints(): ConfiguredOutfit[] {
    return cachedRestraints ?? loadRestraintsFromSettings();
}

function saveRestraints(list: ConfiguredOutfit[]): void {
    const sanitized = list.map(sanitizeOutfit);
    cachedRestraints = sanitized;
    getAddon().restraints = sanitized;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

function captureRestraints(): SerializedItem[] {
    return Player.Appearance
        .filter(item => RESTRAINT_GROUPS.has(item.Asset.Group.Name))
        .map(item => sanitizeItem({
            Group: item.Asset.Group.Name,
            Name: item.Asset.Name,
            Color: item.Color,
            Difficulty: item.Difficulty,
            Property: item.Property,
            Craft: item.Craft,
        }));
}

export function applyRestraintSet(restraint: ConfiguredOutfit): void {
    if (outfitApplyPending) {
        localNotice("An outfit swap is already in progress.", "#ffb7c7");
        return;
    }
    outfitApplyPending = true;

    const restraintGroups = new Set(restraint.items.map(i => i.Group));
    const nextAppearance: Item[] = [];

    // Preserve all current non-restraint items (clothing, body, etc.)
    for (const currentItem of Player.Appearance) {
        const group = currentItem.Asset.Group.Name;
        if (RESTRAINT_GROUPS.has(group)) continue;
        const cloned = cloneAppearanceItem(currentItem);
        if (cloned) nextAppearance.push(cloned);
    }

    // Preserve any current restraints NOT being replaced by this set
    for (const currentItem of Player.Appearance) {
        const group = currentItem.Asset.Group.Name;
        if (!RESTRAINT_GROUPS.has(group) || restraintGroups.has(group)) continue;
        const cloned = cloneAppearanceItem(currentItem);
        if (cloned) nextAppearance.push(cloned);
    }

    // Apply the saved restraint items
    for (const saved of restraint.items) {
        const built = buildAppearanceItem(saved);
        if (built) nextAppearance.push(built);
    }

    Player.Appearance = nextAppearance;
    sanitizeLiveAppearance();
    sendRoomAppearanceUpdate();
    scheduleAppearanceRefresh();

    window.setTimeout(() => {
        try {
            if (restraint.announceText.trim()) {
                ServerSend("ChatRoomChat", {
                    Type: "Action",
                    Content: getDisplayName() + " " + restraint.announceText.trim(),
                    Dictionary: [
                        { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                        { SourceCharacter: Player.MemberNumber },
                    ],
                });
            }
        } finally {
            outfitApplyPending = false;
        }
    }, 80);

    localNotice(`Applied restraint set "${restraint.displayName}" (/${restraint.command})`);
}

export function createRestraintFromCurrent(
    command: string,
    displayName: string,
    announceText: string,
): ConfiguredOutfit | null {
    const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
    if (!cmd || !displayName.trim()) return null;
    if (getOutfits().some(o => o.command === cmd) || getRestraints().some(r => r.command === cmd)) {
        localNotice(`Command "/${cmd}" is already in use.`, "#ffb7c7");
        return null;
    }
    const restraint: ConfiguredOutfit = {
        id: uid(),
        command: cmd,
        displayName: displayName.trim(),
        announceText: announceText.trim(),
        nickname: null,
        tagIds: [],
        includeRestraints: true,
        preserveRestraints: false,
        preserveClothing: true,
        items: captureRestraints(),
    };
    saveRestraints([...getRestraints(), restraint]);
    localNotice(`Created restraint set "${restraint.displayName}" (/${restraint.command}).`);
    return restraint;
}

export function saveCurrentAppearanceToRestraint(id: string): boolean {
    const restraints = getRestraints();
    const restraint = restraints.find(r => r.id === id);
    if (!restraint) return false;
    restraint.items = captureRestraints();
    saveRestraints(restraints);
    localNotice(`Saved current restraints to "${restraint.displayName}".`);
    return true;
}

export function deleteRestraint(id: string): void {
    saveRestraints(getRestraints().filter(r => r.id !== id));
}

export function editRestraint(
    id: string,
    command: string,
    displayName: string,
    announceText: string,
): boolean {
    const restraints = getRestraints();
    const restraint = restraints.find(r => r.id === id);
    if (!restraint) return false;
    const cmd = command.toLowerCase().trim().replace(/\s+/g, "");
    if (!cmd || !displayName.trim()) return false;
    if (getOutfits().some(o => o.command === cmd) || restraints.some(r => r.id !== id && r.command === cmd)) {
        localNotice(`Command "/${cmd}" is already in use.`, "#ffb7c7");
        return false;
    }
    restraint.command = cmd;
    restraint.displayName = displayName.trim();
    restraint.announceText = announceText.trim();
    saveRestraints(restraints);
    localNotice(`Updated restraint set "${restraint.displayName}" (/${restraint.command}).`);
    return true;
}

export function setRestraintTagIds(id: string, tagIds: string[]): void {
    const restraints = getRestraints();
    const restraint = restraints.find(r => r.id === id);
    if (!restraint) return;
    restraint.tagIds = tagIds;
    saveRestraints(restraints);
}

export function moveRestraint(id: string, direction: "up" | "down"): void {
    const restraints = getRestraints();
    const idx = restraints.findIndex(r => r.id === id);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= restraints.length) return;
    [restraints[idx], restraints[newIdx]] = [restraints[newIdx], restraints[idx]];
    saveRestraints(restraints);
}

export function handleRestraintCommand(inputValue: string): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;
    const command = trimmed.slice(1).toLowerCase();
    const restraint = getRestraints().find(r => r.command.toLowerCase() === command);
    if (!restraint) return false;
    if (!restraint.items.length) {
        localNotice(`Restraint set "/${restraint.command}" has no saved items yet.`, "#ffb7c7");
        return true;
    }
    applyRestraintSet(restraint);
    return true;
}

export function importOutfitFromBCCode(
    code: string,
    displayName: string,
    command: string,
    mode: BCImportMode = "restraints",
): ConfiguredOutfit {
    const LZ = (window as unknown as Record<string, unknown>).LZString as
        { decompressFromBase64?: (s: string) => string | null } | undefined;
    if (!LZ?.decompressFromBase64) throw new Error("LZString not found — make sure you are on the BC page.");

    const json = LZ.decompressFromBase64(code.trim());
    if (!json) throw new Error("Could not decompress — is this a valid BC outfit code?");

    let raw: unknown;
    try { raw = JSON.parse(json); } catch { throw new Error("Decoded data is not valid JSON."); }
    if (!Array.isArray(raw)) throw new Error("Unexpected format — expected an appearance array.");

    const toItem = (i: Record<string, unknown>): SerializedItem => sanitizeItem({
        Group:      String(i.Group ?? ""),
        Name:       String(i.Name ?? ""),
        Color:      i.Color as SerializedItem["Color"],
        Difficulty: typeof i.Difficulty === "number" ? i.Difficulty : undefined,
        Property:   typeof i.Property === "object" && i.Property !== null
            ? i.Property as Record<string, unknown> : undefined,
        Craft:      i.Craft as CraftingItem | undefined,
    });

    const all = raw as Record<string, unknown>[];
    let items: SerializedItem[];
    if (mode === "restraints") {
        items = all.filter(i => typeof i.Group === "string" && RESTRAINT_GROUPS.has(i.Group as string)).map(toItem);
        if (items.length === 0) throw new Error("No restraint items found in this BC outfit code.");
    } else if (mode === "outfit") {
        items = all.filter(i => typeof i.Group === "string" && !RESTRAINT_GROUPS.has(i.Group as string)).map(toItem);
        if (items.length === 0) throw new Error("No outfit (non-restraint) items found in this BC outfit code.");
    } else {
        items = all.filter(i => typeof i.Group === "string").map(toItem);
        if (items.length === 0) throw new Error("No items found in this BC outfit code.");
    }

    const existing = getOutfits();
    const baseCmd  = command.toLowerCase().trim().replace(/\s+/g, "") || "imported";
    let finalCmd   = baseCmd;
    let sfx        = 2;
    while (existing.some(o => o.command === finalCmd)) finalCmd = baseCmd + sfx++;

    const includesRestraints = mode !== "outfit";
    const outfit = sanitizeOutfit({
        id:                uid(),
        command:           finalCmd,
        displayName:       displayName.trim() || "Imported Outfit",
        announceText:      "",
        nickname:          null,
        tagIds:            [],
        includeRestraints: includesRestraints,
        preserveRestraints: mode === "outfit",      // outfit-only: keep existing restraints
        preserveClothing:   mode === "restraints",  // restraints-only: keep existing clothing
        items,
    });
    saveOutfits([...existing, outfit]);
    localNotice(`Imported "${outfit.displayName}" (/${outfit.command}) — ${items.length} item(s).`);
    return outfit;
}
