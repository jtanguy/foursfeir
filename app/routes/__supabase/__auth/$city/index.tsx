import { Temporal } from "@js-temporal/polyfill";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import cx from "classnames";
import { createServerClient } from "utils/supabase.server";

import { CalendarDay } from "~/components/CalendarDay";

const SATURDAY = 6;

export const loader = async ({ request, params }: LoaderArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = Temporal.Now.plainDateISO();
  let start = today.subtract({ days: today.dayOfWeek - 1 });

  if (today.dayOfWeek >= SATURDAY) {
    start = start.add({ weeks: 1 });
  }
  const end = start.add({days: today.daysInWeek * 2})

  const [{ data: bookings }, { data: cities }] = await Promise.all([
    supabase
      .from("bookings")
      .select("date, period, profiles:user_id(id, email, full_name, avatar_url)")
      .eq("city", params.city)
      .gte("date", start.toString())
      .lte("date", end.toString()),
    supabase.from("cities").select("capacity").eq("slug", params.city),
  ]);

  return json({
    bookings: bookings ?? [],
    capacity: cities[0].capacity,
    user,
  });
};

export default function Current() {
  const { city } = useParams();
  const { bookings, capacity, user } = useLoaderData<typeof loader>();

  const today = Temporal.Now.plainDateISO();
  let startOfWeek = today.subtract({ days: today.dayOfWeek - 1 });

  if (today.dayOfWeek >= SATURDAY) {
    startOfWeek = startOfWeek.add({ weeks: 1 });
  }

  const days = Array.from({ length: today.daysInWeek * 2 }, (_, i) => i)
    .map((n) => startOfWeek.add({ days: n }))
    .filter((d) => d.dayOfWeek < SATURDAY);

  return (
    <>
      {days.map((day) => {
        const key = day.toString();
        const dayBookings = bookings.filter(({ date }) => date === key);
        return (
          <CalendarDay
            key={day.toString()}
            className={cx({ "calendar-day--end-of-week": day.dayOfWeek === 5 })}
            date={day}
            bookings={dayBookings}
            userId={user!.id}
            city={city!}
            capacity={capacity}
          />
        );
      })}
    </>
  );
}
