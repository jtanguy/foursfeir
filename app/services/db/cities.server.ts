import DataLoader from "dataloader"
import { client, KINDS } from "./client.server"
import { PropertyFilter } from "@google-cloud/datastore"

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
export async function getCities(): Promise<City[]> {
	const query = await client.createQuery(KINDS.city)
	const [res] = await query.run()
	return res;
}

export async function getCity(slug: string): Promise<City> {
	const [res] = await client.get(client.key([KINDS.city, slug]))
	if (!res) {
		throw new Error('City not found')
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

export async function createNotice(notice: Notice) {
	const key = client.key([KINDS.city, notice.city, KINDS.notice, notice.date])
	await client.save({ key, data: notice })
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