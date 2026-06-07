// IndexedDB via Dexie — replaces localStorage for character bundle storage.
// IndexedDB has no 5 MB quota, handles large payloads cleanly, and is async
// so writes never block the BC event loop.

import Dexie, { type Table } from "dexie";

export interface BundleRow {
    num: number;                     // member number (primary key)
    data: Record<string, unknown>;   // stripped character bundle
    ts:  number;                     // last-seen unix ms (used for eviction)
}

class EBCDatabase extends Dexie {
    bundles!: Table<BundleRow, number>;

    constructor() {
        super("EBC");
        this.version(1).stores({
            bundles: "num, ts",      // num = PK, ts = index for age-based eviction
        });
    }
}

// ── Global Dexie error suppression ───────────────────────────────────────────
// Dexie can leak raw IDBRequest error Events as unhandled Promise rejections in
// certain Chrome versions.  We suppress them at every level available:
//
//  1. Dexie.on("error") — static global hook, catches errors from ALL Dexie
//     instances before they escape into the Promise system.
//  2. db.on("error")    — instance-level hook for this specific database.
//  3. db.open().catch() — handles the initial open rejection.
//  4. window.addEventListener("unhandledrejection") — last-resort backstop;
//     registered here (module-load time) so it is always earlier than init().
//
// All four layers are needed because different Chrome versions trigger different
// code paths inside Dexie's internal promise machinery.

try { Dexie.on("error", () => {}); } catch { /* ignore */ }

// window handler registered before the db instance is created
try {
    window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
        try {
            if (e.reason instanceof Event || String(e.reason) === "[object Event]") {
                e.preventDefault();
            }
        } catch { /* ignore */ }
    });
} catch { /* ignore */ }

export const db = new EBCDatabase();

try { db.on("error",   () => {}); } catch { /* ignore */ }
try { db.on("blocked", () => {}); } catch { /* ignore */ }

db.open().catch(() => {});

// Migrate existing localStorage bundles into IndexedDB (one-time, runs on startup).
// Cleans up localStorage entries after a successful migration.
export async function migrateLocalStorageBundles(): Promise<void> {
    try {
        const metaRaw = localStorage.getItem("EBC_bundleMeta");
        if (!metaRaw) return;
        const meta = JSON.parse(metaRaw) as Record<string, number>;
        const rows: BundleRow[] = [];
        for (const [numStr, ts] of Object.entries(meta)) {
            const num = Number(numStr);
            if (!num) continue;
            try {
                const raw = localStorage.getItem(`EBC_bundle_${num}`);
                if (raw) rows.push({ num, data: JSON.parse(raw) as Record<string, unknown>, ts });
            } catch { /* ignore */ }
        }
        if (rows.length === 0) return;
        await db.bundles.bulkPut(rows);
        // Clean up localStorage after successful migration
        for (const numStr of Object.keys(meta)) {
            try { localStorage.removeItem(`EBC_bundle_${numStr}`); } catch { /* ignore */ }
        }
        try { localStorage.removeItem("EBC_bundleMeta"); } catch { /* ignore */ }
    } catch { /* ignore */ }
}

// Evict bundles older than 60 days — runs once on startup after migration.
export async function evictOldBundles(): Promise<void> {
    try {
        const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
        await db.bundles.where("ts").below(cutoff).delete();
    } catch { /* ignore */ }
}
