import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { getUserFromRequest } from "~/services/auth.server";
import { getCities } from "~/services/db/cities.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getUserFromRequest(request)
  const cities = await getCities()

  return json({
    cities: cities ?? [],
  });
};

export default function Index() {
  const { cities } = useLoaderData<typeof loader>();

  return (
    <>
      <main className="container">
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
          <hgroup>
            <h1>Welcome to FourSFEIR</h1>
          </hgroup>
          <ul>
            {cities.map((city) => (
              <li key={city.slug}>
                <Link to={`/${city.slug}`}>{city.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
