import type { LoaderArgs } from "@remix-run/node";
import { json, Response } from "@remix-run/node";
import {
  Outlet,
  useFetcher,
  useLoaderData,
  useOutletContext,
} from "@remix-run/react";
import type { Session, SupabaseClient } from "@supabase/auth-helpers-remix";
import { createBrowserClient } from "@supabase/auth-helpers-remix";
import { createContext, useEffect, useState } from "react";

import { createServerClient } from "utils/supabase.server";
import config from "config";

import type { Database } from "db_types";

export const loader = async ({ request }: LoaderArgs) => {
  const response = new Response();

  const env = {
    SUPABASE_URL: config.SUPABASE_URL,
    SUPABASE_ANON_KEY: config.SUPABASE_ANON_KEY,
  };

  const supabase = createServerClient({ request, response });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return json({ env, session }, { headers: response.headers });
};

const SupabaseContext = createContext({ supabase: undefined, session: null });

export type AuthContext = {
  supabase: SupabaseClient<Database>;
  session?: Session | null;
};

export default function WithSupabase() {
  const { env, session } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [supabase] = useState(() =>
    createBrowserClient<Database, "public">(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    )
  );
  const serverAccessToken = session?.access_token;

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token !== serverAccessToken) {
        // server and client are out of sync.
        // Remix recalls active loaders after actions complete
        fetcher.submit(null, {
          method: "post",
          action: "/supabase-callback",
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [serverAccessToken, supabase, fetcher]);

  return <Outlet context={{ supabase, session }} />;
}

export function useSupabase() {
  return useOutletContext<AuthContext>();
}
