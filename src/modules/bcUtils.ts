import LZString from "lz-string";

// ---------------------------------------------------------------------------
// Compressed ExtensionSettings — single in-memory object, flushed as a
// Base64-compressed JSON blob under Player.ExtensionSettings.EmeryBC._d.
//
// Migration path: if _d doesn't exist, all existing raw keys are copied into
// _mem and immediately re-flushed in compressed form. Old keys are NOT deleted
// (safe fallback for one session if an older EBC build is loaded).
// ---------------------------------------------------------------------------

const COMPRESSED_KEY = "_d";
let _mem: Record<string, unknown> = {};
let _initialized = false;

export function initSettings(): void {
    if (_initialized) return;
    _initialized = true;

    const raw = (Player.ExtensionSettings.EmeryBC ?? {}) as Record<string, unknown>;
    const compressed = raw[COMPRESSED_KEY];

    if (typeof compressed === "string" && compressed.length > 0) {
        try {
            const json = LZString.decompressFromBase64(compressed);
            if (json) {
                const parsed = JSON.parse(json) as unknown;
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                    _mem = parsed as Record<string, unknown>;
                    _migrateKittyFromLocalStorage();
                    return;
                }
            }
        } catch { /* fall through to legacy migration */ }
    }

    // Legacy format: copy all real data keys into _mem, skip _d itself
    _mem = {};
    for (const [k, v] of Object.entries(raw)) {
        if (k !== COMPRESSED_KEY) _mem[k] = v;
    }
    _migrateKittyFromLocalStorage();
    flushToExtensionSettings(); // immediately rewrite in compressed form
}

/** Migrate Kitty data from localStorage into the compressed settings blob. */
function _migrateKittyFromLocalStorage(): void {
    const KITTY_LS_KEYS = [
        "EBC_kittyMood", "EBC_kittyEmotes", "EBC_kittyPoses",
        "EBC_kittyRestraintSets", "EBC_kittyReactions",
        "EBC_kittyExprPresets", "EBC_kittyPunishments",
    ] as const;
    for (const lsKey of KITTY_LS_KEYS) {
        const settingKey = lsKey.slice(4); // strip "EBC_" → e.g. "kittyMood"
        if (_mem[settingKey] !== undefined) continue;
        try {
            const raw = localStorage.getItem(lsKey);
            if (raw) {
                _mem[settingKey] = JSON.parse(raw) as unknown;
                localStorage.removeItem(lsKey);
            }
        } catch { /* ignore */ }
    }
}

/** Returns the live in-memory settings object shared by all EBC modules. */
export function getSettings(): Record<string, unknown> {
    if (!_initialized) initSettings();
    return _mem;
}

/** Serialise _mem, compress, and write to Player.ExtensionSettings.EmeryBC._d. */
export function flushToExtensionSettings(): void {
    try {
        const compressed = LZString.compressToBase64(JSON.stringify(_mem));
        if (!Player.ExtensionSettings.EmeryBC ||
            typeof Player.ExtensionSettings.EmeryBC !== "object") {
            Player.ExtensionSettings.EmeryBC = {};
        }
        (Player.ExtensionSettings.EmeryBC as Record<string, unknown>)[COMPRESSED_KEY] = compressed;
    } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------

/**
 * Call a BC function, swallowing both synchronous throws AND async rejections.
 *
 * In BC R127+ any function can be hooked by a mod with an async wrapper.
 * If that async wrapper rejects, the caller gets an unhandled Promise rejection
 * because normal try/catch only covers synchronous throws.
 * Wrapping with this helper catches both paths.
 */
export function callBC(fn: () => unknown): void {
    try {
        const r = fn();
        if (r && typeof (r as Promise<unknown>).catch === "function")
            (r as Promise<unknown>).catch(() => {});
    } catch { /* ignore */ }
}

// Set to true when EBC initiates a ChatRoomLeave so the ChatRoomRun guard
// knows to skip null-ChatRoomData frames without affecting map rooms.
let _leavePending = false;
export function setLeavePending(): void { _leavePending = true; }
export function isLeavePending(): boolean { return _leavePending; }
export function clearLeavePending(): void { _leavePending = false; }

/** Returns the player's display name (nickname if set, otherwise Name). */
export function getDisplayName(): string {
    const nickFn = (window as unknown as Record<string, unknown>).CharacterNickname;
    if (typeof nickFn === "function") return (nickFn as (c: Character) => string)(Player);
    return (Player as unknown as Record<string, unknown>).Nickname as string || Player.Name || "Player";
}

// ---------------------------------------------------------------------------
// Rate-limit helpers
// ---------------------------------------------------------------------------

// Debounced ServerPlayerExtensionSettingsSync("EmeryBC").
// Collapses rapid back-to-back saves (outfit flag toggles, settings changes,
// etc.) into a single server request fired 400 ms after the last call.
let _syncTimer: ReturnType<typeof setTimeout> | null = null;
export function syncSettings(): void {
    if (_syncTimer !== null) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => {
        _syncTimer = null;
        flushToExtensionSettings();
        try { ServerPlayerExtensionSettingsSync("EmeryBC"); } catch { /* ignore */ }
    }, 400);
}

// Debounced appearance broadcast — collapses rapid expression chip clicks into
// one ChatRoomCharacterUpdate + ServerPlayerAppearanceSync pair fired 300 ms
// after the last change. CharacterRefresh (local canvas refresh) still fires
// immediately; only the server round-trips are deferred.
let _appearTimer: ReturnType<typeof setTimeout> | null = null;
export function syncAppearance(): void {
    if (_appearTimer !== null) clearTimeout(_appearTimer);
    _appearTimer = setTimeout(() => {
        _appearTimer = null;
        try { callBC(() => ChatRoomCharacterUpdate(Player)); } catch { /* ignore */ }
        try { callBC(() => ServerPlayerAppearanceSync()); } catch { /* ignore */ }
    }, 300);
}
