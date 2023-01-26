import { createServerClient as _createServerClient } from "@supabase/auth-helpers-remix";

import config from "config";

import type { Database } from "db_types";

export const createServerClient = ({
  request,
  response,
}: {
  request: Request;
  response: Response;
}) =>
  _createServerClient<Database>(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    request,
    response,
  });
