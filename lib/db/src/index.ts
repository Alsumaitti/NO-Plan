import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

let pool: pg.Pool;
let db: any;

if (DATABASE_URL) {
  pool = new Pool({ connectionString: DATABASE_URL });
  db = drizzle(pool, { schema });
} else {
  // Provide dummy exports during build
  pool = null as any;
  db = null as any;
}

export { pool, db };
export * from "./schema";
