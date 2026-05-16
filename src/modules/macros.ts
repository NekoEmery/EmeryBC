// Macro execution — triggered when a "macro" style action button is clicked.
// Handles all BC/EBC built-in actions so actionButtons.ts stays dependency-free.

import { callBC } from "./bcUtils";
import { releaseRestraints, unlockItems } from "./restraints";
import { applyOutfit, getOutfits } from "./outfitManager";
import { runScene, getScenes } from "./scenes";

// Registered by EBCDrawer at construction time — avoids a circular import.
let _openBeepCb: ((memberNumber: number) => void) | null = null;

export function registerOpenBeepCallback(fn: (memberNumber: number) => void): void {
    _openBeepCb = fn;
}

export function executeMacro(cmd: string): void {
    if (!cmd?.trim()) return;
    try {
        const colonIdx = cmd.indexOf(":");
        const type = (colonIdx >= 0 ? cmd.slice(0, colonIdx) : cmd).toLowerCase().trim();
        const arg  = colonIdx >= 0 ? cmd.slice(colonIdx + 1).trim() : "";

        switch (type) {
            case "wardrobe":
                callBC(() => CommonSetScreen("Character", "Wardrobe"));
                break;

            case "outfit": {
                const o = getOutfits().find(x => x.command === arg || x.displayName === arg);
                if (o) applyOutfit(o);
                break;
            }

            case "scene": {
                const s = getScenes().find(x => x.name === arg);
                if (s) runScene(s);
                break;
            }

            case "beep": {
                const n = parseInt(arg, 10);
                if (!isNaN(n) && n > 0) _openBeepCb?.(n);
                break;
            }

            case "releaseself":
                releaseRestraints();
                break;

            case "unlockself":
                unlockItems();
                break;

            case "leaveroom":
                callBC(() => ChatRoomLeave());
                break;
        }
    } catch { /* ignore */ }
}
