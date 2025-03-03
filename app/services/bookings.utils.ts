import { Temporal } from "temporal-polyfill";

export type Period = 'day' | 'morning' | 'afternoon';
export const periods = {
	day: "Journée",
	morning: "Matin",
	afternoon: "Après-midi",
} as const satisfies Record<Period, string>;

const SATURDAY = 6;

export type Booking = {
	booking_id: string;
	user_id: string;
	booked_by: string | null;
	city: string;
	date: string;
	period: Period;
	guests: { [key: string]: number };
	created_at: string;
};

export type IndexedBooking = Booking & { index: number; };

export function indexBookings(bookings: Booking[]): IndexedBooking[] {
	return bookings.map((booking, i) => ({
		...booking,
		index: bookings
			.slice(0, i)
			.reduce((acc, b) => {
				const { morning, afternoon } = {
					morning: (b.period === "morning" || b.period === "day" ? 1 : 0) + (b.guests.morning ?? 0) + (b.guests.day ?? 0),
					afternoon: (b.period === "afternoon" || b.period === "day" ? 1 : 0) + (b.guests.afternoon ?? 0) + (b.guests.day ?? 0)
				};
				return acc + Math.max(morning, afternoon);
			}, 1)
	}));
}

export type BookingDailySummary = {
	city: string;
	date: string;
	maxOccupancy: number;
} & Record<Period, IndexedBooking[]>;


export function groupBookings<B extends Booking>(input: B[]): Record<Period, B[]> {
	const grouped = Object.groupBy(input, b => b.period)
	return {
		day: grouped.day ?? [],
		morning: grouped.morning ?? [],
		afternoon: grouped.afternoon ?? [],
	}
}

export const isOverflowBooking = (booking: IndexedBooking, capacity: number): boolean => {
	const guestsCount = Object.values(booking.guests).reduce((acc, val) => acc + val, 0);
	return booking.index + guestsCount > capacity;
}

export const getRequestPeriod = (today: Temporal.PlainDate, weeks = 2) => {
	let start = today.subtract({ days: today.dayOfWeek - 1 });

	if (today.dayOfWeek >= SATURDAY) {
		start = start.add({ weeks: 1 });
	}

	const end = start.add(Temporal.Duration.from({ weeks }));

	return [start, end]
}
export const getAllDatesFromPeriod = ([start, end]: [Temporal.PlainDate, Temporal.PlainDate]) => {
	const period = start.until(end)

	return Array.from({ length: period.days }, (_, i) => i)
		.map((i) => start.add({ days: i }))
		.filter(d => d.dayOfWeek < SATURDAY)
		.map(d => d.toString())
}