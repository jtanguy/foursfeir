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

export type BookingDailySummary = {
	city: string;
	date: string;
	maxOccupancy: number;
} & Record<Period, IndexedBooking[]>;


export function groupBookings<B extends Booking>(input: B[]): Record<Period, B[]> {
	return input.reduce((acc, booking) => ({ ...acc, [booking.period]: [...acc[booking.period], booking] }),
		{ day: [], morning: [], afternoon: [] });
}

export const isOverflowBooking = (booking: IndexedBooking, capacity: number): boolean => booking.index > capacity

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