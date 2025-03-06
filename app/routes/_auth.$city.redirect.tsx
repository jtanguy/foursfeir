import { Temporal } from "temporal-polyfill";
import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const today =
    url.searchParams.get("date") ?? Temporal.Now.plainDateISO().toString();
  return redirect(`/${params.city}/${today}`, 302);
};
