import { LoaderFunctionArgs } from "@remix-run/node";
import { Form, redirect } from "@remix-run/react";
import { profileService } from "~/services/application/services.server";
import { authenticator } from "~/services/auth.server";

// if the user is already logged in, redirect to home or /{{city}} if user as a favorite city
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  if (user) {
    const profile = await profileService.getProfileById(user.user_id);
    if (profile?.favorite_city) {
      return redirect(`/${profile.favorite_city}`)
    }
    return redirect("/");
  }
  return null;
}

export default function Login() {
  return (
    <main className="container">
      <article className="grid">
        <div>
          <hgroup>
            <h1>Log in</h1>
            <h2>{"Using google"}</h2>
          </hgroup>
          <Form action="/auth" method="post">
            <input
              type="submit"
              className="primary"
              value={"Login with Google"}
            />
          </Form>
        </div>
        <div className="hero--axolotl-blue"></div>
      </article>
    </main>
  );
}
