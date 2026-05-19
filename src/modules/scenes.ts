// Scene sequencer — chain pose changes, item equips/unequips, emotes and
// waits into a named sequence that plays back step by step with per-step timing.

import { applyPoses } from "./poses";
import { snapshotPlayerRestraints } from "./antiRestraint";
import { callBC, getDisplayName, syncSettings } from "./bcUtils";

export type StepType = "pose" | "equip" | "equip-restraint" | "equip-clothes" | "unequip" | "emote" | "chat" | "wait";

export interface SceneStep {
    type: StepType;
    delayMs: number;            // ms to wait BEFORE this step fires
    poses?: string[];           // pose: full active-pose list to set
    group?: string;             // equip / unequip: item group name
    assetName?: string;         // equip: asset name
    color?: string | string[];  // equip: optional color(s)
    propertyType?: string;      // equip: item Property.Type (e.g. "Tight", "Wrist", "Double")
    heightModifier?: number;    // equip: item Property.HeightModifier for VariableHeight items
    text?: string;              // emote / chat: message text
    chatFormat?: "" | "*" | "("; // chat: wrap style — "" plain, "*" emote, "(" OOC
}

export interface Scene {
    id: string;
    name: string;
    steps: SceneStep[];
    command?: string;
}

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function load(): Scene[] {
    const raw = getStore().scenes;
    return Array.isArray(raw) ? (raw as Scene[]) : [];
}

function saveScenes(list: Scene[]): void {
    getStore().scenes = list;
    syncSettings();
}

export function getScenes(): Scene[] { return load(); }

export function createScene(name: string, steps: SceneStep[], command = ""): Scene {
    const scene: Scene = {
        id: uid(),
        name: name.trim() || "Scene",
        steps,
        command: command.toLowerCase().trim().replace(/\s+/g, "") || undefined,
    };
    saveScenes([...load(), scene]);
    return scene;
}

export function updateScene(id: string, name: string, steps: SceneStep[], command = ""): void {
    const list = load();
    const scene = list.find(s => s.id === id);
    if (!scene) return;
    scene.name = name.trim() || scene.name;
    scene.steps = steps;
    scene.command = command.toLowerCase().trim().replace(/\s+/g, "") || undefined;
    saveScenes(list);
}

export function deleteScene(id: string): void {
    saveScenes(load().filter(s => s.id !== id));
}


function executeStep(step: SceneStep): void {
    try {
        switch (step.type) {
            case "pose":
                applyPoses(step.poses ?? []);
                break;
            case "equip":
            case "equip-restraint":
            case "equip-clothes":
                if (step.group && step.assetName) {
                    // InventoryWear actually puts the item on the character;
                    // InventoryAdd only adds to the wardrobe (never appears worn).
                    const color = step.color as string | string[] | undefined;
                    InventoryWear(Player, step.assetName, step.group, color, undefined, Player.MemberNumber);
                    // Apply state/type (e.g. "Tight", "Wrist", "Double") if specified
                    if (step.propertyType || step.heightModifier !== undefined) {
                        const worn = InventoryGet(Player, step.group);
                        if (worn) {
                            if (!worn.Property) worn.Property = {};
                            if (step.propertyType) {
                                // Legacy compat — some BC systems still read Type
                                worn.Property.Type = step.propertyType;
                                // BC R91+ TypeRecord: { "typed": <optionIndex> }
                                type GetOptionsFn = (g: string, n: string) => Array<{ Name: string }> | null;
                                const getFn = (window as unknown as Record<string, unknown>).TypedItemGetOptions as GetOptionsFn | undefined;
                                if (typeof getFn === "function") {
                                    try {
                                        const opts = getFn(step.group, step.assetName!);
                                        if (opts) {
                                            const idx = opts.findIndex(o => o.Name === step.propertyType);
                                            if (idx >= 0)
                                                (worn.Property as Record<string, unknown>).TypeRecord = { typed: idx };
                                        }
                                    } catch { /* ignore */ }
                                }
                            }
                            if (step.heightModifier !== undefined)
                                (worn.Property as Record<string, unknown>).HeightModifier = step.heightModifier;
                        }
                    }
                    // Snapshot BEFORE CharacterRefresh so the anti-restraint hook doesn't
                    // see the newly-added restraint as "unknown" and immediately strip it.
                    snapshotPlayerRestraints();
                    callBC(() => CharacterRefresh(Player, false));
                    callBC(() => ChatRoomCharacterUpdate(Player));
                    callBC(() => ServerPlayerAppearanceSync());
                }
                break;
            case "unequip":
                if (step.group) {
                    InventoryRemove(Player, step.group, false);
                    callBC(() => CharacterRefresh(Player, false));
                    callBC(() => ChatRoomCharacterUpdate(Player));
                    callBC(() => ServerPlayerAppearanceSync());
                }
                break;
            case "emote":
                if (step.text?.trim()) {
                    ServerSend("ChatRoomChat", {
                        Type: "Action",
                        Content: getDisplayName() + " " + step.text.trim(),
                        Dictionary: [
                            { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                            { SourceCharacter: Player.MemberNumber },
                        ],
                    });
                }
                break;
            case "chat":
                if (step.text?.trim()) {
                    const txt = step.text.trim();
                    if (step.chatFormat === "*") {
                        // Emote — BC Type:"Emote" auto-prepends the sender's name and wraps
                        // in *...*. Send only the raw text so it renders as *Name text*.
                        ServerSend("ChatRoomChat", {
                            Type: "Emote",
                            Content: txt,
                        });
                    } else if (step.chatFormat === "(") {
                        // OOC — Type:"Action" already wraps the content in ( ) when rendered.
                        // Don't add our own parens or they double up: ((text)).
                        // Action messages bypass gag speech processing.
                        ServerSend("ChatRoomChat", {
                            Type: "Action",
                            Content: getDisplayName() + " " + txt,
                            Dictionary: [
                                { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: "‌" },
                                { SourceCharacter: Player.MemberNumber },
                            ],
                        });
                    } else {
                        // Plain speech — goes through normal chat (gag effects apply)
                        ServerSend("ChatRoomChat", { Type: "Chat", Content: txt });
                    }
                }
                break;
            case "wait":
                break; // delay alone is the effect
        }
    } catch { /* ignore */ }
}

export function runScene(scene: Scene): void {
    let elapsed = 0;
    for (const step of scene.steps) {
        elapsed += step.delayMs;
        const s = step;
        window.setTimeout(() => executeStep(s), elapsed);
    }
}

// -- Export / Import -----------------------------------------------------------

export function exportScene(id: string): string | null {
    const scene = load().find(s => s.id === id);
    if (!scene) return null;
    return JSON.stringify(scene);
}

export function importScene(json: string): Scene {
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { throw new Error("Invalid JSON."); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("Not a valid scene object.");
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.name !== "string" || !Array.isArray(obj.steps))
        throw new Error("Missing required fields (name, steps).");
    const scene: Scene = {
        id: uid(),
        name: (obj.name as string).trim() || "Imported Scene",
        steps: obj.steps as SceneStep[],
        command: typeof obj.command === "string"
            ? obj.command.toLowerCase().trim().replace(/\s+/g, "") || undefined
            : undefined,
    };
    saveScenes([...load(), scene]);
    return scene;
}

export function handleSceneCommand(inputValue: string): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;
    const command = trimmed.slice(1).toLowerCase();
    const scene = load().find(s => s.command && s.command.toLowerCase() === command);
    if (!scene) return false;
    runScene(scene);
    return true;
}
