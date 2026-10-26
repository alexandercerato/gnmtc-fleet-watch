import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const vesselStates = sqliteTable("vessel_states", { imo: text("imo").primaryKey(), checkedAt: text("checked_at").notNull(), payload: text("payload").notNull() });
export const destinationChanges = sqliteTable("destination_changes", { id: text("id").primaryKey(), imo: text("imo").notNull(), recordedAt: text("recorded_at").notNull(), fromPort: text("from_port"), toPort: text("to_port"), sourceUrl: text("source_url").notNull() });
export const refreshRuns = sqliteTable("refresh_runs", { id: text("id").primaryKey(), completedAt: text("completed_at").notNull(), verifiedCount: integer("verified_count").notNull(), unavailableCount: integer("unavailable_count").notNull() });
export const monitorSettings = sqliteTable("monitor_settings", { key: text("key").primaryKey(), payload: text("payload").notNull() });
