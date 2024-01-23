import { createElement } from "react";
import { renderToString } from "react-dom/server";
import type { LoaderFunctionArgs } from "@remix-run/node";

import Avatar from "boring-avatars";

const SIZE = 96;
const VARIANT = "bauhaus";
const COLORS = ["#1a2a3a", "#e4426d", "#1d1d2b", "#769cec", "#586f8f"];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  const explicitName = url.searchParams.get("name");
  const name = explicitName || Math.random().toString();

  const svg = renderToString(
    createElement(
      Avatar,
      {
        size: SIZE,
        name,
        variant: VARIANT,
        colors: COLORS,
        square: false,
      },
      null
    )
  );

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": explicitName
        ? "max-age=0, s-maxage=2592000"
        : "max-age=0, s-maxage=1",
    },
  });
}
