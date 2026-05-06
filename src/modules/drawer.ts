/**
 * EmeryBC Drawer
 *
 * A CRABS-inspired sliding side panel that sits beside the chat log.
 * The EmeryBC icon tab protrudes to the left — click it to expand/collapse.
 *
 * UI pattern inspired by CRABS by Sin (https://github.com/sin-1337/CRABS).
 * Thank you Sin for the open design! ♥
 */
import type { ActionButton } from "./actionButtons";

// ── Icon (same SVG as the Extensions button, scaled for the tab) ─────────────

const TAB_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 90 90">
    <rect x="8" y="8" width="74" height="74" rx="18" fill="#2a1421" stroke="#cf6f98" stroke-width="4"/>
    <path d="M28 30 L37 18 L45 31 L53 18 L62 30" fill="#cf6f98"/>
    <circle cx="34" cy="43" r="4" fill="#f7e6ee"/>
    <circle cx="56" cy="43" r="4" fill="#f7e6ee"/>
    <path d="M38 56 Q45 63 52 56" stroke="#f7e6ee" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;

// ── Styles ────────────────────────────────────────────────────────────────────

const DRAWER_CSS = `
#emerybc-drawer {
    position: fixed;
    z-index: 99;
    display: flex;
    align-items: flex-start;
    transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: transform;
    pointer-events: none;
}

#emerybc-drawer.ebc-closed { transform: translateX(calc(100% + 20px)); }
#emerybc-drawer.ebc-open   { transform: translateX(0); }

#ebc-tab {
    pointer-events: auto;
    width: 38px;
    height: 38px;
    background: rgba(42, 20, 33, 0.93);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 1px solid rgba(207, 111, 152, 0.45);
    border-right: none;
    border-radius: 8px 0 0 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    box-shadow: -3px 0 10px rgba(0,0,0,0.55);
    position: absolute;
    left: -38px;
    top: 12px;
    z-index: 99;
    transition: background 0.18s;
    flex-shrink: 0;
}

#ebc-tab:hover { background: rgba(76, 37, 55, 0.97); }

.ebc-panel {
    pointer-events: auto;
    background: rgba(27, 13, 23, 0.97);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border-left: 2px solid #4c2537;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    box-shadow: -4px 0 20px rgba(0,0,0,0.5);
}

/* ── Header ── */
.ebc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 12px;
    border-bottom: 1px solid #4c2537;
    background: rgba(36, 17, 29, 0.9);
    flex-shrink: 0;
    gap: 8px;
}

.ebc-header-title {
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    font-weight: bold;
    color: #cf6f98;
    letter-spacing: 0.07em;
    white-space: nowrap;
}

.ebc-header-actions { display: flex; gap: 5px; align-items: center; }

.ebc-icon-btn {
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 6px;
    color: #967281;
    cursor: pointer;
    padding: 3px 8px;
    font-size: 12px;
    line-height: 1.3;
    font-family: "Trebuchet MS", serif;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
}

.ebc-icon-btn:hover {
    background: #4c2537;
    color: #f7e6ee;
    border-color: #cf6f98;
}

/* ── Body ── */
.ebc-body {
    flex: 1;
    overflow-y: auto;
    padding: 10px 10px 6px;
    scrollbar-width: thin;
    scrollbar-color: #4c2537 transparent;
}

.ebc-body::-webkit-scrollbar { width: 4px; }
.ebc-body::-webkit-scrollbar-track { background: transparent; }
.ebc-body::-webkit-scrollbar-thumb { background: #4c2537; border-radius: 2px; }

/* ── Button grid ── */
.ebc-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
    gap: 6px;
}

.ebc-btn {
    background: var(--ebc-bg, #2a1421);
    border: 1px solid var(--ebc-color, #cf6f98);
    border-radius: 8px;
    color: #f7e6ee;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 0.04em;
    padding: 9px 4px;
    text-align: center;
    transition: background 0.14s, color 0.12s, transform 0.1s;
    word-break: break-word;
    line-height: 1.2;
}

.ebc-btn:hover {
    background: var(--ebc-color, #cf6f98);
    color: #12070d;
    transform: scale(1.04);
}

.ebc-btn:active { transform: scale(0.96); }

/* ── Empty state ── */
.ebc-empty {
    color: #553142;
    font-family: "Trebuchet MS", serif;
    font-size: 12px;
    text-align: center;
    padding: 24px 8px;
    line-height: 1.7;
}

/* ── Footer ── */
.ebc-footer {
    flex-shrink: 0;
    padding: 6px 12px;
    border-top: 1px solid #2a1421;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #3a1a28;
    text-align: center;
    line-height: 1.5;
}

.ebc-footer a {
    color: #553142;
    text-decoration: none;
    transition: color 0.14s;
}

.ebc-footer a:hover { color: #cf6f98; }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Darken a hex color for background use at low opacity */
function colorToAlpha(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

// ── Class ─────────────────────────────────────────────────────────────────────

export class EBCDrawer {
    private static _instance: EBCDrawer | null = null;

    private el: HTMLElement | null = null;
    private isOpen = false;
    private resizeObserver: ResizeObserver | null = null;

    constructor(private getButtons: () => ActionButton[]) {
        EBCDrawer._instance = this;
        if (document.body) {
            this.setup();
        } else {
            document.addEventListener("DOMContentLoaded", () => this.setup());
        }
    }

    // ── Setup ─────────────────────────────────────────────────────────────────

    private setup(): void {
        if (this.el) return;
        this.injectStyles();

        const el = document.createElement("div");
        el.id = "emerybc-drawer";
        el.className = "ebc-closed";
        el.style.display = "none";
        el.innerHTML = `
            <div id="ebc-tab" title="EmeryBC actions">${TAB_ICON}</div>
            <div class="ebc-panel">
                <div class="ebc-header">
                    <span class="ebc-header-title">✦ EmeryBC</span>
                    <div class="ebc-header-actions">
                        <button class="ebc-icon-btn" id="ebc-close-btn" title="Close">✕</button>
                    </div>
                </div>
                <div class="ebc-body">
                    <div id="ebc-grid" class="ebc-grid"></div>
                </div>
                <div class="ebc-footer">
                    UI inspired by <a href="https://github.com/sin-1337/CRABS" target="_blank">CRABS</a> by Sin ♥
                </div>
            </div>
        `;

        document.body.appendChild(el);
        this.el = el;

        el.querySelector("#ebc-tab")!.addEventListener("click", () => this.toggle());
        el.querySelector("#ebc-close-btn")!.addEventListener("click", () => this.close());

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.isOpen) this.close();
        });

        this.syncToChat();

        const chatLog = document.getElementById("TextAreaChatLog");
        if (chatLog && typeof ResizeObserver !== "undefined") {
            this.resizeObserver = new ResizeObserver(() => this.syncToChat());
            this.resizeObserver.observe(chatLog);
        }
    }

    private injectStyles(): void {
        if (document.getElementById("emerybc-drawer-css")) return;
        const s = document.createElement("style");
        s.id = "emerybc-drawer-css";
        s.textContent = DRAWER_CSS;
        document.head.appendChild(s);
    }

    // ── Positioning ───────────────────────────────────────────────────────────

    private syncToChat(): void {
        const chatLog = document.getElementById("TextAreaChatLog");
        if (!chatLog || !this.el) return;
        const rect = chatLog.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        this.el.style.top    = `${rect.top}px`;
        this.el.style.right  = `${document.documentElement.clientWidth - rect.right}px`;
        this.el.style.width  = `${rect.width}px`;
        this.el.style.height = `${Math.round(rect.height * 0.62)}px`;
    }

    // ── Visibility ────────────────────────────────────────────────────────────

    public updateVisibility(): void {
        if (!this.el) return;
        const inRoom = typeof CurrentScreen !== "undefined" && CurrentScreen === "ChatRoom";
        this.el.style.display = inRoom ? "flex" : "none";
        if (!inRoom) {
            this.isOpen = false;
            this.el.className = "ebc-closed";
        }
        if (inRoom) {
            this.syncToChat();
            if (!this.resizeObserver && typeof ResizeObserver !== "undefined") {
                const chatLog = document.getElementById("TextAreaChatLog");
                if (chatLog) {
                    this.resizeObserver = new ResizeObserver(() => this.syncToChat());
                    this.resizeObserver.observe(chatLog);
                }
            }
        } else {
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    private renderButtons(): void {
        const grid = this.el?.querySelector("#ebc-grid");
        if (!grid) return;

        const btns = this.getButtons().filter(b => b.enabled && b.label.trim());

        if (btns.length === 0) {
            grid.innerHTML = `<div class="ebc-empty">No action buttons set up yet.<br>Go to <b>Preferences → Extensions → EmeryBC</b> to add some.</div>`;
            return;
        }

        grid.innerHTML = btns.map(b => {
            const bg  = /^#[0-9a-f]{6}$/i.test(b.color) ? colorToAlpha(b.color, 0.18) : "rgba(42,20,33,0.8)";
            const col = esc(b.color);
            return `<button class="ebc-btn"
                data-emote="${esc(b.emote)}"
                style="--ebc-color:${col};--ebc-bg:${bg}"
                title="${esc(b.emote)}">
                ${esc(b.label)}
            </button>`;
        }).join("");

        grid.querySelectorAll<HTMLButtonElement>(".ebc-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const emote = btn.dataset.emote ?? "";
                if (emote) ServerSend("ChatRoomChat", { Content: emote.trim(), Type: "Emote" });
            });
        });
    }

    // ── Open / Close / Toggle ─────────────────────────────────────────────────

    public toggle(): void { this.isOpen ? this.close() : this.open(); }

    public open(): void {
        if (!this.el) return;
        this.isOpen = true;
        this.el.className = "ebc-open";
        this.syncToChat();
        this.renderButtons();
    }

    public close(): void {
        if (!this.el) return;
        this.isOpen = false;
        this.el.className = "ebc-closed";
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    public destroy(): void {
        this.resizeObserver?.disconnect();
        this.el?.remove();
        this.el = null;
        EBCDrawer._instance = null;
    }

    public static getInstance(): EBCDrawer | null {
        return EBCDrawer._instance;
    }
}
