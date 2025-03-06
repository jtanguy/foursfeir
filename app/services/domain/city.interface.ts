import { Temporal } from "temporal-polyfill";

export interface City {
	slug: string;
	label: string;
	capacity: number;
	max_capacity: number;
}

export interface Notice {
	city: string;
	created_at: Temporal.Instant;
	date: Temporal.PlainDate;
	message: string;
	temp_capacity?: number;
}

export interface CityService {
	// City operations
	createCity(city: City): Promise<void>;
	updateCity(slug: string, data: Omit<City, "slug">): Promise<void>;
	deleteCity(slug: string): Promise<void>;
	getCities(): Promise<City[]>;
	getCity(slug: string): Promise<City>;

	// Notice operations
	getNotices(citySlug: string, opts: { after: Temporal.PlainDate, before?: Temporal.PlainDate }): Promise<Notice[]>;
	getNotice(citySlug: string, date: Temporal.PlainDate): Promise<Notice | null>;
	createNotice(notice: Omit<Notice, "created_at">): Promise<void>;
	deleteNotice(citySlug: string, date: Temporal.PlainDate): Promise<void>;
}

export function isNotice(n: Notice | Error | null): n is Notice {
	return !(n instanceof Error) && n?.message != null;
}