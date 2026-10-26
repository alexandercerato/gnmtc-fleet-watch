import seed from "./fleet-seed.json";
export type NavStatus = "underway" | "anchored" | "moored" | "maintenance" | "held" | "unknown";
export type DestinationKind = "declared" | "arrived" | "orders" | "unavailable";
export type Observation = {
  imo: string; destinationPort: string | null; destinationCountry: string | null; destinationCode: string | null; destinationRaw: string | null; destinationKind: DestinationKind;
  region: string; currentArea: string | null; navStatus: NavStatus; etaText: string | null; etaDate: string | null; lastPort: string | null;
  lastMovementAt: string | null; lastMovementText: string | null; sourceUrl: string; sourceCheckedAt: string; aisObservedAt: string | null; evidenceNote: string;
  lastAttemptAt?: string; checkError?: string | null;
};
export type Vessel = Observation & { name: string; alias?: string; flag: string; flagCode: string; type: string; built: number; attention: boolean };
export type Change = { id: string; imo: string; recordedAt: string; fromPort: string | null; toPort: string | null; sourceUrl: string };
export type Schedule = { enabled: boolean; label: string; timezone: string; automationId?: string };
export type FleetResponse = { vessels: Vessel[]; changes: Change[]; lastRun: { completedAt: string; verifiedCount: number; unavailableCount: number } | null; schedule: Schedule; servedAt: string };
export const seedVessels = seed.vessels as Vessel[];
export const allowedImos = new Set(seedVessels.map(v => v.imo));
export const seedCheckedAt = seed.checkedAt;
export const defaultSchedule: Schedule = { enabled: false, label: "Controlli automatici in configurazione", timezone: "Europe/Rome" };
export const navLabels: Record<NavStatus, string> = { underway: "In navigazione", anchored: "Alla fonda", moored: "Ormeggiata", maintenance: "Manutenzione", held: "Fermo prolungato", unknown: "Stato non esposto" };
export function destinationKey(v: Observation) { return [v.destinationPort?.trim().toLocaleLowerCase("it") ?? "", v.destinationCountry?.trim().toLocaleLowerCase("it") ?? ""].join("|"); }
export function mergeFleet(updates: Observation[]): Vessel[] { const map = new Map(updates.map(v => [v.imo, v])); return seedVessels.map(v => ({ ...v, ...map.get(v.imo) })); }
export function niceDate(value: string | null | undefined, withTime = false) {
  if (!value) return "Non disponibile";
  const date = new Date(value); if (Number.isNaN(date.getTime())) return "Non disponibile";
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}), timeZone: "Europe/Rome" }).format(date);
}
