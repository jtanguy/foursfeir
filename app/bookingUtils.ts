import type { periods } from "./constants";

type BookingWithGuests = {
  period: keyof typeof periods;
  guests: Record<keyof typeof periods, number>;
};

/**
 * Compute the maximum number of people.
 * This function assumes that all bookings are on the same day
 * @param {BookingWithGuests} bookings
 */
export function getOccupancy(bookings: BookingWithGuests[]): number {
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
