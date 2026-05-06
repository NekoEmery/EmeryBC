// BC pose application and user-configurable pose combos.
// Poses require matching equipped items to visually render — BC handles
// validation server-side and silently ignores inapplicable poses.

export interface PoseCombo {
    id: string;
    name: string;
    poses: string[];
}

// Well-known BC pose names grouped by type.
// Body and arm poses can be freely combined (e.g. Kneel + BackCuffs).
export const KNOWN_POSES: { group: string; poses: { key: string; label: string }[] }[] = [
    {
        group: "Body",
        poses: [
            { key: "",               label: "Stand"       },
            { key: "Kneel",          label: "Kneel"       },
            { key: "KneelingSpread", label: "Kneel Wide"  },
            { key: "AllFours",       label: "All Fours"   },
            { key: "Hogtied",        label: "Hogtied"     },
            { key: "Spread",         label: "Spread"      },
        ],
    },
    {
        group: "Arms",
        poses: [
            { key: "OverTheHead",    label: "Arms Up"     },
            { key: "BackCuffs",      label: "Arms Back"   },
            { key: "BackBoxTie",     label: "Box Tie"     },
            { key: "BackElbowCuffs", label: "Elbow Cuffs" },
            { key: "FrontCuffs",     label: "Front Cuffs" },
            { key: "Yoked",          label: "Yoked"       },
        ],
    },
];

export function applyPoses(poses: string[]): void {
    try {
        (Player as unknown as Record<string, unknown>).ActivePose = poses.filter(Boolean);
        CharacterRefresh(Player, false, false);
        if (Player.OnlineID != null) {
            ServerSend("ChatRoomCharacterUpdate", {
                ID: Player.OnlineID,
                ActivePose: Player.ActivePose,
                Appearance: ServerAppearanceBundle(Player.Appearance),
            });
        }
    } catch { /* ignore */ }
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
    ServerPlayerExtensionSettingsSync("EmeryBC");
}

export function getPoseCombos(): PoseCombo[] { return load(); }

export function createCombo(name: string, poses: string[]): PoseCombo {
    const combo: PoseCombo = { id: uid(), name: name.trim() || "Combo", poses: poses.filter(Boolean) };
    saveCombos([...load(), combo]);
    return combo;
}

export function updateCombo(id: string, name: string, poses: string[]): void {
    const list = load();
    const combo = list.find(c => c.id === id);
    if (combo) { combo.name = name.trim() || combo.name; combo.poses = poses.filter(Boolean); saveCombos(list); }
}

export function deleteCombo(id: string): void {
    saveCombos(load().filter(c => c.id !== id));
}
