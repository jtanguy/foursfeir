import { ActionFunctionArgs, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";

export const loader = () => redirect("/login");

export async function action({ request }: ActionFunctionArgs) {
  const method = process.env.OFFLINE === "true" ? "offline" : "google";
  let user;
  if (method === "offline") {
    // Login and handle session with authenticator
    user = await authenticator.authenticate(method, request, {
      successRedirect: "/",
      failureRedirect: "/login",
    });
  } else {
    // Check login ony, the session will be created by the /auth/callback route
    user = await authenticator.authenticate(method, request);
  }
  return user;
}
