// Expression presets and sequences — live expression picker + animated sequences.

import { callBC, getSettings, syncSettings, syncAppearance } from "./bcUtils";

export const EXPR_GROUPS = ["Blush", "Emoticon", "Eyebrows", "Eyes", "Eyes2", "Fluids", "Mouth", "Tears"] as const;
export type ExprGroup = typeof EXPR_GROUPS[number];

// Friendly labels shown in the picker row headers
export const EXPR_GROUP_LABELS: Record<string, string> = {
    Blush: "Blush", Emoticon: "Emoticon", Eyebrows: "Eyebrows",
    Eyes: "Eyes L", Eyes2: "Eyes R", Fluids: "Fluids", Mouth: "Mouth", Tears: "Tears",
};

export interface ExpressionPreset {
    id: string;
    name: string;
    groups: Partial<Record<string, { Name: string; Color?: string | string[] } | null>>;
}

// A sequence step is a self-contained face snapshot — no preset reference needed.
// presetId/presetName are display metadata only; groups is the authoritative playback data.
export interface ExprSequenceStep {
    groups: Partial<Record<string, string | null>>;   // group → expr name, or null = clear
    delayMs: number;
    label?: string;
    presetId?: string;   // source preset id (for display — not required at playback)
    presetName?: string; // cached preset name (shown when preset is later deleted)
    reset?: boolean;     // if true, apply default preset (or clear all groups) at playback
}

export interface ExpressionSequence {
    id: string;
    name: string;
    steps: ExprSequenceStep[];
    command?: string; // optional /command trigger (matched by handleExprSequenceCommand)
}

function uid(): string {
    return Math.random().toString(36).slice(2, 9);
}


// -- Expression option discovery -----------------------------------------------
// Query BC's runtime Asset array for all expression options in a group.
// Falls back to a hardcoded list if the global isn't available.

const EXPR_FALLBACK: Record<string, string[]> = {
    Blush:    ["Low", "Medium", "High", "VeryHigh", "Extreme", "ShortBreath"],
    Emoticon: [
        "Afk", "Brb", "SOS", "Whisper", "Sleep", "Hearts", "Tear", "Hearing",
        "Confusion", "Exclamation", "Annoyed", "Read", "RaisedHand", "Spectator",
        "ThumbsDown", "ThumbsUp", "LoveRope", "LoveGag", "LoveLock",
        "Wardrobe", "Gaming", "Work", "Shopping", "Coffee", "Fork", "Music",
        "Car", "Hanger", "Call", "Lightbulb", "Warning", "BrokenHeart",
        "Drawing", "Coding", "TV", "Bathing",
    ],
    Eyebrows: ["Raised", "Lowered", "OneRaised", "Harsh", "Angry", "Soft"],
    Eyes:     [
        "Closed", "Dazed", "Shy", "Sad", "Horny", "Lewd", "VeryLewd",
        "Heart", "HeartPink", "LewdHeart", "LewdHeartPink",
        "Dizzy", "Daydream", "ShylyHappy", "Angry", "Surprised", "Scared",
    ],
    Eyes2:    [
        "Closed", "Dazed", "Shy", "Sad", "Horny", "Lewd", "VeryLewd",
        "Heart", "HeartPink", "LewdHeart", "LewdHeartPink",
        "Dizzy", "Daydream", "ShylyHappy", "Angry", "Surprised", "Scared",
    ],
    Fluids:   [
        "DroolLow", "DroolMedium", "DroolHigh", "DroolSides", "DroolMessy",
        "DroolTearsLow", "DroolTearsMedium", "DroolTearsHigh",
        "DroolTearsMessy", "DroolTearsSides",
        "TearsHigh", "TearsMedium", "TearsLow",
    ],
    Mouth:    [
        "Frown", "Sad", "Pained", "Angry", "HalfOpen", "Open",
        "Ahegao", "Moan", "TonguePinch", "LipBite",
        "Happy", "Devious", "Laughing", "Grin", "Smirk", "Pout",
    ],
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

// noSync = true: skip the CharacterRefresh + syncAppearance call after setting the expression.
// Use this when applying a batch of groups (e.g. a full preset) so the caller can issue
// one refresh + one server sync after ALL groups are set, instead of one per group.
// That prevents 8× CharacterRefresh hook traversals (and potential WCE auto-syncs) per preset.
export function applyExprGroup(group: string, exprName: string | null, noSync = false): void {
    try {
        // Validate that the expression name exists in the current BC build before applying.
        // Stored presets may contain names from older BC versions (e.g. "Eyes5", "Eyes1",
        // "Regular", "Fluids", "Emoticon" for R128) that no longer exist as asset variants.
        // BC's server rejects appearance bundles containing unrecognised items and pushes a
        // sanitised copy back — each round-trip triggers another sync, creating the loop that
        // causes ErrorRateLimited on login.  If AssetGet returns null/undefined, treat the
        // expression as absent and clear the group instead (silent downgrade, never an error).
        let safeExprName = exprName;
        if (safeExprName) {
            try {
                const assetGet = (window as unknown as Record<string, unknown>).AssetGet as
                    ((family: string, group: string, name: string) => unknown) | undefined;
                if (typeof assetGet === "function") {
                    if (!assetGet(Player.AssetFamily ?? "Female3DCG", group, safeExprName)) {
                        safeExprName = null; // not valid in this BC version — clear group instead
                    }
                }
            } catch { /* ignore — keep safeExprName as-is if AssetGet itself throws */ }
        }

        // Prefer BC's official API — omit optional Timer/Color args entirely so BC
        // uses its own defaults (no timer = keep expression; no colour override).
        // Passing null for Timer can be treated as "0 ms" in some BC builds which
        // would instantly clear the expression.
        const setExpr = (window as unknown as Record<string, unknown>).CharacterSetFacialExpression as
            ((c: Character, g: string, e: string | null) => void) | undefined;
        if (typeof setExpr === "function") {
            setExpr(Player, group, safeExprName);
        } else {
            // Fallback: direct Appearance manipulation.
            // Also try BC's InventoryWear / InventoryRemove if available.
            const wear   = (window as unknown as Record<string, unknown>).InventoryWear   as Function | undefined;
            const remove = (window as unknown as Record<string, unknown>).InventoryRemove as Function | undefined;
            if (typeof wear === "function" && typeof remove === "function") {
                if (safeExprName) {
                    (wear as Function)(Player, safeExprName, group, "Default", 0);
                    // Ensure Property.Expression is set (some BC builds leave it unset)
                    const item = (Player.Appearance as Item[]).find(i => i.Asset.Group.Name === group);
                    if (item) {
                        if (!item.Property) (item as unknown as Record<string, unknown>).Property = {};
                        (item.Property as Record<string, unknown>).Expression = safeExprName;
                    }
                } else {
                    (remove as Function)(Player, group);
                }
            } else {
                // Last-resort: splice + push the variant asset
                const app = Player.Appearance as Item[];
                const idx = app.findIndex(i => i.Asset.Group.Name === group);
                if (idx !== -1) app.splice(idx, 1);
                if (safeExprName) {
                    const asset = AssetGet(Player.AssetFamily, group, safeExprName);
                    if (asset) {
                        app.push({
                            Asset: asset,
                            Color: "Default",
                            Difficulty: 0,
                            Property: { Expression: safeExprName },
                        } as unknown as Item);
                    }
                }
            }
        }
        if (!noSync) {
            callBC(() => CharacterRefresh(Player, false));
            syncAppearance(); // debounced — collapses rapid clicks into one server round-trip
        }
    } catch { /* ignore */ }
}

// Clear all expression groups in one batch: one CharacterRefresh + one server sync total.
// Use this instead of looping applyExprGroup(g, null) without noSync.
export function clearAllExprGroups(): void {
    for (const g of EXPR_GROUPS) { try { applyExprGroup(g, null, true); } catch { /* ignore */ } }
    try { callBC(() => CharacterRefresh(Player, false)); } catch { /* ignore */ }
    syncAppearance();
}

// -- Presets (saved full-face snapshots for quick-apply) -----------------------

export function getExpressionPresets(): ExpressionPreset[] {
    try {
        const list = getSettings().expressionPresets;
        return Array.isArray(list) ? (list as ExpressionPreset[]) : [];
    } catch { return []; }
}

export function saveExpressionPresets(presets: ExpressionPreset[]): void {
    try {
        const store = getSettings();
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
    // Apply all groups with noSync=true, then do ONE CharacterRefresh + ONE server sync.
    // Previously each applyExprGroup call did its own refresh, causing 8× CharacterRefresh
    // chain traversals per preset (8 chances for WCE/BCX hooks to react and re-sync).
    try {
        for (const [group, entry] of Object.entries(preset.groups)) {
            try {
                applyExprGroup(group, (entry !== null && entry !== undefined) ? entry.Name : null, true);
            } catch { /* skip group */ }
        }
    } catch { /* ignore */ }
    try { callBC(() => CharacterRefresh(Player, false)); } catch { /* ignore */ }
    syncAppearance();
}

// -- Sequences -----------------------------------------------------------------

export function getExpressionSequences(): ExpressionSequence[] {
    try {
        const list = getSettings().expressionSequences;
        return Array.isArray(list) ? (list as ExpressionSequence[]) : [];
    } catch { return []; }
}

export function saveExpressionSequences(seqs: ExpressionSequence[]): void {
    try {
        const store = getSettings();
        store.expressionSequences = seqs;
        syncSettings();
    } catch { /* ignore */ }
}

export function createExpressionSequence(name: string, steps: ExprSequenceStep[], command?: string): ExpressionSequence {
    const seq: ExpressionSequence = { id: uid(), name: name || "Sequence", steps };
    if (command?.trim()) seq.command = command.trim();
    return seq;
}

export function updateExpressionSequence(id: string, name: string, steps: ExprSequenceStep[], command?: string): void {
    const seqs = getExpressionSequences();
    const i = seqs.findIndex(s => s.id === id);
    if (i === -1) return;
    const trimCmd = command?.trim();
    seqs[i] = { ...seqs[i], name: name.trim() || seqs[i].name, steps, command: trimCmd || undefined };
    if (!trimCmd) delete seqs[i].command;
    saveExpressionSequences(seqs);
}

export function deleteExpressionSequence(id: string): void {
    saveExpressionSequences(getExpressionSequences().filter(s => s.id !== id));
}

// Returns true if a sequence command matched and playback was started.
export function handleExprSequenceCommand(text: string): boolean {
    const lower = text.trim().toLowerCase().replace(/^\//, "");
    for (const seq of getExpressionSequences()) {
        if (seq.command && lower === seq.command.toLowerCase()) {
            playExpressionSequence(seq);
            return true;
        }
    }
    return false;
}

// -- Default expression preset -------------------------------------------------
// The preset the user reverts to after a timed expression or trigger fires.
// null = clear all groups back to neutral.

export function getDefaultExprPresetId(): string | null {
    try {
        const v = getSettings().defaultExprPresetId;
        return typeof v === "string" && v ? v : null;
    } catch { return null; }
}

export function setDefaultExprPresetId(id: string | null): void {
    try {
        const store = getSettings();
        if (id) { store.defaultExprPresetId = id; } else { delete store.defaultExprPresetId; }
        syncSettings();
    } catch { /* ignore */ }
}

// -- Auto-apply default face on room join --------------------------------------
// When enabled, the default ★ face preset is applied automatically each time
// the player enters a room (on ChatRoomSync hook in main.ts).

export function getAutoApplyDefaultFace(): boolean {
    try {
        const v = getSettings().autoApplyDefaultFace;
        return v === true;
    } catch { return false; }
}

export function setAutoApplyDefaultFace(on: boolean): void {
    try {
        const store = getSettings();
        if (on) { store.autoApplyDefaultFace = true; } else { delete store.autoApplyDefaultFace; }
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
        const v = getSettings().expressionTriggers;
        return Array.isArray(v) ? (v as ExpressionTrigger[]) : [];
    } catch { return []; }
}

export function saveExpressionTriggers(triggers: ExpressionTrigger[]): void {
    try {
        const store = getSettings();
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
                if (defPreset) { applyExpressionPreset(defPreset); return; } // already batched
            }
            // No default — clear all expression groups back to neutral (batched)
            clearAllExprGroups();
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
export function isExprSeqRunning(): boolean { return _seqRunning; }

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
            if (step.reset) {
                // Apply the default face preset (already batched), or clear all groups in one batch.
                const defaultId = getDefaultExprPresetId();
                if (defaultId) {
                    const defPreset = getExpressionPresets().find(p => p.id === defaultId);
                    if (defPreset) { applyExpressionPreset(defPreset); } // batched — one refresh+sync
                    else { clearAllExprGroups(); }
                } else {
                    clearAllExprGroups();
                }
            } else {
                // Apply all groups in this step with noSync, then one refresh + one sync for the step.
                const groups = step.groups ?? {};
                for (const [group, name] of Object.entries(groups)) {
                    try { applyExprGroup(group, name ?? null, true); } catch { /* skip */ }
                }
                try { callBC(() => CharacterRefresh(Player, false)); } catch { /* ignore */ }
                syncAppearance();
            }
        } catch { /* ignore */ }
        i++;
        window.setTimeout(runStep, Math.max(100, step.delayMs ?? 500));
    };

    runStep();
}
