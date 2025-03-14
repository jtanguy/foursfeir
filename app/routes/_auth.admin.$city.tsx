import { Temporal } from "temporal-polyfill";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, Form, useLoaderData } from "@remix-run/react";
import { FiPlus, FiTrash } from "react-icons/fi";
import { RouteMatch } from "react-router";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { getUserFromRequest } from "~/services/auth.server";
import { adminService, cityService } from "~/services/application/services.server";
import invariant from "~/services/validation.utils.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `FourSFEIR Admin | ${data?.city.label}` },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  invariant(params.city, "No city given");
  const user = await getUserFromRequest(request);
  const isAdmin = await adminService.isUserAdmin(user.user_id, params.city);

  if (!isAdmin) {
    throw redirect(`/${params.city}`);
  }

  const today = Temporal.Now.plainDateISO();
  const start = today.subtract({ weeks: 1, days: today.dayOfWeek - 1 });

  const [notices, city] = await Promise.all([
    cityService.getNotices(params.city, { after: start }),
    cityService.getCity(params.city),
  ]);

  return json({
    notices: notices ?? [],
    city: city,
  });
};

const schema = zfd
  .formData(
    z.discriminatedUnion("_action", [
      z.object({
        _action: z.literal("create"),
        date: zfd.text(z.string().date().transform((d) => Temporal.PlainDate.from(d))),
        message: zfd.text(z.string().min(1).max(500)),
        temp_capacity: zfd.numeric(z.number().int().min(0).optional()).optional(),
      }),
      z.object({
        _action: z.literal("delete"),
        date: zfd.text(z.string().date().transform((d) => Temporal.PlainDate.from(d))),
      }),
      z.object({
        _action: z.literal("update"),
        label: zfd.text(z.string().min(1).max(100)),
        capacity: zfd.numeric(z.number().int().min(0)),
        max_capacity: zfd.numeric(z.number().int().min(0)),
      }),
    ]),
  )
  .refine(
    (data) => data._action !== "update" || data.capacity <= data.max_capacity,
    {
      message: "La capacité max doit être supérieure à la capacité",
      path: ["capacity"],
    },
  );

export const action = async ({ request, params }: ActionFunctionArgs) => {
  invariant(params.city, "No city given");
  const user = await getUserFromRequest(request);
  const isAdmin = await adminService.isUserAdmin(user.user_id, params.city);
  if (!isAdmin) throw new Response("Forbidden", { status: 403 });

  const f = schema.parse(await request.formData());

  console.log(f);

  if (f._action === "create") {
    const { _action, ...data } = f;
    await cityService.createNotice({ city: params.city, ...data });
    return new Response(null, { status: 201 });
  }
  if (f._action === "delete") {
    await cityService.deleteNotice(params.city, f.date);
    return new Response(null, { status: 202 });
  }
  if (f._action === "update") {
    const { _action, ...data } = f;
    await cityService.updateCity(params.city, data);
    return new Response(null, { status: 201 });
  }
};

export default function CityAdmin() {
  const { notices, city } = useLoaderData<typeof loader>();
  return (
    <>
      <h1>{city.label}</h1>
      <h2>Évènements exceptionnels</h2>
      <table className="striped">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Message</th>
            <th scope="col">Capacité (par défaut {city.capacity})</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {notices.map((notice) => (
            <tr key={notice.date}>
              <th scope="row">
                <Link to={`/${city.slug}/${notice.date}`}>{notice.date}</Link>
              </th>
              <td>{notice.message}</td>
              <td>
                {notice.temp_capacity != null ? (
                  <>
                    {notice.temp_capacity}/{city.max_capacity} (limite dure)
                  </>
                ) : (
                  <>{city.capacity} (flexible, par défaut)</>
                )}
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
      <div>
        <h4>Actions</h4>
        <div className="grid">
          <details>
            <summary role="button">Modifier le lieu</summary>
            <Form method="post">
              <label>
                Nom
                <input type="text" name="label" defaultValue={city.label} />
              </label>
              <div className="grid">
                <label>
                  Capacité normale
                  <input
                    type="number"
                    min="0"
                    name="capacity"
                    defaultValue={city.capacity}
                  />
                </label>
                <label>
                  Capacité max
                  <input
                    type="number"
                    min="0"
                    name="max_capacity"
                    defaultValue={city.max_capacity}
                  />
                </label>
              </div>

              <button name="_action" value="update">
                Mettre à jour
              </button>
            </Form>
          </details>
        </div>
      </div>
    </>
  );
}

export const handle = {
  breadcrumb: (match: RouteMatch) => (
    <Link to={match.pathname}>{match.params.city}</Link>
  ),
};
