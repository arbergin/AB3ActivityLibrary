import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { SupabaseActivityRow } from "@/types/supabaseActivity";

export const runtime = "nodejs";
const bucket = "activity-files";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A service-role request never trusts an actor supplied by the browser. SQL checks
// the verified actor again, both before file copies and in the database transaction.
export async function POST(request: NextRequest) {
  const paths: string[] = [];
  const cleanup = async () => {
    if (!paths.length) return;
    // Do not delete referenced objects, including if a transaction committed but its response was lost.
    const { data, error } = await supabaseAdmin.from("activities").select("file_path").in("file_path", paths);
    if (error) { console.error("Unable to verify unused session-copy files", error); return; }
    const referenced = new Set((data ?? []).map(row => row.file_path));
    const unused = paths.filter(path => !referenced.has(path));
    if (unused.length) {
      const result = await supabaseAdmin.storage.from(bucket).remove(unused);
      if (result.error) console.error("Session copy cleanup failed", result.error);
    }
  };
  try {
    const header = request.headers.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Login required." }, { status: 401 });
    const body = await request.json();
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";
    if (!uuid.test(sessionId)) return NextResponse.json({ error: "Invalid session ID." }, { status: 400 });
    const { data, error } = await supabaseAdmin.rpc("ab3_session_bundle_for", { p_id: sessionId, p_actor: user.id });
    if (error) return NextResponse.json({ error: error.code === "42501" ? "Session not found or access denied." : "Unable to load session for copying." }, { status: error.code === "42501" ? 403 : 500 });
    const bundle = data as { team: { is_active: boolean }; activities: SupabaseActivityRow[]; activityRows: { activity_id: string | null }[] };
    if (!bundle.team.is_active) return NextResponse.json({ error: "Archived sessions must be restored before copying." }, { status: 409 });
    const available = new Set(bundle.activities.map(a => a.id));
    if (bundle.activityRows.some(row => row.activity_id && !available.has(row.activity_id))) {
      return NextResponse.json({ error: "A linked activity is unavailable to you. Ask the session owner to share or replace it before copying." }, { status: 409 });
    }
    const files: Record<string, { source: string; path: string }> = {};
    for (const activity of bundle.activities) {
      if (!activity.file_path) continue;
      if (activity.file_bucket && activity.file_bucket !== bucket) throw new Error("An activity uses an unsupported file bucket.");
      const extension = activity.file_path.match(/\.([a-zA-Z0-9]{1,10})$/)?.[1] ?? "file";
      const path = `activities/session_copy_${randomUUID()}.${extension}`;
      const result = await supabaseAdmin.storage.from(bucket).copy(activity.file_path, path);
      if (result.error) throw new Error(`Unable to copy the file for ${activity.activity_name}.`);
      paths.push(path);
      files[activity.id] = { source: activity.file_path, path };
    }
    const copied = await supabaseAdmin.rpc("ab3_copy_session", { p_id: sessionId, p_actor: user.id, p_files: files });
    if (copied.error) {
      await cleanup();
      return NextResponse.json({ error: copied.error.code === "42501" ? "Session access changed. Copy cancelled." : copied.error.message }, { status: copied.error.code === "42501" ? 403 : 409 });
    }
    return NextResponse.json({ id: copied.data });
  } catch (error) {
    await cleanup();
    console.error("Copy session failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to copy session." }, { status: 500 });
  }
}
