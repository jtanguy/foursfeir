import { client, KINDS } from "./client.server"

export type Admin = {
	city: string
}
export async function getAdmin(user_id: string): Promise<Admin[]> {
	const query = client.createQuery(KINDS.admin).filter('id', user_id)
	const res = await query.run()
	return res[0];
}

export async function findIsAdmin(user_id: string, citySlug: string): Promise<boolean> {
	const query = client.createQuery(KINDS.admin).filter('id', user_id).hasAncestor(client.key([KINDS.city, citySlug]))
	const [res] = await query.run()
	return !!res;

}