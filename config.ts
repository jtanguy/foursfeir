import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    EMAIL_DOMAIN: z
      .string()
      .min(1)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/),
    NAMESPACE: z.string().min(1).max(100).optional(),

    SESSION_SECRET: z.string().min(1),
    // For Datastore
    GCP_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
    GCP_PRIVATE_KEY: z.string().min(1).optional(),
    GCP_PROJECT_ID: z.string().min(1),

    // Oauth
    GOOGLE_AUTH_ID: z.string().min(1),
    GOOGLE_AUTH_SECRET: z.string().min(1),
    GOOGLE_AUTH_CALLBACK_URL: z.string().url(),
  },
  runtimeEnv: process.env,
});
