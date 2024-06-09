
export type Period = 'day' | 'morning' | 'afternoon';
export const periods = {
	day: "Journée",
	morning: "Matin",
	afternoon: "Après-midi",
} as const satisfies Record<Period, string>;

export type Booking = {
	booking_id: string;
	id: string;
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

export const isOverflowBooking = (booking: IndexedBooking, capacity: number): boolean => booking.index >= capacity