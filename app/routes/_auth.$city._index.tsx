import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData, json, useParams } from "@remix-run/react";
import cx from "classnames";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { CalendarDay } from "~/components/CalendarDay";

import { authenticator, getUserFromRequest } from "~/services/auth.server";
import invariant from "~/services/validation.utils.server";
import { Temporal } from "temporal-polyfill";
import { bookingService, cityService, profileService } from "~/services/application/services.server";
import { IndexedBooking } from "~/services/domain/booking.interface";
import { getOccupancy } from "~/services/domain/booking.interface";
import { getRequestPeriod, getAllDatesFromPeriod } from "~/services/domain/booking.interface";
import { emailToFoursfeirId, Profile } from "~/services/domain/profile.interface";
import { isNotice } from "~/services/domain/city.interface";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  invariant(params.city, "No city given");
  const user = await getUserFromRequest(request);
  const city = await cityService.getCity(params.city);

  const search = new URL(request.url).searchParams;
  const [start, end] = getRequestPeriod(
    search.get("from") != null
      ? Temporal.PlainDate.from(search.get("from")!)
      : Temporal.Now.plainDateISO(),
    Number(search.get("weeks") ?? 2),
  );

  const [periodBookings, notices] = await Promise.all([
    bookingService.getBookingsRange(city.slug, start, end),
    cityService.getNotices(city.slug, { after: start, before: end }),
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

  const days = getAllDatesFromPeriod([start, end]);
  const occupancies = days.map((day) =>
    getOccupancy(bookingsDailies.flat().filter(({ date }) => date === day)),
  );

  const sortedByDayWithProfile: (IndexedBooking & { profile: Profile })[] =
    await Promise.all(
      bookingsDailies.flat().map(async (booking) => {
        const profile = await profileService.loader.load(booking.user_id);
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
      date: zfd.text(z.string().date().transform((d) => Temporal.PlainDate.from(d))),
      period: zfd.text(z.enum(["day", "morning", "afternoon"])),
    }),
    z.object({
      _action: z.literal("remove"),
      user_id: zfd.text(),
      date: zfd.text(z.string().date().transform((d) => Temporal.PlainDate.from(d))),
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
    const user_id = emailToFoursfeirId(user.email);

    const profile = await profileService.getProfileById(user_id);
    if (!profile) {
      await profileService.createProfile({
        user_id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      });
    }

    await bookingService.upsertBooking({
      city: params.city,
      user_id,
      date: f.date,
      guests: { day: 0, morning: 0, afternoon: 0 },
      period: f.period,
      booked_by: null,
      created_at: Temporal.Now.instant(),
    });

    return new Response(null, { status: 201 });
  } else {
    await bookingService.deleteBooking({
      city: params.city,
      user_id: f.user_id,
      date: f.date,
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
            userId={user!.user_id}
            city={city!}
            capacity={notice?.temp_capacity ?? capacity}
            maxCapacity={notice?.temp_capacity ?? maxCapacity}
          />
        );
      })}

      <Form className="calendar-day" method="get" action={`/${city}/redirect`}>
        <fieldset role="group">
          <input type="date" name="date" />
          <button type="submit">Go</button>
        </fieldset>
      </Form>
    </>
  );
}
