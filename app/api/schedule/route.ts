import { env } from "cloudflare:workers";
import { z } from "zod";
const schema = z.object({ enabled: z.boolean(), label: z.string().max(180), timezone: z.literal("Europe/Rome"), automationId: z.string().max(160) }).strict();
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Origin not allowed" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid schedule" }, { status: 400 });
  if (!env.DB) return Response.json({ error: "Register unavailable" }, { status: 503 });
  await env.DB.prepare("INSERT INTO monitor_settings (key, payload) VALUES ('schedule', ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload").bind(JSON.stringify(parsed.data)).run();
  return Response.json({ ok: true, schedule: parsed.data });
}
