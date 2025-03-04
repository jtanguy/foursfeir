import DataLoader from "dataloader";
import { KINDS, client, Entity } from "./client.server"
import { emailToFoursfeirId } from "../profiles.utils";
import Fuse from "fuse.js";

let fuseInstance: Fuse<Profile> | null = null;

export async function getFuseInstance(): Promise<Fuse<Profile>> {
	if (!fuseInstance) {
		const profiles = await getProfiles();
		setFuseInstance(profiles);
	}
	if (!fuseInstance) {
		throw new Error("Failed to initialize Fuse instance");
	}
	return fuseInstance;
}

function setFuseInstance(profiles: Profile[]) {
	fuseInstance = new Fuse(profiles, {
		includeScore: true,
		keys: [
			{ name: "full_name" },
			{ name: "email", getFn: (p) => p.email.split("@")[0] },
		],
	});
}

export function invalidateFuseInstance() {
	fuseInstance = null;
}

export type Profile = {
	id: string,
	full_name: string,
	email: string,
	avatar_url?: string,
}
export function isProfile(p: Profile | Error | null): p is Profile {
	return !(p instanceof Error) && p?.email != null
}

export const profileLoader = new DataLoader(async (userIds: ReadonlyArray<string>) => {
	const [results] = await client.get(userIds.map(u => client.key([KINDS.profile, u])))
	const profiles = results.map((raw: Entity<Profile>) => ({ ...raw, id: raw[client.KEY].name }))
	return userIds.map(u => (profiles as Profile[]).find(p => p.id === u) ?? null)
})

export async function findProfile(email: string) {
	return getProfile(emailToFoursfeirId(email))
}

export async function getProfile(user_id: string): Promise<Profile> {
	const res = await profileLoader.load(user_id)
	if (!res) {
		throw new Error('Profile not found')
	}
	return res;
}

export async function getProfiles(): Promise<Profile[]> {
	const [profiles] = await client.createQuery(KINDS.profile).run()
	return profiles.map((profile) => ({ ...profile, id: profile[client.KEY].name }))
}

export function saveProfile(profile: Profile) {
	if (fuseInstance != null) {
		fuseInstance.add(profile)
	}
	return client.save({ key: client.key([KINDS.profile, profile.id]), data: profile })
}