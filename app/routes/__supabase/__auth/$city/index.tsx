import { Temporal } from "@js-temporal/polyfill";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import { createServerClient } from "utils/supabase.server";

import { CalendarDay } from "~/components/CalendarDay";

export const loader = async ({ request, params }: LoaderArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const [{ data: bookings }, { data: cities }] = await Promise.all([
    supabase
      .from("bookings")
      .select("date, profiles (id, full_name, avatar_url)")
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
  const startOfWeek = today.subtract({ days: today.dayOfWeek - 1 });

  const days = Array.from({ length: 14 }, (_, i) => i).map((n) =>
    startOfWeek.add({ days: n })
  );

  return (
    <>
      {days.map((day) => {
        const key = day.toString();
        const people = bookings.filter(({ date }) => date === key);
        return (
          <CalendarDay
            key={day.toString()}
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
