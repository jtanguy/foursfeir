import { AdminService, AdminInfo } from "../../domain/admin.interface";
import { KINDS } from "../../infrastructure/db/datastore";
import { PropertyFilter, Datastore } from "@google-cloud/datastore";
import { City } from "../../domain/city.interface";

export class DatastoreAdminService implements AdminService {
	private readonly client: Datastore;

	constructor(client: Datastore) {
		this.client = client;
	}

	async getAllAdmins(): Promise<AdminInfo[]> {
		const query = this.client.createQuery(KINDS.admin);
		const [res] = await query.run();
		const users = new Set(res.map((adm) => adm.id as string));
		return (await Promise.all([...users].map((id) => this.getAdminInfo(id))))
			.filter((info): info is AdminInfo => info != null)
			.toSorted((a, b) => a.type.localeCompare(b.type));
	}

	async getAdminInfo(userId: string): Promise<AdminInfo | null> {
		const query = this.client
			.createQuery(KINDS.admin)
			.filter(new PropertyFilter("id", "=", userId));
		const [res] = await query.run();
		const adminWithParents: AdminInfo[] = await Promise.all(
			res.map(async (admin) => {
				const parentKey = admin[this.client.KEY].parent;
				if (parentKey) {
					const [city]: City[] = await this.client.get(parentKey);
					return { type: "local", user_id: userId, cities: [city] };
				} else {
					return { type: "global", user_id: userId };
				}
			}),
		);

		const info = adminWithParents.reduce(
			(acc, adm) => {
				if (acc.type === "global" || adm.type === "global") {
					return { type: "global", user_id: acc.user_id };
				}
				return {
					type: "local",
					user_id: acc.user_id,
					cities: [...acc.cities, ...adm.cities],
				};
			},
			{ type: "local", user_id: userId, cities: [] },
		);
		if (info.type === "local" && info.cities.length === 0) {
			return null;
		}
		return info;
	}

	async createAdmin(admin: AdminInfo): Promise<void> {
		if (admin.type === "global") {
			const globalKey = this.client.key([KINDS.admin]);
			await this.client.save({ key: globalKey, data: { id: admin.user_id } });
		} else {
			// On crée une ligne par lieu
			for await (const city of admin.cities) {
				const localKey = this.client.key([KINDS.city, city.slug, KINDS.admin]);
				await this.client.save({
					key: localKey,
					data: { id: admin.user_id, city: city.slug },
				});
			}
		}
	}

	async updateAdmin(admin: AdminInfo): Promise<void> {
		await this.deleteAdmin(admin.user_id);
		await this.createAdmin(admin);
	}

	async deleteAdmin(userId: string): Promise<void> {
		const adminDataQuery = this.client
			.createQuery(KINDS.admin)
			.filter(new PropertyFilter("id", "=", userId));
		const [adminData] = await adminDataQuery.run();
		await this.client.delete(adminData.map((entity) => entity[this.client.KEY]));
	}

	async isUserSuperAdmin(userId: string): Promise<boolean> {
		const query = this.client
			.createQuery(KINDS.admin)
			.filter(new PropertyFilter("id", "=", userId));
		const [res] = await query.run();

		return res.some((admin) => admin[this.client.KEY].parent == null);
	}

	async isUserAdmin(userId: string, citySlug: string): Promise<boolean> {
		const query = this.client
			.createQuery(KINDS.admin)
			.filter(new PropertyFilter("id", "=", userId));
		const [res] = await query.run();

		const cityKeySerialized = await this.client.keyToLegacyUrlSafe(
			this.client.key([KINDS.city, citySlug]),
		);
		return res.some(async (admin) => {
			const parentKey = admin[this.client.KEY].parent;
			// Les admins sans parent sont des admins globaux
			if (!parentKey) {
				return true;
			}
			const serialized = await this.client.keyToLegacyUrlSafe(parentKey);
			return serialized == cityKeySerialized;
		});
	}
} 