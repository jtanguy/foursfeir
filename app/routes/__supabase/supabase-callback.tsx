import type {ActionArgs} from "@remix-run/node";
import {createServerClient} from "utils/supabase.server";

export const action = async ({request}: ActionArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("profiles")
      .update({
        full_name: user.user_metadata.full_name,
        avatar_url: user.user_metadata.avatar_url,
      })
      .eq("id", user.id);

    return new Response(null, { status: 202 });
  } else {
    return null;
  }
};
