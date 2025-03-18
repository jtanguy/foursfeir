import { ProfileService, Profile } from "../../domain/profile.interface";
import { KINDS, Entity } from "../../infrastructure/db/datastore";
import { PropertyFilter, Datastore } from "@google-cloud/datastore";
import Fuse from "fuse.js";
import DataLoader from "dataloader";
import { Temporal } from "temporal-polyfill";

export class DatastoreProfileService implements ProfileService {
	private readonly client: Datastore;
	private fuseInstance: Fuse<Profile> | null = null;

	constructor(client: Datastore) {
		this.client = client;
	}

	loader = new DataLoader(async (userIds: ReadonlyArray<string>) => {
		const [results] = await this.client.get(userIds.map(u => this.client.key([KINDS.profile, u])))
		const profiles = results.map((raw: Entity<Profile>) => ({ ...raw, user_id: raw[this.client.KEY].name }))
		return userIds.map(u => (profiles as Profile[]).find(p => p.user_id === u) ?? new Error(`Profile not found: ${u}`))
	});

	async getProfileById(user_id: string): Promise<Profile | null> {
		const key = this.client.key([KINDS.profile, user_id]);
		const [entity] = await this.client.get(key);
		if (!entity) return null;
		return {
			user_id,
			email: entity.email,
			full_name: entity.full_name,
			avatar_url: entity.avatar_url,
		};
	}


	async createProfile(data: Omit<Profile, "created_at">): Promise<Profile> {
		const key = this.client.key([KINDS.profile]);
		const entity = { ...data, created_at: Temporal.Now.instant().toString() } as Profile;
		await this.client.save({ key, data: entity });
		this.addToCache(entity);
		return entity;
	}

	async updateProfile(data: Partial<Profile> & Pick<Profile, "user_id">): Promise<Profile> {
		const existingProfile = await this.getProfileById(data.user_id);
		if (!existingProfile) {
			throw new Error(`Profile not found: ${data.user_id}`);
		}
		const updatedProfile = { ...existingProfile, ...data };
		const key = this.client.key([KINDS.profile, data.user_id]);
		await this.client.save({ key, data: updatedProfile });
		this.addToCache(updatedProfile);
		return updatedProfile;
	}

	async deleteProfile(id: string): Promise<void> {
		const key = this.client.key([KINDS.profile, id]);
		await this.client.delete(key);
		this.removeFromCache(id);
	}

	async getProfiles(): Promise<Profile[]> {
		const query = this.client.createQuery(KINDS.profile);
		const [entities] = await query.run();
		return entities.map(entity => ({
			user_id: entity[this.client.KEY].name as string,
			created_at: entity.created_at,
			email: entity.email,
			full_name: entity.full_name,
			avatar_url: entity.avatar_url,
		}));
	}

	async findProfile(email: string): Promise<Profile> {
		const query = this.client.createQuery(KINDS.profile);
		query.filter(new PropertyFilter("email", "=", email));
		const [entities] = await query.run();

		if (entities.length === 0) {
			throw new Error(`Profile not found for email: ${email}`);
		}

		const entity = entities[0];
		return {
			user_id: entity[this.client.KEY].name as string,
			email: entity.email,
			full_name: entity.full_name,
			avatar_url: entity.avatar_url,
		};
	}

	async searchProfiles(pattern: string): Promise<{ profile: Profile, score: number }[]> {
		if (!this.fuseInstance) {
			const profiles = await this.getProfiles();
			this.initializeFuse(profiles);
		}
		if (!this.fuseInstance) {
			return [];
		}
		return this.fuseInstance.search(pattern).map(result => ({ profile: result.item, score: result.score! }));
	}

	private initializeFuse(profiles: Profile[]): void {
		this.fuseInstance = new Fuse(profiles, {
			includeScore: true,
			keys: [
				{ name: "full_name" },
				{ name: "email", getFn: (p) => p.email.split("@")[0] },
			],
		});
	}

	private addToCache(profile: Profile): void {
		if (!this.fuseInstance) {
			this.fuseInstance = new Fuse([profile], {
				keys: ["email", "full_name"],
				threshold: 0.3,
			});
		} else {
			this.fuseInstance.add(profile);
		}
	}

	private removeFromCache(user_id: string): void {
		if (this.fuseInstance) {
			this.fuseInstance.remove((item) => item.user_id === user_id);
		}
	}

	clearProfileCache(): void {
		this.fuseInstance = null;
	}
} 