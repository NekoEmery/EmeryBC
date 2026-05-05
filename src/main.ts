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

// ─── Load notice ──────────────────────────────────────────────────────────────

let noticeShown = false;
function showLoadNotice(): void {
    if (noticeShown) return;
    noticeShown = true;

    // Popup in top-right corner
    const wrap = document.createElement("div");
    wrap.style.cssText = `
        position: fixed; top: 10px; right: 10px; width: 260px;
        font-family: Arial, sans-serif; font-size: 13px;
        border: 2px solid #4a0080; border-radius: 6px;
        box-shadow: 0 3px 12px rgba(0,0,0,0.6);
        z-index: 99999; cursor: pointer; user-select: none;
    `;
    const title = document.createElement("div");
    title.style.cssText = `
        background: #4a0080; color: white; font-weight: bold;
        text-align: center; padding: 6px 10px;
        border-radius: 4px 4px 0 0; font-size: 14px;
    `;
    title.textContent = "EmeryBC Loaded";

    const body = document.createElement("div");
    body.style.cssText = `
        background: #7c3fbf; color: white;
        padding: 8px 12px; line-height: 1.6;
        border-radius: 0 0 4px 4px;
    `;
    body.innerHTML = `
        Version: ${MOD_VERSION}<br>
        ✓ Action Buttons<br>
        ✓ Outfit Commands<br>
        <span style="font-size:11px;opacity:0.7;">(click to dismiss)</span>
    `;
    wrap.appendChild(title);
    wrap.appendChild(body);
    wrap.addEventListener("click", () => wrap.remove());
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 10000);

    // Message in chat log
    const log = document.getElementById("TextAreaChatLog");
    if (log) {
        const msg = document.createElement("div");
        msg.style.cssText = `
            background: #2a0a4a; color: #c084fc;
            border-left: 3px solid #7c3fbf;
            padding: 4px 8px; margin: 2px 0;
            font-style: italic; font-size: 12px;
        `;
        msg.textContent = `✓ EmeryBC v${MOD_VERSION} loaded — configure in Preferences > Extensions`;
        log.appendChild(msg);
        log.scrollTop = log.scrollHeight;
    }
}

// ─── Settings screen ─────────────────────────────────────────────────────────

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
    DrawRect(0, 0, 1000, 65, "#0f0720");
    drawTabs();
    if (activeTab === "actions") actionSettingsRun();
    else                         outfitSettingsRun();
}

function settingsClick(): void {
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

// ─── Init ─────────────────────────────────────────────────────────────────────

let settingsRegistered = false;
function registerSettings(): void {
    if (settingsRegistered) return;
    const g = window as unknown as Record<string, unknown>;
    const reg = g["PreferenceRegisterExtensionSetting"] as ((s: unknown) => void) | undefined;
    console.log(`[EmeryBC] registerSettings: fn=${typeof reg}, player=${typeof Player !== "undefined" ? Player.MemberNumber : "N/A"}`);
    if (reg) {
        try {
            reg({
                Identifier: MOD_NAME,
                ButtonText:  "EmeryBC",
                Image:       "",
                load:  () => {},
                run:   settingsRun,
                click: settingsClick,
                exit:  settingsExit,
            });
            settingsRegistered = true;
            console.log("[EmeryBC] Extension settings registered OK");
        } catch (e) {
            console.error("[EmeryBC] Registration failed:", e);
        }
    } else {
        console.log("[EmeryBC] PreferenceRegisterExtensionSetting not ready yet, retrying in 1s");
        setTimeout(registerSettings, 1000);
    }
}

function init(): void {
    const modAPI = bcModSDK.registerMod(
        { name: MOD_NAME, fullName: "EmeryBC", version: MOD_VERSION },
        { allowReplace: true }
    );

    modAPI.hookFunction("ChatRoomMenuDraw", 3, (args, next) => {
        next(args);
        try { drawActionButtons(); } catch { /* silent */ }
    });

    modAPI.hookFunction("ChatRoomSync", 3, (args, next) => {
        const result = next(args);
        try { showLoadNotice(); } catch { /* silent */ }
        return result;
    });

    modAPI.hookFunction("ChatRoomClick", 3, (args, next) => {
        try { if (handleActionButtonClick()) return; } catch { /* silent */ }
        return next(args);
    });

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

    registerSettings();

    try { showLoadNotice(); } catch { /* silent */ }

    console.log(`[${MOD_NAME}] v${MOD_VERSION} loaded`);
}

const readyInterval = setInterval(() => {
    if (typeof bcModSDK !== "undefined") {
        clearInterval(readyInterval);
        init();
    }
}, 100);
