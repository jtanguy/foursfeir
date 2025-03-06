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

const actionSchema = zfd.formData({
  _action: z.literal("refresh"),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  await getUserFromRequest(request);

  actionSchema.parse(await request.formData());
  console.log("Invalidation fuse profiles");

  profileService.clearProfileCache();

  return new Response(null, { status: 204 });
};
