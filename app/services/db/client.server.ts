import { Datastore } from "@google-cloud/datastore";
import { env } from "config";

export const client = new Datastore({
	keyFile: env.GOOGLE_APPLICATION_CREDENTIALS
})

export const KINDS = {
	profile: 'Profile',
	admin: 'Admin',
	city: 'City',
	date: 'Date',
	notice: 'Notice',
	booking: 'Booking',
} as const;
