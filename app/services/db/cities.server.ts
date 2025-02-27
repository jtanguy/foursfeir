import DataLoader from "dataloader"
import { client, KINDS } from "./client.server"
import { PropertyFilter } from "@google-cloud/datastore"
import { Temporal } from "temporal-polyfill"

// #region Types
export type City = {
	slug: string,
	label: string,
	capacity: number,
	max_capacity: number,
}

export type Notice = {
	city: string
	created_at: string,
	date: string,
	message: string
	temp_capacity?: number
}
// #endregion


// #region Data access
export async function createCity(newCity: City) {
	const key = client.key([KINDS.city, newCity.slug])
	await client.save({
		key, data: { ...newCity, created_at: Temporal.Now.instant().toString() }
	})
}

export async function updateCity(slug: string, newData: Omit<City, "slug">) {
	const key = client.key([KINDS.city, slug])
	await client.save({ key, data: { slug, ...newData } })
}

export async function deleteCity(slug: string) {
	const key = client.key([KINDS.city, slug])
	await client.delete(key)
}

export async function getCities(): Promise<City[]> {
	const query = await client.createQuery(KINDS.city)
	const [res] = await query.run()
	return res;
}

export async function getCity(slug: string): Promise<City> {
	const key = client.key([KINDS.city, slug])
	const [res] = await client.get(key)
	if (!res) {
		throw new Error(`City ${slug} not found`)
	}
	return res
}

export async function getAllNotices(citySlug: string, afterDay: string): Promise<Notice[]> {
	const query = await client.createQuery(KINDS.notice).hasAncestor(client.key([KINDS.city, citySlug])).filter(new PropertyFilter('date', '>=', afterDay))
	const [res] = await query.run()
	return res
}

export async function getNoticeFor(citySlug: string, day: string): Promise<Notice | null> {
	const [res] = await client.get(client.key([KINDS.city, citySlug, KINDS.notice, day]))
	return res ?? null
}

export async function createNotice(notice: Omit<Notice, "created_at">) {
	const key = client.key([KINDS.city, notice.city, KINDS.notice, notice.date])
	await client.save({ key, data: { ...notice, created_at: Temporal.Now.instant().toString() } })
}

export async function deleteNotice(notice: Pick<Notice, "city" | "date">) {
	const key = client.key([KINDS.city, notice.city, KINDS.notice, notice.date])
	await client.delete(key)
}


export function isNotice(n: Notice | Error | null): n is Notice {
	return !(n instanceof Error) && n?.message != null
}

export const noticeLoader = new DataLoader(async (days: ReadonlyArray<[string, string]>) => Promise.all(days.map(([citySlug, d]) => getNoticeFor(citySlug, d))))
// #endregion