// Drop-in boot helper that builds the Firestore-compatible Supabase backend for the game.
//
// It creates a Supabase browser client (from the CDN ESM build) and returns the same
// names index.html's Firebase boot block already destructures, so swapping Firebase ->
// Supabase is a tiny, localized change. See README "Flipping the game to Supabase".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createFirestoreCompat, getAuth, signInAnonymously,
} from "./firestore-shim.js";

/**
 * @param {{ url: string, key: string }} cfg  Supabase project URL + publishable (anon) key.
 * @returns boot bundle: { app, db, auth, fs, signInAnonymously, supabase }
 */
export async function bootSupabase(cfg) {
  const supabase = createClient(cfg.url, cfg.key, {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  const { db, fs } = createFirestoreCompat(supabase);
  const auth = getAuth({ supabase });
  return { app: { __fsType: "app", supabase }, db, auth, fs, signInAnonymously, supabase };
}

// Same default project the migration targets; override by passing your own cfg.
export const BCA_SUPABASE = {
  url: "https://sbvnjguruzmexmamorlv.supabase.co",
  key: "sb_publishable_zNJWXu6dlChngw72NHARNA_XUh1kpX7",
};
