// BC pose application and user-configurable pose combos.
// Poses require matching equipped items to visually render — BC handles
// validation server-side and silently ignores inapplicable poses.

import { callBC, getDisplayName, syncSettings } from "./bcUtils";

export interface PoseCombo {
    id: string;
    name: string;
    poses: string[];         // ordered — applied step by step in this exact order
    stepDelayMs?: number;    // ms between each step (default: 420)
    command?: string;        // optional chat command (without /) to trigger this combo
    announceText?: string;   // optional action emote shown to the room when applied
}

// Well-known BC pose names grouped by type.
// Body and arm poses can be freely combined (e.g. Kneel + BackCuffs).
export const KNOWN_POSES: { group: string; poses: { key: string; label: string }[] }[] = [
    {
        group: "Body",
        poses: [
            { key: "",               label: "Stand"        },
            { key: "Kneel",          label: "Kneel"        },
            { key: "KneelingSpread", label: "Kneel Wide"   },
            { key: "AllFours",       label: "All Fours"    },
            { key: "Hogtied",        label: "Hogtied"      },
            { key: "Spread",         label: "Spread"       },
        ],
    },
    {
        group: "Arms",
        poses: [
            { key: "",               label: "Relaxed"     },
            { key: "OverTheHead",    label: "Arms Up"     },
            { key: "BackCuffs",      label: "Arms Back"   },
            { key: "BackBoxTie",     label: "Box Tie"     },
            { key: "Yoked",          label: "Yoked"       },
        ],
    },
];

export function applyPoses(poses: string[]): void {
    const filtered = poses.filter(Boolean);
    try { (Player as unknown as Record<string, unknown>).ActivePose = filtered; } catch { /* ignore */ }
    callBC(() => CharacterRefresh(Player, false));
    callBC(() => ChatRoomCharacterUpdate(Player));
    callBC(() => ServerPlayerAppearanceSync());
}

// Apply poses one-by-one in the given order with a delay between each step.
// Respects the exact order provided — the user controls sequencing via the editor.
// e.g. [Kneel, BackCuffs] → applies [Kneel] first, waits stepDelayMs, then [Kneel, BackCuffs].
export function applyPosesSequential(poses: string[], stepDelayMs = 420): void {
    const steps = poses.filter(Boolean);
    if (steps.length <= 1) {
        applyPoses(steps);
        return;
    }
    for (let i = 0; i < steps.length; i++) {
        const subset = steps.slice(0, i + 1);
        window.setTimeout(() => applyPoses(subset), i * stepDelayMs);
    }
}

export function getCurrentPoses(): string[] {
    try { return [...((Player.ActivePose as string[]) ?? [])]; } catch { return []; }
}

// -- Combo storage -------------------------------------------------------

function getStore(): Record<string, unknown> {
    if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
    return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
}

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function load(): PoseCombo[] {
    const list = getStore().poseCombos;
    return Array.isArray(list) ? (list as PoseCombo[]) : [];
}

function saveCombos(list: PoseCombo[]): void {
    getStore().poseCombos = list;
    syncSettings();
}

export function getPoseCombos(): PoseCombo[] { return load(); }

export function createCombo(
    name: string,
    poses: string[],
    command = "",
    announceText = "",
    stepDelayMs = 420,
): PoseCombo {
    const combo: PoseCombo = {
        id: uid(),
        name: name.trim() || "Combo",
        poses: poses.filter(Boolean),
        stepDelayMs: Math.max(50, Math.min(3000, stepDelayMs)),
        command: command.toLowerCase().trim().replace(/\s+/g, "") || undefined,
        announceText: announceText.trim() || undefined,
    };
    saveCombos([...load(), combo]);
    return combo;
}

export function updateCombo(
    id: string,
    name: string,
    poses: string[],
    command = "",
    announceText = "",
    stepDelayMs = 420,
): void {
    const list = load();
    const combo = list.find(c => c.id === id);
    if (!combo) return;
    combo.name = name.trim() || combo.name;
    combo.poses = poses.filter(Boolean);
    combo.stepDelayMs = Math.max(50, Math.min(3000, stepDelayMs));
    combo.command = command.toLowerCase().trim().replace(/\s+/g, "") || undefined;
    combo.announceText = announceText.trim() || undefined;
    saveCombos(list);
}

export function deleteCombo(id: string): void {
    saveCombos(load().filter(c => c.id !== id));
}

// Apply a combo (animation + announce text). Used by both the chat command handler
// and the ▶ apply button in the drawer so announce always fires either way.
export function applyCombo(combo: PoseCombo): void {
    const delay = combo.stepDelayMs ?? 420;
    applyPosesSequential(combo.poses, delay);

    const totalMs = combo.poses.length > 1 ? (combo.poses.length - 1) * delay + 80 : 80;
    if (combo.announceText?.trim()) {
        window.setTimeout(() => {
            try {
                ServerSend("ChatRoomChat", {
                    Type: "Action",
                    Content: getDisplayName() + " " + combo.announceText!.trim(),
                    Dictionary: [
                        { Tag: 'MISSING TEXT IN "Interface.csv": ', Text: String.fromCharCode(0x200C) },
                        { SourceCharacter: Player.MemberNumber },
                    ],
                });
            } catch { /* ignore */ }
        }, totalMs);
    }
}

// Handle a chat command and apply the matching pose combo if found.
export function handlePoseComboCommand(inputValue: string): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;

    const command = trimmed.slice(1).toLowerCase();
    const combo = load().find(c => c.command && c.command.toLowerCase() === command);
    if (!combo) return false;

    applyCombo(combo);
    return true;
}
