import { Temporal } from "@js-temporal/polyfill";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useParams } from "@remix-run/react";
import { createServerClient } from "utils/supabase.server";
import Avatar from "~/components/Avatar";


export const loader = async ({ request, params }: LoaderArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const {
    data: { user },
  } = await supabase.auth.getUser();


  const [{ data: bookings }, { data: cities }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("period, profiles:user_id(id, email, full_name, avatar_url)")
        .eq("city", params.city)
        .eq("date", params.date),
      supabase.from("cities").select("capacity").eq("slug", params.city)
    ]);

    const excludedIds: string[] = [user!.id, ...(bookings ?? []).map(b => b!.profiles!.id)]

    const {data: profiles} = await supabase.from("profiles")
    .select("id, email, full_name")
    .not('id', 'in', `(${excludedIds.join(',')})`)

  return json({
    bookings: bookings ?? [],
    capacity: cities[0].capacity,
    profiles: profiles ?? [],
    user,
  });
};

export default function Current() {
  const { city, date: dateStr } = useParams();
  const { bookings, capacity, profiles } = useLoaderData<typeof loader>();

  const day = Temporal.PlainDate.from(dateStr);

  const periods = {
    morning: "Matin",
    afternoon: "Après-midi",
  };

  return (
    <>
      <h2>
        {day.toLocaleString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </h2>

      <p>
        {bookings.length}/{capacity} inscrits
      </p>

      <ul className="calendar-people__list">
        {bookings.map((booking) => (
          <li key={booking.profiles?.id}>
            <Avatar profile={booking.profiles} size={96}/>
            <span>
              {booking.profiles?.full_name ?? booking.profiles.email}{" "}
              {periods[booking.period] && <> ({periods[booking.period]})</>}
            </span>
          </li>
        ))}
      </ul>

      <Form method="post" action={`/${city}`}>
        <input type="hidden" name="date" value={dateStr} />
        <label>
          Email
          <input type="text" name="for_user" list="other" />
        </label>
        <datalist id="other">
          {profiles.map((p) => {
            return (
              <option value={p.email!} key={p.id}>
                {p.full_name ?? p.email}
              </option>
            );
          })}
        </datalist>
        <fieldset>
          <legend>Période</legend>
          <label>
            <input type="radio" name="period" value="day" defaultChecked/>
            Journée
          </label>
          <label>
            <input type="radio" name="period" value="morning"/>
            Matin
          </label>
          <label>
            <input type="radio" name="period" value="afternoon"/>
            Après-midi
          </label>
        </fieldset>

        <input type="hidden" name="action" value="book" />
        <input type="submit" value="Inscrire"/>
      </Form>
      {/*     <CalendarDay */}
      {/*       key={day.toString()} */}
      {/*       className={cx({ "calendar-day--end-of-week": day.dayOfWeek === 5 })} */}
      {/*       date={day} */}
      {/*       people={bookings!} */}
      {/*       userId={user!.id} */}
      {/*       city={city!} */}
      {/*       capacity={capacity} */}
      {/*     /> */}
    </>
  );
}

export const handle = {
  breadcrumb: (match) => <>{match.params.date}</>,
};
