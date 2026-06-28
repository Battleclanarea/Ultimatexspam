// Ultimatexspam — example Supabase Edge Function using @supabase/server.
//
// This replaces the Firebase/Firestore client writes the game does today. The
// browser (index.html) calls this endpoint with the player's Supabase auth JWT;
// @supabase/server verifies the JWT and hands us an RLS-scoped client so a player
// can only ever read/write their OWN rows. Privileged work (admin grants, boosts,
// roster edits) uses ctx.supabaseAdmin, which bypasses RLS and is therefore ONLY
// safe here on the server — never in the browser, where the secret key would leak.
//
// Deno (Supabase Edge runtime) import. For Node-based runtimes use "@supabase/server".
import { withSupabase } from "npm:@supabase/server@^1.2.0";

export default {
  // auth: "user" => requires a valid Supabase user JWT (Authorization: Bearer ...).
  fetch: withSupabase({ auth: "user" }, async (req: Request, ctx) => {
    const url = new URL(req.url);
    const me = ctx.userClaims?.id; // the authenticated player's uid

    // GET /game-api  → return THIS player's own profile (RLS guarantees scoping).
    if (req.method === "GET") {
      const { data, error } = await ctx.supabase
        .from("profiles")
        .select("id, callsign, score, soul_score, gold")
        .eq("id", me)
        .maybeSingle();
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ profile: data });
    }

    // POST /game-api  → upsert THIS player's score/gold. RLS policies on `profiles`
    // (e.g. "id = auth.uid()") ensure a player can never write another player's row.
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const patch: Record<string, unknown> = { id: me };
      if (typeof body.score === "number") patch.score = body.score;
      if (typeof body.gold === "number") patch.gold = body.gold;
      if (typeof body.soul_score === "number") patch.soul_score = body.soul_score;
      const { data, error } = await ctx.supabase
        .from("profiles")
        .upsert(patch)
        .select()
        .maybeSingle();
      if (error) return Response.json({ error: error.message }, { status: 400 });
      return Response.json({ profile: data });
    }

    // Example of a privileged, admin-only action (bypasses RLS). Guard it with your
    // own admin check before using ctx.supabaseAdmin in real handlers.
    // if (url.pathname.endsWith("/grant")) {
    //   const { target, amount } = await req.json();
    //   await ctx.supabaseAdmin.rpc("admin_grant_score", { target, amount });
    // }

    return new Response("Method Not Allowed", { status: 405 });
  }),
};
