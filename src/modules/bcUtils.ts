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
