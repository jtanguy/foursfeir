import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    GOOGLE_APPLICATION_CREDENTIALS: z.string(),
    GOOGLE_AUTH_ID: z.string(),
    GOOGLE_AUTH_SECRET: z.string(),
    GOOGLE_AUTH_CALLBACK_URL: z.string().url(),
  },
  runtimeEnv: process.env
})
