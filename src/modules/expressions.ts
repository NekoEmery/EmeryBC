// Expression presets and sequences — live expression picker + animated sequences.

import { callBC, syncSettings, syncAppearance } from "./bcUtils";

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
    Emoticon: [
        "Afk", "Anger", "Auction", "BecomeLeader", "Bed", "BrokenHeart", "Cake",
        "Captured", "CollaredPickup", "Confused", "Dead", "GagTalk", "Heart",
        "HighHeel", "Juice", "LostLeader", "Love", "Maid", "Meditate", "Music",
        "Obey", "Orgasm", "Pain", "Question", "Read", "Shy", "Skull", "Sleeping",
        "Snow", "Star", "Study", "Whisper", "XP", "Yell",
    ],
    Eyebrows: ["Raised", "Lowered", "OneRaised", "Harsh", "Soft"],
    Eyes:     ["Closed", "Dazed", "Lewd", "Sad", "Shy", "Smiling"],
    Eyes2:    ["Closed", "Dazed", "Lewd", "Sad", "Shy", "Smiling"],
    Mouth:    ["Angry", "HalfOpen", "Open", "Sad", "Smile"],
    Tears:    ["Crying", "HeavyCrying", "Tear1", "Tear2", "Tear3"],
};

export function getExprGroupOptions(group: string): string[] {
    try {
        const bcAsset = (window as unknown as Record<string, unknown>).Asset as
            Array<{ Group: { Name: string; Family?: string }; Name: string }> | undefined;
        if (Array.isArray(bcAsset)) {
            const family = Player?.AssetFamily ?? "Female3DCG";
            // Family lives on the Group in BC, not on the Asset itself.
            // Accept any asset whose group name matches and whose group family
            // is either the player's family or unset (shared assets).
            const opts = bcAsset
                .filter(a => a.Group.Name === group &&
                    (a.Group.Family === family || !a.Group.Family))
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
        // Prefer BC's official API — omit optional Timer/Color args entirely so BC
        // uses its own defaults (no timer = keep expression; no colour override).
        // Passing null for Timer can be treated as "0 ms" in some BC builds which
        // would instantly clear the expression.
        const setExpr = (window as unknown as Record<string, unknown>).CharacterSetFacialExpression as
            ((c: Character, g: string, e: string | null) => void) | undefined;
        if (typeof setExpr === "function") {
            setExpr(Player, group, exprName);
        } else {
            // Fallback: direct Appearance manipulation.
            // Also try BC's InventoryWear / InventoryRemove if available.
            const wear   = (window as unknown as Record<string, unknown>).InventoryWear   as Function | undefined;
            const remove = (window as unknown as Record<string, unknown>).InventoryRemove as Function | undefined;
            if (typeof wear === "function" && typeof remove === "function") {
                if (exprName) {
                    (wear as Function)(Player, exprName, group, "Default", 0);
                    // Ensure Property.Expression is set (some BC builds leave it unset)
                    const item = (Player.Appearance as Item[]).find(i => i.Asset.Group.Name === group);
                    if (item) {
                        if (!item.Property) (item as unknown as Record<string, unknown>).Property = {};
                        (item.Property as Record<string, unknown>).Expression = exprName;
                    }
                } else {
                    (remove as Function)(Player, group);
                }
            } else {
                // Last-resort: splice + push the variant asset
                const app = Player.Appearance as Item[];
                const idx = app.findIndex(i => i.Asset.Group.Name === group);
                if (idx !== -1) app.splice(idx, 1);
                if (exprName) {
                    const asset = AssetGet(Player.AssetFamily, group, exprName);
                    if (asset) {
                        app.push({
                            Asset: asset,
                            Color: "Default",
                            Difficulty: 0,
                            Property: { Expression: exprName },
                        } as unknown as Item);
                    }
                }
            }
        }
        callBC(() => CharacterRefresh(Player, false));
        syncAppearance(); // debounced — collapses rapid clicks into one server round-trip
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
        syncSettings();
    } catch { /* ignore */ }
}

export function captureCurrentExpression(name: string): ExpressionPreset {
    const groups: ExpressionPreset["groups"] = {};
    try {
        for (const group of EXPR_GROUPS) {
            const item = Player.Appearance.find((i: Item) => i.Asset.Group.Name === group);
            if (item) {
                // BC stores the active expression variant in Asset.Name (always reliable).
                // Property.Expression mirrors it in most builds; use it as the primary source
                // and fall back to Asset.Name so capture works regardless of BC version.
                const propExpr = (item.Property as Record<string, unknown> | undefined)?.Expression as string | null | undefined;
                const exprName = propExpr || item.Asset.Name || null;
                groups[group] = exprName
                    ? { Name: exprName, Color: item.Color !== undefined ? item.Color : undefined }
                    : null;
            } else {
                groups[group] = null;
            }
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
        syncSettings();
    } catch { /* ignore */ }
}

export function createExpressionSequence(name: string, steps: ExprSequenceStep[]): ExpressionSequence {
    return { id: uid(), name: name || "Sequence", steps };
}

// -- Default expression preset -------------------------------------------------
// The preset the user reverts to after a timed expression or trigger fires.
// null = clear all groups back to neutral.

export function getDefaultExprPresetId(): string | null {
    try {
        const v = getStore()?.defaultExprPresetId;
        return typeof v === "string" && v ? v : null;
    } catch { return null; }
}

export function setDefaultExprPresetId(id: string | null): void {
    try {
        const store = getStore();
        if (!store) return;
        if (id) { store.defaultExprPresetId = id; } else { delete store.defaultExprPresetId; }
        syncSettings();
    } catch { /* ignore */ }
}

// -- Expression triggers -------------------------------------------------------
// When the player sends an outgoing chat message whose text contains matchText
// (case-insensitive), the named preset is applied for durationMs ms, then the
// face reverts to the default preset (or clears to neutral if none is set).

export interface ExpressionTrigger {
    id: string;
    name: string;       // user label e.g. "Whimper"
    matchText: string;  // substring to match in outgoing chat (case-insensitive)
    presetId: string;   // which preset to apply
    durationMs: number; // ms before reverting (0 = stay permanently)
}

export function getExpressionTriggers(): ExpressionTrigger[] {
    try {
        const v = getStore()?.expressionTriggers;
        return Array.isArray(v) ? (v as ExpressionTrigger[]) : [];
    } catch { return []; }
}

export function saveExpressionTriggers(triggers: ExpressionTrigger[]): void {
    try {
        const store = getStore();
        if (!store) return;
        store.expressionTriggers = triggers;
        syncSettings();
    } catch { /* ignore */ }
}

// -- Timed expression revert ---------------------------------------------------

let _revertTimer: ReturnType<typeof setTimeout> | null = null;

export function cancelExpressionRevert(): void {
    if (_revertTimer !== null) { clearTimeout(_revertTimer); _revertTimer = null; }
}

/** Apply a preset, then after revertMs ms revert to the default preset
 *  (or clear all groups if no default is set). revertMs = 0 means stay forever. */
export function applyExprPresetWithRevert(presetId: string, revertMs: number): void {
    const preset = getExpressionPresets().find(p => p.id === presetId);
    if (!preset) return;
    cancelExpressionRevert();
    applyExpressionPreset(preset);
    if (revertMs > 0) {
        _revertTimer = setTimeout(() => {
            _revertTimer = null;
            const defaultId = getDefaultExprPresetId();
            if (defaultId) {
                const defPreset = getExpressionPresets().find(p => p.id === defaultId);
                if (defPreset) { applyExpressionPreset(defPreset); return; }
            }
            // No default — clear all expression groups back to neutral
            for (const g of EXPR_GROUPS) {
                try { applyExprGroup(g, null); } catch { /* ignore */ }
            }
        }, revertMs);
    }
}

// -- Trigger checker -----------------------------------------------------------
// Call once per outgoing chat message. First matching trigger fires.

export function checkExpressionTriggers(message: string): void {
    const triggers = getExpressionTriggers();
    if (!triggers.length) return;
    const lower = message.toLowerCase();
    for (const trigger of triggers) {
        if (!trigger.matchText || !trigger.presetId) continue;
        if (lower.includes(trigger.matchText.toLowerCase())) {
            applyExprPresetWithRevert(trigger.presetId, trigger.durationMs);
            break; // first match wins per message
        }
    }
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
