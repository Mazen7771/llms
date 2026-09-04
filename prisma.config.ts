import { defineConfig, env } from "prisma/config";
import { config } from "dotenv";

// Load local .env (never committed) so CLI commands (db push / migrate)
// resolve DATABASE_URL. Read-only config — contains no secrets.
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
