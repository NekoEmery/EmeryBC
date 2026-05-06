// Color palette manager — capture the full color map of your current
// appearance as a named palette and re-apply it later (or to a different outfit).

export interface ColorPalette {
    id: string;
    name: string;
    // group → serialized color value (string or string[])
    colorMap: Record<string, string | string[]>;
}

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

function load(): ColorPalette[] {
    const list = getStore().palettes;
    return Array.isArray(list) ? (list as ColorPalette[]) : [];
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

// Snapshot current appearance colors as a new named palette.
export function captureCurrentPalette(name: string): ColorPalette {
    const colorMap: Record<string, string | string[]> = {};
    for (const item of Player.Appearance) {
        if (item.Color !== undefined) {
            colorMap[item.Asset.Group.Name] = item.Color as string | string[];
        }
    }
    const palette: ColorPalette = { id: uid(), name: name.trim() || "Palette", colorMap };
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
