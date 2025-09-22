import type { LoaderFunctionArgs, MetaFunction, SerializeFrom } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData, UIMatch } from "@remix-run/react";
import { RouteMatch } from "react-router";
import { FavoriteCityForm } from "~/components/FavoriteCityForm";
import { cityService, profileService } from "~/services/application/services.server";
import { getUserFromRequest } from "~/services/auth.server";
import invariant from "~/services/validation.utils.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `FourSFEIR | ${data?.city}` },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  invariant(params.city, "No city given");
  await getUserFromRequest(request);
  const cities = await cityService.getCities();
  const city = await cityService.getCity(params.city);
  const user = await getUserFromRequest(request);
  const profile = await profileService.getProfileById(user.user_id);

  return json({
    cities: cities ?? [],
    city: city.label ?? params.city,
    favoriteCity: profile?.favorite_city ?? null
  });
};

export default function City() {
  const { cities, city: label, favoriteCity } = useLoaderData<typeof loader>();

  return (
    <>
      
      <main className="container">
        <h1> Réservations à {label}</h1>
        <details className="dropdown header-cities">
          <summary>
            Choisir ma ville
          </summary>
          <ul className="city-list">
            {cities.map(city => (
              <li key={city.slug}>
                <Link to={`/${city.slug}`}>{city.label}</Link>
                <FavoriteCityForm city={city.slug} isFavorite={city.slug === favoriteCity}/>
              </li>
            ))}
          </ul>
        </details>
        <Outlet />
      </main>
    </>
  );
}

type LoaderData = {
    cities: Array<{ slug: string; label: string }>;
    city: string;
    favoriteCity: string | null;
  };

export const handle = {
  breadcrumb: (match: UIMatch<LoaderData>) =>  (
    <div>
      <details className="dropdown header-cities">
        <summary>
          <Link to={match.pathname}>{match.params.city}</Link>
        </summary>
        <ul className="city-list">
          {match.data?.cities?.map(city => (
            <li key={city.slug}>
              <Link to={`/${city.slug}`}>{city.label}</Link>
              <FavoriteCityForm 
                city={city.slug} 
                isFavorite={city.slug === match.data?.favoriteCity}
              />
            </li>
          ))}
        </ul>
      </details>
    </div>
  ),
};
