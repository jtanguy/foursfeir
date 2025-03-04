import { Key, PropertyFilter } from "@google-cloud/datastore"
import { client, KINDS } from "./client.server"
import { City } from "./cities.server"

export type Admin = {
	id: string
}

type GlobalAdmin = {
	type: "global",
	user_id: string
}

type LocalAdmin = {
	type: "local",
	user_id: string,
	cities: City[]
}

export type AdminInfo = GlobalAdmin | LocalAdmin

export async function getAllAdmins(): Promise<AdminInfo[]> {
	const query = client.createQuery(KINDS.admin)
	const [res] = await query.run()
	const users = new Set(res.map(adm => adm.id as string))
	return (await Promise.all([...users].map(id => getAdminTnfo(id)))).filter(info => info != null).toSorted((a, b) => a.type.localeCompare(b.type))
}

export async function createAdmin(newAdmin: AdminInfo) {
	if (newAdmin.type === "global") {
		const globalKey = client.key([KINDS.admin])
		return client.save({ key: globalKey, data: { id: newAdmin.user_id } })
	} else {
		// On crée une ligne par lieu
		for await (const city of newAdmin.cities) {
			const localKey = client.key([KINDS.city, city.slug, KINDS.admin])
			await client.save({ key: localKey, data: { id: newAdmin.user_id, city: city.slug } })
		}
	}
}

export async function updateAdmin(newInfo: AdminInfo) {
	await deleteAdmin(newInfo.user_id)
	await createAdmin(newInfo)
}

export async function deleteAdmin(user_id: string) {
	const adminTadaQuery = client.createQuery(KINDS.admin).filter(new PropertyFilter("id", "=", user_id))
	const [adminData] = await adminTadaQuery.run()
	await client.delete(adminData.map(entity => entity[client.KEY]))
}

export async function getAdminTnfo(user_id: string): Promise<AdminInfo | null> {
	const query = client.createQuery(KINDS.admin).filter(new PropertyFilter('id', "=", user_id))
	const [res] = await query.run()
	const adminWithParents: AdminInfo[] = await Promise.all(res.map(async (admin) => {
		const parentKey = admin[client.KEY].parent
		if (parentKey) {
			const [city]: City[] = await client.get(parentKey)
			return (
				{ type: "local", user_id, cities: [city] })
		} else {
			return ({ type: "global", user_id }) satisfies GlobalAdmin
		}
	}))

	const info = adminWithParents.reduce((acc, adm) => {
		if (acc.type === "global" || adm.type === "global") {
			return { type: "global", user_id: acc.user_id }
		}
		return { type: "local", user_id: acc.user_id, cities: [...acc.cities, ...adm.cities] }
	}, { type: "local", user_id, cities: [] })
	if (info.type === "local" && info.cities.length === 0) {
		return null
	}
	return info
}

export async function isUserSuperAdmin(user_id: string): Promise<boolean> {
	const query = client.createQuery(KINDS.admin).filter(new PropertyFilter('id', "=", user_id))
	const [res] = await query.run()

	return res.some(admin => admin[client.KEY].parent == null)
}

export async function isUserAdmin(user_id: string, citySlug: string): Promise<boolean> {
	const query = client.createQuery(KINDS.admin).filter(new PropertyFilter('id', "=", user_id))
	const [res] = await query.run()

	const cityKeySerialized = await client.keyToLegacyUrlSafe(client.key([KINDS.city, citySlug]))
	return res.some(async admin => {
		const parentKey: Key = admin[client.KEY].parent
		// Les admins sans parent sont des admins globaux
		if (!parentKey) {
			return true
		}
		const serialized = await client.keyToLegacyUrlSafe(parentKey)
		return serialized == cityKeySerialized
	})
}