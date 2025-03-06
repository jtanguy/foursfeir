import type { AdminInfo } from "./domain/admin.interface";
import { Booking } from "./domain/booking.interface";
import type { City } from "./domain/city.interface";
import type { Profile } from "./domain/profile.interface";

export type CompareFn<T> = (a: T, b: T) => number;

function wrapMaybe<T>(
  innerCompare: CompareFn<T>,
): CompareFn<T | null | undefined> {
  return (a, b) => {
    if (a != null && b != null) {
      return innerCompare(a, b);
    }
    if (a != null) {
      return 1;
    }
    return -1;
  };
}

function lexi<T>(sortFns: CompareFn<T>[]): CompareFn<T> {
  return (a, b) =>
    sortFns.toReversed().reduceRight((acc, current) => acc || current(a, b), 0);
}

function byKey<T, K extends keyof T>(
  key: K,
  sortFn: CompareFn<T[K]>,
): CompareFn<T> {
  return (a, b) => sortFn(a[key], b[key]);
}

export const Collator = {
  wrapMaybe,
  lexi,
  byKey,
  string: (a: string, b: string) => a.localeCompare(b),
  // Admins
  admin: <T extends AdminInfo>(a: T, b: T) => a.type.localeCompare(b.type),
  // Cities
  city: <T extends City>(a: T, b: T) => a.label.localeCompare(b.label),
  // Profiles
  email: (a: Profile, b: Profile) => a.email.localeCompare(b.email),
  // Bookings
  booking: <T extends Booking>(a: T, b: T) => b.created_at.epochSeconds - a.created_at.epochSeconds,
};
