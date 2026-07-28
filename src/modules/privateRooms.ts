// Private room sharing.
//
// BC's server never tells you the name of a private room a friend is in - the
// friend query returns Private:true with the name stripped. So this is not a
// lookup, it is a broadcast: while you are in a private room your client beeps
// the room name to people you have chosen, and their client fills it in where
// it would otherwise say "in a private room".
//
// Because it publishes where you are, everything here is off until you turn it
// on, and sending and receiving are separate switches - you can do either, both
// or neither. Recipients are the UNION of three sources so the common cases
// (everyone, just the people I starred, plus a couple of specific others) can be
// combined rather than forcing one model.

import { getSettings, syncSettings } from "./bcUtils";
import { getSpecialFriends } from "./settings";

const RECEIVED_TTL_MS = 15 * 60 * 1000;   // a shared name older than this is stale

function s(): Record<string, unknown> {
    return getSettings() as Record<string, unknown>;
}

function flag(key: string): boolean {
    return s()[key] === true;
}

function setFlag(key: string, v: boolean): void {
    // Written explicitly rather than deleted: the settings flush only ever
    // copies keys to the server, so a deleted key keeps its old value there.
    s()[key] = v;
    syncSettings();
}

export const getShareWithAllFriends = (): boolean => flag("privRoomShareAll");
export const setShareWithAllFriends = (v: boolean): void => setFlag("privRoomShareAll", v);

export const getShareWithStarred = (): boolean => flag("privRoomShareStarred");
export const setShareWithStarred = (v: boolean): void => setFlag("privRoomShareStarred", v);

/** Receiving is independent of sharing - either can be on alone. */
export const getReceiveShared = (): boolean => flag("privRoomReceive");
export const setReceiveShared = (v: boolean): void => setFlag("privRoomReceive", v);

export function getShareList(): number[] {
    const v = s().privRoomShareList;
    return Array.isArray(v) ? v.filter((n): n is number => typeof n === "number") : [];
}

export function addToShareList(memberNumber: number): void {
    if (!memberNumber || getShareList().includes(memberNumber)) return;
    s().privRoomShareList = [...getShareList(), memberNumber];
    syncSettings();
}

export function removeFromShareList(memberNumber: number): void {
    s().privRoomShareList = getShareList().filter(n => n !== memberNumber);
    syncSettings();
}

/** Everyone who should be told, from all three sources combined. */
export function shareRecipients(): number[] {
    const out = new Set<number>();
    try {
        // Read the friend list straight from Player rather than through
        // friends.ts - that module imports this one, and a cycle here would be
        // fragile for no benefit.
        const fl = Array.isArray(Player?.FriendList) ? Player.FriendList as number[] : [];
        if (getShareWithAllFriends()) for (const n of fl) out.add(n);
        if (getShareWithStarred()) for (const n of getSpecialFriends()) out.add(n);
        for (const n of getShareList()) out.add(n);
    } catch { /* ignore */ }
    out.delete(Player?.MemberNumber ?? -1);
    return [...out];
}

export function isSharingEnabled(): boolean {
    return shareRecipients().length > 0;
}

// -- Received names ------------------------------------------------------------
// Memory only. A room name someone shared is theirs, not ours to persist across
// sessions, and it goes stale the moment they move.

const received = new Map<number, { name: string; space: string; ts: number }>();

export function noteSharedRoom(from: number, name: string, space = ""): void {
    if (!getReceiveShared() || !from) return;
    if (!name) { received.delete(from); return; }
    received.set(from, { name, space, ts: Date.now() });
}

/** The private room this person shared with us, or null. */
export function getSharedRoom(memberNumber: number): { name: string; space: string } | null {
    const e = received.get(memberNumber);
    if (!e) return null;
    if (Date.now() - e.ts > RECEIVED_TTL_MS) { received.delete(memberNumber); return null; }
    return { name: e.name, space: e.space };
}

export function clearSharedRooms(): void {
    received.clear();
}

// -- Protocol ------------------------------------------------------------------

const PREFIX = "[EBC-PRIVROOM:";
// Unit separator - a control character, so it can never collide with a real
// room name. Written as an escape: a raw control byte in source does not
// survive editors, copy/paste or encoding changes.
const SEP = "\u001f";

export function buildShareMessage(name: string, space: string): string {
    return `${PREFIX}${name}${SEP}${space}]`;
}

/** Parses an incoming share. Returns null when the message is not one. */
export function parseShareMessage(msg: string): { name: string; space: string } | null {
    if (!msg.startsWith(PREFIX) || !msg.endsWith("]")) return null;
    const body = msg.slice(PREFIX.length, -1);
    const sep = body.indexOf(SEP);
    return sep >= 0
        ? { name: body.slice(0, sep), space: body.slice(sep + 1) }
        : { name: body, space: "" };
}

// -- Sending -------------------------------------------------------------------

let lastSentRoom = "";

/**
 * Tells the chosen people which private room you are in, or that you have left
 * one. Only fires when the room actually changed, so moving around does not
 * spam a beep per sync.
 *
 * @param send - injected so this module does not depend on friends.ts's sender
 *   and create an import cycle.
 */
export function broadcastRoom(send: (to: number, msg: string) => void): void {
    try {
        const w = window as unknown as Record<string, unknown>;
        const data = w.ChatRoomData as { Name?: string; Space?: string; Visibility?: string[] } | null | undefined;
        const name = String(data?.Name ?? "");
        // "Private" here means anyone who is not already allowed to see it in the
        // room list - exactly the case where the friend query strips the name.
        const vis = Array.isArray(data?.Visibility) ? data?.Visibility ?? [] : [];
        const isPrivate = !!name && !vis.includes("All");
        const payload = isPrivate ? name : "";

        if (payload === lastSentRoom) return;
        lastSentRoom = payload;

        const targets = shareRecipients();
        if (targets.length === 0) return;
        const msg = buildShareMessage(payload, String(data?.Space ?? ""));
        targets.forEach((n, i) => {
            // Staggered so a long list never trips the server's rate limiter.
            window.setTimeout(() => { try { send(n, msg); } catch { /* ignore */ } }, i * 250);
        });
    } catch { /* ignore */ }
}
