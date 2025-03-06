import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";

export const loader = () => redirect("/login");

export async function action({ request }: ActionFunctionArgs) {
  // Check login ony, the session will be created by the /auth/callback route
  const user = await authenticator.authenticate("google", request);
  return user;
}
