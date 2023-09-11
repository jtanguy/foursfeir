import { Temporal } from "@js-temporal/polyfill";
import { redirect } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import type { LoaderArgs } from "@remix-run/node";

export const loader = async ({request}: LoaderArgs) => {
    const today = Temporal.Now.plainDateISO();
    return redirect(`${request.params.city}/${today.toString()}`, 302)
}