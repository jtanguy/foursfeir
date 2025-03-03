import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import z from "zod";
import Fuse from "fuse.js";
import { getUserFromRequest } from "~/services/auth.server";
import { getProfiles, Profile } from "~/services/db/profiles.server";
import { ProfileSearchLoaderData } from "~/components/ProfileSearch";
import { zfd } from "zod-form-data";

let fuseInstance: Fuse<Profile> | null = null;

const schema = z.string().trim().min(2).max(50).nullable();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getUserFromRequest(request);

  const q = new URL(request.url).searchParams.get("search");
  const query = schema.parse(q);
  if (query == null) {
    return json<ProfileSearchLoaderData>({ profiles: [] });
  }


  if (!fuseInstance) {
    const profiles = await getProfiles();
    fuseInstance = new Fuse(profiles, {
      includeScore: true,
      keys: ["email", "full_name"],
    });
  }

  const candidates = fuseInstance.search(query);

  return json<ProfileSearchLoaderData>({
    profiles: candidates,
  });
};

const actionSchema = zfd.formData({
  _action: z.literal("refresh"),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  await getUserFromRequest(request);

  const f = actionSchema.parse(await request.formData());
  console.log("Invalidation fuse profiles")

  // invalidate the fuse instance
  fuseInstance = null;

  return new Response(null, { status: 204 });
};
