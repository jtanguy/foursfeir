import { useOutletContext } from "@remix-run/react";
import type { SupabaseClient } from "@supabase/auth-helpers-remix";
import type { Database } from "db_types";

export default function Login() {
  const { supabase } = useOutletContext<{
    supabase: SupabaseClient<Database>;
  }>();
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
    });
  };
  return (
    <main className="container">
      <article className="grid">
        <div>
          <hgroup>
            <h1>Log in</h1>
            <h2>Using google</h2>
          </hgroup>
          <form>
            <button
              type="button"
              className="primary"
              onClick={handleGoogleLogin}
            >
              Login with Google
            </button>
          </form>
        </div>
        <div className="hero--axolotl-blue"></div>
      </article>
    </main>
  );
}
