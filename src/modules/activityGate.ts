// Permission gate for BC activities EBC fires itself.
//
// ActivityRun does not check anything. In BC's own interface the checking has
// already happened by the time it is called - the dialog only offers activities
// on someone whose permissions allow it, and only while you are able to act at
// all. EBC calls ActivityRun straight from its own buttons, so none of that
// applied: a one-way friend with no item permission could still be booped, and
// you could boop people while bound hand and foot.
//
// The three checks below are the ones BC's interface applies, in the same order.
// Any one of them being unavailable means it is skipped rather than treated as a
// refusal - a missing function should never block something legitimate, and the
// remaining checks still stand.

/** Why an activity was refused, or null when it is allowed. */
export type ActivityDenial = "bound" | "permission" | "prerequisite" | null;

interface BCActivityGlobals {
    ActivityRun?: (actor: Character, acted: Character, group: unknown, itemActivity: unknown, sendMessage?: boolean) => void;
    AssetGetActivity?: (family: string, name: string) => unknown;
    AssetGroupGet?: (family: string, group: string) => unknown;
    ServerChatRoomGetAllowItem?: (source: Character, target: Character) => boolean;
    ActivityCheckPrerequisites?: (activity: unknown, acting: Character, acted: Character, group: unknown) => boolean;
}

function bc(): BCActivityGlobals {
    return window as unknown as BCActivityGlobals;
}

/**
 * Whether the player may run this activity on this target right now.
 *
 * Acting on yourself deliberately skips the permission check - BC treats the
 * player as always allowed on themselves (`C.IsPlayer() || ...`), and requiring
 * an item permission from yourself would refuse something BC permits.
 */
export function activityDenial(target: Character, groupName: string, activityName: string): ActivityDenial {
    const w = bc();
    try {
        // 1. Can you act at all? False while bound, blindfolded into helplessness,
        //    and so on - the same thing that greys out BC's own activity list.
        // Cast because the local Character type does not declare it; BC's does.
        const canInteract = (Player as unknown as { CanInteract?: () => boolean })?.CanInteract;
        if (typeof canInteract === "function" && !canInteract.call(Player)) return "bound";

        const isSelf = target?.MemberNumber === Player?.MemberNumber;

        // 2. Does the target allow you to act on them? This is the one the report
        //    was about: a one-way friend with item permissions off.
        if (!isSelf && typeof w.ServerChatRoomGetAllowItem === "function"
            && !w.ServerChatRoomGetAllowItem(Player, target)) return "permission";

        // 3. Is the activity actually valid for this person and this slot? Needs a
        //    real AssetGroup - the bare { Name } object passed to ActivityRun is
        //    not one, so this check is skipped rather than failed if the lookup is
        //    unavailable.
        if (typeof w.ActivityCheckPrerequisites === "function"
            && typeof w.AssetGetActivity === "function"
            && typeof w.AssetGroupGet === "function") {
            const activity = w.AssetGetActivity("Female3DCG", activityName);
            const group = w.AssetGroupGet("Female3DCG", groupName);
            if (activity && group && !w.ActivityCheckPrerequisites(activity, Player, target, group)) {
                return "prerequisite";
            }
        }
    } catch { /* a failing check must not block a legitimate action */ }
    return null;
}

/**
 * Runs the activity if it is allowed. Returns false when refused, so callers can
 * report an honest count rather than claiming everything went through.
 */
export function runActivityOn(target: Character, groupName: string, activityName: string): boolean {
    if (activityDenial(target, groupName, activityName) !== null) return false;
    const w = bc();
    try {
        if (typeof w.ActivityRun !== "function" || typeof w.AssetGetActivity !== "function") return false;
        const activity = w.AssetGetActivity("Female3DCG", activityName);
        if (!activity) return false;
        w.ActivityRun(Player, target, { Name: groupName }, { Activity: activity, Item: null });
        return true;
    } catch { return false; }
}

/** One line explaining a batch of refusals, or null when nothing was refused. */
export function describeSkipped(skipped: number, verb: string): string | null {
    if (skipped <= 0) return null;
    return `[EBC] ${skipped} ${skipped === 1 ? "person was" : "people were"} not ${verb} - `
        + "either they have not given you permission, or you cannot act right now.";
}
