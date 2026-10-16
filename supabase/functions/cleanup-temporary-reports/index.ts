import { createClient } from "npm:@supabase/supabase-js@2";
Deno.serve(async request => {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || request.headers.get("authorization") !== "Bearer " + expected) return new Response("Unauthorized", { status: 401 });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response("Missing Supabase configuration", { status: 500 });
  const client = createClient(url, key);
  let deleted = 0;
  for (let i = 0; i < 20; i++) {
    const { data: rows, error } = await client.from("temporary_reports").select("id,storage_path").lte("expires_at", new Date().toISOString()).limit(100);
    if (error) return new Response(error.message, { status: 500 });
    if (!rows?.length) break;
    const { error: removeError } = await client.storage.from("temporary-reports").remove(rows.map(r => r.storage_path));
    if (removeError) return new Response(removeError.message, { status: 500 });
    const { error: deleteError } = await client.from("temporary_reports").delete().in("id", rows.map(r => r.id));
    if (deleteError) return new Response(deleteError.message, { status: 500 });
    deleted += rows.length;
  }
  return Response.json({ deleted });
});
