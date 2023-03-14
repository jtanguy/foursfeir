import { Temporal } from "@js-temporal/polyfill";
import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import cx from "classnames";
import { createServerClient } from "utils/supabase.server";
import { z } from "zod";
import { zfd } from "zod-form-data";

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
  const end = start.add({ days: today.daysInWeek * 2 });

  const [{ data: bookings }, { data: cities }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "date, period, profile:user_id(id, email, full_name, avatar_url), guests"
      )
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

const schema = zfd.formData(
  z.discriminatedUnion("action", [
    z.object({
      action: z.literal("book"),
      date: zfd.text(),
      period: zfd.text(z.enum(["day", "morning", "afternoon"])),
    }),
    z.object({
      action: z.literal("remove"),
      date: zfd.text(),
    }),
  ])
);

export const action = async ({ request, params }: ActionArgs) => {
  if (!params.city) throw new Response("No city given", { status: 400 });
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const { action, date, period } = schema.parse(await request.formData());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw redirect("/login");

  if (action === "book") {
    await supabase
      .from("bookings")
      .insert([
        { city: params.city, date: date, user_id: user.id, period: period },
      ]);
    return new Response(null, { status: 201 });
  } else {
    await supabase.from("bookings").delete().match({
      user_id: user.id,
      city: params.city,
      date: date,
    });
    return new Response(null, { status: 202 });
  }
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
