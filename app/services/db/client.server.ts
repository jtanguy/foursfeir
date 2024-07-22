import { Datastore } from "@google-cloud/datastore";

function getGCPCredentials() {
	// for Vercel, use environment variables
	return process.env.GCP_PRIVATE_KEY ? {
		credentials: {
			client_email: process.env.GCP_SERVICE_ACCOUNT_EMAIL,
			private_key: process.env.GCP_PRIVATE_KEY,
		},
		projectId: process.env.GCP_PROJECT_ID,
	}
	// for local development, use gcloud CLI
	: {
		projectId: 'nte-foursfeir',
	};
}

export const client = new Datastore(getGCPCredentials())

export const KINDS = {
	profile: 'Profile',
	admin: 'Admin',
	city: 'City',
	date: 'Date',
	notice: 'Notice',
	booking: 'Booking',
} as const;
