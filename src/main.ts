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
const MOD_VERSION = "0.1.1";

type Tab = "actions" | "outfits";

let noticeShown = false;
let activeTab: Tab = "actions";
let settingsRegistered = false;

const TAB_BTN_Y = 82;
const TAB_BTN_H = 28;
const TAB_BTN_W = 102;

function showLoadNotice(): void {
    if (noticeShown) return;
    noticeShown = true;

    const wrap = document.createElement("div");
    wrap.style.cssText = `
        position: fixed;
        top: 14px;
        right: 14px;
        width: 288px;
        font-family: "Trebuchet MS", "Palatino Linotype", serif;
        font-size: 13px;
        border: 1px solid ${UI.panelEdge};
        border-radius: 16px;
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
        overflow: hidden;
        z-index: 99999;
        cursor: pointer;
        user-select: none;
        background: linear-gradient(180deg, #341522 0%, #1b0d17 100%);
    `;

    const title = document.createElement("div");
    title.style.cssText = `
        background: linear-gradient(90deg, ${UI.accentDeep} 0%, ${UI.accentSoft} 100%);
        color: ${UI.text};
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        text-align: center;
        padding: 9px 12px;
        font-size: 13px;
    `;
    title.textContent = "EmeryBC Ready";

    const body = document.createElement("div");
    body.style.cssText = `
        color: ${UI.text};
        padding: 12px 14px 13px;
        line-height: 1.65;
    `;
    body.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="color:${UI.textMuted};">Version</span>
            <span style="color:${UI.gold};">${MOD_VERSION}</span>
        </div>
        <div style="padding:8px 10px;border:1px solid ${UI.panelEdge};border-radius:12px;background:${UI.cardMuted};">
            <div style="margin-bottom:4px;">Action Buttons online</div>
            <div>Outfit Commands online</div>
        </div>
        <div style="margin-top:9px;font-size:11px;color:${UI.textSoft};text-align:center;">Click to dismiss</div>
    `;

    wrap.appendChild(title);
    wrap.appendChild(body);
    wrap.addEventListener("click", () => wrap.remove());
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 10000);

    const log = document.getElementById("TextAreaChatLog");
    if (log) {
        const msg = document.createElement("div");
        msg.style.cssText = `
            background: ${UI.cardMuted};
            color: ${UI.accent};
            border-left: 3px solid ${UI.accent};
            padding: 4px 8px;
            margin: 2px 0;
            font-style: italic;
            font-size: 12px;
        `;
        msg.textContent = `EmeryBC v${MOD_VERSION} loaded - open Preferences > Extensions to configure it.`;
        log.appendChild(msg);
        log.scrollTop = log.scrollHeight;
    }
}

function drawTabs(): void {
    drawChromeButton(134, TAB_BTN_Y, TAB_BTN_W, TAB_BTN_H, "Actions", activeTab === "actions" ? "accent" : "muted");
    drawChromeButton(246, TAB_BTN_Y, TAB_BTN_W, TAB_BTN_H, "Outfits", activeTab === "outfits" ? "accent" : "muted");
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
        if (MouseX >= 134 && MouseX <= 134 + TAB_BTN_W && activeTab !== "actions") {
            outfitSettingsExit();
            activeTab = "actions";
            actionSettingsLoad();
            return;
        }
        if (MouseX >= 246 && MouseX <= 246 + TAB_BTN_W && activeTab !== "outfits") {
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
            Image: "",
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

    modAPI.hookFunction("ChatRoomSync", 3, (args, next) => {
        const result = next(args);
        try {
            showLoadNotice();
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
                if (input && handleOutfitCommand(input.value)) {
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
            if (input && handleOutfitCommand(input.value)) {
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
        showLoadNotice();
    } catch {
        // Ignore early notice failures.
    }

    console.log(`[${MOD_NAME}] v${MOD_VERSION} loaded`);
}

const readyInterval = setInterval(() => {
    if (typeof bcModSDK !== "undefined") {
        clearInterval(readyInterval);
        init();
    }
}, 100);
