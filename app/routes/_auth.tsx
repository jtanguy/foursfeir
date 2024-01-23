import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Outlet } from "@remix-run/react";

import { createServerClient } from "utils/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();

  const supabase = createServerClient({ request, response });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const path = new URL(request.url).pathname;

  if (path != "/" && !session) {
    throw redirect("/login");
  }
  return null;
};

export default function Layout() {
  return <Outlet />;
}
