import { Temporal } from "@js-temporal/polyfill";
import { ActionArgs, LoaderArgs, redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useParams } from "@remix-run/react";
import { createServerClient } from "utils/supabase.server";
import cx from "classnames";
import { zfd } from "zod-form-data";
import { z } from "zod";

import { FiMinusCircle, FiPlusCircle } from "react-icons/fi";

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

const schema = zfd.formData({
  date: zfd.text(),
  action: zfd.text(z.enum(["book", "remove"])),
});

export const action = async ({ request, params }: ActionArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const { action, date } = await schema.parse(await request.formData());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw redirect("/login");

  if (action === "book") {
    await supabase
      .from("bookings")
      .insert([{ city: params.city, date: date, user_id: user.id }]);
  } else {
    await supabase.from("bookings").delete().match({
      user_id: user.id,
      city: params.city,
      date: date,
    });
  }
  return null;
};

export default function CurrentMonth() {
  const today = Temporal.Now.plainDateISO();
  const currentMonth = today.toPlainYearMonth();

  const days = Array.from(
    { length: currentMonth.daysInMonth },
    (_, i) => i + 1
  ).map((day) => currentMonth.toPlainDate({ day }));

  const { bookings, capacity, user } = useLoaderData<typeof loader>();

  return (
    <>
      {days.map((day) => {
        const key = day.toString();
        const people = bookings.filter(({ date }) => date === key);
        const hasBooking = people.some((p) => p.profiles.id === user.id);
        const isWeekDay = day.dayOfWeek < 6;
        const isFuture = Temporal.PlainDate.compare(day, today) > 0;
        return (
          <article
            key={key}
            className={cx("calendar-day", {
              "calendar-day--full": people.length === capacity,
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
                  <Form method="post">
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
                    <button className="day__book">
                      {hasBooking ? <FiMinusCircle /> : <FiPlusCircle />}
                    </button>
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
