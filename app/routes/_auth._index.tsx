import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { createServerClient } from "utils/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const [
    { data: cities },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase.from("cities").select("slug, label"),
    supabase.auth.getUser(),
  ]);

  return json({
    cities: cities ?? [],
    loggedIn: user != null,
  });
};

export default function Index() {
  const { cities, loggedIn } = useLoaderData<typeof loader>();

  return (
    <>
      <main className="container">
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
          <hgroup>
            <h1>Welcome to FourSFEIR</h1>
            <h2>Si vous avez la référence, félicitations vous êtes vieux</h2>
          </hgroup>
          {!loggedIn && <p>Connectez-vous pour voir les présences</p>}
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
