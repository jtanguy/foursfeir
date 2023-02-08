import { LoaderArgs, redirect } from "@remix-run/node";
import { Response } from "@remix-run/node";
import { Link, Outlet, useMatches } from "@remix-run/react";

import { FiLogOut } from "react-icons/fi";

import { createServerClient } from "utils/supabase.server";
import { useSupabase } from "../__supabase";

export const loader = async ({ request }: LoaderArgs) => {
  const response = new Response();

  const supabase = createServerClient({ request, response });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw redirect("/login");
  }
  return null;
};

export default function WithAuth() {
  const matches = useMatches();

  const { supabase, session } = useSupabase();

  const user = session!.user;

  const logout = () => supabase.auth.signOut();
  return (
    <>
      <nav className="header container-fluid" aria-label="breadcrumb">
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
        <ul>
          <li>
            <div className="header-user">
              <img
                className="avatar"
                referrerPolicy="no-referrer"
                src={user.user_metadata.avatar_url}
                alt=""
              />
              <span className="header-user__name">
                {user.user_metadata.full_name}
              </span>
              <button className="icon" type="button" onClick={logout}>
                <FiLogOut aria-label="Logout" />
              </button>
            </div>
          </li>
        </ul>
      </nav>
      <Outlet />
      <footer className="container">
        FourSFEIR. CSS by <a href="https://picocss.com/">PicoCSS</a>. Icons by{" "}
        <a href="https://react-icons.github.io/react-icons/icons?name=fi">
          Feather by React-icons
        </a>{" "}
      </footer>
    </>
  );
}
