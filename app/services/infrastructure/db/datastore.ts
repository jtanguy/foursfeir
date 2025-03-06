import { Datastore, Key } from "@google-cloud/datastore";
import { env } from "config";

export const KINDS = {
	city: "City",
	date: "Date",
	booking: "Booking",
	profile: "Profile",
	admin: "Admin",
	notice: "Notice",
} as const;

/**
 * Entity is a type that extends a type T with a key property.
 * The datastore client does not properly type the entities, so we need to use this type.
 * @template T - The type of the entity.
 * @property {Key} [client.KEY] - The key of the entity.
 */
export type Entity<T> = T & {
	[client.KEY]: Key;
};

const common = {
	projectId: env.GCP_PROJECT_ID,
	namespace: env.NAMESPACE,
};

export const client = new Datastore(
	env.GCP_PRIVATE_KEY && env.GCP_SERVICE_ACCOUNT_EMAIL ?
		{
			credentials: {
				client_email: env.GCP_SERVICE_ACCOUNT_EMAIL,
				private_key: env.GCP_PRIVATE_KEY,
			},
			...common
		} : common)