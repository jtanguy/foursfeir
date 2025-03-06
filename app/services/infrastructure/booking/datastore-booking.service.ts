import { Temporal } from "temporal-polyfill";
import { BookingService, Booking } from "../../domain/booking.interface";
import { KINDS } from "../../infrastructure/db/datastore";
import { PropertyFilter, Datastore, and, Key } from "@google-cloud/datastore";
import { Collator } from "~/services/collator.utils";

export class DatastoreBookingService implements BookingService {
	private readonly client: Datastore;

	constructor(client: Datastore) {
		this.client = client;
	}

	private async getBookingKey(city: string, date: Temporal.PlainDate, user_id: string): Promise<Key | null> {
		const key = this.client.key([KINDS.city, city, KINDS.date, date.toString()]);
		const [entity] = await this.client.createQuery(KINDS.booking).hasAncestor(key).filter(new PropertyFilter("user_id", "=", user_id)).run();
		if (!entity || entity.length === 0) return null;
		return entity[0][this.client.KEY]
	}
	// async getBookingById(id: string): Promise<Booking | null> {
	// 	const key = this.client.key([KINDS.booking, id]);
	// 	const [entity] = await this.client.get(key);
	// 	if (!entity) return null;
	// 	return {
	// 		created_at: Temporal.Instant.from(entity.created_at),
	// 		user_id: entity.user_id,
	// 		city: entity.city,
	// 		date: Temporal.PlainDate.from(entity.date),
	// 		period: entity.period,
	// 		guests: entity.guests,
	// 	};
	// }

	private async createBooking(data: Omit<Booking, "created_at">): Promise<Booking> {
		const key = this.client.key([KINDS.city, data.city, KINDS.date, data.date.toString(), KINDS.booking]);
		const now = Temporal.Now.instant();
		await this.client.save({ key, data: { ...data, date: data.date.toString(), created_at: now.toString() } });
		return { ...data, created_at: now };
	}

	async updateBooking(key: Key, data: Partial<Booking>): Promise<Booking> {
		const [entity] = await this.client.get(key);
		if (!entity) {
			throw new Error("Booking not found");
		}
		const updatedBooking = { ...entity, period: data.period, guests: data.guests };
		await this.client.save({ key, data: updatedBooking });
		return updatedBooking;
	}

	async upsertBooking(data: Booking): Promise<Booking> {
		const existingBooking = await this.getBookingKey(data.city, Temporal.PlainDate.from(data.date), data.user_id);
		if (existingBooking) {
			return this.updateBooking(existingBooking, data);
		}
		return this.createBooking(data);
	}


	async deleteBooking(booking: Pick<Booking, "city" | "user_id" | "date">): Promise<void> {
		const key = await this.getBookingKey(booking.city, Temporal.PlainDate.from(booking.date), booking.user_id);
		if (key) {
			await this.client.delete(key);
		}
	}

	// async getBookingsByUserId(userId: string): Promise<Booking[]> {
	// 	const query = this.client.createQuery(KINDS.booking);
	// 	query.filter(new PropertyFilter("user_id", "=", userId));
	// 	const [entities] = await query.run();
	// 	return entities.map(entity => ({
	// 		...entity,
	// 		id: entity[this.client.KEY].id as string,
	// 	})) as Booking[];
	// }

	async getBookings(city: string, date: Temporal.PlainDate): Promise<Booking[]> {
		const ancestorKey = this.client.key([KINDS.city, city, KINDS.date, date.toString()]);
		const query = this.client.createQuery(KINDS.booking).hasAncestor(ancestorKey);

		const [raw] = await query.run()
		return raw
			.sort(Collator.byKey("created_at", Collator.string))
	}

	async getBookingsRange(city: string, from: Temporal.PlainDate, to: Temporal.PlainDate): Promise<Booking[]> {
		const ancestorKey = this.client.key([KINDS.city, city]);
		const query = this.client.createQuery(KINDS.booking).hasAncestor(ancestorKey).filter(and([
			new PropertyFilter("date", ">=", from.toString()),
			new PropertyFilter("date", "<=", to.toString())
		]
		));
		const [raw] = await query.run()
		return raw
			.sort(Collator.byKey("created_at", Collator.string))
	}

	async getMyBookings(userId: string, month: Temporal.PlainYearMonth): Promise<Booking[]> {
		const query = this.client.createQuery(KINDS.booking).filter(and([
			new PropertyFilter("user_id", "=", userId),
			new PropertyFilter("date", ">=", month.toPlainDate({ day: 1 }).toString()),
			new PropertyFilter("date", "<=", month.toPlainDate({ day: month.daysInMonth }).toString())
		]
		));
		const [raw] = await query.run()
		return raw
			.sort(Collator.byKey("created_at", Collator.string))
	}

} 