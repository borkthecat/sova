import { vi } from "vitest";
process.env.DATABASE_URL = "file:./data/test.db";
vi.clearAllMocks();
