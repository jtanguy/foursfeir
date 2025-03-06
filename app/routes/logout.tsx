import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";

export const loader = () => redirect("/");

export const action = ({ request }: ActionFunctionArgs) => {
  return authenticator.logout(request, { redirectTo: "/" });
};
