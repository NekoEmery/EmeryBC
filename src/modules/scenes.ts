// Scene sequencer — chain pose changes, item equips/unequips, emotes and
// waits into a named sequence that plays back step by step with per-step timing.

import { applyPoses } from "./poses";
import { getDisplayName } from "./actionButtons";
import { snapshotPlayerRestraints } from "./antiRestraint";

export type StepType = "pose" | "equip" | "unequip" | "emote" | "chat" | "wait";

export interface SceneStep {
    type: StepType;
    delayMs: number;            // ms to wait BEFORE this step fires
    poses?: string[];           // pose: full active-pose list to set
    group?: string;             // equip / unequip: item group name
    assetName?: string;         // equip: asset name
    color?: string | string[];  // equip: optional color(s)
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
    ServerPlayerExtensionSettingsSync("EmeryBC");
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
                if (step.group && step.assetName) {
                    InventoryAdd(Player, step.assetName, step.group, false);
                    if (step.color !== undefined) {
                        const item = InventoryGet(Player, step.group);
                        if (item) (item as unknown as Record<string, unknown>).Color = step.color;
                    }
                    // Snapshot BEFORE CharacterRefresh so the anti-restraint hook doesn't
                    // see the newly-added restraint as "unknown" and immediately strip it.
                    snapshotPlayerRestraints();
                    CharacterRefresh(Player, false);
                    ChatRoomCharacterUpdate(Player);
                    ServerPlayerAppearanceSync();
                }
                break;
            case "unequip":
                if (step.group) {
                    InventoryRemove(Player, step.group, false);
                    CharacterRefresh(Player, false);
                    ChatRoomCharacterUpdate(Player);
                    ServerPlayerAppearanceSync();
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
                        // Emote-style action — same format as nod/giggle buttons
                        ServerSend("ChatRoomChat", {
                            Type: "Action",
                            Content: getDisplayName() + " " + txt,
                            Dictionary: [
                                { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                                { SourceCharacter: Player.MemberNumber },
                            ],
                        });
                    } else if (step.chatFormat === "(") {
                        // OOC — plain chat with parentheses
                        ServerSend("ChatRoomChat", { Type: "Chat", Content: `(${txt})` });
                    } else {
                        // Plain speech
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
