import {
    drawActionButtons,
    handleActionButtonClick,
    settingsLoad as actionSettingsLoad,
    settingsRun as actionSettingsRun,
    settingsClick as actionSettingsClick,
    settingsExit as actionSettingsExit,
} from "./modules/actionButtons";
import {
    handleOutfitCommand,
    outfitSettingsLoad,
    outfitSettingsRun,
    outfitSettingsClick,
    outfitSettingsExit,
} from "./modules/outfitManager";
import { UI, drawChromeButton } from "./modules/ui";

const MOD_NAME = "EmeryBC";
const MOD_VERSION = "0.1.27";
const EXTENSION_ICON = "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90">
        <rect x="8" y="8" width="74" height="74" rx="18" fill="#2a1421" stroke="#cf6f98" stroke-width="4"/>
        <path d="M28 30 L37 18 L45 31 L53 18 L62 30" fill="#cf6f98"/>
        <circle cx="34" cy="43" r="4" fill="#f7e6ee"/>
        <circle cx="56" cy="43" r="4" fill="#f7e6ee"/>
        <path d="M38 56 Q45 63 52 56" stroke="#f7e6ee" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>`
);

type Tab = "actions" | "outfits";

let noticeShown = false;
let activeTab: Tab = "actions";
let settingsRegistered = false;

const TAB_BTN_Y = 86;
const TAB_BTN_H = 30;
const TAB_BTN_W = 132;
const TAB_BTN_GAP = 14;
const TAB_BTN_LEFT = 156;
const CHANGELOG: Array<{ version: string; changes: string[] }> = [
    {
        version: "0.1.27",
        changes: [
            "Action buttons now collapse behind a small toggle chip (≡) to avoid overlapping map build UI.",
            "Click the chip to expand/collapse the button panel at any time.",
        ],
    },
    {
        version: "0.1.26",
        changes: [
            "/ebc release now skips items locked with owner or lover locks, and reports how many were skipped.",
        ],
    },
    {
        version: "0.1.25",
        changes: [
            "Fixed /ebc release — now calls ChatRoomCharacterUpdate so the restraint removal is visible to all room members.",
        ],
    },
    {
        version: "0.1.24",
        changes: [
            "Added /ebc release (alias: /ebc free) — removes all restraints from yourself instantly.",
        ],
    },
    {
        version: "0.1.23",
        changes: [
            "Moved EBC badge another 15% to the left.",
        ],
    },
    {
        version: "0.1.22",
        changes: [
            "Moved EBC badge 10% to the left.",
        ],
    },
    {
        version: "0.1.21",
        changes: [
            "Stripped version line from EBC badge — now just a small subtle EBC chip.",
        ],
    },
    {
        version: "0.1.20",
        changes: [
            "Scaled EBC badge down by 50%.",
        ],
    },
    {
        version: "0.1.19",
        changes: [
            "Moved EBC badge further right and scaled it up for better text readability.",
        ],
    },
    {
        version: "0.1.18",
        changes: [
            "Moved EBC badge 15% to the right.",
            "Widened badge so EBC text and version number render without clipping.",
        ],
    },
    {
        version: "0.1.17",
        changes: [
            "Made EBC overhead badge much smaller and shifted it 15% to the left.",
        ],
    },
    {
        version: "0.1.16",
        changes: [
            "Made EBC overhead badge slightly smaller and moved it further down.",
        ],
    },
    {
        version: "0.1.15",
        changes: [
            "Removed login screen popup — no more dialog on startup.",
            "Added a quiet chat message on room join confirming EmeryBC loaded successfully.",
            "Fixed badge version text visibility by widening the overhead badge further.",
        ],
    },
    {
        version: "0.1.14",
        changes: [
            "Added version number back under EBC in the overhead badge.",
        ],
    },
    {
        version: "0.1.13",
        changes: [
            "Badge 50% bigger, fixed EBC text clipping by increasing internal padding.",
        ],
    },
    {
        version: "0.1.12",
        changes: [
            "EBC badge scaled up 45% and text rendering fixed to always show EBC.",
        ],
    },
    {
        version: "0.1.11",
        changes: [
            "Made EBC badge slightly bigger so 'EBC' text is no longer clipped to 'BC'.",
            "Moved badge further down by 25%.",
        ],
    },
    {
        version: "0.1.10",
        changes: [
            "Made EBC overhead badge significantly smaller and moved it further down.",
            "Reverted action buttons back to Emote type (* Name text *).",
        ],
    },
    {
        version: "0.1.9",
        changes: [
            "Fixed outfit page row and editor overlaps — labels, inputs and buttons no longer stack on each other.",
            "Action buttons now use Type:Action so they show as (Name text.) instead of * Name text *.",
            "Default action emotes updated to match the new format.",
            "EBC overhead badge made smaller and drops the version line.",
            "Outfit notice messages bumped to 12px to match other log messages.",
        ],
    },
    {
        version: "0.1.8",
        changes: [
            "Fixed EBC badge visibility — now uses OnlineSharedSettings so all room members can see it.",
            "Shrunk outfit notice messages in chat to 11px so they are less intrusive.",
            "Bumped version number that was missed in previous release.",
        ],
    },
    {
        version: "0.1.7",
        changes: [
            "Moved the overhead EBC badge higher and removed the extra logo chip beside it.",
            "Spread the action button builder out further to reduce label and picker overlap.",
            "Reworked the outfit list and editor spacing to reduce overlapping text and controls.",
        ],
    },
    {
        version: "0.1.6",
        changes: [
            "Moved EmeryBC presence sharing onto BC's shared online settings path so other clients can receive the head tag.",
            "The badge now reads shared presence from online settings first, with local settings as a fallback.",
        ],
    },
    {
        version: "0.1.5",
        changes: [
            "Changed /ebc version so it only prints the current addon version.",
            "Kept the full history on /ebc changelog and /ebc changes.",
        ],
    },
    {
        version: "0.1.4",
        changes: [
            "Shifted the overhead EmeryBC badge a little further left for better alignment above characters.",
        ],
    },
    {
        version: "0.1.3",
        changes: [
            "Synced EmeryBC presence/version data automatically so the overhead badge has real data to read.",
            "Moved the badge above the character and added a version line under the EBC label.",
            "Keep the overhead version marker and pushed bundle version in lockstep on update.",
        ],
    },
    {
        version: "0.1.2",
        changes: [
            "Redesigned the Extensions UI into wider multi-panel layouts instead of the cramped left-column stack.",
            "Replaced the action button color hex field with a real click-to-pick color control.",
            "Added quicker wardrobe-side buttons for wearing, refreshing, and editing saved outfits.",
        ],
    },
    {
        version: "0.1.1",
        changes: [
            "Removed unstable overhead marker hooks so the addon loads safely again.",
            "Improved outfit command handling and reduced refresh delay during swaps.",
            "Updated the userscript loader and bundle versioning for cleaner updates.",
        ],
    },
    {
        version: "0.1.0",
        changes: [
            "Added action buttons and outfit command support.",
            "Added editable outfit name, command, restraint mode, and announce text settings.",
            "Added refreshed EmeryBC settings styling and startup notice.",
        ],
    },
];

function appendLocalLogLine(text: string, color = UI.accent): void {
    const log = document.getElementById("TextAreaChatLog");
    if (!log) return;

    const msg = document.createElement("div");
    msg.style.cssText = `
        background: ${UI.cardMuted};
        color: ${color};
        border-left: 3px solid ${UI.accent};
        padding: 4px 8px;
        margin: 2px 0;
        font-style: italic;
        font-size: 12px;
    `;
    msg.textContent = text;
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
}

function showVersionInfo(): void {
    appendLocalLogLine(`[EmeryBC] Version ${MOD_VERSION}`, UI.gold);
}

function showChangelog(): void {
    appendLocalLogLine(`[EmeryBC] Version ${MOD_VERSION}`, UI.gold);
    for (const entry of CHANGELOG) {
        appendLocalLogLine(`[EmeryBC] v${entry.version}`, UI.textMuted);
        for (const change of entry.changes) {
            appendLocalLogLine(`- ${change}`, UI.accent);
        }
    }
}

function isProtectedLock(item: Item): boolean {
    const lock = item.Property?.LockedBy as string | undefined;
    if (!lock) return false;
    return lock.toLowerCase().includes("owner") || lock.toLowerCase().includes("lover");
}

function releaseRestraints(): void {
    const toRemove = Player.Appearance.filter(
        item => item.Asset.Group.IsRestraint && !isProtectedLock(item)
    );
    const skipped = Player.Appearance.filter(
        item => item.Asset.Group.IsRestraint && isProtectedLock(item)
    );

    if (toRemove.length === 0) {
        if (skipped.length > 0) {
            appendLocalLogLine(`[EmeryBC] All restraints are owner/lover locked — none removed.`, UI.textMuted);
        } else {
            appendLocalLogLine("[EmeryBC] No restraints found to remove.", UI.textMuted);
        }
        return;
    }

    for (const item of toRemove) {
        InventoryRemove(Player, item.Asset.Group.Name, false);
    }
    if (skipped.length > 0) {
        appendLocalLogLine(`[EmeryBC] Skipped ${skipped.length} owner/lover locked item(s).`, UI.textMuted);
    }

    CharacterRefresh(Player, false);
    ChatRoomCharacterUpdate(Player);
    ServerPlayerAppearanceSync();
    appendLocalLogLine(`[EmeryBC] Released ${toRemove.length} restraint(s).`, UI.gold);
}

function handleMetaCommand(inputValue: string): boolean {
    const trimmed = inputValue.trim();
    if (!trimmed.startsWith("/")) return false;

    const parts = trimmed.slice(1).split(/\s+/);
    if (parts[0]?.toLowerCase() !== "ebc") return false;

    const subcommand = (parts[1] || "version").toLowerCase();
    if (["version", "ver", "v"].includes(subcommand)) {
        showVersionInfo();
        return true;
    }

    if (["changelog", "changes"].includes(subcommand)) {
        showChangelog();
        return true;
    }

    if (["release", "free"].includes(subcommand)) {
        releaseRestraints();
        return true;
    }

    appendLocalLogLine("[EmeryBC] Commands: /ebc version  |  /ebc changelog  |  /ebc release", UI.gold);
    return true;
}

interface EmeryPresence {
    version: string;
    marker: string;
}

interface EmeryAddonSettings {
    presence?: EmeryPresence;
    [key: string]: unknown;
}

function getSharedPresence(character: Character | null | undefined): EmeryPresence | null {
    if (!character) return null;

    // OnlineSharedSettings are broadcast to all room members via ChatRoomSync
    // and CharacterUpdate — this is the reliable cross-client path.
    const shared = character.OnlineSharedSettings?.[MOD_NAME];
    if (shared && typeof shared === "object") {
        const presence = (shared as EmeryAddonSettings).presence;
        if (presence?.marker === "EBC") return presence;
    }

    // Fallback: ExtensionSettings (visible if they were synced before room join)
    const addon = getAddonSettings(character, false)?.presence;
    return addon?.marker === "EBC" ? addon : null;
}

function getAddonSettings(character: Character | null | undefined, create = false): EmeryAddonSettings | null {
    if (!character) return null;
    const extensionSettings = character.ExtensionSettings as Record<string, unknown> | undefined;
    if (!extensionSettings) return null;

    const existing = extensionSettings[MOD_NAME];
    if (existing && typeof existing === "object") {
        return existing as EmeryAddonSettings;
    }

    if (!create) return null;
    const created: EmeryAddonSettings = {};
    extensionSettings[MOD_NAME] = created;
    return created;
}

function syncPresenceMarker(): void {
    const presence: EmeryPresence = { version: MOD_VERSION, marker: "EBC" };

    // Write to ExtensionSettings for local persistence
    const settings = getAddonSettings(Player, true);
    if (settings) settings.presence = presence;
    ServerPlayerExtensionSettingsSync(MOD_NAME);

    // Write to OnlineSharedSettings — this IS broadcast to all room members
    // via ChatRoomSync and CharacterUpdate packets, making the badge visible
    // to every other EmeryBC user in the room.
    const shared = (Player.OnlineSharedSettings ??= {});
    const current = shared[MOD_NAME];
    const alreadySynced = current && typeof current === "object" &&
        (current as EmeryAddonSettings).presence?.version === MOD_VERSION;
    if (!alreadySynced) {
        shared[MOD_NAME] = { presence };
        ServerSend("AccountUpdate", { OnlineSharedSettings: shared });
    }
}

function hasEmeryBC(character: Character | null | undefined): boolean {
    return !!getSharedPresence(character);
}

function drawPresenceMarker(args: unknown[]): void {
    if (CurrentScreen !== "ChatRoom") return;

    const character = args[0] as Character | undefined;
    const left = typeof args[1] === "number" ? args[1] : null;
    const top = typeof args[2] === "number" ? args[2] : null;
    const zoom = typeof args[3] === "number" ? args[3] : 1;
    if (!character || left == null || top == null || !hasEmeryBC(character)) return;

    const presence = getSharedPresence(character);
    const width = Math.max(30, 34 * zoom);
    const height = Math.max(12, 14 * zoom);
    const x = left + 197 * zoom;
    const y = top + 26 * zoom;
    const badgeLeft = x - width / 2;
    const badgeTop = y - height / 2;

    DrawRect(badgeLeft + 1, badgeTop + 1, width, height, "rgba(0, 0, 0, 0.28)");
    DrawRect(badgeLeft, badgeTop, width, height, UI.cardMuted);
    DrawEmptyRect(badgeLeft, badgeTop, width, height, UI.panelEdge, 1);
    DrawTextFit("EBC", badgeLeft + width / 2, badgeTop + height / 2 + 1, width - 6, UI.accent);
}

function showRoomLoadNotice(): void {
    if (noticeShown) return;
    noticeShown = true;
    appendLocalLogLine(`✓ EmeryBC v${MOD_VERSION} loaded successfully.`);
}

function drawTabs(): void {
    drawChromeButton(TAB_BTN_LEFT, TAB_BTN_Y, TAB_BTN_W, TAB_BTN_H, "Actions", activeTab === "actions" ? "accent" : "muted");
    drawChromeButton(TAB_BTN_LEFT + TAB_BTN_W + TAB_BTN_GAP, TAB_BTN_Y, TAB_BTN_W, TAB_BTN_H, "Outfits", activeTab === "outfits" ? "accent" : "muted");
}

function settingsRun(): void {
    if (activeTab === "actions") {
        actionSettingsRun();
    } else {
        outfitSettingsRun();
    }
    drawTabs();
}

function settingsClick(): void {
    if (MouseY >= TAB_BTN_Y && MouseY <= TAB_BTN_Y + TAB_BTN_H) {
        if (MouseX >= TAB_BTN_LEFT && MouseX <= TAB_BTN_LEFT + TAB_BTN_W && activeTab !== "actions") {
            outfitSettingsExit();
            activeTab = "actions";
            actionSettingsLoad();
            return;
        }
        const outfitsLeft = TAB_BTN_LEFT + TAB_BTN_W + TAB_BTN_GAP;
        if (MouseX >= outfitsLeft && MouseX <= outfitsLeft + TAB_BTN_W && activeTab !== "outfits") {
            actionSettingsExit();
            activeTab = "outfits";
            outfitSettingsLoad();
            return;
        }
    }

    if (activeTab === "actions") {
        actionSettingsClick();
    } else {
        outfitSettingsClick();
    }
}

function settingsExit(): void {
    if (activeTab === "actions") {
        actionSettingsExit();
    } else {
        outfitSettingsExit();
    }
    activeTab = "actions";
}

function registerSettings(): void {
    if (settingsRegistered) return;

    const globalScope = window as unknown as Record<string, unknown>;
    const register = globalScope["PreferenceRegisterExtensionSetting"] as ((setting: unknown) => void) | undefined;
    if (!register) {
        setTimeout(registerSettings, 1000);
        return;
    }

    try {
        register({
            Identifier: MOD_NAME,
            ButtonText: "EmeryBC",
            Image: EXTENSION_ICON,
            load: () => {
                activeTab = "actions";
                actionSettingsLoad();
                outfitSettingsLoad();
            },
            run: settingsRun,
            click: settingsClick,
            exit: settingsExit,
        });
        settingsRegistered = true;
    } catch (error) {
        console.error("[EmeryBC] Extension registration failed:", error);
    }
}

function tryHookFunction(
    modAPI: ModSDKModAPI,
    funcName: string,
    priority: number,
    hook: (args: unknown[], next: (args: unknown[]) => unknown) => unknown
): void {
    try {
        modAPI.hookFunction(funcName, priority, hook);
    } catch (error) {
        console.warn(`[${MOD_NAME}] Optional hook "${funcName}" unavailable:`, error);
    }
}

function init(): void {
    const modAPI = bcModSDK.registerMod(
        { name: MOD_NAME, fullName: "EmeryBC", version: MOD_VERSION },
        { allowReplace: true }
    );

    modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
        next(args);
        try {
            drawActionButtons();
        } catch {
            // Ignore draw failures so the room UI still renders.
        }
    });

    tryHookFunction(modAPI, "DrawCharacter", 3, (args, next) => {
        const result = next(args);
        try {
            drawPresenceMarker(args);
        } catch {
            // Ignore marker draw failures.
        }
        return result;
    });

    modAPI.hookFunction("ChatRoomSync", 3, (args, next) => {
        const result = next(args);
        try {
            syncPresenceMarker();
        } catch {
            // Ignore sync failures.
        }
        try {
            showRoomLoadNotice();
        } catch {
            // Ignore notice failures.
        }
        return result;
    });

    modAPI.hookFunction("ChatRoomClick", 3, (args, next) => {
        try {
            if (handleActionButtonClick()) return;
        } catch {
            // Ignore click failures.
        }
        return next(args);
    });

    modAPI.hookFunction("ChatRoomKeyDown", 10, (args, next) => {
        try {
            if (typeof KeyPress !== "undefined" && KeyPress === 13) {
                const input = document.getElementById("InputChat") as HTMLInputElement | null;
                if (input && (handleMetaCommand(input.value) || handleOutfitCommand(input.value))) {
                    input.value = "";
                    return;
                }
            }
        } catch {
            // Ignore keydown failures.
        }
        return next(args);
    });

    modAPI.hookFunction("ChatRoomSendChat", 10, (args, next) => {
        try {
            const input = document.getElementById("InputChat") as HTMLInputElement | null;
            if (input && (handleMetaCommand(input.value) || handleOutfitCommand(input.value))) {
                input.value = "";
                return;
            }
        } catch {
            // Ignore command failures.
        }
        return next(args);
    });

    registerSettings();

    try {
        syncPresenceMarker();
    } catch {
        // Ignore early sync failures.
    }

    console.log(`[${MOD_NAME}] v${MOD_VERSION} loaded`);
}

const readyInterval = setInterval(() => {
    if (typeof bcModSDK !== "undefined") {
        clearInterval(readyInterval);
        init();
    }
}, 100);
