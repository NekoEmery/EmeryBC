import { drawActionButtons, handleActionButtonClick } from "./modules/actionButtons";
import { EBCDrawer } from "./modules/drawer";
import { handleOutfitCommand } from "./modules/outfitManager";
import { releaseRestraints, unlockItems } from "./modules/restraints";
import { UI } from "./modules/ui";

const MOD_NAME = "EmeryBC";
const MOD_VERSION = "0.1.35";

let noticeShown = false;
const CHANGELOG: Array<{ version: string; changes: string[] }> = [
    {
        version: "0.1.35",
        changes: [
            "Drawer widened to 300px for more comfortable reading.",
            "Version number shown in drawer header beside EmeryBC.",
            "Quick Actions bar added below tabs: Release Restraints and Remove Locks buttons always visible.",
            "Restraint/lock logic moved to shared module so commands and drawer use identical code.",
        ],
    },
    {
        version: "0.1.34",
        changes: [
            "/ebc release and /ebc unlock now also skip family padlocks (OwnerPadlock, LoverPadlock, FamilyPadlock, etc.).",
        ],
    },
    {
        version: "0.1.33",
        changes: [
            "Removed Extensions/Preferences settings screen - all management now lives in the EBC drawer.",
            "Drawer now has two tabs: Outfits and Buttons.",
            "Buttons tab: inline DOM editor for all action button slots (toggle, label, color, emote, delete, add, save).",
            "Drawer positioned to match CRABS x-alignment, 10% down from chat log top.",
            "Hamburger collapse chip restored to original simple - / + style.",
            "Added /ebc unlock command - removes all non-owner/lover locks from your items.",
        ],
    },
    {
        version: "0.1.32",
        changes: [
            "Fixed action emotes - name now appears correctly as (Name emotes.) using proper BC dictionary tag lookup.",
            "Fixed outfit announce text with same name-substitution fix.",
            "Re-added hamburger collapse toggle chip above sidebar action buttons.",
            "Drawer tab now sits just below CRABS's tab (50px offset from chat log top).",
            "Fixed drawer appearing in the middle of the screen on first room join.",
            "Drawer: added Update button on each outfit row to snapshot current look.",
            "Drawer: added New Outfit inline form with command, name, announce, and restraints toggle.",
        ],
    },
    {
        version: "0.1.31",
        changes: [
            "Removed all non-ASCII characters from source files and bundle to fix Tampermonkey internal error on load.",
            "Action type dictionary poison now uses String.fromCharCode(0x200C) instead of embedded Unicode.",
            "Drawer HTML built imperatively to avoid any template literal encoding issues.",
        ],
    },
    {
        version: "0.1.30",
        changes: [
            "Fixed potential crash: drawer initialisation is now wrapped in try/catch so a DOM error can no longer prevent the rest of the addon from loading.",
            "Drawer DOM queries use safe optional chaining instead of hard assertions.",
        ],
    },
    {
        version: "0.1.29",
        changes: [
            "Restored canvas sidebar action buttons alongside the drawer.",
            "Action buttons now send as (Name action.) using the MBCHC Action type trick instead of * emote *.",
            "Outfit announce text also uses Action type for consistent formatting.",
            "Drawer repositioned to the lower 40% of the chat log and now shows outfit switcher.",
            "Drawer outfit panel: one-click Wear buttons for all saved outfits.",
        ],
    },
    {
        version: "0.1.28",
        changes: [
            "Replaced canvas sidebar action buttons with a CRABS-inspired DOM drawer.",
            "A small EmeryBC icon tab sits beside the chat log - click it to expand your action buttons.",
            "Drawer auto-hides when leaving the chat room and never overlaps the map UI.",
            "Added credit to Sin / CRABS in the README and drawer footer.",
        ],
    },
    {
        version: "0.1.27",
        changes: [
            "Action buttons now collapse behind a small toggle chip (-) to avoid overlapping map build UI.",
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
            "Fixed /ebc release - now calls ChatRoomCharacterUpdate so the restraint removal is visible to all room members.",
        ],
    },
    {
        version: "0.1.24",
        changes: [
            "Added /ebc release (alias: /ebc free) - removes all restraints from yourself instantly.",
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
            "Stripped version line from EBC badge - now just a small subtle EBC chip.",
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
            "Removed login screen popup - no more dialog on startup.",
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
            "Fixed outfit page row and editor overlaps - labels, inputs and buttons no longer stack on each other.",
            "Action buttons now use Type:Action so they show as (Name text.) instead of * Name text *.",
            "Default action emotes updated to match the new format.",
            "EBC overhead badge made smaller and drops the version line.",
            "Outfit notice messages bumped to 12px to match other log messages.",
        ],
    },
    {
        version: "0.1.8",
        changes: [
            "Fixed EBC badge visibility - now uses OnlineSharedSettings so all room members can see it.",
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

    if (subcommand === "unlock") {
        unlockItems();
        return true;
    }

    appendLocalLogLine("[EmeryBC] Commands: /ebc version  |  /ebc changelog  |  /ebc release  |  /ebc unlock", UI.gold);
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
    // and CharacterUpdate - this is the reliable cross-client path.
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

    // Write to OnlineSharedSettings - this IS broadcast to all room members
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
    appendLocalLogLine(`- EmeryBC v${MOD_VERSION} loaded successfully.`);
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

    // Canvas sidebar action buttons
    modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
        next(args);
        try { drawActionButtons(); } catch { /* ignore */ }
    });

    modAPI.hookFunction("ChatRoomClick", 3, (args, next) => {
        try { if (handleActionButtonClick()) return; } catch { /* ignore */ }
        return next(args);
    });

    // DOM drawer - outfit switcher panel beside the chat log
    let drawer: EBCDrawer | null = null;
    try {
        drawer = new EBCDrawer(MOD_VERSION);
    } catch (err) {
        console.warn("[EmeryBC] Drawer failed to initialise:", err);
    }

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
        } catch { /* ignore */ }
        try {
            showRoomLoadNotice();
        } catch { /* ignore */ }
        try {
            drawer?.updateVisibility();
        } catch { /* ignore */ }
        return result;
    });

    // Keep drawer visibility in sync whenever the BC screen changes
    tryHookFunction(modAPI, "CommonSetScreen", 3, (args, next) => {
        const result = next(args);
        try { drawer?.updateVisibility(); } catch { /* ignore */ }
        return result;
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
