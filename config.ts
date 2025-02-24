import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    // For Datastore
    GCP_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
    GCP_PRIVATE_KEY: z.string().optional(),
    GCP_PROJECT_ID: z.string(),

    // Oauth
    GOOGLE_AUTH_ID: z.string(),
    GOOGLE_AUTH_SECRET: z.string(),
    GOOGLE_AUTH_CALLBACK_URL: z.string().url(),
  },
  runtimeEnv: process.env
})
