import { Temporal } from "@js-temporal/polyfill";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createServerClient } from "utils/supabase.server";
import { useSupabase } from "~/routes/__supabase";

export const loader = async ({ request, params }: LoaderArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const { data: bookings } = await supabase
    .from("bookings")
    .select("date, profiles (id, full_name, avatar_url)")
    .eq("city", params.city);

  return json({
    bookings: bookings ?? [],
  });
};

export default function CurrentMonth() {
  const { session } = useSupabase();
  const today = Temporal.Now.plainDateISO().toPlainYearMonth();

  const days = Array.from({ length: today.daysInMonth }, (_, i) => i + 1).map(
    (day) => today.toPlainDate({ day })
  );

  const { bookings } = useLoaderData<typeof loader>();

  return (
    <>
      <ul className="calendar-day">
        {days.map((day) => {
          const key = day.toString();
          const people = bookings.filter(({ date }) => date === key);
          const hasBooking = people.some(
            (p) => p.profiles.id === session?.user.id
          );
          return (
            <li key={key}>
              <span className="day__name">
                {day.toLocaleString("fr-FR", { weekday: "narrow" })}
              </span>{" "}
              <span className="day__number"> {day.day}</span>
              {hasBooking ? "book" : "remove"}
              <ul className="calendar-people">
                {people.map((person) => (
                  <li key={person.profiles?.id}>
                    <img
                      className="avatar"
                      referrerPolicy="no-referrer"
                      alt={person.profiles?.full_name}
                      src={person.profiles?.avatar_url}
                    />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </>
  );
}
