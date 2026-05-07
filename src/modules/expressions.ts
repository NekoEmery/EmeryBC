// Expression presets and sequences — save/apply facial expression states.

export const EXPR_GROUPS = ["Blush", "Emoticon", "Eyebrows", "Eyes", "Eyes2", "Mouth", "Tears"] as const;
export type ExprGroup = typeof EXPR_GROUPS[number];

export interface ExpressionPreset {
    id: string;
    name: string;
    groups: Partial<Record<string, { Name: string; Color?: string | string[] } | null>>;
}

export interface ExprSequenceStep {
    presetId: string;
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

function getStore(): Record<string, unknown> | null {
    try {
        if (!Player?.ExtensionSettings) return null;
        if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
    } catch {
        return null;
    }
}

// -- Presets -------------------------------------------------------------------

export function getExpressionPresets(): ExpressionPreset[] {
    try {
        const store = getStore();
        const list = store?.expressionPresets;
        return Array.isArray(list) ? (list as ExpressionPreset[]) : [];
    } catch { return []; }
}

export function saveExpressionPresets(presets: ExpressionPreset[]): void {
    try {
        const store = getStore();
        if (!store) return;
        store.expressionPresets = presets;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    } catch { /* ignore */ }
}

export function captureCurrentExpression(name: string): ExpressionPreset {
    const groups: ExpressionPreset["groups"] = {};
    try {
        for (const group of EXPR_GROUPS) {
            const item = Player.Appearance.find((i: Item) => i.Asset.Group.Name === group);
            if (item) {
                const color = item.Color;
                groups[group] = {
                    Name: item.Asset.Name,
                    Color: color !== undefined ? color : undefined,
                };
            } else {
                groups[group] = null;
            }
        }
    } catch { /* return whatever captured so far */ }
    return { id: uid(), name: name || "Preset", groups };
}

// Use BC's CharacterSetFacialExpression when available (proper API for expressions),
// falling back to direct Appearance manipulation otherwise.
export function applyExpressionPreset(preset: ExpressionPreset): void {
    try {
        // Runtime check — CharacterSetFacialExpression is the correct BC API
        const setExpr = (window as unknown as Record<string, unknown>).CharacterSetFacialExpression as
            ((c: Character, group: string, expr: string | null, intensity?: number | null, color?: string | string[] | null) => void) | undefined;

        for (const [group, entry] of Object.entries(preset.groups)) {
            try {
                if (setExpr) {
                    // BC's own function — handles asset lookup, removal, and push internally
                    const exprName = (entry !== null && entry !== undefined) ? entry.Name : null;
                    const color = entry?.Color ?? null;
                    setExpr(Player, group, exprName, null, color as string | null);
                } else {
                    // Fallback: direct Appearance manipulation
                    const existingIdx = Player.Appearance.findIndex(
                        (i: Item) => i.Asset.Group.Name === group,
                    );
                    if (existingIdx !== -1) Player.Appearance.splice(existingIdx, 1);
                    if (entry !== null && entry !== undefined) {
                        const asset = AssetGet(Player.AssetFamily, group, entry.Name);
                        if (asset) {
                            Player.Appearance.push({
                                Asset: asset,
                                Color: (entry.Color ?? "Default") as string | string[],
                                Difficulty: 0,
                            } as Item);
                        }
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
    try {
        const store = getStore();
        const list = store?.expressionSequences;
        return Array.isArray(list) ? (list as ExpressionSequence[]) : [];
    } catch { return []; }
}

export function saveExpressionSequences(seqs: ExpressionSequence[]): void {
    try {
        const store = getStore();
        if (!store) return;
        store.expressionSequences = seqs;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    } catch { /* ignore */ }
}

export function createExpressionSequence(name: string, steps: ExprSequenceStep[]): ExpressionSequence {
    return { id: uid(), name: name || "Sequence", steps };
}

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
