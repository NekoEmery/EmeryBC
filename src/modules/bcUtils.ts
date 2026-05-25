// ---------------------------------------------------------------------------
// In-memory settings store.  All EBC modules read/write through getSettings().
// Data is stored as plain key/value pairs in Player.ExtensionSettings.EmeryBC.
// ---------------------------------------------------------------------------

let _mem: Record<string, unknown> = {};
let _initialized = false;

export function initSettings(): void {
    if (_initialized) return;
    // If BC hasn't populated Player.ExtensionSettings yet, bail out.
    // getSettings() will retry on the next call once the player is ready.
    if (!Player.ExtensionSettings) return;
    _initialized = true;

    const src = (Player.ExtensionSettings.EmeryBC ?? {}) as Record<string, unknown>;
    // Copy all existing keys into _mem, dropping any legacy _d compression blob.
    _mem = {};
    for (const [k, v] of Object.entries(src)) {
        if (k !== "_d") _mem[k] = v;
    }
    // One-time migration: pull kitty data that may still be in localStorage
    // from before it was moved into ExtensionSettings in v4.6.1.
    _migrateKittyFromLocalStorage();
}

function _migrateKittyFromLocalStorage(): void {
    const LS_KEYS = [
        "EBC_kittyMood", "EBC_kittyEmotes", "EBC_kittyPoses",
        "EBC_kittyRestraintSets", "EBC_kittyReactions",
        "EBC_kittyExprPresets", "EBC_kittyPunishments",
    ] as const;
    for (const lsKey of LS_KEYS) {
        const settingKey = lsKey.slice(4); // "EBC_kittyMood" → "kittyMood"
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

/** Write _mem as plain keys to Player.ExtensionSettings.EmeryBC. */
export function flushToExtensionSettings(): void {
    try {
        if (!Player.ExtensionSettings) return;
        if (!Player.ExtensionSettings.EmeryBC ||
            typeof Player.ExtensionSettings.EmeryBC !== "object") {
            Player.ExtensionSettings.EmeryBC = {} as typeof Player.ExtensionSettings.EmeryBC;
        }
        const target = Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
        // Remove stale _d blob if it somehow survived.
        delete target["_d"];
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
// one ChatRoomCharacterUpdate fired 300 ms after the last change.
// CharacterRefresh (local canvas refresh) still fires immediately; only the
// server round-trip is deferred.
//
// ServerPlayerAppearanceSync is only sent outside a chat room (e.g. wardrobe).
// In a room, ChatRoomCharacterUpdate already handles the room broadcast AND the
// server-side appearance save.  Calling both inside a room is redundant and
// doubles EBC's server traffic — other addons (WCE etc.) may also react to
// ChatRoomCharacterUpdate and send their own syncs on top, compounding the issue.
let _appearTimer: ReturnType<typeof setTimeout> | null = null;
export function syncAppearance(): void {
    if (_appearTimer !== null) clearTimeout(_appearTimer);
    _appearTimer = setTimeout(() => {
        _appearTimer = null;
        try { callBC(() => ChatRoomCharacterUpdate(Player)); } catch { /* ignore */ }
        // Only sync via ServerPlayerAppearanceSync when outside a room — in a room
        // ChatRoomCharacterUpdate already persists the appearance server-side.
        const screen = (window as unknown as Record<string, unknown>).CurrentScreen;
        if (typeof screen !== "string" || screen !== "ChatRoom") {
            try { callBC(() => ServerPlayerAppearanceSync()); } catch { /* ignore */ }
        }
    }, 300);
}

// ---------------------------------------------------------------------------
// Current room name tracker
//
// The 📍 invite button needs to know the player's current room name.
// Accessing window.ChatRoomData.Name is unreliable in newer BC versions where
// ChatRoomData may be module-scoped (not on window).  We track it ourselves
// via the ChatRoomSync hook (data is passed directly to the hook, no window
// lookup needed) and clear it on ChatRoomLeave.
//
// getCurrentRoomName() falls back to window.ChatRoomData?.Name on first call
// so rooms joined before EBC loaded are handled correctly.
// ---------------------------------------------------------------------------

let _currentRoomName = "";

export function setCurrentRoomName(name: string): void { _currentRoomName = name; }
export function clearCurrentRoomName(): void { _currentRoomName = ""; }
export function getCurrentRoomName(): string {
    if (!_currentRoomName) {
        // Lazy init: try window.ChatRoomData for rooms entered before EBC loaded.
        try {
            const w = window as unknown as Record<string, unknown>;
            const cd = w.ChatRoomData as Record<string, unknown> | null | undefined;
            if (cd && typeof cd.Name === "string" && cd.Name.trim()) {
                _currentRoomName = cd.Name.trim();
            }
        } catch { /* ignore */ }
    }
    return _currentRoomName;
}
