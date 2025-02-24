import { renderToString } from "react-dom/server";
import type { LoaderFunctionArgs } from "@remix-run/node";

import Boring from "boring-avatars";

const SIZE = 96;
const VARIANT = "bauhaus";
const COLORS = ["#1a2a3a", "#e4426d", "#1d1d2b", "#769cec", "#586f8f"];


export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);

  const explicitName = url.searchParams.get("name");
  const name = explicitName || Math.random().toString();

  // Fixing the UMD export of boring-avatars
  // See https://github.com/boringdesigners/boring-avatars/issues/76
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RealBoring = typeof (Boring as any).default !== "undefined" ? (Boring as any).default : Boring;

  const svg = renderToString(
    <RealBoring size={SIZE} name={name} variant={VARIANT} colors={COLORS} square={false} />
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
