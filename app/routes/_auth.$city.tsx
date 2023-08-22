import type { LoaderFunction, RouteHandle } from "@remix-run/node";
import { json, Response } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { createServerClient } from "utils/supabase.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  if (!params.city) throw new Response("No city given", { status: 400 });

  const response = new Response();
  const supabase = createServerClient({ request, response });

  const { data, error } = await supabase
    .from("cities")
    .select("slug, label")
    .eq("slug", params.city);

  if (error) throw error;

  if (data.length === 0)
    throw new Response(`Could not find city ${params.city}`, { status: 404 });

  return json({
    city: data[0].label ?? params.slug,
  });
};

export default function City() {
  const { city: label } = useLoaderData<typeof loader>();

  return (
    <>
      <main className="container">
        <h1> Réservations à {label}</h1>
        <Outlet />
      </main>
    </>
  );
}

export const handle: RouteHandle = {
  breadcrumb: (match) => <Link to={match.pathname}>{match.params.city}</Link>,
};
