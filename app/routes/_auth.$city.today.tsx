import { redirect } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";

export const loader = async ({request}: LoaderArgs) => {
    const today = Temporal.Now.plainDateISO();
    return redirect(`${request.params.city}/${today.toString()}`, 302)
}