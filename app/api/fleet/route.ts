import { getDb } from "@/db";
import { vesselStates, destinationChanges, refreshRuns, monitorSettings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { mergeFleet, defaultSchedule, type Observation } from "@/lib/fleet";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const db = getDb();
    const [states, changes, runs, settings] = await Promise.all([
      db.select().from(vesselStates), db.select().from(destinationChanges).orderBy(desc(destinationChanges.recordedAt)).limit(200),
      db.select().from(refreshRuns).orderBy(desc(refreshRuns.completedAt)).limit(1), db.select().from(monitorSettings).where(eq(monitorSettings.key, "schedule")).limit(1),
    ]);
    return Response.json({ vessels: mergeFleet(states.map(s => JSON.parse(s.payload) as Observation)), changes, lastRun: runs[0] ?? null, schedule: settings[0] ? JSON.parse(settings[0].payload) : defaultSchedule, servedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Fleet read failed", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: "Il registro non è raggiungibile. Riprova tra poco." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
