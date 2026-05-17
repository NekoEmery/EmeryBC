// Macro execution — triggered when a "macro" style action button is clicked.
// Handles all BC/EBC built-in actions so actionButtons.ts stays dependency-free.

import { callBC, setLeavePending } from "./bcUtils";
import { releaseRestraints } from "./restraints";
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

            case "leaveroom":
                // setLeavePending() must fire in the same tick as ChatRoomLeave() so no
                // ChatRoomRun frame runs between the flag being set and the data being
                // cleared — otherwise the guard sees ChatRoomData != null and clears the
                // flag prematurely, causing the null-crash guard to never fire.
                window.setTimeout(() => { setLeavePending(); callBC(() => ChatRoomLeave()); }, 0);
                break;
        }
    } catch { /* ignore */ }
}
