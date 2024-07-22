import type { LoaderFunctionArgs } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { getUserFromRequest } from "~/services/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getUserFromRequest(request);
  return null;
};

export default function Layout() {
  return <Outlet />;
}
