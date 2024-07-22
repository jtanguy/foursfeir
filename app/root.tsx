import { LinksFunction, LoaderFunctionArgs, json } from "@remix-run/node";
import {
  Form,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useMatches,
} from "@remix-run/react";
import { toTemporalInstant } from "@js-temporal/polyfill";

import picoStyles from "@picocss/pico/css/pico.min.css?url";
import globalStyles from "~/styles/global.css?url";
import { FiGithub, FiLogOut } from "react-icons/fi";
import { authenticator } from "./services/auth.server";
import { getAdmin } from "./services/db/admins.server";
import { getCities } from "./services/db/cities.server";

if (!Date.prototype.hasOwnProperty("toTemporalInstant")) {
  // eslint-disable-next-line no-extend-native
  Object.defineProperty(Date.prototype, "toTemporalInstant", {
    value: toTemporalInstant,
    writable: false,
  });
}

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: picoStyles },
  { rel: "stylesheet", href: globalStyles },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);

  let cities: { slug: string, label: string }[] = []
  if (user) {
    const [admin, allCities] = await Promise.all([getAdmin(user.id), getCities()])
    cities = admin.flatMap(({ city }) => allCities.filter(c => c.slug === city).map(c => ({ slug: c.slug, label: c.label })))
  }

  return json({ user, cities })
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, cities } = useLoaderData<typeof loader>()

  const matches = useMatches();


  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <>
          <nav className="header container-fluid" aria-label="breadcrumb">
            <div className="header-flex">
              <img className="header-logo" alt="" src="/Foursfeir.png" />
              <ul>
                <li>
                  <Link to="/">FourSFEIR</Link>
                </li>
                {matches
                  // skip routes that don't have a breadcrumb
                  .filter((match) => match.handle && match.handle.breadcrumb)
                  // render breadcrumbs!
                  .map((match, index) => (
                    <li key={index}>{match.handle?.breadcrumb(match)}</li>
                  ))}
              </ul>
            </div>
            {user ? (
              <details className="dropdown header-user">
                <summary>
                  <img
                    className="avatar"
                    referrerPolicy="no-referrer"
                    src={user.avatar_url}
                    alt=""
                  />
                  <span className="header-user__name">
                    {user.full_name}
                  </span>
                </summary>
                <ul>
                  {cities?.map(({ slug, label }) => (
                    <li key={slug}>
                      <Link to={`/${slug}/admin`}>
                        {label} admin
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Form id="logout-form" action='/logout' method='post'>
                      <button className="icon">
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
                </li></ul>
            )}
          </nav>
          {children}
          <footer className="container">
            FourSFEIR (
            <a href="https://github.com/jtanguy/foursfeir">
              <FiGithub /> Source
            </a>
            ). CSS by <a href="https://picocss.com/">PicoCSS</a>. Icons by{" "}
            <a href="https://react-icons.github.io/react-icons/icons?name=fi">
              Feather by React-icons
            </a>{" "}
          </footer>
        </>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html >
  );
}

export default function App() {
  return <Outlet />;
}
