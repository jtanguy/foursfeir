import DataLoader from "dataloader";
import { CityService, City, Notice } from "../../domain/city.interface";
import { KINDS } from "../../infrastructure/db/datastore";
import { Datastore, PropertyFilter } from "@google-cloud/datastore";
import { Temporal } from "temporal-polyfill";

export class DatastoreCityService implements CityService {
	private readonly client: Datastore;

	constructor(client: Datastore) {
		this.client = client
	}

	// City operations
	async createCity(city: City): Promise<void> {
		const key = this.client.key([KINDS.city, city.slug]);
		await this.client.save({ key, data: city });
	}

	async updateCity(slug: string, data: Omit<City, "slug">): Promise<void> {
		const key = this.client.key([KINDS.city, slug]);
		await this.client.save({ key, data: { ...data, slug } });
	}

	async deleteCity(slug: string): Promise<void> {
		const key = this.client.key([KINDS.city, slug]);
		await this.client.delete(key);
	}

	async getCities(): Promise<City[]> {
		const query = this.client.createQuery(KINDS.city);
		const [res] = await query.run();
		return res;
	}

	async getCity(slug: string): Promise<City> {
		const key = this.client.key([KINDS.city, slug]);
		const [entity] = await this.client.get(key);
		if (!entity) {
			throw new Error(`City not found: ${slug}`);
		}
		return entity as City;
	}

	// Notice operations
	async getNotices(citySlug: string, opts: { after: Temporal.PlainDate, before?: Temporal.PlainDate }): Promise<Notice[]> {
		const query = this.client
			.createQuery(KINDS.notice)
			.hasAncestor(this.client.key([KINDS.city, citySlug]))
			.filter(new PropertyFilter("date", ">=", opts.after.toString()));
		if (opts.before) {
			query.filter(new PropertyFilter("date", "<=", opts.before.toString()));
		}
		const [res] = await query.run();
		return res;
	}

	async getNotice(citySlug: string, date: Temporal.PlainDate): Promise<Notice | null> {
		const query = this.client
			.createQuery(KINDS.notice)
			.hasAncestor(this.client.key([KINDS.city, citySlug]))
			.filter(new PropertyFilter("date", "=", date.toString()));
		const [res] = await query.run();
		if (res.length === 0) return null;
		return res[0];
	}

	async createNotice(notice: Omit<Notice, "created_at">): Promise<void> {
		const key = this.client.key([KINDS.city, notice.city, KINDS.notice, notice.date.toString()]);
		await this.client.save({ key, data: { ...notice, date: notice.date.toString(), created_at: Temporal.Now.instant().toString() } });
	}

	async deleteNotice(citySlug: string, date: Temporal.PlainDate): Promise<void> {
		const query = this.client
			.createQuery(KINDS.notice)
			.hasAncestor(this.client.key([KINDS.city, citySlug]))
			.filter(new PropertyFilter("date", "=", date.toString()));
		const [res] = await query.run();
		if (res.length === 0) return;
		await this.client.delete(res[0][this.client.KEY]);
	}

} 