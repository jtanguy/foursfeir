import type { LoaderArgs } from "@remix-run/node";
import { json, Response } from "@remix-run/node";
import {
  Link,
  Outlet,
  useFetcher,
  useLoaderData,
  useMatches,
  useOutletContext,
} from "@remix-run/react";
import type { Session, SupabaseClient } from "@supabase/auth-helpers-remix";
import { createBrowserClient } from "@supabase/auth-helpers-remix";
import { createContext, useEffect, useState } from "react";

import { createServerClient } from "utils/supabase.server";
import config from "config";

import type { Database } from "db_types";
import { FiGithub, FiLogOut } from "react-icons/fi";

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

// const SupabaseContext = createContext({ supabase: undefined, session: null });

export type AuthContext = {
  supabase: SupabaseClient<Database>;
  session?: Session | null;
};

export default function WithSupabase() {
  const { env, session } = useLoaderData<typeof loader>();
  const matches = useMatches();
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

  const user = session?.user;

  const logout = () => supabase.auth.signOut();

  return (
    <>
      <nav className="header container-fluid" aria-label="breadcrumb">
        <div className="header-flex">
          <img className="header-logo" alt="" src="/Foursfeir.png" />
          <ul>
            <li>
              <Link to="/">FourSFEIR</Link>
            </li>
            {matches
              // skip routes that don't have a breadcrumb
              .filter((match) => match.handle && match.handle.breadcrumb)
              // render breadcrumbs!
              .map((match, index) => (
                <li key={index}>{match.handle?.breadcrumb(match)}</li>
              ))}
          </ul>
        </div>
        <ul>
          {user ? (
            <li role="list" dir="rtl" className="header-user">
              <a href="#" aria-haspopup="listbox">
                <img
                  className="avatar"
                  referrerPolicy="no-referrer"
                  src={user.user_metadata.avatar_url}
                  alt=""
                />
                <span className="header-user__name">
                  {user.user_metadata.full_name}
                </span>
              </a>
              <ul role="listbox">
                <li>
                  <button className="icon" type="button" onClick={logout}>
                    Déconnexion <FiLogOut aria-label="Logout" />
                  </button>
                </li>
              </ul>
            </li>
          ) : (
            <li>
              <Link to="/login">Login</Link>
            </li>
          )}
        </ul>
      </nav>
      <Outlet context={{ supabase, session }} />
      <footer className="container">
        FourSFEIR (
        <a href="https://github.com/jtanguy/foursfeir">
          <FiGithub /> Source
        </a>
        ). CSS by <a href="https://picocss.com/">PicoCSS</a>. Icons by{" "}
        <a href="https://react-icons.github.io/react-icons/icons?name=fi">
          Feather by React-icons
        </a>{" "}
      </footer>
    </>
  );
}

export function useSupabase() {
  return useOutletContext<AuthContext>();
}
