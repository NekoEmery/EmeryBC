// Character bundle storage — session-memory only.
// Dexie/IndexedDB was removed because Chrome's IDB implementation
// leaks raw IDBRequest error Events as unhandled Promise rejections
// that BC's error reporter displays as "[object Event]" dialogs.
// Eight suppression attempts (db.open().catch, db.on("error"),
// Dexie.on("error"), window.unhandledrejection, etc.) all failed.
// The in-session memory cache (tier-1 in friends.ts) already covers
// all same-session lookups; only cross-session persistence is lost.

export interface BundleRow {
    num: number;
    data: Record<string, unknown>;
    ts:  number;
}

// No-op stubs — keep the same public interface so call-sites don't change.
export async function migrateLocalStorageBundles(): Promise<void> {
    // Clean up any IndexedDB the old version created so the database
    // doesn't sit there taking up space.
    try { indexedDB.deleteDatabase("EBC"); } catch { /* ignore */ }
    // Also clean up any old localStorage bundle data
    try {
        const metaRaw = localStorage.getItem("EBC_bundleMeta");
        if (metaRaw) {
            const meta = JSON.parse(metaRaw) as Record<string, number>;
            for (const numStr of Object.keys(meta)) {
                try { localStorage.removeItem(`EBC_bundle_${numStr}`); } catch { /* ignore */ }
            }
            localStorage.removeItem("EBC_bundleMeta");
        }
    } catch { /* ignore */ }
}

export async function evictOldBundles(): Promise<void> {
    // nothing to evict — no persistent store
}
