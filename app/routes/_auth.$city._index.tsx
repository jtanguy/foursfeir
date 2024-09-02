import { Temporal } from "@js-temporal/polyfill";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useParams } from "@remix-run/react";
import cx from "classnames";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { CalendarDay } from "~/components/CalendarDay";

import { authenticator, getUserFromRequest } from "~/services/auth.server";
import {
  createBooking,
  deleteBooking,
  getBookingsFor,
  getOccupancy,
} from "~/services/db/bookings.server";
import {
  IndexedBooking,
  getAllDatesFromPeriod,
  getRequestPeriod,
} from "~/services/bookings.utils";
import { getCity, isNotice, noticeLoader } from "~/services/db/cities.server";
import {
  Profile,
  profileLoader,
  saveProfile,
} from "~/services/db/profiles.server";
import invariant from "~/services/validation.utils.server";
import { emailToFoursfeirId } from "~/services/profiles.utils";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  invariant(params.city, "No city given");
  const user = await getUserFromRequest(request);
  const city = await getCity(params.city);

  const search = new URL(request.url).searchParams;
  const [start, end] = getRequestPeriod(
    search.get("from") != null
      ? Temporal.PlainDate.from(search.get("from")!)
      : Temporal.Now.plainDateISO(),
    Number(search.get("weeks") ?? 2),
  );

  const days = getAllDatesFromPeriod([start, end]);
  const daysWithCity: [string, string][] = days.map((d) => [city.slug, d]);
  const [periodBookings, notices] = await Promise.all([
    getBookingsFor(city.slug, [start.toString(), end.toString()]),
    noticeLoader.loadMany(daysWithCity),
  ]);

  const bookingsDailies = [
    ...periodBookings
      .reduce((previous, booking) => {
        previous.set(
          booking.date,
          (previous.get(booking.date) ?? []).concat({
            index: (previous.get(booking.date)?.length ?? 0) + 1,
            ...booking,
          }),
        );
        return previous;
      }, new Map())
      .values(),
  ];

  const occupancies = days.map((day) =>
    getOccupancy(bookingsDailies.flat().filter(({ date }) => date === day)),
  );

  const sortedByDayWithProfile: (IndexedBooking & { profile: Profile })[] =
    await Promise.all(
      bookingsDailies.flat().map(async (booking) => {
        const profile = await profileLoader.load(booking.user_id);
        return { ...booking, profile: profile! };
      }),
    );

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
  ]),
);

export const action = async ({ request, params }: ActionFunctionArgs) => {
  invariant(params.city, "No city given");

  const form = await request.formData();
  const f = schema.parse(form);

  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  if (f._action === "book") {
    await saveProfile({
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
    });

    /*  delete all previous bookings to avoid to create a doublon booking
        It is temporary fix other possibility use the user_id to identify the booking_id and overwrite the previous booking
    */
    const user_id = emailToFoursfeirId(user.email);
    const previousBookings = await getBookingsFor(params.city, f.date, user_id)

    if(previousBookings.length > 0) {
      await Promise.all(previousBookings.map(({booking_id, city, date}) => deleteBooking({booking_id, city, date})))
    }

    await createBooking({
      city: params.city,
      user_id,
      date: f.date,
      guests: {},
      period: f.period,
      booked_by: null,
      created_at: new Date().toISOString(),
    });

    return new Response(null, { status: 201 });
  } else {
    await deleteBooking({
      booking_id: f.booking_id,
      date: f.date,
      city: params.city,
    });
    return new Response(null, { status: 202 });
  }
};

export default function Current() {
  const { city } = useParams();
  const { days, occupancies, bookings, notices, capacity, maxCapacity, user } =
    useLoaderData<typeof loader>();

  return (
    <>
      {days.map((day, i) => {
        const dayBookings = bookings.filter(({ date }) => date === day);
        const notice = notices.find((n) => n.date === day);
        const date = Temporal.PlainDate.from(day);
        return (
          <CalendarDay
            key={day}
            occupancy={occupancies[i]}
            className={cx({
              "calendar-day--end-of-week": date.dayOfWeek === 5,
            })}
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
