// Color palette manager — capture the full color map of your current
// appearance as a named palette and re-apply it later (or to a different outfit).

import { RESTRAINT_GROUPS } from "./outfitManager";

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
        if (RESTRAINT_GROUPS.has(item.Asset.Group.Name) && item.Color !== undefined) {
            colorMap[item.Asset.Group.Name] = item.Color as string | string[];
        }
    }
    const palette: ColorPalette = { id: uid(), name: name.trim() || "Restraint Palette", type: "restraint", colorMap };
    save([...load(), palette]);
    return palette;
}

// Apply a palette to the current live appearance — only groups present in
// the palette are updated; everything else is left as-is.
export function applyPalette(id: string): boolean {
    const palette = load().find(p => p.id === id);
    if (!palette) return false;

    for (const item of Player.Appearance) {
        const saved = palette.colorMap[item.Asset.Group.Name];
        if (saved !== undefined) {
            (item as unknown as Record<string, unknown>).Color = saved;
        }
    }

    try {
        CharacterRefresh(Player, false, false);
        if (Player.OnlineID != null) {
            ServerSend("ChatRoomCharacterUpdate", {
                ID: Player.OnlineID,
                ActivePose: Player.ActivePose ?? null,
                Appearance: ServerAppearanceBundle(Player.Appearance),
            });
        }
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
