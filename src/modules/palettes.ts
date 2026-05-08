// Color palette manager — capture the full color map of your current
// appearance as a named palette and re-apply it later (or to a different outfit).

export type PaletteType = "outfit" | "restraint";

export interface ColorPalette {
    id: string;
    name: string;
    type: PaletteType;
    // group → serialized color value (string or string[])
    colorMap: Record<string, string | string[]>;
}

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

function load(): ColorPalette[] {
    const list = getStore().palettes;
    if (!Array.isArray(list)) return [];
    // Backfill `type` for palettes saved before this field existed
    return (list as ColorPalette[]).map(p => ({ ...p, type: (p.type ?? "outfit") as PaletteType }));
}

function save(list: ColorPalette[]): void {
    getStore().palettes = list;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

function uid(): string {
    return Math.random().toString(36).slice(2, 9);
}

export function getAllPalettes(): ColorPalette[] {
    return load();
}

export function getPalettesByType(type: PaletteType): ColorPalette[] {
    return load().filter(p => p.type === type);
}

// Snapshot current appearance colors as a new named palette (all slots).
export function captureCurrentPalette(name: string): ColorPalette {
    const colorMap: Record<string, string | string[]> = {};
    for (const item of Player.Appearance) {
        if (item.Color !== undefined) {
            colorMap[item.Asset.Group.Name] = item.Color as string | string[];
        }
    }
    const palette: ColorPalette = { id: uid(), name: name.trim() || "Palette", type: "outfit", colorMap };
    save([...load(), palette]);
    return palette;
}

// Snapshot only the colors of active restraint items as a named palette.
export function captureRestraintPalette(name: string): ColorPalette {
    const colorMap: Record<string, string | string[]> = {};
    for (const item of Player.Appearance) {
        if (item.Asset.Group.IsRestraint && item.Color !== undefined) {
            colorMap[item.Asset.Group.Name] = item.Color as string | string[];
        }
    }
    const palette: ColorPalette = { id: uid(), name: name.trim() || "Restraint Palette", type: "restraint", colorMap };
    save([...load(), palette]);
    return palette;
}

// Locks that block color edits — owner/exclusive/high-security tiers.
const PROTECTED_LOCKS = new Set([
    "OwnerOnlyPadlock", "ExclusivePadlock", "HighSecurityPadlock",
    "MistressPadlock", "MistressTimerPadlock",
    "LoversPadlock", "LoversTimerPadlock",
]);

function isProtectedLock(item: Item): boolean {
    try {
        const lock = ((item as unknown as Record<string, unknown>).Property as Record<string, unknown> | undefined)?.LockedBy as string | undefined;
        return !!lock && PROTECTED_LOCKS.has(lock);
    } catch { return false; }
}

// Apply a palette to the current live appearance — only groups present in
// the palette are updated; everything else is left as-is.
// For restraint palettes, items with owner/exclusive/high-security locks are skipped.
export function applyPalette(id: string): boolean {
    const palette = load().find(p => p.id === id);
    if (!palette) return false;

    for (const item of Player.Appearance) {
        const saved = palette.colorMap[item.Asset.Group.Name];
        if (saved === undefined) continue;
        if (palette.type === "restraint" && isProtectedLock(item)) continue;
        (item as unknown as Record<string, unknown>).Color = saved;
    }

    try {
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
    } catch { /* ignore */ }

    return true;
}

export function deletePalette(id: string): void {
    save(load().filter(p => p.id !== id));
}

export function renamePalette(id: string, name: string): void {
    const list = load();
    const p = list.find(x => x.id === id);
    if (p && name.trim()) { p.name = name.trim(); save(list); }
}

// -- Custom color swatches --------------------------------------------------
// A flat list of user-saved hex colors for the direct picker workflow.

function saveCustomColors(list: string[]): void {
    getStore().customColors = list;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

export function getCustomColors(): string[] {
    const v = getStore().customColors;
    return Array.isArray(v) ? v as string[] : [];
}

export function addCustomColor(hex: string): void {
    const list = getCustomColors();
    if (!list.includes(hex)) saveCustomColors([...list, hex]);
}

export function removeCustomColor(hex: string): void {
    saveCustomColors(getCustomColors().filter(c => c !== hex));
}

// Apply a single hex colour to every colour zone of a worn restraint group.
export function applyColorToGroup(groupName: string, color: string): boolean {
    const item = InventoryGet(Player, groupName);
    if (!item) return false;
    const existing = item.Color;
    (item as unknown as Record<string, unknown>).Color = Array.isArray(existing)
        ? (existing as string[]).map(() => color)
        : color;
    try {
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
    } catch { /* ignore */ }
    return true;
}

// Apply a color to a specific zone index of a worn restraint group.
export function applyColorZoneToGroup(groupName: string, zoneIndex: number, color: string): boolean {
    const item = InventoryGet(Player, groupName);
    if (!item) return false;
    let colors: string[];
    if (Array.isArray(item.Color)) {
        colors = [...item.Color as string[]];
    } else {
        colors = [item.Color as string ?? "Default"];
    }
    if (zoneIndex < 0 || zoneIndex >= colors.length) return false;
    colors[zoneIndex] = color;
    (item as unknown as Record<string, unknown>).Color = colors;
    try {
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
    } catch { /* ignore */ }
    return true;
}

// Apply a full colors array to a worn restraint group (for preset apply).
// Handles zone-count mismatches gracefully.
export function applyColorsToGroup(groupName: string, colors: string[]): boolean {
    const item = InventoryGet(Player, groupName);
    if (!item) return false;
    if (Array.isArray(item.Color)) {
        const zoneCount = (item.Color as string[]).length;
        const applied: string[] = [];
        for (let i = 0; i < zoneCount; i++) {
            applied.push(colors[i] ?? colors[colors.length - 1] ?? "Default");
        }
        (item as unknown as Record<string, unknown>).Color = applied;
    } else {
        (item as unknown as Record<string, unknown>).Color = colors[0] ?? "Default";
    }
    try {
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
    } catch { /* ignore */ }
    return true;
}

// Return the current color array for a worn item (normalised to string[]).
export function getGroupColors(groupName: string): string[] {
    const item = InventoryGet(Player, groupName);
    if (!item) return [];
    if (Array.isArray(item.Color)) return [...item.Color as string[]];
    return [item.Color as string ?? "Default"];
}

// Return zone names for a worn item by reading Asset.Layer[].Name.
export function getGroupZoneNames(groupName: string): string[] {
    const item = InventoryGet(Player, groupName);
    if (!item) return [];
    const colors = Array.isArray(item.Color) ? item.Color as string[] : [item.Color as string ?? "Default"];
    const assetRaw = item.Asset as unknown as Record<string, unknown>;
    const layers = Array.isArray(assetRaw.Layer) ? assetRaw.Layer as Array<Record<string, unknown>> : [];
    return colors.map((_, i) => {
        const layer = layers[i];
        if (!layer) return `Zone ${i + 1}`;
        const name = (layer.Name as string | undefined)?.trim();
        return name || `Zone ${i + 1}`;
    });
}

// -- Restraint color presets ---------------------------------------------------

export interface RestraintColorPreset {
    id: string;
    name: string;
    colors: string[]; // per-zone values ("Default" or hex)
}

function saveRestraintPresets(list: RestraintColorPreset[]): void {
    getStore().restraintPresets = list;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

export function getRestraintPresets(): RestraintColorPreset[] {
    const v = getStore().restraintPresets;
    return Array.isArray(v) ? (v as RestraintColorPreset[]) : [];
}

export function saveRestraintPreset(name: string, colors: string[]): RestraintColorPreset {
    const p: RestraintColorPreset = { id: uid(), name: name.trim() || "Preset", colors: [...colors] };
    saveRestraintPresets([...getRestraintPresets(), p]);
    return p;
}

export function deleteRestraintPreset(id: string): void {
    saveRestraintPresets(getRestraintPresets().filter(p => p.id !== id));
}

export function renameRestraintPreset(id: string, name: string): void {
    const list = getRestraintPresets();
    const p = list.find(x => x.id === id);
    if (p && name.trim()) { p.name = name.trim(); saveRestraintPresets(list); }
}
