import { Datastore } from "@google-cloud/datastore";
import { env } from "config";

export const client = new Datastore(
	env.GCP_PRIVATE_KEY && env.GCP_SERVICE_ACCOUNT_EMAIL ?
		{
			credentials: {
				client_email: env.GCP_SERVICE_ACCOUNT_EMAIL,
				private_key: env.GCP_PRIVATE_KEY,
			},
			projectId: env.GCP_PROJECT_ID,
		} : {
			projectId: env.GCP_PROJECT_ID
		})

export const KINDS = {
	profile: 'Profile',
	admin: 'Admin',
	city: 'City',
	date: 'Date',
	notice: 'Notice',
	booking: 'Booking',
} as const;
