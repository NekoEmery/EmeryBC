// General EmeryBC settings — lightweight key/value flags stored in ExtensionSettings.

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

// -- Badge visibility ----------------------------------------------------------
// Controls whether the EBC overhead badge is broadcast to other users.
// Defaults to true (badge shown). Setting to false clears presence from
// OnlineSharedSettings so no one else renders the tag above your head.

export function getBadgeEnabled(): boolean {
    return getStore().badgeEnabled !== false;
}

export function setBadgeEnabled(value: boolean): void {
    getStore().badgeEnabled = value;
    ServerPlayerExtensionSettingsSync("EmeryBC");
}
