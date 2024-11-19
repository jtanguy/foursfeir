import { KINDS, client } from "./client.server";
import { Booking } from "../bookings.utils";
import { and, PropertyFilter } from "@google-cloud/datastore";

/**
 * Compute the maximum number of people.
 * @param {Booking[]} bookings
 */
export function getOccupancy(bookings: Booking[]): number {
  const days = new Set(bookings.map((b) => b.date));
  if (days.size > 1) {
    throw new Error(
      `Occupancy cannot be computed across multiple days: ${days}`,
    );
  }
  const { morning, afternoon } = bookings.reduce(
    (acc, booking) => {
      return {
        morning:
          acc.morning +
          (booking.period !== "afternoon" ? 1 : 0) +
          (booking.guests.morning ?? 0) +
          (booking.guests.day ?? 0),
        afternoon:
          acc.afternoon +
          (booking.period !== "morning" ? 1 : 0) +
          (booking.guests.afternoon ?? 0) +
          (booking.guests.day ?? 0),
      };
    },
    { morning: 0, afternoon: 0 },
  );

  return Math.max(morning, afternoon);
}

export function withIndex(booking: Booking, index: number) {
  return { ...booking, index: index + 1 };
}

export async function getBookingsFor(
  citySlug: string,
  date: string | [string, string],
  userId?: string,
): Promise<Booking[]> {
  let ancestorKey;
  if (Array.isArray(date)) {
    ancestorKey = client.key([KINDS.city, citySlug]);
  } else {
    ancestorKey = client.key([KINDS.city, citySlug, KINDS.date, date]);
  }

  const query = client.createQuery(KINDS.booking).hasAncestor(ancestorKey);

  if (userId) {
    query.filter("user_id", userId);
  }

  if (!userId && Array.isArray(date)) {
    query.filter(
      and([
        new PropertyFilter("date", ">=", date[0]),
        new PropertyFilter("date", "<=", date[1]),
      ]),
    );
  }

  // no order on created_at to avoid to read all the index created_at

  const [raw] = await query.run();
  return raw
    .map((rawBooking) => ({
      ...rawBooking,
      booking_id: rawBooking[client.KEY].id,
    }))
    .sort((bookingA, bookingB) =>
      bookingA.created_at.localeCompare(bookingB.created_at),
    );
}

export async function createBooking(booking: Omit<Booking, "booking_id">) {
  const key = client.key([
    KINDS.city,
    booking.city,
    KINDS.date,
    booking.date,
    KINDS.booking,
  ]);
  await client.save({ key, data: booking });
}

export async function deleteBooking(
  booking: Pick<Booking, "city" | "date" | "booking_id">,
) {
  const key = client.key([
    KINDS.city,
    booking.city,
    KINDS.date,
    booking.date,
    KINDS.booking,
    Number(booking.booking_id),
  ]);
  await client.delete(key);
}

export function isBooking<B extends Booking>(b: B | Error | null): b is B {
  return !(b instanceof Error) && b?.id != null;
}
