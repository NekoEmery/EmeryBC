import { appendLocalLogBlock } from "./notify";
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
    // Device-stored keys override the account copy for whatever the user moved
    // off the account on this browser.
    loadDeviceKeysIntoMem();
    // One-time cleanup: old EBC versions wrote an "EmeryBC" key directly into
    // Player.OnlineSettings before settings were moved to ExtensionSettings.
    // BC's PreferenceInitPlayer now warns about unknown OnlineSettings keys, which
    // shows up as a /!\ warning mark over the player's head.  Remove the stale key.
    try {
        const onlineSettings = (Player as unknown as Record<string, unknown>).OnlineSettings as
            Record<string, unknown> | undefined;
        if (onlineSettings && "EmeryBC" in onlineSettings) {
            delete onlineSettings["EmeryBC"];
            try {
                const syncFn = (window as unknown as Record<string, unknown>).ServerPlayerSettingsSync;
                if (typeof syncFn === "function") (syncFn as () => void)();
            } catch { /* ignore */ }
        }
    } catch { /* ignore */ }

    // Prune oversized data accumulated by old EBC versions:
    // - peopleMet capped at 300 entries (was 2000, ~27 bytes/entry = 54 KB)
    // - beepHistory capped at 100 entries (was 300, each up to 500+ bytes)
    // - friendNames / friendAccountNames capped at 500 entries each (were unbounded)
    try {
        if (Array.isArray(_mem.peopleMet) && (_mem.peopleMet as unknown[]).length > 150) {
            (_mem.peopleMet as unknown[]).splice(0, (_mem.peopleMet as unknown[]).length - 150);
        }
        if (Array.isArray(_mem.beepHistory) && (_mem.beepHistory as unknown[]).length > 100) {
            (_mem.beepHistory as unknown[]).splice(0, (_mem.beepHistory as unknown[]).length - 100);
        }
        for (const key of ["friendNames", "friendAccountNames"] as const) {
            const d = _mem[key];
            if (d && typeof d === "object" && !Array.isArray(d)) {
                const keys = Object.keys(d as Record<string, unknown>);
                if (keys.length > 500) {
                    for (const k of keys.slice(0, keys.length - 500))
                        delete (d as Record<string, unknown>)[k];
                }
            }
        }
    } catch { /* ignore */ }

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

/**
 * Re-seed _mem from EmeryBC settings data without overwriting keys that already
 * have in-session values.
 *
 * Pass ebcData (the raw EmeryBC object from the server response, i.e.
 * args[1].ExtensionSettings.EmeryBC from the PreferenceInitPlayer hook) when
 * calling from PreferenceInitPlayer. BC sets Player.ExtensionSettings at line
 * 1183 of LoginSetupPlayer, which is AFTER PreferenceInitPlayer is called at
 * line 1098 — so reading from Player.ExtensionSettings inside that hook always
 * sees stale/empty data. Passing the raw server value bypasses this race.
 *
 * When ebcData is omitted, falls back to Player.ExtensionSettings.EmeryBC (for
 * call sites outside the login flow where the race doesn't apply).
 */
export function reinitFromExtensionSettings(ebcData?: Record<string, unknown>): void {
    try {
        let src: Record<string, unknown>;
        if (ebcData !== undefined) {
            src = ebcData;
        } else {
            if (!Player.ExtensionSettings) return;
            src = (Player.ExtensionSettings.EmeryBC ?? {}) as Record<string, unknown>;
        }
        for (const [k, v] of Object.entries(src)) {
            if (k === "_d") continue;
            // Name caches: merge server data (full cache) with whatever is in _mem
            // (which may be a smaller tablet-local cache), with in-memory winning on conflict.
            // Without this merge, a tablet session that ran initSettings() before the server
            // response arrived sees only its own partial friendNames and reinit skips the key.
            if ((k === "friendNames" || k === "friendAccountNames") &&
                v && typeof v === "object" && !Array.isArray(v)) {
                const inMem = _mem[k];
                if (inMem && typeof inMem === "object" && !Array.isArray(inMem)) {
                    _mem[k] = { ...(v as Record<string, string>), ...(inMem as Record<string, string>) };
                } else {
                    _mem[k] = v;
                }
            } else if (_mem[k] === undefined) {
                _mem[k] = v;
            }
        }
        // Device-stored keys override whatever the account had for them.
        loadDeviceKeysIntoMem();
        _initialized = true;
    } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Device-stored keys
// ---------------------------------------------------------------------------
// Any settings key listed here is persisted to this browser's localStorage
// instead of the BC account. Every getter/setter in the addon still reads and
// writes _mem exactly as before - only where the data lands changes. Keeping the
// split at the persistence layer means no feature code needs to know about it.

const DEVICE_KEYS_LS = "EBC_deviceKeys";

/**
 * Whole lists kept on the device rather than per-key. Outfits and restraint
 * sets are stored this way because they are moved to the device ONE AT A TIME
 * (the per-item Account/Local pill), so there is no single settings key to flag
 * - the list is split, half on the account and half here.
 *
 * Declared here rather than in outfitManager so the backup code can see them.
 * It could not, which meant a backup silently left out every outfit you had
 * moved to this device.
 */
export const LOCAL_OUTFITS_KEY    = "EBC_localOutfits";
export const LOCAL_RESTRAINTS_KEY = "EBC_localRestraints";

/**
 * Settings keys that must never become device keys.
 *
 * These hold lists whose items each carry their own account/device flag, so
 * moving the whole key is a second, conflicting way to say the same thing - and
 * the two disagreeing is what stranded outfits on a single browser.
 */
export const PER_ITEM_SETTINGS_KEYS = ["outfits", "restraints", "restraintPresets"];
const DEVICE_VAL_PREFIX = "EBC_dev_";

export function getDeviceKeys(): Set<string> {
    try {
        const raw = localStorage.getItem(DEVICE_KEYS_LS);
        const v = raw ? JSON.parse(raw) as unknown : null;
        return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
    } catch { return new Set(); }
}

export function setDeviceKeys(keys: Set<string>): void {
    try { localStorage.setItem(DEVICE_KEYS_LS, JSON.stringify([...keys])); } catch { /* ignore */ }
}

/** Reads one device-stored key straight from localStorage (null when absent). */
export function readDeviceValue(key: string): unknown {
    try {
        const raw = localStorage.getItem(DEVICE_VAL_PREFIX + key);
        return raw === null ? null : JSON.parse(raw) as unknown;
    } catch { return null; }
}

export function writeDeviceValue(key: string, value: unknown): void {
    try {
        if (value === undefined || value === null) localStorage.removeItem(DEVICE_VAL_PREFIX + key);
        else localStorage.setItem(DEVICE_VAL_PREFIX + key, JSON.stringify(value));
    } catch { /* ignore */ }
}

/** Pulls every device-stored key into _mem. Called after the account settings
 *  load so the device copy wins for keys the user moved off the account. */
export function loadDeviceKeysIntoMem(): void {
    try {
        for (const k of getDeviceKeys()) {
            const v = readDeviceValue(k);
            if (v !== null) _mem[k] = v;
        }
    } catch { /* ignore */ }
    migrateOutfitKeysOffDeviceStorage();
}

/**
 * Takes `outfits` and `restraints` back off the device-key mechanism.
 *
 * Those two are stored per item - each outfit carries its own `local` flag - and
 * the storage manager now drives that flag. It used to move the whole settings
 * KEY instead, and anyone who pressed the button back then still has the key
 * registered here. That matters because the flush nulls the account copy of
 * every device key on every sync, so the outfits stayed on the one browser that
 * made the switch and every other device saw nothing - while the button, now
 * reading the per-item flags, reported them as being on the account.
 *
 * The device copy is loaded into memory first, so this hands the outfits back to
 * the account rather than dropping them: whichever device runs this is the one
 * that still had them, and its copy is what gets uploaded.
 */
function migrateOutfitKeysOffDeviceStorage(): void {
    try {
        const dev = getDeviceKeys();
        const stale = PER_ITEM_SETTINGS_KEYS.filter(k => dev.has(k));
        if (stale.length === 0) return;

        // _mem already holds the device copy (loaded just above). Dropping the
        // registration is what lets the next flush put it back on the account.
        for (const k of stale) {
            const v = readDeviceValue(k);
            if (v !== null) _mem[k] = v;
            dev.delete(k);
        }
        setDeviceKeys(dev);

        // The local copy is NOT deleted here. Until the account actually has the
        // data, that copy is the only one there is - clearing it first would
        // leave the outfits in memory alone, and a session that ended before the
        // next flush would take them with it. Deferred so BC has finished
        // setting up, then removed only once the flush reports it wrote.
        setTimeout(() => {
            try {
                if (!flushToExtensionSettings()) return;   // retry on next load
                try { ServerPlayerExtensionSettingsSync("EmeryBC"); } catch { /* ignore */ }
                for (const k of stale) writeDeviceValue(k, null);
                console.info(`[EBC] Moved ${stale.join(", ")} back to account storage - `
                    + "these are managed per item now, not per key.");
            } catch { /* ignore - the device copy is still intact */ }
        }, 2000);
    } catch { /* ignore */ }
}


/** Write _mem as plain keys to Player.ExtensionSettings.EmeryBC. */
// Hard ceiling for EBC's ExtensionSettings blob. BC accounts share a ~180 KB
// budget across ALL addons - pushing an oversized account update gets the
// connection dropped by the server, and since the data is re-flushed after every
// relog the client ends up in an infinite reconnect loop. Never let that happen.
export const SETTINGS_FLUSH_CAP = 150_000;

/** Warn about the cap once a session - it is hit on every sync, not once. */
let _flushCapWarned = false;

/** Serialized size (in characters ~ bytes) of EBC's whole settings blob. */
export function getSettingsBlobSize(): number {
    try {
        const dev = getDeviceKeys();
        if (dev.size === 0) return JSON.stringify(_mem).length;
        const acct: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(_mem)) if (!dev.has(k)) acct[k] = v;
        return JSON.stringify(acct).length;
    } catch { return 0; }
}

export function flushToExtensionSettings(): boolean {
    try {
        if (!Player.ExtensionSettings) return false;
        try {
            const size = JSON.stringify(_mem).length;
            if (size > SETTINGS_FLUSH_CAP) {
                console.error(`[EBC] Settings NOT synced - data too large (${Math.round(size / 1000)} KB > ${SETTINGS_FLUSH_CAP / 1000} KB cap).`);
                // Said out loud, once. This is the worst of the three "full"
                // states because nothing else shows it: saving simply stops
                // working and the only sign was a console line nobody opens.
                if (!_flushCapWarned) {
                    _flushCapWarned = true;
                    appendLocalLogBlock("EBC has stopped saving to your account", [
                        `Everything EBC stores adds up to ${Math.round(size / 1000)} KB, over the ${SETTINGS_FLUSH_CAP / 1000} KB the game allows.`,
                        "Nothing is lost - it is all still here for this session. It just cannot be sent to your account, so a reload would lose the newest bits.",
                        "To fix it: open SETTINGS, then Storage. Move outfits to This device, or clear something you do not need.",
                        "Crafted items take by far the most room.",
                    ], "#ff8a8a");
                }
                return false;
            }
        } catch { /* size check best-effort */ }
        if (!Player.ExtensionSettings.EmeryBC ||
            typeof Player.ExtensionSettings.EmeryBC !== "object") {
            Player.ExtensionSettings.EmeryBC = {} as typeof Player.ExtensionSettings.EmeryBC;
        }
        const target = Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
        const deviceKeys = getDeviceKeys();
        // Remove stale _d blob if it somehow survived.
        delete target["_d"];
        for (const [k, v] of Object.entries(_mem)) {
            // Device-stored: persist locally and null the account copy, otherwise
            // the old (large) server value would linger - the flush only ever
            // copies keys to the server, it never removes them.
            if (deviceKeys.has(k)) {
                writeDeviceValue(k, v);
                target[k] = null;
                continue;
            }
            // Name caches are MERGED with the server copy rather than overwritten.
            // Without this, a secondary device (tablet) that has only seen a handful
            // of friends pushes its tiny cache over the desktop's full one the moment
            // any sync fires — leaving everyone as #number on next login.
            if ((k === "friendNames" || k === "friendAccountNames") &&
                v && typeof v === "object" && !Array.isArray(v)) {
                const existing = target[k];
                if (existing && typeof existing === "object" && !Array.isArray(existing)) {
                    // Server data as base, in-memory (current session) wins on conflict.
                    const merged = { ...(existing as Record<string, string>), ...(v as Record<string, string>) };
                    // Keep within the 500-entry cap to avoid bloating the sync payload.
                    const keys = Object.keys(merged);
                    if (keys.length > 500) {
                        for (const ek of keys.slice(0, keys.length - 500)) delete merged[ek];
                    }
                    target[k] = merged;
                } else {
                    target[k] = v;
                }
            } else {
                target[k] = v;
            }
        }
        return true;
    } catch { return false; }
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
        // Only push to the server when the flush actually wrote - an oversized
        // blob is kept in-memory only (see SETTINGS_FLUSH_CAP above).
        if (flushToExtensionSettings()) {
            try { ServerPlayerExtensionSettingsSync("EmeryBC"); } catch { /* ignore */ }
        }
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

// ---------------------------------------------------------------------------
// Room search result relay
//
// BC R128 keeps ServerSocket module-scoped (not on window), so attaching
// listeners via window.ServerSocket is unreliable.  Instead, main.ts hooks
// the BC global ChatRoomSearchResult function and calls fireRoomSearchResult.
// Any module (e.g. drawer.ts) can register a one-shot callback via
// setRoomSearchCallback to receive the next result list.
// ---------------------------------------------------------------------------

type RoomSearchCb = (list: Array<Record<string, unknown>>) => void;
let _roomSearchCb: RoomSearchCb | null = null;

export function setRoomSearchCallback(cb: RoomSearchCb | null): void { _roomSearchCb = cb; }
export function fireRoomSearchResult(list: Array<Record<string, unknown>>): void {
    const cb = _roomSearchCb;
    if (!cb) return;
    _roomSearchCb = null; // auto-clear (one-shot)
    try { cb(list); } catch { /* ignore */ }
}

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

/** Returns true if the given member number is present in the current chat room. */
export function isInCurrentRoom(memberNumber: number): boolean {
    try {
        const chars = (window as unknown as Record<string, unknown>).ChatRoomCharacter as
            Array<{ MemberNumber?: number }> | undefined;
        if (Array.isArray(chars)) return chars.some(c => c?.MemberNumber === memberNumber);
    } catch { /* ignore */ }
    return false;
}
