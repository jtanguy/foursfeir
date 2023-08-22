import { LoaderArgs, redirect } from "@remix-run/node";
import { Response } from "@remix-run/node";
import { Outlet } from "@remix-run/react";

import { createServerClient } from "utils/supabase.server";

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
  return <Outlet />;
}
