import { Temporal } from "@js-temporal/polyfill";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { FiPlus, FiTrash } from "react-icons/fi";
import { json } from "react-router";
import { createServerClient } from "utils/supabase.server";
import { z } from "zod";
import { zfd } from "zod-form-data";

export const loader = async ({ request, params }: LoaderArgs) => {
  const response = new Response();

  const supabase = createServerClient({ request, response });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user == null) {
    return redirect(`/${params.city}`);
  }

  const { data: isAdmin } = await supabase.rpc("is_admin", {
    user_id: user.id,
    city: params.city!,
  });

  if (!isAdmin) {
    return redirect(`/${params.city}`);
  }

  const today = Temporal.Now.plainDateISO();
  const start = today.subtract({ weeks: 1, days: today.dayOfWeek - 1 });

  const { data: notices } = await supabase
    .from("notices")
    .select("message, date, temp_capacity")
    .eq("city", params.city)
    .gte("date", start.toString());
  const { data: city } = await supabase
    .from("cities")
    .select("capacity, max_capacity")
    .eq("slug", params.city);
  return json({ notices: notices ?? [], city: city[0] });
};

const schema = zfd.formData(
  z.discriminatedUnion("_action", [
    z.object({
      _action: z.literal("create"),
      date: zfd.text(),
      message: zfd.text(),
      temp_capacity: zfd.numeric().optional(),
    }),
    z.object({
      _action: z.literal("delete"),
      date: zfd.text(),
    }),
  ])
);
export const action = async ({ request, params }: ActionArgs) => {
  if (!params.city) throw new Response("No city given", { status: 400 });
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const f = schema.parse(await request.formData());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw redirect("/login");

  if (f._action === "create") {
    await supabase.from("notices").insert([
      {
        city: params.city,
        date: f.date,
        message: f.message,
        temp_capacity: f.temp_capacity,
      },
    ]);
    return new Response(null, { status: 201 });
  } else {
    await supabase.from("notices").delete().match({
      city: params.city,
      date: f.date,
    });
    return new Response(null, { status: 202 });
  }
};

export default function CityAdmin() {
  const { notices, city } = useLoaderData<typeof loader>();
  return (
    <>
      <h1>Admin</h1>
      <h2>Évènements exceptionnels</h2>
      <table role="grid">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Message</th>
            <th scope="col">Capacité</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          {notices.map((notice) => (
            <tr key={notice.date}>
              <th scope="row">{notice.date}</th>
              <td>{notice.message}</td>
              <td>
                {notice.temp_capacity}/{city.max_capacity}
              </td>
              <td>
                <Form method="post" className="admin-form">
                  <input type="hidden" name="date" value={notice.date} />
                  <button
                    className="inline-button icon"
                    role="button"
                    name="_action"
                    value="delete"
                  >
                    <FiTrash aria-label="Supprimer" />
                  </button>
                </Form>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="col">
              <input form="create-notice" type="date" name="date" />
            </th>
            <th scope="col">
              <input form="create-notice" type="text" name="message" />
            </th>
            <th scope="col">
              <input
                form="create-notice"
                type="number"
                name="temp_capacity"
                min="0"
                max={city.max_capacity}
                defaultValue={city.capacity}
              />
            </th>
            <th scope="col">
              <Form method="post" id="create-notice">
                <button
                  className="inline-button icon"
                  role="button"
                  name="_action"
                  value="create"
                >
                  <FiPlus aria-label="Ajouter" />
                </button>
              </Form>
            </th>
          </tr>
        </tfoot>
      </table>
      <ul></ul>
    </>
  );
}
