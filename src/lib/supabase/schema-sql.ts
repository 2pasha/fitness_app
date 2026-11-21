import fs from "fs";
import path from "path";

export function getInitialSchemaSql(): string {
  try {
    const sqlPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "0001_initial_schema.sql"
    );
    return fs.readFileSync(sqlPath, "utf-8");
  } catch {
    return "-- Check supabase/migrations/0001_initial_schema.sql";
  }
}
