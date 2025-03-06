import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, useMatches } from "@remix-run/react";
import type { RouteMatch } from "react-router";
import { ReactNode } from "react";
import { Header } from "~/components/Header";
import { getUserFromRequest } from "~/services/auth.server";
import { adminService, cityService } from "~/services/application/services.server";

type Crumb = {
  breadcrumb: (match: RouteMatch) => ReactNode;
};

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserFromRequest(request);

  const [admin, cities] = await Promise.all([
    adminService.getAdminInfo(user.user_id),
    cityService.getCities(),
  ]);
  return json({ user, cities, admin });
}

export default function Layout() {
  const { user, cities, admin } = useLoaderData<typeof loader>();
  const matches = useMatches();

  const breadcrumbs: ReactNode[] = matches
    // skip routes that don't have a breadcrumb
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .filter((match) => match.handle && match.handle.breadcrumb)
    // render breadcrumbs!
    .map((match) =>
      (match.handle as Crumb).breadcrumb(match as unknown as RouteMatch),
    );
  return (
    <>
      <Header
        breadcrumbs={breadcrumbs}
        user={user}
        cities={cities}
        admin={admin}
      />
      <Outlet />
    </>
  );
}
