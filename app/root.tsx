import {
  json,
  type LinksFunction,
  type LoaderArgs,
  type V2_MetaFunction,
} from "@remix-run/node";
import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useMatches,
  useRevalidator,
} from "@remix-run/react";
import { toTemporalInstant } from "@js-temporal/polyfill";

import picoStyles from "@picocss/pico/css/pico.min.css";
import globalStyles from "~/styles/global.css";
import { createServerClient } from "utils/supabase.server";
import config from "config";
import { createBrowserClient } from "@supabase/auth-helpers-remix";
import { useEffect, useState } from "react";
import type { Database } from "db_types";
import { FiLogOut, FiGithub } from "react-icons/fi";

export const loader = async ({ request }: LoaderArgs) => {
  const response = new Response();

  const supabase = createServerClient({ request, response });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const env = {
    SUPABASE_URL: config.SUPABASE_URL,
    SUPABASE_ANON_KEY: config.SUPABASE_ANON_KEY,
  };

  return json({ env, session }, { headers: response.headers });
};

export const meta: V2_MetaFunction = () => [
  { title: "FourSFEIR" },
  { charset: "utf-8" },
  { property: "viewport", value: "width=device-width,initial-scale=1" },
];

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: picoStyles },
  { rel: "stylesheet", href: globalStyles },
];

// eslint-disable-next-line no-extend-native
Object.defineProperty(Date.prototype, "toTemporalInstant", {
  value: toTemporalInstant,
  writable: false,
});

export default function App() {
  const { env, session } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();
  const matches = useMatches();
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
      if (
        event !== "INITIAL_SESSION" &&
        session?.access_token !== serverAccessToken
      ) {
        // server and client are out of sync.
        revalidate();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [serverAccessToken, supabase, revalidate]);

  const user = session?.user;

  const logout = () => supabase.auth.signOut();

  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
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
          <Outlet context={{ supabase }} />
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
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
