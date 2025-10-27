import { ActionFunctionArgs, json, MetaFunction, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Temporal } from "temporal-polyfill";
import { getUserFromRequest } from "~/services/auth.server";
import { bookingService, profileService } from "~/services/application/services.server";
import { cityService } from "~/services/application/services.server";
import Avatar from "~/components/Avatar";
import { FaSync } from "react-icons/fa";
import { zfd } from "zod-form-data";
import z from "zod";

export const meta: MetaFunction = () => [
  { title: "FourSFEIR | Mes réservations" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const user = await getUserFromRequest(request);
  const url = new URL(request.url);
  const monthParam = url.searchParams.get("month");

  let month: Temporal.PlainYearMonth;
  if (monthParam) {
    month = Temporal.PlainYearMonth.from(monthParam);
  } else {
    month = Temporal.Now.plainDateISO().toPlainYearMonth();
  }

  const profile = await profileService.getProfileById(user.user_id);
  const cities = await cityService.getCities();
  const bookings = await bookingService.getMyBookings(user.user_id, month);

  return json({ bookings, cities, date: month.toString(), profile, user });
};

const actionSchema = zfd.formData(
  z.discriminatedUnion("_action", [
    z.object({
      _action: z.literal("update-avatar"),
      full_name: zfd.text(z.string()),
      avatar_url: zfd.text(z.string().url())
    }),
  ]),
);
export const action = async ({ request }: ActionFunctionArgs) => {
  const user = await getUserFromRequest(request);
  const f = actionSchema.parse(await request.formData());
  const profile = await profileService.getProfileById(user.user_id);

  if (f._action === "update-avatar") {
    const newProfile = { ...profile, user_id: user.user_id, full_name: f.full_name, avatar_url: f.avatar_url };
    await profileService.updateProfile(newProfile);
  }

  return new Response(null, { status: 204 });
};

export default function MeRoute() {
  const { bookings, cities, date: month, profile, user } = useLoaderData<typeof loader>();
  const currentMonth = Temporal.PlainYearMonth.from(month);
  const prevMonth = currentMonth.subtract({ months: 1 });
  const nextMonth = currentMonth.add({ months: 1 });

  const dates = Array.from({ length: currentMonth.daysInMonth }, (_, i) => {
    const date = currentMonth.toPlainDate({ day: i + 1 });
    // Skip weekends
    if (date.dayOfWeek > 5) return null;
    return date;
  }).filter((date): date is Temporal.PlainDate => date !== null);

  return (
    <main className="container">
      <h2>Mes réservations</h2>

      <h3>
        {currentMonth.toLocaleString("fr-FR", {
          calendar: "iso8601",
          month: "long",
          year: "numeric",
        })}
      </h3>

      {bookings.length === 0 ? (
        <p>Aucune réservation ce mois-ci</p>
      ) : (
        <table className="calendar--compact">
          <thead>
            <tr>
              <th>Lieu</th>
              {dates.map((date) => (
                <th key={date.toString()}>
                  {date.toLocaleString("fr-FR", {
                    weekday: "narrow",
                    day: "numeric",
                  })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cities.map((city) => (
              <tr key={city.slug}>
                <td>{city.label}</td>
                {dates.map((date) => {
                  const booking = bookings.find(
                    (b) => b.city === city.slug && b.date === date.toString(),
                  );
                  return <td key={date.toString()}>{booking ? "✓" : ""}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Form>
        <div className="grid">
          <button name="month" value={prevMonth.toString()} className="outline">
            ←{" "}
            {prevMonth.toLocaleString("fr-FR", {
              calendar: "iso8601",
              month: "long",
              year: "numeric",
            })}
          </button>
          <button name="month" value={nextMonth.toString()} className="outline">
            {nextMonth.toLocaleString("fr-FR", {
              calendar: "iso8601",
              month: "long",
              year: "numeric",
            })}{" "}
            →
          </button>
        </div>
      </Form>

      <h2>Profil</h2>

      <div className="grid">
        <article>
          <header>Session Google</header>
          <div className="grid">
            <Avatar className="avatar--huge" profile={user} />
            <p className="center-content">{user.full_name}</p>
          </div>
        </article>
        <Form className="center-content" method="post" action="/me">
          <input type="hidden" name="_action" value="update-avatar" />
          <input type="hidden" name="full_name" value={user.full_name} />
          <input type="hidden" name="avatar_url" value={user.avatar_url} />
          <button type="submit"><FaSync /> Synchroniser</button>
        </Form>
        {profile && (
          <article>
            <header>Profil Foursfeir</header>
            <div className="grid">
              <Avatar className="avatar--huge" profile={profile} />
              <p className="center-content">{profile.full_name}</p>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
