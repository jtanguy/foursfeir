import { Temporal } from "@js-temporal/polyfill";
import { redirect } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const today = Temporal.Now.plainDateISO();
  return redirect(`/${params.city}/${today.toString()}`, 302);
};
