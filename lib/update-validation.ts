import { z } from "zod";
import { allowedImos } from "./fleet";
const nullableText = z.string().trim().min(1).max(160).nullable();
const timestamp = z.string().datetime({ offset: true });
const httpsUrl = z.string().url().refine(s => { const u = new URL(s); return u.protocol === "https:" && !u.username && !u.password; }, "HTTPS source required");
const imo = z.string().refine(s => allowedImos.has(s), "IMO outside the fixed GNMTC fleet");
export const observationSchema = z.object({
  imo, destinationPort: nullableText, destinationCountry: nullableText, destinationCode: z.string().max(12).nullable(), destinationRaw: z.string().max(200).nullable(),
  destinationKind: z.enum(["declared", "arrived", "orders", "unavailable"]), region: z.enum(["Mediterraneo", "Americhe", "Asia", "Africa", "Altro", "Non disponibile"]),
  currentArea: nullableText, navStatus: z.enum(["underway", "anchored", "moored", "maintenance", "held", "unknown"]),
  etaText: z.string().max(120).nullable(), etaDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), lastPort: nullableText,
  lastMovementAt: timestamp.nullable(), lastMovementText: z.string().max(240).nullable(), sourceUrl: httpsUrl, sourceCheckedAt: timestamp, aisObservedAt: timestamp.nullable(), evidenceNote: z.string().trim().max(800),
}).strict().superRefine((v, ctx) => {
  if (v.destinationKind === "unavailable" && (v.destinationPort || v.destinationCountry)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Unavailable destinations must be null" });
  if (v.destinationKind === "declared" && !v.destinationPort) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Declared destination needs a port" });
  if (Date.parse(v.sourceCheckedAt) > Date.now() + 300_000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Check time cannot be in the future" });
  if (v.aisObservedAt && Date.parse(v.aisObservedAt) > Date.parse(v.sourceCheckedAt)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "AIS observation cannot be after source check" });
});
export const updateSchema = z.object({
  runId: z.string().regex(/^[a-zA-Z0-9:_-]{5,100}$/), observations: z.array(observationSchema).max(18),
  failures: z.array(z.object({ imo, checkedAt: timestamp, message: z.string().trim().max(800) }).strict()).max(18).default([]),
}).strict().superRefine((v, ctx) => {
  const ids = [...v.observations.map(x => x.imo), ...v.failures.map(x => x.imo)];
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Each IMO may appear only once per run" });
  if (!ids.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "An update needs at least one result" });
});
