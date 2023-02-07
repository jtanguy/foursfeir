import { Temporal } from "@js-temporal/polyfill";
import { ActionArgs, LoaderArgs, redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { createServerClient } from "utils/supabase.server";

import { FiMinusCircle, FiPlusCircle } from "react-icons/fi";

export const loader = async ({ request, params }: LoaderArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const { data: bookings } = await supabase
    .from("bookings")
    .select("date, profiles (id, full_name, avatar_url)")
    .eq("city", params.city);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return json({
    bookings: bookings ?? [],
    user,
  });
};

export default function CurrentMonth() {
  const today = Temporal.Now.plainDateISO().toPlainYearMonth();

  const days = Array.from({ length: today.daysInMonth }, (_, i) => i + 1).map(
    (day) => today.toPlainDate({ day })
  );

  const { bookings, user } = useLoaderData<typeof loader>();

  return (
    <>
      <ul className="calendar-day">
        {days.map((day) => {
          const key = day.toString();
          const people = bookings.filter(({ date }) => date === key);
          const hasBooking = people.some((p) => p.profiles.id === user.id);
          const isWeekDay = day.dayOfWeek < 6;
          return (
            <li key={key}>
              <form method="post">
                <input type="hidden" name="date" value={key} />
                <input
                  type="hidden"
                  name="action"
                  value={hasBooking ? "remove" : "book"}
                />
                <span className="day__name">
                  {day.toLocaleString("fr-FR", { weekday: "narrow" })}
                </span>{" "}
                <span className="day__number"> {day.day}</span>
                {isWeekDay && (
                  <button className="day__book">
                    {hasBooking ? <FiMinusCircle /> : <FiPlusCircle />}
                  </button>
                )}
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
              </form>
            </li>
          );
        })}
      </ul>
    </>
  );
}
