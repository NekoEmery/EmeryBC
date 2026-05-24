// BC pose application and user-configurable pose combos.
// Poses require matching equipped items to visually render — BC handles
// validation server-side and silently ignores inapplicable poses.

import { callBC, getDisplayName, getSettings, syncSettings } from "./bcUtils";

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
            { key: "LegsClosed",     label: "Legs Closed"  },
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

const ARM_POSES = ["OverTheHead", "BackCuffs", "BackBoxTie", "Yoked"];

export function applyPoses(poses: string[]): void {
    // An explicit empty string ("") in the list means "Relaxed arms" —
    // clear any active arm pose from the result set.
    const safeList = Array.isArray(poses) ? poses : [];
    const wantsRelaxed = safeList.includes("");
    const filtered = safeList.filter(Boolean);
    const result   = wantsRelaxed ? filtered.filter(p => !ARM_POSES.includes(p)) : filtered;

    const win = window as unknown as Record<string, unknown>;
    const psa = win.PoseSetActive as
        ((C: unknown, name: string | null, force?: boolean, push?: boolean) => void) | undefined;
    const pfn = win.AssetPoseFindName as
        ((name: string) => { Category?: string } | null | undefined) | undefined;

    // 1a. PoseSetActive (BC R107+) — sets ActivePoseMapping the canonical way.
    if (typeof psa === "function") {
        try {
            if (result.length === 0) {
                psa(Player, null, true, false);
            } else if (wantsRelaxed) {
                // "Relaxed arms" path: nuke everything first, then re-add body-only poses.
                // On some BC builds, psa(body, force=true) only replaces the body category
                // and leaves the arm category untouched.  Clearing everything first (null +
                // force=true) and then re-adding is the only guaranteed way to flush the
                // arm slot from BC's internal state.
                psa(Player, null, true, false);
                for (const p of result) {
                    psa(Player, p, false, false);
                }
            } else {
                psa(Player, result[0], true, false);
                for (let i = 1; i < result.length; i++) {
                    psa(Player, result[i], false, false);
                }
            }
        } catch { /* ignore */ }
    }

    // 1b. Also set ActivePoseMapping directly via AssetPoseFindName.
    //     This is the critical belt-and-suspenders step: PoseSetActive can silently
    //     return early (e.g. pose not found) without throwing, leaving the mapping
    //     unchanged.  Every subsequent CharacterRefresh then recomputes ActivePose
    //     from that unchanged (empty) mapping and wipes the pose we tried to set.
    //     Setting the mapping ourselves guarantees CharacterRefresh always sees the
    //     correct categories regardless of whether PoseSetActive succeeded.
    if (typeof pfn === "function") {
        try {
            const mapping: Record<string, string> = {};
            for (const p of result) {
                const data = pfn(p);
                if (data?.Category) mapping[data.Category] = p;
            }
            (Player as unknown as Record<string, unknown>).ActivePoseMapping =
                result.length === 0 ? {} : mapping;
        } catch { /* ignore */ }
    } else if (typeof psa !== "function") {
        // Truly old BC (no PoseSetActive, no AssetPoseFindName): direct ActivePose assignment.
        try {
            (Player as unknown as Record<string, unknown>).ActivePose =
                result.length > 0 ? result : null;
        } catch { /* ignore */ }
    }

    // 1c. Keep Player.Pose, ActivePoseMapping, and ActivePose all in sync.
    //     CharacterRefresh → CharacterLoadActualPose rebuilds the derived fields
    //     from Player.Pose, so without syncing Pose here a stale arm entry would
    //     survive the refresh and re-appear in ActivePoseMapping/ActivePose.
    try {
        const pp = Player as unknown as Record<string, unknown>;
        // Pose — canonical source used by CharacterLoadActualPose
        pp.Pose = result.length > 0 ? [...result] : [];
        // ActivePoseMapping — also clear/set for builds that read this direction
        // (already set in 1b above if pfn was available, but ensure it for wantsRelaxed)
        if (result.length === 0) {
            pp.ActivePoseMapping = {};
        }
        // ActivePose — derived cache
        pp.ActivePose = result.length > 0 ? result : null;
    } catch { /* ignore */ }

    // 2. Local visual refresh — Push=false, we push below.
    callBC(() => CharacterRefresh(Player, false));

    // 3. Push to room via direct ServerSend (same approach as sequence runner in
    //    actionButtons.ts which is known to work).
    try {
        if (Player.OnlineID != null) {
            ServerSend("ChatRoomCharacterUpdate", {
                ID:         Player.OnlineID,
                ActivePose: result.length > 0 ? result : null,
                Appearance: ServerAppearanceBundle(Player.Appearance),
            });
        }
    } catch { /* ignore */ }
}

// Surgically remove any active arm pose without disturbing body poses.
// Mutates Player.Pose (the canonical source), ActivePoseMapping, AND ActivePose.
//
// Root-cause note: CharacterRefresh → CharacterLoadActualPose rebuilds both
// ActivePoseMapping and ActivePose FROM Player.Pose every call.  Earlier
// attempts that only cleared ActivePoseMapping/ActivePose were immediately
// undone by the next CharacterRefresh reading the stale Player.Pose.
export function clearArmPose(): void {
    try {
        const p = Player as unknown as Record<string, unknown>;

        // 1. Player.Pose — the canonical array CharacterLoadActualPose reads.
        //    This is the field that was missing in prior fix attempts.
        const pose = p.Pose as string[] | null | undefined;
        if (Array.isArray(pose)) {
            p.Pose = pose.filter(x => !ARM_POSES.includes(x));
        }

        // 2. ActivePoseMapping — belt-and-suspenders for builds where the
        //    mapping is the primary source instead of Pose.
        const mapping = p.ActivePoseMapping as Record<string, string> | null | undefined;
        if (mapping && typeof mapping === "object") {
            for (const key of Object.keys(mapping)) {
                if (ARM_POSES.includes(mapping[key])) delete mapping[key];
            }
        }

        // 3. ActivePose — the derived cache; keep consistent so nothing re-reads
        //    a stale value before CharacterRefresh rebuilds it.
        const ap = p.ActivePose as string[] | null | undefined;
        if (Array.isArray(ap)) {
            const next = ap.filter(x => !ARM_POSES.includes(x));
            p.ActivePose = next.length > 0 ? next : null;
        }

        // 4. Capture pose list for the server push BEFORE CharacterRefresh can
        //    alter anything (use Pose as source of truth, fall back to mapping).
        const cleanPose = (p.Pose as string[] | null | undefined) ?? [];
        const m2        = p.ActivePoseMapping as Record<string, string> | null | undefined;
        const poseList  = cleanPose.length > 0
            ? cleanPose.filter(Boolean)
            : Object.values(m2 ?? {}).filter(Boolean);

        // 5. Local visual refresh — CharacterLoadActualPose rebuilds the derived
        //    fields from the Pose array we just cleaned.
        callBC(() => CharacterRefresh(Player, false));

        // 6. Push to room
        if (Player.OnlineID != null) {
            ServerSend("ChatRoomCharacterUpdate", {
                ID:         Player.OnlineID,
                ActivePose: poseList.length > 0 ? poseList : null,
                Appearance: ServerAppearanceBundle(Player.Appearance),
            });
        }
    } catch { /* ignore */ }
}

// Apply poses one-by-one in the given order with a delay between each step.
// Each entry in `poses` is one step:
//   - a body-pose key ("Kneel", "AllFours", …) → replaces the body slot
//   - an arm-pose key ("BackBoxTie", "Yoked", …) → replaces the arm slot
//   - ""  (Relaxed marker)                       → clears the arm slot
// State is cumulative: every step passes the full [body?, arm?] snapshot to
// applyPoses, so the animation builds up correctly regardless of which steps
// include a Relaxed ("") entry.
export function applyPosesSequential(poses: string[], stepDelayMs = 420): void {
    const safeList = Array.isArray(poses) ? poses : [];
    if (safeList.length === 0) { applyPoses([]); return; }

    // Build a concrete pose-state snapshot for each step.
    let bodyPose: string | null = null;
    let armPose:  string | null = null;
    const steps: string[][] = [];

    for (const p of safeList) {
        if (p === "") {
            armPose = null;            // Relaxed: clear arm slot
        } else if (ARM_POSES.includes(p)) {
            armPose = p;               // replace arm pose
        } else {
            bodyPose = p;              // replace body pose
        }
        steps.push([
            ...(bodyPose !== null ? [bodyPose] : []),
            ...(armPose  !== null ? [armPose]  : []),
        ]);
    }

    if (steps.length <= 1) {
        applyPoses(steps[0] ?? []);
        return;
    }
    for (let i = 0; i < steps.length; i++) {
        window.setTimeout(() => applyPoses(steps[i]), i * stepDelayMs);
    }
}

export function getCurrentPoses(): string[] {
    try {
        const ap = (Player.ActivePose as string[] | undefined) ?? [];
        if (ap.length > 0) return [...ap];
        // In newer BC, PoseSetActive writes to ActivePoseMapping rather than ActivePose.
        // Fall back to the mapping values so callers always see the real current pose set.
        const mapping = (Player as unknown as Record<string, unknown>).ActivePoseMapping as
            Record<string, string> | undefined;
        if (mapping && typeof mapping === "object") {
            const vals = Object.values(mapping).filter(Boolean);
            if (vals.length > 0) return vals;
        }
        return [];
    } catch { return []; }
}

// -- Combo storage -------------------------------------------------------


function uid(): string { return Math.random().toString(36).slice(2, 9); }

function load(): PoseCombo[] {
    const list = getSettings().poseCombos;
    if (!Array.isArray(list)) return [];
    // Sanitize each combo — old data may have undefined/null poses array
    return (list as PoseCombo[]).map(c => ({
        ...c,
        poses: Array.isArray(c.poses) ? c.poses : [],
    }));
}

function saveCombos(list: PoseCombo[]): void {
    getSettings().poseCombos = list;
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
        poses: poses.filter(p => p != null),  // keep "" (Relaxed arms marker)
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
    combo.poses = poses.filter(p => p != null);  // keep "" (Relaxed arms marker)
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
    applyPosesSequential(combo.poses ?? [], delay);

    const poseCount = Array.isArray(combo.poses) ? combo.poses.length : 0;
    const totalMs = poseCount > 1 ? (poseCount - 1) * delay + 80 : 80;
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
