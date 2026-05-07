// Expression presets and sequences — live expression picker + animated sequences.

export const EXPR_GROUPS = ["Blush", "Emoticon", "Eyebrows", "Eyes", "Eyes2", "Mouth", "Tears"] as const;
export type ExprGroup = typeof EXPR_GROUPS[number];

// Friendly labels shown in the picker row headers
export const EXPR_GROUP_LABELS: Record<string, string> = {
    Blush: "Blush", Emoticon: "Emoticon", Eyebrows: "Eyebrows",
    Eyes: "Eyes L", Eyes2: "Eyes R", Mouth: "Mouth", Tears: "Tears",
};

export interface ExpressionPreset {
    id: string;
    name: string;
    groups: Partial<Record<string, { Name: string; Color?: string | string[] } | null>>;
}

// A sequence step is a self-contained face snapshot — no preset reference needed.
export interface ExprSequenceStep {
    groups: Partial<Record<string, string | null>>;   // group → expr name, or null = clear
    delayMs: number;
    label?: string;
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
    } catch { return null; }
}

// -- Expression option discovery -----------------------------------------------
// Query BC's runtime Asset array for all expression options in a group.
// Falls back to a hardcoded list if the global isn't available.

const EXPR_FALLBACK: Record<string, string[]> = {
    Blush:    ["1", "2", "3", "4", "5"],
    Emoticon: ["Afk", "Anger", "Auction", "BrokenHeart", "Cake", "Confused", "Dead",
               "GagTalk", "Heart", "HighHeel", "Juice", "Love", "Maid", "Music",
               "Question", "Read", "Shy", "Skull", "Sleeping", "Star", "Study", "Yell"],
    Eyebrows: ["Raised", "Lowered", "OneRaised", "Harsh", "Soft"],
    Eyes:     ["Closed", "Dazed", "Lewd", "Sad", "Shy", "Smiling"],
    Eyes2:    ["Closed", "Dazed", "Lewd", "Sad", "Shy", "Smiling"],
    Mouth:    ["Angry", "HalfOpen", "Open", "Sad", "Smile"],
    Tears:    ["Crying", "HeavyCrying", "Tear1", "Tear2", "Tear3"],
};

export function getExprGroupOptions(group: string): string[] {
    try {
        const bcAsset = (window as unknown as Record<string, unknown>).Asset as
            Array<{ Family: string; Group: { Name: string }; Name: string }> | undefined;
        if (Array.isArray(bcAsset)) {
            const family = Player?.AssetFamily ?? "Female3DCG";
            const opts = bcAsset
                .filter(a => a.Family === family && a.Group.Name === group)
                .map(a => a.Name);
            if (opts.length > 0) return opts;
        }
    } catch { /* fall through */ }
    return EXPR_FALLBACK[group] ?? [];
}

// -- Single-expression apply ---------------------------------------------------
// Uses CharacterSetFacialExpression (BC's proper API) if available,
// otherwise falls back to direct Appearance manipulation.

export function applyExprGroup(group: string, exprName: string | null): void {
    try {
        const setExpr = (window as unknown as Record<string, unknown>).CharacterSetFacialExpression as
            ((c: Character, g: string, e: string | null, i?: number | null, color?: string | null) => void) | undefined;
        if (setExpr) {
            setExpr(Player, group, exprName, null, null);
        } else {
            const idx = Player.Appearance.findIndex((i: Item) => i.Asset.Group.Name === group);
            if (idx !== -1) Player.Appearance.splice(idx, 1);
            if (exprName) {
                const asset = AssetGet(Player.AssetFamily, group, exprName);
                if (asset) Player.Appearance.push({ Asset: asset, Color: "Default", Difficulty: 0 } as Item);
            }
        }
        CharacterRefresh(Player, false);
        ChatRoomCharacterUpdate(Player);
        ServerPlayerAppearanceSync();
    } catch { /* ignore */ }
}

// -- Presets (saved full-face snapshots for quick-apply) -----------------------

export function getExpressionPresets(): ExpressionPreset[] {
    try {
        const list = getStore()?.expressionPresets;
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
            groups[group] = item
                ? { Name: item.Asset.Name, Color: item.Color !== undefined ? item.Color : undefined }
                : null;
        }
    } catch { /* return whatever captured so far */ }
    return { id: uid(), name: name || "Preset", groups };
}

export function applyExpressionPreset(preset: ExpressionPreset): void {
    try {
        for (const [group, entry] of Object.entries(preset.groups)) {
            try {
                applyExprGroup(group, (entry !== null && entry !== undefined) ? entry.Name : null);
            } catch { /* skip group */ }
        }
    } catch { /* ignore */ }
}

// -- Sequences -----------------------------------------------------------------

export function getExpressionSequences(): ExpressionSequence[] {
    try {
        const list = getStore()?.expressionSequences;
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

export function playExpressionSequence(seq: ExpressionSequence, onDone?: () => void): void {
    if (_seqRunning) return;
    _seqRunning = true;
    let i = 0;

    const runStep = (): void => {
        if (i >= seq.steps.length) {
            _seqRunning = false;
            onDone?.();
            return;
        }
        const step = seq.steps[i];
        try {
            const groups = step.groups ?? {};
            for (const [group, name] of Object.entries(groups)) {
                try { applyExprGroup(group, name ?? null); } catch { /* skip */ }
            }
        } catch { /* ignore */ }
        i++;
        window.setTimeout(runStep, Math.max(100, step.delayMs ?? 500));
    };

    runStep();
}
