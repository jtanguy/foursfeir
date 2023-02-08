import { Temporal } from "@js-temporal/polyfill";
import type { LoaderArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useParams } from "@remix-run/react";
import { createServerClient } from "utils/supabase.server";
import cx from "classnames";

import { FiMinus, FiPlus, FiEdit, FiEye } from "react-icons/fi";
import { useState } from "react";

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

  const [edit, setEdit] = useState(false);

  const toggleEdit = () => setEdit((e) => !e);

  return (
    <>
      <button type="button" onClick={toggleEdit}>
        {edit ? (
          <>
            <FiEye /> Visualiser
          </>
        ) : (
          <>
            <FiEdit /> Éditer
          </>
        )}
      </button>
      {days.map((day) => {
        const key = day.toString();
        const people = bookings.filter(({ date }) => date === key);
        const hasBooking = people.some((p) => p.profiles.id === user.id);
        const isWeekDay = day.dayOfWeek < 6;
        const isToday = Temporal.PlainDate.compare(day, today) === 0;
        const isFuture = Temporal.PlainDate.compare(day, today) > 0;
        return (
          <article
            key={key}
            className={cx("calendar-day", {
              "calendar-day--full": people.length === capacity,
              "calendar-day--today": isToday,
            })}
          >
            <span className="day__name">
              {day.toLocaleString("fr-FR", {
                weekday: "short",
                day: "numeric",
              })}
            </span>{" "}
            {isWeekDay && (
              <>
                {isFuture ? (
                  <Form method="post" action={`/${city}`}>
                    <input type="hidden" name="date" value={key} />
                    <input
                      type="hidden"
                      name="action"
                      value={hasBooking ? "remove" : "book"}
                    />
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
                    {edit && (
                      <button className="day__book">
                        {hasBooking ? <FiMinus /> : <FiPlus />}
                      </button>
                    )}
                  </Form>
                ) : (
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
                )}
              </>
            )}
            {isWeekDay && (
              <progress
                value={people.length}
                max={capacity}
                className="calendar-day__gauge"
              />
            )}
          </article>
        );
      })}
    </>
  );
}
