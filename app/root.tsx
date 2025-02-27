import { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import "temporal-polyfill"

import picoStyles from "@picocss/pico/css/pico.min.css?url";
import globalStyles from "~/styles/global.css?url";
import { FiGithub } from "react-icons/fi";

export const meta: MetaFunction = () => [
  { title: "FourSFEIR" }
]

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: picoStyles },
  { rel: "stylesheet", href: globalStyles },
];


export function Layout({ children }: { children: React.ReactNode }) {

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
          {children}
          <footer className="container">
            FourSFEIR (
            <a href="https://github.com/jtanguy/foursfeir">
              <FiGithub /> Source
            </a>
            ). CSS by <a href="https://picocss.com/">PicoCSS</a>. Icons by{" "}
            <a href="https://react-icons.github.io/react-icons/">
              React-icons
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
