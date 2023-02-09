import type { LoaderArgs, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { FiLogOut } from "react-icons/fi";
import { createServerClient } from "utils/supabase.server";
import { useSupabase } from "../__supabase";

export const loader = async ({ request }: LoaderArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const { data } = await supabase.from("cities").select("slug, label");

  return json({
    cities: data ?? [],
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
            <h2>Si vous avez la référence, félicitations vous êtes vieux</h2>
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
