import { Form, Link } from "@remix-run/react";
import { Fragment, ReactNode } from "react";
import { FiLogOut } from "react-icons/fi";
import { AdminInfo } from "~/services/domain/admin.interface";
import { City } from "~/services/domain/city.interface";
import { Profile } from "~/services/domain/profile.interface";
import { FavoriteCityForm } from "./FavoriteCityForm";

type HeaderProps = {
  breadcrumbs: ReactNode[];
  user: Profile;
  admin: AdminInfo | null;
  cities: City[];
  favoriteCity?: string;
};

export function Header({ breadcrumbs, user, admin, cities, favoriteCity }: HeaderProps) {
  return (
    <header className="header header-flex container-fluid">
      <nav aria-label="breadcrumb">
        <img className="header-logo" alt="" src="/Foursfeir.png" />
        <ul>
          <li>
            <Link to="/">FourSFEIR</Link>
          </li>
          {breadcrumbs.map((crumb, index, arr) => {
            const isLast = index === arr.length - 1;
            return (
              <li key={index} aria-current={isLast ? "page" : "false"}>
                <details className="dropdown header-cities">
                  <summary>{crumb}</summary>
                  <ul>
                    {cities.map(city => (
                      <li key={city.slug}>
                        <Link to={`/${city.slug}`}>{city.label}</Link>
                        <FavoriteCityForm city={city.slug} isFavorite={city.slug === favoriteCity}/>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      </nav>
      {user ? (
        <details className="dropdown header-user">
          <summary>
            <img
              className="avatar"
              referrerPolicy="no-referrer"
              src={user.avatar_url}
              alt=""
            />
            <span className="header-user__name">{user.full_name}</span>
          </summary>
          <ul dir="ltr">
            <li>
              <Link to={"/me"}>Mes réservations</Link>
            </li>
            {admin != null && admin.type === "global" && (
              <Fragment key="admin">
                <li key="admin.global">
                  <Link to={"/admin"}>Administration</Link>
                </li>
                <li key="admin.cities">
                  <ul>
                    {cities.map(({ slug, label }) => (
                      <li key={slug}>
                        <Link to={`/admin/${slug}`}>{label}</Link>
                      </li>
                    ))}
                  </ul>
                </li>
              </Fragment>
            )}
            {admin != null && admin.type === "local" && (
              <>
                {admin.cities.map(({ slug, label }) => (
                  <li key={slug}>
                    <Link to={`/admin/${slug}`}>{label} admin</Link>
                  </li>
                ))}
              </>
            )}
            <li key="logout">
              <Form id="logout-form" action="/logout" method="post">
                <button className="inline-button icon">
                  Déconnexion <FiLogOut aria-label="Logout" />
                </button>
              </Form>
            </li>
          </ul>
        </details>
      ) : (
        <ul>
          <li>
            <Link to="/login">Login</Link>
          </li>
        </ul>
      )}
    </header>
  );
}
