// Routes outgoing speech through BC's own send functions instead of the raw
// socket.
//
// Rule addons (BCX above all) enforce restrictions by hooking the named BC
// globals - ServerSendBeepMessage for beeps, ChatRoomSendEmote for emotes,
// ChatRoomSendWhisper for whispers. Anything that calls ServerSend() itself
// skips that hook chain entirely, so a person who had deliberately turned on a
// "no beeping" rule could still beep from EBC's own windows. That is a consent
// bypass, not a convenience bug: the rule was opted into and EBC was quietly
// stepping around it.
//
// Every helper here falls back to the direct send when the BC global is
// missing, so a BC version that renames or drops one of them degrades to the
// old behaviour rather than going silent.
//
// EBC protocol traffic ("[EBC-..." payloads: toy sync, group routing) is
// deliberately NOT routed through here. It is addon-to-addon sync, not the
// person speaking, and putting it through the speech pipeline would both
// mangle it and make unrelated rules break EBC's internals.

type WinFns = Record<string, unknown>;

/**
 * Sends a beep, honouring any rule addon hooked onto ServerSendBeepMessage.
 *
 * Returns false when a hook swallowed the beep, so callers can skip recording
 * it as sent. BC's function returns void, so the block is detected by watching
 * FriendListBeepLog: the real implementation always appends an entry as its
 * last step, so an unchanged log means the call never reached it.
 *
 * @param includeRoom - attaches the current room, giving the recipient a join
 *   button. Maps to BC's IsSecret:false.
 */
export function sendBeepViaBC(target: number, message: string, includeRoom: boolean): boolean {
    const w = window as unknown as WinFns;
    const viaBC = w.ServerSendBeepMessage as
        ((t: number, m?: string, o?: { includeRoom?: boolean }) => void) | undefined;

    if (typeof viaBC !== "function") {
        ServerSend("AccountBeep", { MemberNumber: target, Message: message, BeepType: "", IsSecret: !includeRoom });
        return true;
    }

    const log = w.FriendListBeepLog as unknown[] | undefined;
    const before = Array.isArray(log) ? log.length : -1;
    viaBC(target, message, { includeRoom });
    if (before < 0) return true;              // no log to compare against
    return (log as unknown[]).length > before;
}

/**
 * Sends a room emote through BC's own pipeline.
 *
 * @param content - emote text WITHOUT the leading asterisk. BC's
 *   ChatRoomSendEmote expects the asterisk (it strips it while parsing the
 *   `*50%` chance syntax), so it is added back here.
 */
export function sendEmoteViaBC(content: string): void {
    const w = window as unknown as WinFns;
    const viaBC = w.ChatRoomSendEmote as ((msg: string) => void) | undefined;
    if (typeof viaBC === "function") {
        viaBC("*" + content);
        return;
    }
    ServerSend("ChatRoomChat", { Type: "Emote", Content: content, Dictionary: [] });
}
