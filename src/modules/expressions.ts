// Expression presets — capture and apply facial expression states.

export const EXPR_GROUPS = ["Blush", "Emoticon", "Eyebrows", "Eyes", "Eyes2", "Mouth", "Tears"] as const;
export type ExprGroup = typeof EXPR_GROUPS[number];

export interface ExpressionPreset {
    id: string;
    name: string;
    groups: Partial<Record<string, { Name: string; Color?: string | string[] } | null>>;
}

function uid(): string {
    return Math.random().toString(36).slice(2, 9);
}

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

export function getExpressionPresets(): ExpressionPreset[] {
    const list = getStore().expressionPresets;
    return Array.isArray(list) ? (list as ExpressionPreset[]) : [];
}

export function saveExpressionPresets(presets: ExpressionPreset[]): void {
    getStore().expressionPresets = presets;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

export function captureCurrentExpression(name: string): ExpressionPreset {
    const groups: ExpressionPreset["groups"] = {};
    for (const group of EXPR_GROUPS) {
        const item = Player.Appearance.find(i => i.Asset.Group.Name === group);
        if (item) {
            groups[group] = {
                Name: item.Asset.Name,
                Color: item.Color,
            };
        } else {
            groups[group] = null;
        }
    }
    return { id: uid(), name: name || "Preset", groups };
}

export function applyExpressionPreset(preset: ExpressionPreset): void {
    try {
        const IW = (window as unknown as Record<string, unknown>).InventoryWear as
            ((C: Character, ItemName: string, GroupName: string, ItemColor?: string | string[]) => void) | undefined;
        const IR = (window as unknown as Record<string, unknown>).InventoryRemove as
            ((C: Character, GroupName: string, Push?: boolean) => void) | undefined;
        const CR = (window as unknown as Record<string, unknown>).CharacterRefresh as
            ((C: Character, Push?: boolean, RefreshAssets?: boolean) => void) | undefined;
        const SPAS = (window as unknown as Record<string, unknown>).ServerPlayerAppearanceSync as
            (() => void) | undefined;

        if (!IW || !IR) return;

        for (const [group, entry] of Object.entries(preset.groups)) {
            if (entry === null || entry === undefined) {
                try { IR(Player, group, false); } catch { /* ignore */ }
            } else {
                try { IW(Player, entry.Name, group, entry.Color as string | undefined); } catch { /* ignore */ }
            }
        }

        try { CR?.(Player, false); } catch { /* ignore */ }
        try { SPAS?.(); } catch { /* ignore */ }
    } catch { /* ignore */ }
}
