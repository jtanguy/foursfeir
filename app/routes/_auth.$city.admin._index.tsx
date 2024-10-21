import { Temporal } from "@js-temporal/polyfill";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, Form, useLoaderData } from "@remix-run/react";
import { FiPlus, FiTrash } from "react-icons/fi";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { getUserFromRequest } from "~/services/auth.server";
import { findIsAdmin } from "~/services/db/admins.server";
import { createNotice, deleteNotice, getAllNotices, getCity } from "~/services/db/cities.server";
import invariant from "~/services/validation.utils.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  invariant(params.city, 'No city given')
  const user = await getUserFromRequest(request)
  const isAdmin = await findIsAdmin(user.id, params.city)

  if (!isAdmin) {
    throw redirect(`/${params.city}`);
  }

  const today = Temporal.Now.plainDateISO();
  const start = today.subtract({ weeks: 1, days: today.dayOfWeek - 1 });

  const [notices, city] = await Promise.all([getAllNotices(params.city, start.toString()), getCity(params.city)])

  return json({
    notices: notices ?? [],
    city: city
  });
};

const schema = zfd.formData(
  z.discriminatedUnion("_action", [
    z.object({
      _action: z.literal("create"),
      date: zfd.text(),
      message: zfd.text(),
      temp_capacity: zfd.numeric(z.number().optional()),
    }),
    z.object({
      _action: z.literal("delete"),
      date: zfd.text(),
    }),
  ])
);

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (!params.city) throw new Response("No city given", { status: 400 });

  const f = schema.parse(await request.formData());

  if (f._action === "create") {
    await createNotice({ city: params.city, date: f.date, message: f.message, temp_capacity: f.temp_capacity, created_at: new Date().toISOString() })
    return new Response(null, { status: 201 });
  } else {
    await deleteNotice({ city: params.city, date: f.date })
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
            <th scope="col">Capacité (par défaut {city.capacity})</th>
            <th scope="col"></th>
          </tr>
        </thead>
        <tbody>
          {notices.map((notice) => (
            <tr key={notice.date}>
              <th scope="row"><Link to={`/${city.slug}/${notice.date}`}>{notice.date}</Link></th>
              <td>{notice.message}</td>
              <td>
                {notice.temp_capacity != null ? <>{notice.temp_capacity}/{city.max_capacity} (limite dure)</> : <>{city.capacity} (flexible, par défaut)</>}
              </td>
              <td>
                <Form method="post" className="admin-form">
                  <input type="hidden" name="date" value={notice.date} />
                  <button
                    className="inline-button icon"
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
              />
            </th>
            <th scope="col">
              <Form method="post" id="create-notice">
                <button
                  className="inline-button icon"
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
