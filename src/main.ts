import {
    drawActionButtons,
    handleActionButtonClick,
    settingsRun    as actionSettingsRun,
    settingsClick  as actionSettingsClick,
    settingsExit   as actionSettingsExit,
} from "./modules/actionButtons";
import {
    handleOutfitCommand,
    outfitSettingsRun,
    outfitSettingsClick,
    outfitSettingsExit,
} from "./modules/outfitManager";

const MOD_NAME    = "EmeryBC";
const MOD_VERSION = "0.1.0";

const modAPI = bcModSDK.registerMod(
    { name: MOD_NAME, fullName: "EmeryBC", version: MOD_VERSION },
    { allowReplace: true }
);

// ─── Load indicator ───────────────────────────────────────────────────────────

// Small badge drawn above BCAR's buttons (BCAR upperleft starts at y=135)
function drawLoadIndicator(): void {
    DrawRect(0, 92, 45, 38, "#2a0a4a");
    DrawEmptyRect(0, 92, 45, 38, "#7c3fbf", 1);
    DrawText("NA", 22, 111, "#c084fc");
}

// One-time chat notice per session
let noticeShown = false;
function showLoadNotice(): void {
    if (noticeShown) return;
    noticeShown = true;
    const log = document.getElementById("TextAreaChatLog");
    if (!log) return;
    const div = document.createElement("div");
    div.style.cssText = "color:#c084fc;font-style:italic;padding:3px 5px;border-left:3px solid #7c3fbf;margin:2px 0;";
    div.textContent = `✓ EmeryBC v${MOD_VERSION} loaded`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
}

// ─── In-game hooks ────────────────────────────────────────────────────────────

modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
    next(args);
    try { drawActionButtons(); } catch { /* silent */ }
    try { drawLoadIndicator(); } catch { /* silent */ }
});

// Show notice once when first entering a room
modAPI.hookFunction("ChatRoomSync", 3, (args, next) => {
    const result = next(args);
    try { showLoadNotice(); } catch { /* silent */ }
    return result;
});

modAPI.hookFunction("ChatRoomClick", 3, (args, next) => {
    try { if (handleActionButtonClick()) return; } catch { /* silent */ }
    return next(args);
});

// Intercept slash commands before BC processes them
modAPI.hookFunction("ChatRoomSendChat", 10, (args, next) => {
    try {
        const input = document.getElementById("InputChat") as HTMLInputElement | null;
        if (input && handleOutfitCommand(input.value)) {
            input.value = "";
            return;
        }
    } catch { /* silent */ }
    return next(args);
});

// ─── Settings screen (two tabs: Actions | Outfits) ────────────────────────────

type Tab = "actions" | "outfits";
let activeTab: Tab = "actions";

const TAB_BTN_Y = 65;
const TAB_BTN_H = 50;

function drawTabs(): void {
    DrawButton( 60, TAB_BTN_Y, 220, TAB_BTN_H, "Action Buttons",
        activeTab === "actions" ? "#4a2a7a" : "#2a1a4a");
    DrawButton(290, TAB_BTN_Y, 220, TAB_BTN_H, "Outfits",
        activeTab === "outfits" ? "#4a2a7a" : "#2a1a4a");
}

function settingsRun(): void {
    DrawRect(0, 0, 1000, 65, "#0f0720");   // tab bar background
    drawTabs();
    if (activeTab === "actions") actionSettingsRun();
    else                         outfitSettingsRun();
}

function settingsClick(): void {
    // Tab switching
    if (MouseY >= TAB_BTN_Y && MouseY <= TAB_BTN_Y + TAB_BTN_H) {
        if (MouseX >= 60  && MouseX <= 280  && activeTab !== "actions") {
            outfitSettingsExit();
            activeTab = "actions";
            return;
        }
        if (MouseX >= 290 && MouseX <= 510  && activeTab !== "outfits") {
            actionSettingsExit();
            activeTab = "outfits";
            return;
        }
    }
    if (activeTab === "actions") actionSettingsClick();
    else                         outfitSettingsClick();
}

function settingsExit(): void {
    if (activeTab === "actions") actionSettingsExit();
    else                         outfitSettingsExit();
    activeTab = "actions";
}

PreferenceRegisterExtensionSetting({
    Identifier: MOD_NAME,
    ButtonText:  "EmeryBC",
    Image:       "",
    run:   settingsRun,
    click: settingsClick,
    exit:  settingsExit,
});

console.log(`[${MOD_NAME}] v${MOD_VERSION} loaded`);
