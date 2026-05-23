import LZString from "lz-string";

// ---------------------------------------------------------------------------
// In-memory settings store — all EBC modules read/write through getSettings().
//
// Storage format: plain key/value pairs written directly under
// Player.ExtensionSettings.EmeryBC (no compression).
//
// One-time recovery migration: v4.6.2–v4.6.4 stored everything in a
// compressed _d blob.  If _d exists and decompresses to a non-empty object,
// its contents are restored to plain keys and the blob is removed.
// If _d was corrupted by v4.6.4 (empty object), the pre-v4.6.2 raw keys
// that were never deleted are used instead — recovering data from there.
// ---------------------------------------------------------------------------

// Only used to decompress the legacy _d blob during the one-time migration.
// Never written again after this.
const COMPRESSED_KEY = "_d";

let _mem: Record<string, unknown> = {};
let _initialized = false;

export function initSettings(): void {
    if (_initialized) return;

    // Do not initialise until BC has fully built Player.ExtensionSettings.
    // getSettings() will retry on the next call — nothing is lost.
    if (!Player.ExtensionSettings) return;

    _initialized = true;

    const raw = (Player.ExtensionSettings.EmeryBC ?? {}) as Record<string, unknown>;

    // ── Recovery: try to decompress legacy _d blob (v4.6.2–v4.6.4) ──────────
    // Only accept it if it contains at least one key.  An empty object means
    // v4.6.4 corrupted it with an empty sync; in that case fall through to the
    // raw keys below which were never overwritten and still hold the real data.
    const blob = raw[COMPRESSED_KEY];
    if (typeof blob === "string" && blob.length > 0) {
        try {
            const json = LZString.decompressFromBase64(blob);
            if (json) {
                const parsed = JSON.parse(json) as unknown;
                if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
                    Object.keys(parsed as object).length > 0) {
                    _mem = parsed as Record<string, unknown>;
                    _migrateKittyFromLocalStorage();
                    flushToExtensionSettings(); // rewrite as plain keys, removes _d
                    return;
                }
            }
        } catch { /* fall through to raw keys */ }
    }

    // ── Plain raw keys (pre-v4.6.2 format or recovery from corrupted _d) ────
    _mem = {};
    for (const [k, v] of Object.entries(raw)) {
        if (k !== COMPRESSED_KEY) _mem[k] = v;
    }
    _migrateKittyFromLocalStorage();
    flushToExtensionSettings(); // write back immediately so _d is cleared
}

/** Migrate Kitty data from localStorage into the settings store. */
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
            const val = localStorage.getItem(lsKey);
            if (val) {
                _mem[settingKey] = JSON.parse(val) as unknown;
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

/** Write _mem as plain keys directly to Player.ExtensionSettings.EmeryBC. */
export function flushToExtensionSettings(): void {
    try {
        if (!Player.ExtensionSettings) return;
        if (!Player.ExtensionSettings.EmeryBC ||
            typeof Player.ExtensionSettings.EmeryBC !== "object") {
            Player.ExtensionSettings.EmeryBC = {} as typeof Player.ExtensionSettings.EmeryBC;
        }
        const target = Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
        // Remove the legacy compressed blob — never written back.
        delete target[COMPRESSED_KEY];
        // Sync every in-memory key as a plain value.
        for (const [k, v] of Object.entries(_mem)) {
            target[k] = v;
        }
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
