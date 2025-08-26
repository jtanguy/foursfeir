import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { authenticator } from "~/services/auth.server";

// if the user is already logged in, redirect to home
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  if (user) {
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
