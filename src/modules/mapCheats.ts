// Map room cheats.
//
// BC already implements every one of these - it calls the bundle "super powers"
// and gates it behind ChatRoomMapViewHasSuperPowers(), which requires you to be
// a room admin. Turning that one function on gives full vision and hearing,
// maximum sight range, walking through walls, and hidden objects made visible,
// all through BC's own tested code paths rather than a reimplementation.
//
// So this module is mostly a switch, not a feature. The parts BC has no path
// for at all are the door keys, which are normally only picked up by walking
// over them on the map.
//
// These are client-side. Nothing here changes what anyone else sees, and
// nothing is broadcast - which also means that in a game built on not knowing
// where people are, this is the thing that quietly stops it being a game. It
// is off by default and worth leaving off in someone else's scene.

import { getSettings, syncSettings, callBC } from "./bcUtils";

/** Everything BC's own super-powers mode covers, minus the admin requirement. */
export function getMapSuperPowers(): boolean {
    try { return getSettings()?.mapSuperPowers === true; } catch { return false; }
}

export function setMapSuperPowers(v: boolean): void {
    try { getSettings().mapSuperPowers = v; syncSettings(); } catch { /* ignore */ }
}

/**
 * Fog alone.
 *
 * Separate from super powers because seeing the map is a much smaller thing
 * than walking through its walls, and wanting the first is not wanting the
 * second - reading a room's layout does not have to come with moving through it
 * in ways nobody else can.
 */
export function getMapFogOff(): boolean {
    try { return getSettings()?.mapFogOff === true; } catch { return false; }
}

export function setMapFogOff(v: boolean): void {
    try { getSettings().mapFogOff = v; syncSettings(); } catch { /* ignore */ }
}

export type MapKey = "Bronze" | "Silver" | "Gold";
export const MAP_KEYS: MapKey[] = ["Bronze", "Silver", "Gold"];

interface MapPrivateState { HasKeyBronze?: boolean; HasKeySilver?: boolean; HasKeyGold?: boolean }

function privateState(): MapPrivateState | null {
    try {
        const md = (Player as unknown as { MapData?: { PrivateState?: MapPrivateState } }).MapData;
        if (!md) return null;
        if (!md.PrivateState) md.PrivateState = {};
        return md.PrivateState;
    } catch { return null; }
}

/** True when the player is holding that key. */
export function hasMapKey(key: MapKey): boolean {
    const st = privateState();
    return st ? st[`HasKey${key}` as keyof MapPrivateState] === true : false;
}

/**
 * Gives or takes a door key.
 *
 * The same field BC sets when you walk over the key on the floor, followed by
 * the same update BC sends afterwards - so the server keeps it and it survives
 * leaving the map, exactly as a key picked up the normal way would.
 *
 * Returns false when there is no map data yet, which is the case until the map
 * has been opened at least once.
 */
export function setMapKey(key: MapKey, held: boolean): boolean {
    const st = privateState();
    if (!st) return false;
    try {
        (st as Record<string, boolean>)[`HasKey${key}`] = held;
        callBC(() => {
            const send = (window as unknown as Record<string, unknown>).ServerSend as
                ((type: string, data: unknown) => void) | undefined;
            send?.("ChatRoomCharacterMapDataUpdate",
                (Player as unknown as { MapData?: unknown }).MapData);
        });
        return true;
    } catch { return false; }
}

/** True when the player is on a map room at all - the controls are dead otherwise. */
export function inMapRoom(): boolean {
    try {
        const w = window as unknown as Record<string, unknown>;
        const data = w.ChatRoomData as { MapData?: { Type?: string } } | null | undefined;
        const type = data?.MapData?.Type;
        return type === "Always" || type === "Hybrid";
    } catch { return false; }
}
