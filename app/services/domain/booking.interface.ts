import { Temporal } from "temporal-polyfill";

export type Period = "day" | "morning" | "afternoon";
export const periods = {
	day: "Journée",
	morning: "Matin",
	afternoon: "Après-midi",
} as const satisfies Record<Period, string>;

const SATURDAY = 6;

export interface Booking {
	user_id: string;
	city: string;
	date: Temporal.PlainDate | string;
	period: Period;
	guests: {
		day?: number;
		morning?: number;
		afternoon?: number;
	};
	booked_by?: string | null;
	created_at: Temporal.Instant | string;
}

export interface IndexedBooking extends Booking {
	index: number;
}

export interface BookingDailySummary {
	city: string;
	date: string;
	maxOccupancy: number;
	day: IndexedBooking[];
	morning: IndexedBooking[];
	afternoon: IndexedBooking[];
}


export interface BookingService {
	upsertBooking(data: Booking): Promise<Booking>;
	// createBooking(data: Omit<Booking, "created_at"> & { created_at?: Temporal.Instant }): Promise<Booking>;
	// updateBooking(id: string, data: Partial<Booking>): Promise<Booking>;
	deleteBooking(booking: Pick<Booking, "city" | "user_id" | "date">): Promise<void>;
	getBookings(city: string, date: Temporal.PlainDate): Promise<Booking[]>;
	getBookingsRange(city: string, from: Temporal.PlainDate, to: Temporal.PlainDate): Promise<Booking[]>;
	getMyBookings(userId: string, month: Temporal.PlainYearMonth): Promise<Booking[]>;
}

// Implémentation des fonctions utilitaires
export function indexBookings(bookings: Booking[]): IndexedBooking[] {
	return bookings.map((booking, i) => ({
		...booking,
		index: bookings.slice(0, i).reduce((acc, b) => {
			const { morning, afternoon } = {
				morning:
					(b.period === "morning" || b.period === "day" ? 1 : 0) +
					(b.guests.morning ?? 0) +
					(b.guests.day ?? 0),
				afternoon:
					(b.period === "afternoon" || b.period === "day" ? 1 : 0) +
					(b.guests.afternoon ?? 0) +
					(b.guests.day ?? 0),
			};
			return acc + Math.max(morning, afternoon);
		}, 1),
	}));
}

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

export function groupBookings<B extends Booking>(input: B[]): Record<Period, B[]> {
	const grouped = Object.groupBy(input, (b) => b.period);
	return {
		day: grouped.day ?? [],
		morning: grouped.morning ?? [],
		afternoon: grouped.afternoon ?? [],
	};
}

export function isOverflowBooking(booking: IndexedBooking, capacity: number): boolean {
	const guestsCount = Object.values(booking.guests).reduce(
		(acc, val) => acc + val,
		0,
	);
	return booking.index + guestsCount > capacity;
}

export function getRequestPeriod(today: Temporal.PlainDate, weeks = 2): [Temporal.PlainDate, Temporal.PlainDate] {
	let start = today.subtract({ days: today.dayOfWeek - 1 });

	if (today.dayOfWeek >= SATURDAY) {
		start = start.add({ weeks: 1 });
	}

	const end = start.add(Temporal.Duration.from({ weeks }));

	return [start, end];
}

export function getAllDatesFromPeriod([start, end]: [Temporal.PlainDate, Temporal.PlainDate]): string[] {
	const period = start.until(end);

	return Array.from({ length: period.days }, (_, i) => i)
		.map((i) => start.add({ days: i }))
		.filter((d) => d.dayOfWeek < SATURDAY)
		.map((d) => d.toString());
}

export function isBooking<B extends Booking>(b: B | Error | null): b is B {
	return b !== null && !(b instanceof Error);
} 