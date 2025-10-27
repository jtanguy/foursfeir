import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { getUserFromRequest } from "~/services/auth.server";
import { cityService, profileService } from "~/services/application/services.server";
import { FavoriteCityForm } from "~/components/FavoriteCityForm";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserFromRequest(request);
  const cities = await cityService.getCities();
  const profile = await profileService.getProfileById(user.user_id);

  return json({
    cities: cities ?? [],
    favoriteCity: profile?.favorite_city ?? null
  });
};

export default function Index() {
  const { cities, favoriteCity } = useLoaderData<typeof loader>();

  return (
    <>
      <main className="container">
        <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
          <hgroup>
            <h1>Welcome to FourSFEIR</h1>
          </hgroup>
          <ul className="city-list">
            {cities.map((city) => {
                return (
                  <li key={city.slug}>
                    <Link to={`/${city.slug}`}>{city.label}</Link>
                    <FavoriteCityForm city={city.slug} isFavorite={city.slug === favoriteCity}/>
                  </li>
                );
              })}
          </ul>
        </div>
      </main>
    </>
  );
}
