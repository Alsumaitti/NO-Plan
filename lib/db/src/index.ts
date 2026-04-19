import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const getDatabaseUrl = () => process.env.DATABASE_URL || "";

export const pool = new Pool({
  connectionString: getDatabaseUrl(),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
