// Private character notes — stored locally in Player.ExtensionSettings, never shared.

import { callBC, syncSettings } from "./bcUtils";

export interface CharacterNote {
    name:      string;  // last seen display name
    note:      string;
    updatedAt: number;  // Date.now()
}

function getStore(): Record<string, unknown> | null {
    try {
        if (!Player?.ExtensionSettings) return null;
        if (!Player.ExtensionSettings.EmeryBC) Player.ExtensionSettings.EmeryBC = {};
        return Player.ExtensionSettings.EmeryBC as Record<string, unknown>;
    } catch {
        return null;
    }
}

export function getNotes(): Record<string, CharacterNote> {
    try {
        const raw = getStore()?.characterNotes;
        return (raw && typeof raw === "object" && !Array.isArray(raw))
            ? (raw as Record<string, CharacterNote>)
            : {};
    } catch { return {}; }
}

export function saveNote(memberNumber: number, name: string, note: string): void {
    try {
        const store = getStore();
        if (!store) return;
        const notes = getNotes();
        const key = String(memberNumber);
        if (note.trim()) {
            notes[key] = { name, note: note.trim(), updatedAt: Date.now() };
        } else {
            delete notes[key];
        }
        store.characterNotes = notes;
        syncSettings();
    } catch { /* ignore */ }
}

export function deleteNote(memberNumber: number): void {
    try {
        const store = getStore();
        if (!store) return;
        const notes = getNotes();
        delete notes[String(memberNumber)];
        store.characterNotes = notes;
        syncSettings();
    } catch { /* ignore */ }
}
