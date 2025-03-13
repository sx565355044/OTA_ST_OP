import type { Config } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

export default {
  schema: "./shared/schema-mysql.ts",
  out: "./drizzle",
  driver: "mysql2",
  dbCredentials: {
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "otainsight",
  },
} satisfies Config;
