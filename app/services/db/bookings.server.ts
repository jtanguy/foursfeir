import DataLoader from "dataloader";
import { KINDS, client } from "./client.server"
import { Booking, IndexedBooking } from "../bookings.utils";

/**
 * Compute the maximum number of people.
 * @param {Booking[]} bookings
 */
export function getOccupancy(bookings: Booking[]): number {
  const days = new Set(bookings.map(b => b.date))
  if (days.size > 1) {
    throw new Error(`Occupancy cannot be computed across multiple days: ${days}`)
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
    { morning: 0, afternoon: 0 }
  );

  return Math.max(morning, afternoon);
}

export function sortBookings(input: Booking[]): IndexedBooking[] {
  return Array.from(input)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((booking, i) => ({ index: i + 1, ...booking }))
    .sort((a, b) => b.period.localeCompare(a.period)) // Trick to sort by ascending period: morning, day, afternoon
}

export async function getBookingsFor(citySlug: string, date: string): Promise<Booking[]> {
  const query = client.createQuery(KINDS.booking).filter('city', citySlug).filter('date', date)
  const [raw] = await query.run()
  const bookings = raw.map(rawBooking => ({ ...rawBooking, booking_id: rawBooking[client.KEY].id }))
  const sorted = (bookings as Booking[]).sort((a, b) => a.created_at.localeCompare(b.created_at))
  return sorted
}

export async function createBooking(booking: Omit<Booking, 'booking_id'>) {
  const key = client.key([KINDS.city, booking.city, KINDS.date, booking.date, KINDS.booking])
  await client.save({ key, data: booking })
}

export async function deleteBooking(booking: Pick<Booking, "city" | "date" | "booking_id">) {
  const key = client.key([KINDS.city, booking.city, KINDS.date, booking.date, KINDS.booking, Number(booking.booking_id)])
  await client.delete(key)
}


export function isBooking<B extends Booking>(b: B | Error | null): b is B {
  return !(b instanceof Error) && b?.id != null
}
export const bookingsLoader = new DataLoader(async (days: ReadonlyArray<[string, string]>) => Promise.all(days.map(([citySlug, day]) => getBookingsFor(citySlug, day))))
