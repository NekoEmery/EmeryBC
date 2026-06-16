import { UI } from "./ui";

export function appendLocalLogLine(text: string, color = UI.accent): void {
    const doAppend = (): boolean => {
        const log = document.getElementById("TextAreaChatLog");
        if (!log) return false;
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
        return true;
    };
    if (!doAppend()) {
        window.setTimeout(() => doAppend(), 300);
    }
}
