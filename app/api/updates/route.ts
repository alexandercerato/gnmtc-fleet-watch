import { env } from "cloudflare:workers";
import { updateSchema } from "@/lib/update-validation";
import { destinationKey, seedVessels, type Observation } from "@/lib/fleet";

// Sites dispatch enforces owner/service access for this owner-private Site.
// Do not expose this shared writer by changing the Site to a public audience.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Origin not allowed" }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "JSON required" }, { status: 415 });
  const raw = await request.text();
  if (raw.length > 100_000) return Response.json({ error: "Payload too large" }, { status: 413 });
  let input: unknown; try { input = JSON.parse(raw); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return Response.json({ error: "Invalid update", details: parsed.error.flatten() }, { status: 400 });
  if (!env.DB) return Response.json({ error: "Register unavailable" }, { status: 503 });
  const db = env.DB;
  const { runId, observations, failures } = parsed.data;
  const priorRun = await db.prepare("SELECT id FROM refresh_runs WHERE id = ?").bind(runId).first();
  if (priorRun) return Response.json({ ok: true, duplicate: true, runId });
  const stored = await db.prepare("SELECT imo, checked_at, payload FROM vessel_states").all<{ imo: string; checked_at: string; payload: string }>();
  const prior = new Map(stored.results.map(s => [s.imo, JSON.parse(s.payload) as Observation]));
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  let accepted = 0; let changed = 0;
  for (const observation of observations) {
    const old = prior.get(observation.imo) ?? seedVessels.find(s => s.imo === observation.imo)!;
    if (Date.parse(observation.sourceCheckedAt) < Date.parse(old.sourceCheckedAt)) continue;
    if (old.aisObservedAt && observation.aisObservedAt && Date.parse(observation.aisObservedAt) < Date.parse(old.aisObservedAt)) continue;
    const next = { ...observation, lastAttemptAt: observation.sourceCheckedAt, checkError: null };
    statements.push(db.prepare("INSERT INTO vessel_states (imo, checked_at, payload) VALUES (?, ?, ?) ON CONFLICT(imo) DO UPDATE SET checked_at = excluded.checked_at, payload = excluded.payload WHERE excluded.checked_at >= vessel_states.checked_at").bind(observation.imo, observation.sourceCheckedAt, JSON.stringify(next)));
    if (destinationKey(old) !== destinationKey(observation)) {
      statements.push(db.prepare("INSERT OR IGNORE INTO destination_changes (id, imo, recorded_at, from_port, to_port, source_url) VALUES (?, ?, ?, ?, ?, ?)").bind(runId + ":" + observation.imo, observation.imo, observation.sourceCheckedAt, old.destinationPort, observation.destinationPort, observation.sourceUrl)); changed++;
    }
    accepted++;
  }
  for (const failure of failures) {
    const old = prior.get(failure.imo) ?? seedVessels.find(s => s.imo === failure.imo)!;
    if (Date.parse(failure.checkedAt) < Date.parse(old.lastAttemptAt ?? old.sourceCheckedAt)) continue;
    const next = { ...old, lastAttemptAt: failure.checkedAt, checkError: failure.message };
    statements.push(db.prepare("INSERT INTO vessel_states (imo, checked_at, payload) VALUES (?, ?, ?) ON CONFLICT(imo) DO UPDATE SET payload = excluded.payload WHERE excluded.checked_at >= vessel_states.checked_at").bind(failure.imo, old.sourceCheckedAt, JSON.stringify(next)));
  }
  statements.push(db.prepare("INSERT INTO refresh_runs (id, completed_at, verified_count, unavailable_count) VALUES (?, ?, ?, ?)").bind(runId, now, accepted, failures.length));
  await db.batch(statements);
  return Response.json({ ok: true, runId, verified: accepted, unavailable: failures.length, changed, completedAt: now });
}
