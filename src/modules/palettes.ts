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
