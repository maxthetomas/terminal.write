import { drizzle } from "drizzle-orm/bun-sqlite";

// You can specify any property from the bun:sql connection options
const db = drizzle({ connection: { source: process.env.DB_FILE_NAME! } });

export default db;
