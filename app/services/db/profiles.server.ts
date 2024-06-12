import { NIL, v5 } from "uuid"
import DataLoader from "dataloader";
import { KINDS, client } from "./client.server"

export type Profile = {
	id: string,
	full_name: string,
	email: string,
	avatar_url?: string,
}

export function emailToFoursfeirId(email: string): string {
	const foursfeir_ns = v5('foursfeir', NIL)
	return v5(email, foursfeir_ns)
}

export function isProfile(p: Profile | Error | null): p is Profile {
	return !(p instanceof Error) && p?.email != null
}

export const profileLoader = new DataLoader(async (userIds: ReadonlyArray<string>) => {
	if (process.env.OFFLINE == "true") {
		const profilePath = '../../../scripts/data/profiles.json';
		const data = await import(profilePath);
		return userIds.map(u => {
			const found = data.default.find(p => p.id === u)
			if (!found) return null
			return {
				...found,
				full_name: found.full_name ?? found.email,
				avatar_url: found.avatar_url ?? undefined,
			}
		})
	}
	const [results] = await client.get(userIds.map(u => client.key([KINDS.profile, u])))
	return userIds.map(u => (results as Profile[]).find(p => p.id === u) ?? null)
})


export async function getProfile(user_id: string): Promise<Profile> {
	const res = await profileLoader.load(user_id)
	if (!res) {
		throw new Error('Profile not found')
	}
	return res;
}

export async function saveProfile(profile: Profile): Promise<void> {
	await client.save({ key: client.key([KINDS.profile, profile.id]), data: profile })
}