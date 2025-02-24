import { Datastore } from "@google-cloud/datastore";

export const client = new Datastore()

export const KINDS = {
	profile: 'Profile',
	admin: 'Admin',
	city: 'City',
	date: 'Date',
	notice: 'Notice',
	booking: 'Booking',
} as const;
