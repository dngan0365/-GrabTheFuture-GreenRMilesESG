/**
 * Service entry point — selects the active implementation.
 *
 * Set NEXT_PUBLIC_USE_MOCK=true to use the in-memory mock (Step 1).
 * Otherwise the live API client (Step 2) talks to NEXT_PUBLIC_API_BASE_URL.
 * Both implement `GreenMilesApi`, so no page/component changes are needed.
 */
import type { GreenMilesApi } from "./contract";
import { mockApi } from "./mock/mock-api";
import { apiClient } from "./api/api-client";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const api: GreenMilesApi = useMock ? mockApi : apiClient;

export type { GreenMilesApi } from "./contract";
