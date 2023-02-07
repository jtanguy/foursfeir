import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { toTemporalInstant } from "@js-temporal/polyfill";

import picoStyles from "@picocss/pico/css/pico.min.css";
import globalStyles from "~/styles/global.css";

export const meta: MetaFunction = () => ({
  charset: "utf-8",
  title: "FourSFEIR",
  viewport: "width=device-width,initial-scale=1",
});

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: picoStyles },
  { rel: "stylesheet", href: globalStyles },
];

// eslint-disable-next-line no-extend-native
Object.defineProperty(Date.prototype, "toTemporalInstant", {
  value: toTemporalInstant,
  writable: false,
});

export default function App() {
  return (
    <html lang="en">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
