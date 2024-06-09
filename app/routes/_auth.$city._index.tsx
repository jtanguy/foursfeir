import { Temporal } from "@js-temporal/polyfill";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import cx from "classnames";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { CalendarDay } from "~/components/CalendarDay";

import { authenticator, getUserFromRequest } from "~/services/auth.server";
import { bookingsLoader, createBooking, deleteBooking, getOccupancy, sortBookings } from "~/services/db/bookings.server";
import { IndexedBooking } from "~/services/bookings.utils";
import { getCity, isNotice, noticeLoader } from "~/services/db/cities.server";
import { Profile, profileLoader } from "~/services/db/profiles.server";
import invariant from "~/services/validation.utils.server";

const SATURDAY = 6;

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  invariant(params.city, 'No city given')
  const user = await getUserFromRequest(request)

  const city = await getCity(params.city)

  const search = new URL(request.url).searchParams

  const today = search.get("from") != null ? Temporal.PlainDate.from(search.get("from")!) : Temporal.Now.plainDateISO();
  let start = today.subtract({ days: today.dayOfWeek - 1 });

  if (today.dayOfWeek >= SATURDAY) {
    start = start.add({ weeks: 1 });
  }

  const weeks = Number(search.get('weeks')) || 2

  const days = Array.from({ length: today.daysInWeek * weeks }, (_, i) => i)
    .map((i) => start.add({ days: i }))
    .filter(d => d.dayOfWeek < SATURDAY)
    .map(d => d.toString())

  const daysWithCity: [string, string][] = days.map(d => [city.slug, d])

  const [bookings, notices] = await Promise.all([bookingsLoader.loadMany(daysWithCity), noticeLoader.loadMany(daysWithCity)])

  const sortedByDay = bookings.map(daily => Array.isArray(daily) ? sortBookings(daily) : [])

  const occupancies = sortedByDay.map(getOccupancy)

  const sortedByDayWithProfile: (IndexedBooking & { profile: Profile })[] = await Promise.all(
    sortedByDay.flat().map(async booking => {
      const profile = await profileLoader.load(booking.id)
      return ({ ...booking, profile: profile! })
    })
  )

  return json({
    days,
    occupancies,
    bookings: sortedByDayWithProfile ?? [],
    capacity: city.capacity,
    maxCapacity: city.max_capacity,
    notices: notices.filter(isNotice) ?? [],
    user,
  });
};

const schema = zfd.formData(
  z.union([
    z.object({
      _action: z.literal("book"),
      date: zfd.text(),
      period: zfd.text(z.enum(["day", "morning", "afternoon"])),
    }),
    z.object({
      _action: z.literal("remove"),
      booking_id: zfd.text(),
      date: zfd.text(),
    }),
  ])
);

export const action = async ({ request, params }: ActionFunctionArgs) => {
  invariant(params.city, "No city given")

  const form = await request.formData()
  const f = schema.parse(form);

  const user = await authenticator.isAuthenticated(request, { failureRedirect: "/login" })


  if (f._action === "book") {
    await createBooking({
      city: params.city,
      id: user.id,
      date: f.date,
      guests: {},
      period: f.period,
      booked_by: null,
      created_at: new Date().toISOString(),
    })
    return new Response(null, { status: 201 });
  } else {
    await deleteBooking({
      booking_id: f.booking_id,
      date: f.date,
      city: params.city,
    })
    return new Response(null, { status: 202 });
  }
};

export default function Current() {
  const { city } = useParams();
  const { days, occupancies, bookings, notices, capacity, maxCapacity, user } = useLoaderData<typeof loader>();

  return (
    <>
      {days.map((day, i) => {
        const dayBookings = bookings.filter(({ date }) => date === day);
        const notice = notices.find((n) => n.date === day);
        const date = Temporal.PlainDate.from(day)
        return (
          <CalendarDay
            key={day}
            occupancy={occupancies[i]}
            className={cx({ "calendar-day--end-of-week": date.dayOfWeek === 5 })}
            date={date}
            notice={notice?.message}
            bookings={dayBookings}
            userId={user!.id}
            city={city!}
            capacity={notice?.temp_capacity ?? capacity}
            maxCapacity={notice?.temp_capacity ?? maxCapacity}
          />
        );
      })}
    </>
  );
}
