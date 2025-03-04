import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import z from "zod";
import { getUserFromRequest } from "~/services/auth.server";
import { getFuseInstance, invalidateFuseInstance } from "~/services/db/profiles.server";
import { ProfileSearchLoaderData } from "~/components/ProfileSearch";
import { zfd } from "zod-form-data";

const schema = z.string().trim().min(2).max(50).nullable();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await getUserFromRequest(request);

  const q = new URL(request.url).searchParams.get("search");
  const query = schema.parse(q);
  if (query == null) {
    return json<ProfileSearchLoaderData>({ profiles: [] });
  }

  const fuseInstance = await getFuseInstance();
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

  invalidateFuseInstance();

  return new Response(null, { status: 204 });
};
