// Expression presets and sequences — save/apply facial expression states.

export const EXPR_GROUPS = ["Blush", "Emoticon", "Eyebrows", "Eyes", "Eyes2", "Mouth", "Tears"] as const;
export type ExprGroup = typeof EXPR_GROUPS[number];

export interface ExpressionPreset {
    id: string;
    name: string;
    groups: Partial<Record<string, { Name: string; Color?: string | string[] } | null>>;
}

export interface ExprSequenceStep {
    presetId: string;  // references a saved ExpressionPreset by id
    delayMs: number;
}

export interface ExpressionSequence {
    id: string;
    name: string;
    steps: ExprSequenceStep[];
}

function uid(): string {
    return Math.random().toString(36).slice(2, 9);
}

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

// -- Presets -------------------------------------------------------------------

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
                // Remove any existing item in this slot first
                const existingIdx = Player.Appearance.findIndex(
                    i => i.Asset.Group.Name === group,
                );
                if (existingIdx !== -1) Player.Appearance.splice(existingIdx, 1);

                if (entry !== null && entry !== undefined) {
                    // Resolve the asset and push directly onto Appearance
                    const asset = AssetGet(Player.AssetFamily, group, entry.Name);
                    if (asset) {
                        Player.Appearance.push({
                            Asset: asset,
                            Color: (entry.Color ?? "Default") as string | string[],
                            Difficulty: 0,
                        } as Item);
                    }
                }
            } catch { /* skip this group */ }
        }
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
    } catch { /* ignore */ }
}

// -- Sequences -----------------------------------------------------------------

export function getExpressionSequences(): ExpressionSequence[] {
    const list = getStore().expressionSequences;
    return Array.isArray(list) ? (list as ExpressionSequence[]) : [];
}

export function saveExpressionSequences(seqs: ExpressionSequence[]): void {
    getStore().expressionSequences = seqs;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

export function createExpressionSequence(name: string, steps: ExprSequenceStep[]): ExpressionSequence {
    return { id: uid(), name: name || "Sequence", steps };
}

// Re-entry guard so a sequence can't be double-triggered
let _seqRunning = false;

export function isSeqRunning(): boolean { return _seqRunning; }

export function playExpressionSequence(
    seq: ExpressionSequence,
    onDone?: () => void,
): void {
    if (_seqRunning) return;
    _seqRunning = true;
    const presets = getExpressionPresets();
    let i = 0;

    const runStep = (): void => {
        if (i >= seq.steps.length) {
            _seqRunning = false;
            onDone?.();
            return;
        }
        const step = seq.steps[i];
        const preset = presets.find(p => p.id === step.presetId);
        if (preset) applyExpressionPreset(preset);
        i++;
        window.setTimeout(runStep, step.delayMs);
    };

    runStep();
}
