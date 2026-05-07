// General EmeryBC settings — lightweight key/value flags stored in ExtensionSettings.

function getStore(): Record<string, unknown> | null {
    try {
        if (!Player?.ExtensionSettings) return null;
        if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
    } catch {
        return null;
    }
}

// -- Badge visibility ----------------------------------------------------------
// Controls whether the EBC overhead badge is broadcast to other users.
// Defaults to true (badge shown). Setting to false clears presence from
// OnlineSharedSettings so no one else renders the tag above your head.

export function getBadgeEnabled(): boolean {
    try {
        return getStore()?.badgeEnabled !== false;
    } catch {
        return true; // safe default
    }
}

export function setBadgeEnabled(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.badgeEnabled = value;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    } catch { /* ignore */ }
}

// -- Version badge visibility --------------------------------------------------
// When enabled, the overhead EBC badge shows the player's EBC version number.
// Defaults to false (badge shows just "EBC").

export function getShowVersionBadge(): boolean {
    try { return getStore()?.showVersionBadge === true; } catch { return false; }
}

export function setShowVersionBadge(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.showVersionBadge = value;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    } catch { /* ignore */ }
}

// -- Anti-restraint -----------------------------------------------------------
// When enabled, any restraint applied to the player by someone else is
// immediately removed and a playful emote is sent to the room.

export function getAntiRestraintEnabled(): boolean {
    try { return getStore()?.antiRestraint === true; } catch { return false; }
}

export function setAntiRestraintEnabled(value: boolean): void {
    try {
        const store = getStore();
        if (!store) return;
        store.antiRestraint = value;
        ServerPlayerExtensionSettingsSync("EmeryBC");
    } catch { /* ignore */ }
}
