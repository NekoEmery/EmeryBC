// XToys WebSocket integration.
// Sends BC game events (activities, vibrator changes, shocks) to the XToys
// webhook so physical toys respond to in-game actions.
// Restricted to specific member numbers only.

import { getSettings, syncSettings } from "./bcUtils";

export const XTOYS_MEMBERS = [130267, 230466]; // Emery, Lucy
const XTOYS_WS_BASE = "wss://webhook.xtoys.app/";
const MAX_RETRIES   = 3;
const LOG_MAX       = 30;

export type XToysStatus = "disconnected" | "connecting" | "connected" | "error";

export interface XToysLogEntry {
    ts:     string;
    label:  "out" | "sys" | "err";
    text:   string;
}

let _ws:             WebSocket | null = null;
let _currentId       = "";
let _retries         = 0;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _status:         XToysStatus = "disconnected";
const _log:          XToysLogEntry[] = [];
let _listeners:      Array<(s: XToysStatus) => void> = [];

// ── Status ─────────────────────────────────────────────────────────────────────

export function xtoysStatus(): XToysStatus { return _status; }
export function xtoysLog():    XToysLogEntry[] { return [..._log]; }

export function xtoysOnStatus(cb: (s: XToysStatus) => void): () => void {
    _listeners.push(cb);
    return () => { _listeners = _listeners.filter(x => x !== cb); };
}

function _setStatus(s: XToysStatus): void {
    _status = s;
    for (const cb of _listeners) { try { cb(s); } catch { /* ignore */ } }
}

function _pushLog(label: XToysLogEntry["label"], text: string): void {
    const d = new Date();
    const ts = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
    _log.unshift({ ts, label, text });
    if (_log.length > LOG_MAX) _log.pop();
}

// ── Settings ───────────────────────────────────────────────────────────────────

export function getXToysWebhookId(): string {
    try { const v = getSettings().xtoysWebhookId; return typeof v === "string" ? v : ""; } catch { return ""; }
}

export function setXToysWebhookId(id: string): void {
    try { getSettings().xtoysWebhookId = id.trim(); syncSettings(); } catch { /* ignore */ }
}

export function isXToysUser(memberNumber: number | null | undefined): boolean {
    return typeof memberNumber === "number" && XTOYS_MEMBERS.includes(memberNumber);
}

// ── Connection ─────────────────────────────────────────────────────────────────

export function xtoysConnect(webhookId?: string): void {
    const id = (webhookId ?? getXToysWebhookId()).trim();
    if (!id) return;
    _currentId = id;
    setXToysWebhookId(id);
    _retries = 0;
    _doConnect();
}

function _doConnect(): void {
    if (_reconnectTimer !== null) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    if (_ws) { try { _ws.close(); } catch { /* ignore */ } _ws = null; }

    const url = _currentId.startsWith("wss://") || _currentId.startsWith("ws://")
        ? _currentId
        : `${XTOYS_WS_BASE}${_currentId}`;

    _setStatus("connecting");

    try {
        const ws = new WebSocket(url);
        _ws = ws;

        ws.addEventListener("open", () => {
            _retries = 0;
            _setStatus("connected");
            _pushLog("sys", "connected");
        });

        ws.addEventListener("close", (ev) => {
            _ws = null;
            if (_retries < MAX_RETRIES) {
                _retries++;
                const delay = 3000 * _retries;
                _setStatus("connecting");
                _pushLog("sys", `reconnecting in ${delay / 1000}s (attempt ${_retries}/${MAX_RETRIES})`);
                _reconnectTimer = setTimeout(_doConnect, delay);
            } else {
                _setStatus("disconnected");
                _pushLog("sys", `disconnected (code ${ev.code})`);
            }
        });

        ws.addEventListener("error", () => {
            _setStatus("error");
            _pushLog("err", "connection error");
        });
    } catch {
        _setStatus("error");
        _pushLog("err", "failed to open WebSocket");
    }
}

export function xtoysDisconnect(): void {
    if (_reconnectTimer !== null) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    if (_ws) { try { _ws.close(); } catch { /* ignore */ } _ws = null; }
    _retries  = MAX_RETRIES; // prevent auto-reconnect
    _currentId = "";
    _setStatus("disconnected");
    _pushLog("sys", "disconnected by user");
}

// ── Send ───────────────────────────────────────────────────────────────────────

export function xtoysSend(payload: Record<string, unknown>): void {
    if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
    try {
        _ws.send(JSON.stringify(payload));
        const action = String(payload.action ?? "?");
        const detail = [payload.activityGroup, payload.actionName, payload.assetName, payload.toyState]
            .filter(Boolean).join(" / ");
        _pushLog("out", detail ? `${action}: ${detail}` : action);
    } catch { /* ignore */ }
}

// ── Event helpers ──────────────────────────────────────────────────────────────

export function xtoysActivityEvent(activityGroup: string, actionName: string, assetName?: string): void {
    const p: Record<string, unknown> = { action: "activityEvent", activityGroup, actionName };
    if (assetName) p.assetName = assetName;
    xtoysSend(p);
}

export function xtoysActivityOnOtherEvent(activityGroup: string, actionName: string, assetName?: string): void {
    const p: Record<string, unknown> = { action: "activityOnOtherEvent", activityGroup, actionName };
    if (assetName) p.assetName = assetName;
    xtoysSend(p);
}

export function xtoysItemAdded(assetGroup: string, assetName: string): void {
    xtoysSend({ action: "itemAdded", assetGroup, assetName });
}

export function xtoysItemRemoved(assetGroup: string, assetName: string): void {
    xtoysSend({ action: "itemRemoved", assetGroup, assetName });
}

export function xtoysShockEvent(): void {
    xtoysSend({ action: "shockEvent" });
}

export function xtoysToyEvent(toyState: string, assetGroup?: string): void {
    const p: Record<string, unknown> = { action: "toyEvent", toyState };
    if (assetGroup) p.assetGroup = assetGroup;
    xtoysSend(p);
}

// ── Activity dictionary parser ─────────────────────────────────────────────────
// BC sends activity messages via ChatRoomMessage. The dictionary format varies
// between BC versions - this parser handles both the object-property style
// (older BC / reference BC-XToys format) and the Tag-string style (newer BC).

type DictEntry = Record<string, unknown>;

export function parseXToysActivity(dict: DictEntry[]): {
    targetNum?: number;
    sourceNum?: number;
    actGroup?:  string;
    actName?:   string;
} {
    let targetNum: number | undefined;
    let sourceNum: number | undefined;
    let actGroup:  string | undefined;
    let actName:   string | undefined;

    for (const item of dict) {
        // Target
        if ("TargetCharacter" in item && typeof item.TargetCharacter === "object" && item.TargetCharacter !== null) {
            targetNum = (item.TargetCharacter as DictEntry).MemberNumber as number | undefined;
        }
        if (item.Tag === "TargetCharacter" || item.Tag === "DestinationCharacter") {
            if (typeof item.MemberNumber === "number") targetNum = item.MemberNumber;
        }
        // Source
        if ("SourceCharacter" in item && typeof item.SourceCharacter === "object" && item.SourceCharacter !== null) {
            sourceNum = (item.SourceCharacter as DictEntry).MemberNumber as number | undefined;
        }
        if (item.Tag === "SourceCharacter") {
            if (typeof item.MemberNumber === "number") sourceNum = item.MemberNumber;
        }
        // Asset group
        if (typeof item.ActivityAssetGroup === "string") actGroup = item.ActivityAssetGroup;
        if (item.Tag === "AssetGroupName" && typeof item.AssetGroupName === "string") actGroup = item.AssetGroupName;
        // Activity name
        if (typeof item.ActivityAsset === "string") actName = item.ActivityAsset;
        if (item.Tag === "ActivityName" && typeof item.ActivityName === "string") actName = item.ActivityName;
    }

    return { targetNum, sourceNum, actGroup, actName };
}
