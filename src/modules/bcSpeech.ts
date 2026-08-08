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

// True only while sendBeepViaBC is inside ServerSendBeepMessage. main.ts hooks
// that function to catch beeps sent through BC's OWN ui (/beep, the friend list
// button) which EBC would otherwise never see. Once EBC started routing its own
// beeps through it as well, that hook began logging them too - on top of the
// entry sendBeep already writes - so every sent message appeared twice.
let _ebcOriginated = false;
export function isEbcOriginatedBeep(): boolean { return _ebcOriginated; }

/**
 * The rule addon most likely responsible for a blocked send, named only when it
 * is actually loaded. BCX is the usual one but not the only thing that can hook
 * these functions, so an unknown blocker is described rather than misattributed.
 */
export function ruleAddonName(): string {
    try {
        const sdk = (window as unknown as Record<string, unknown>).bcModSdk as
            { getModsInfo?: () => Array<{ name?: string }> } | undefined;
        const mods = sdk?.getModsInfo?.();
        if (Array.isArray(mods) && mods.some(m => (m.name ?? "").toUpperCase() === "BCX")) return "BCX";
    } catch { /* ignore */ }
    return "a rule addon";
}

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
    try {
        _ebcOriginated = true;
        viaBC(target, message, { includeRoom });
    } catch {
        // Deliberately no raw-send fallback here. If a hook threw we cannot tell
        // whether it meant to block us, and guessing "send it anyway" would put
        // the bypass straight back. Report undelivered instead.
        return false;
    } finally {
        _ebcOriginated = false;
    }
    if (before < 0) return true;              // no log to compare against
    return (log as unknown[]).length > before;
}

/**
 * Sends a room emote.
 *
 * This deliberately does NOT go through BC's ChatRoomSendEmote, unlike beeps
 * above. It did for a while, so that rule addons hooking that function would
 * see EBC's emotes - but routing through it also meant BC re-parsed our text as
 * chat syntax, and emotes started arriving without the sender's name in front.
 * Two attempts to explain that failed, and a broken sidebar button is a worse
 * problem than an unenforced rule nobody had reported.
 *
 * What that costs: a BCX rule forbidding emotes, and BC's own owner "BlockEmote"
 * presence rule, do not apply to emotes sent from EBC's buttons, anims or outfit
 * announcements. Beeps - which is what was actually reported - still go through
 * BC's function, so rules on those are still enforced.
 */
export function sendRoomEmote(content: string): void {
    ServerSend("ChatRoomChat", { Type: "Emote", Content: content, Dictionary: [] });
}
