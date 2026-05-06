/**
 * EmeryBC Drawer
 *
 * A CRABS-inspired sliding side panel positioned in the lower portion of the
 * chat log. Shows saved outfits with one-click wear buttons.
 *
 * UI pattern inspired by CRABS by Sin (https://github.com/sin-1337/CRABS).
 * Thank you Sin for the open design! ♥
 */
import { getOutfits, applyOutfit, type ConfiguredOutfit } from "./outfitManager";

// ── Icon ──────────────────────────────────────────────────────────────────────

const TAB_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 90 90">
    <rect x="8" y="8" width="74" height="74" rx="18" fill="#2a1421" stroke="#cf6f98" stroke-width="4"/>
    <path d="M28 30 L37 18 L45 31 L53 18 L62 30" fill="#cf6f98"/>
    <circle cx="34" cy="43" r="4" fill="#f7e6ee"/>
    <circle cx="56" cy="43" r="4" fill="#f7e6ee"/>
    <path d="M38 56 Q45 63 52 56" stroke="#f7e6ee" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>`;

// ── Styles ────────────────────────────────────────────────────────────────────

const CSS = `
#emerybc-drawer {
    position: fixed;
    z-index: 99;
    display: flex;
    align-items: flex-start;
    transition: transform 0.35s cubic-bezier(0.25, 1, 0.5, 1);
    will-change: transform;
    pointer-events: none;
}

#emerybc-drawer.ebc-closed { transform: translateX(calc(100% + 24px)); }
#emerybc-drawer.ebc-open   { transform: translateX(0); }

#ebc-tab {
    pointer-events: auto;
    width: 36px;
    height: 36px;
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
    left: -36px;
    top: 10px;
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
    padding: 8px 12px;
    border-bottom: 1px solid #4c2537;
    background: rgba(36, 17, 29, 0.9);
    flex-shrink: 0;
    gap: 8px;
}

.ebc-title {
    font-family: "Trebuchet MS", serif;
    font-size: 13px;
    font-weight: bold;
    color: #cf6f98;
    letter-spacing: 0.07em;
    white-space: nowrap;
}

.ebc-header-btns { display: flex; gap: 5px; align-items: center; }

.ebc-icon-btn {
    background: transparent;
    border: 1px solid #4c2537;
    border-radius: 6px;
    color: #967281;
    cursor: pointer;
    padding: 3px 7px;
    font-size: 12px;
    line-height: 1.3;
    font-family: "Trebuchet MS", serif;
    transition: background 0.14s, color 0.14s, border-color 0.14s;
}

.ebc-icon-btn:hover { background: #4c2537; color: #f7e6ee; border-color: #cf6f98; }

/* ── Body ── */
.ebc-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    scrollbar-width: thin;
    scrollbar-color: #4c2537 transparent;
}

.ebc-body::-webkit-scrollbar { width: 4px; }
.ebc-body::-webkit-scrollbar-track { background: transparent; }
.ebc-body::-webkit-scrollbar-thumb { background: #4c2537; border-radius: 2px; }

/* ── Section label ── */
.ebc-section-label {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 0.1em;
    color: #553142;
    text-transform: uppercase;
    padding: 4px 4px 6px;
}

/* ── Outfit rows ── */
.ebc-outfit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    border-radius: 8px;
    margin-bottom: 5px;
    background: rgba(42, 20, 33, 0.6);
    border: 1px solid #3a1928;
    transition: border-color 0.14s;
}

.ebc-outfit-row:hover { border-color: #6b3048; }

.ebc-outfit-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.ebc-outfit-name {
    font-family: "Trebuchet MS", serif;
    font-size: 12px;
    font-weight: bold;
    color: #f7e6ee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ebc-outfit-cmd {
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #cf6f98;
    letter-spacing: 0.04em;
}

.ebc-wear-btn {
    flex-shrink: 0;
    background: #2a1421;
    border: 1px solid #91405f;
    border-radius: 6px;
    color: #cf6f98;
    cursor: pointer;
    font-family: "Trebuchet MS", serif;
    font-size: 11px;
    font-weight: bold;
    padding: 4px 10px;
    transition: background 0.14s, color 0.12s;
    white-space: nowrap;
}

.ebc-wear-btn:hover { background: #91405f; color: #f7e6ee; }
.ebc-wear-btn:active { transform: scale(0.96); }

.ebc-wear-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
}

/* ── Empty ── */
.ebc-empty {
    color: #553142;
    font-family: "Trebuchet MS", serif;
    font-size: 12px;
    text-align: center;
    padding: 20px 8px;
    line-height: 1.7;
}

/* ── Footer ── */
.ebc-footer {
    flex-shrink: 0;
    padding: 5px 12px;
    border-top: 1px solid #2a1421;
    font-family: "Trebuchet MS", serif;
    font-size: 10px;
    color: #3a1a28;
    text-align: center;
}

.ebc-footer a { color: #553142; text-decoration: none; transition: color 0.14s; }
.ebc-footer a:hover { color: #cf6f98; }
`;

// ── Helper ────────────────────────────────────────────────────────────────────

function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Class ─────────────────────────────────────────────────────────────────────

export class EBCDrawer {
    private static _instance: EBCDrawer | null = null;

    private el: HTMLElement | null = null;
    private isOpen = false;
    private resizeObserver: ResizeObserver | null = null;

    constructor() {
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
            <div id="ebc-tab" title="EmeryBC outfits">${TAB_ICON}</div>
            <div class="ebc-panel">
                <div class="ebc-header">
                    <span class="ebc-title">✦ Outfits</span>
                    <div class="ebc-header-btns">
                        <button class="ebc-icon-btn" id="ebc-refresh-btn" title="Refresh outfit list">↺</button>
                        <button class="ebc-icon-btn" id="ebc-close-btn" title="Close">✕</button>
                    </div>
                </div>
                <div class="ebc-body" id="ebc-body"></div>
                <div class="ebc-footer">
                    UI inspired by <a href="https://github.com/sin-1337/CRABS" target="_blank">CRABS</a> by Sin ♥
                </div>
            </div>
        `;

        document.body.appendChild(el);
        this.el = el;

        el.querySelector("#ebc-tab")!.addEventListener("click", () => this.toggle());
        el.querySelector("#ebc-close-btn")!.addEventListener("click", () => this.close());
        el.querySelector("#ebc-refresh-btn")!.addEventListener("click", () => this.renderOutfits());

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
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    // ── Positioning — lower portion of the chat log ───────────────────────────

    private syncToChat(): void {
        const chatLog = document.getElementById("TextAreaChatLog");
        if (!chatLog || !this.el) return;
        const rect = chatLog.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        // Start 40% down the chat log so it sits in the lower half
        const topOffset = rect.height * 0.40;
        this.el.style.top    = `${rect.top + topOffset}px`;
        this.el.style.right  = `${document.documentElement.clientWidth - rect.right}px`;
        this.el.style.width  = `${rect.width}px`;
        this.el.style.height = `${Math.round(rect.height * 0.52)}px`;
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

    // ── Render outfits ────────────────────────────────────────────────────────

    private renderOutfits(): void {
        const body = this.el?.querySelector("#ebc-body");
        if (!body) return;

        const outfits = getOutfits();

        if (outfits.length === 0) {
            body.innerHTML = `<div class="ebc-empty">No outfits saved yet.<br>Go to <b>Preferences → Extensions → EmeryBC → Outfits</b> to set some up.</div>`;
            return;
        }

        body.innerHTML = `<div class="ebc-section-label">Saved Outfits</div>` +
            outfits.map((o: ConfiguredOutfit) => `
                <div class="ebc-outfit-row">
                    <div class="ebc-outfit-info">
                        <span class="ebc-outfit-name">${esc(o.displayName)}</span>
                        <span class="ebc-outfit-cmd">/${esc(o.command)}</span>
                    </div>
                    <button class="ebc-wear-btn" data-id="${esc(o.id)}">Wear</button>
                </div>
            `).join("");

        body.querySelectorAll<HTMLButtonElement>(".ebc-wear-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                const outfit = getOutfits().find(o => o.id === id);
                if (!outfit) return;

                // Disable all wear buttons briefly to prevent double-tap
                body.querySelectorAll<HTMLButtonElement>(".ebc-wear-btn").forEach(b => {
                    b.disabled = true;
                });

                applyOutfit(outfit);

                // Re-enable after outfit swap settles
                window.setTimeout(() => {
                    body.querySelectorAll<HTMLButtonElement>(".ebc-wear-btn").forEach(b => {
                        b.disabled = false;
                    });
                }, 500);
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
        this.renderOutfits();
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
