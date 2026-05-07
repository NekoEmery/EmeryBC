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
    try {
        for (const group of EXPR_GROUPS) {
            const item = Player.Appearance.find(i => i.Asset.Group.Name === group);
            groups[group] = item
                ? { Name: item.Asset.Name, Color: item.Color }
                : null;
        }
    } catch { /* return whatever was captured so far */ }
    return { id: uid(), name: name || "Preset", groups };
}

export function applyExpressionPreset(preset: ExpressionPreset): void {
    try {
        for (const [group, entry] of Object.entries(preset.groups)) {
            try {
                if (entry === null || entry === undefined) {
                    InventoryRemove(Player, group, false);
                } else {
                    InventoryWear(Player, entry.Name, group,
                        entry.Color as string | string[] | undefined);
                }
            } catch { /* skip this group */ }
        }
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
    } catch { /* ignore */ }
}
