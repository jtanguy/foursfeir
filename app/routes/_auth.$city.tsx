import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { RouteMatch } from "react-router";
import { getUserFromRequest } from "~/services/auth.server";
import { getCity } from "~/services/db/cities.server";
import invariant from "~/services/validation.utils.server";


export const meta: MetaFunction<typeof loader> = ({ data }) => [

  { title: `FourSFEIR | ${data.city}` }
]

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  invariant(params.city, "No city given")
  await getUserFromRequest(request)
  const city = await getCity(params.city)

  return json({
    city: city.label ?? params.city,
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

export const handle = {
  breadcrumb: (match: RouteMatch) => <Link to={match.pathname}>{match.params.city}</Link>,
};
