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
