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

  const [{ data: bookings }, { data: cities }] = await Promise.all([
    supabase
      .from("bookings")
      .select("date, period, profiles (id, full_name, avatar_url)")
      .eq("city", params.city),
    supabase.from("cities").select("capacity").eq("slug", params.city),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
        const people = bookings.filter(({ date }) => date === key);
        return (
          <CalendarDay
            key={day.toString()}
            className={cx({ "calendar-day--end-of-week": day.dayOfWeek === 5 })}
            date={day}
            people={people!}
            userId={user!.id}
            city={city!}
            capacity={capacity}
          />
        );
      })}
    </>
  );
}
