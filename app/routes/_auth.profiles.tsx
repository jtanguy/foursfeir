import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import z from "zod";
import { getUserFromRequest } from "~/services/auth.server";
import { ProfileSearchLoaderData } from "~/components/ProfileSearch";
import { zfd } from "zod-form-data";
import { profileService } from "~/services/application/services.server";

const schema = z.string().trim().min(2).max(50).nullable();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getUserFromRequest(request);

  const q = new URL(request.url).searchParams.get("search");
  const query = schema.parse(q);
  if (query == null) {
    return json<ProfileSearchLoaderData>({ profiles: [] });
  }

  const candidates = await profileService.searchProfiles(query);

  return json<ProfileSearchLoaderData>({
    profiles: candidates,
  });
};

const actionSchema = zfd.formData(
  z.discriminatedUnion("_action", [
    z.object({
      _action: z.literal("favorite"),
      city_slug: zfd.text(z.string()),
    }),
    z.object({
      _action: z.literal("refresh"),
    }),
  ]),
);

export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await getUserFromRequest(request);
  const f = actionSchema.parse(await request.formData());

  if (f._action === "refresh") {
    console.log("Invalidation fuse profiles");
    profileService.clearProfileCache();
  }

  if (f._action === "favorite") {
    const profile = await profileService.getProfileById(user.user_id)
    await profileService.updateProfile({
      user_id: user.user_id,
      favorite_city: f.city_slug === profile?.favorite_city ? undefined : f.city_slug //Favorite / Unfavorite
    });
  }

  return new Response(null, { status: 204 });
};
