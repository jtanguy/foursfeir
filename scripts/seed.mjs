#!/usr/bin/env zx
import fs from 'node:fs';
import path from 'node:path'
import { NIL, v5 } from "uuid"
import { Temporal } from "@js-temporal/polyfill";

import { parse } from 'csv-parse';
import { Datastore } from '@google-cloud/datastore'

export function emailToFoursfeirId(email) {
	const foursfeir_ns = v5('foursfeir', NIL)
	return v5(email, foursfeir_ns)
}

const datastore = new Datastore({
	projectId: "nte-foursfeir",
})

const __dirname = new URL('.', import.meta.url).pathname;

const idToFourSfeirId = new Map();

const KINDS = {
	city: "City",
	notice: "Notice",
	admin: "Admin",
	profile: "Profile",
	date: "Date",
	booking: "Booking"
}

if (argv.reset) {
	console.log("Cleaning up the database")
	for (const k of Object.keys(KINDS)) {
		let query = datastore.createQuery(KINDS[k]).select('__key__')
		do {
			const [objects, metadata] = await datastore.runQuery(query)
			if (!Array.isArray(objects) || objects.length == 0) break;
			await datastore.delete(objects.map(o => o[datastore.KEY]))
			console.log(`Deleted ${objects.length} objects of type ${k}`)
			if (metadata.moreResults === 'NO_MORE_RESULTS') {
				query = null
			} else {
				query = metadata.endCursor
			}
		} while (query != null)
	}
	process.exit(0)
}

await spinner('Importing cities', async () => {
	try {
		const cities = fs.createReadStream(path.join(__dirname, 'data', 'cities.csv')).pipe(parse({delimiter: ',', columns: true}));
		let totalCities = 0
		for await (const city of cities) {
			const key = datastore.key([KINDS.city, city.slug])
			await datastore.save({ key, data: city })
			totalCities++
		}
		console.log(`Saved ${totalCities} cities`)
	} catch (error) {
		console.error(`${path.join(__dirname, '/cities.csv')} not found`)
	}
})

await spinner('Importing notices', async () => {
	try {
		const notices = fs.createReadStream(path.join(__dirname, 'data', 'notices.csv')).pipe(parse({delimiter: ',', columns: true}));
		let totalNotices = 0;
		for await (const {created_at, ...notice} of notices) {
			const key = datastore.key([KINDS.city, notice.city, KINDS.notice, notice.date])
			notice.created_at = new Date(created_at).toISOString()
			await datastore.save({ key, data: notice })
			totalNotices++
		}
		console.log(`Saved ${totalNotices} notices`)
	} catch (error) {
		console.error('./data/notices.json not found')
	}
})

await spinner('Importing profiles', async () => {
	try {
		const profiles = fs.createReadStream(path.join(__dirname, 'data', 'profiles.csv')).pipe(parse({delimiter: ',', columns: true}));
		let totalProfiles = 0;
		for await (const { id, ...profile } of profiles) {
			idToFourSfeirId.set(id, emailToFoursfeirId(profile.email))
			const key = datastore.key([KINDS.profile, emailToFoursfeirId(profile.email)])
			await datastore.save({ key, data: profile })
			totalProfiles++
		}
		console.log(`Saved ${totalProfiles} profiles`)
	} catch (error) {
		console.error(`${path.join(__dirname, '/profiles.csv')} not found`)
	}
})

await spinner('Importing admins', async () => {
	try {
		const admins = fs.createReadStream(path.join(__dirname, 'data', 'admins.csv')).pipe(parse({delimiter: ',', columns: true}));
		let totalAdmins = 0;
		for await (const { user_id, city_slug } of admins) {
			if(!idToFourSfeirId.get(user_id)) {
				if(!idToFourSfeirId.get(user_id)) {
					console.log(`user_id ${user_id} missing`)
				}
				continue;
			}
			const key = datastore.key([KINDS.city, city_slug, KINDS.admin])
			await datastore.save({ key, data: { id: idToFourSfeirId.get(user_id), city: city_slug} })
			totalAdmins++
		}
		console.log(`Saved ${totalAdmins} profiles`)
	} catch (error) {
		console.log('./data/admins.json not found')
	}
})

await spinner('Importing bookings', async () => {
	try {
		let totalBookings = 0
		const bookings = fs.createReadStream(path.join(__dirname, 'data', 'bookings.csv')).pipe(parse({delimiter: ',', columns: true}));
		for await (const { user_id, booked_by, date, created_at, ...booking } of bookings) {
			if(!idToFourSfeirId.get(user_id) || (booked_by && !idToFourSfeirId.get(booked_by))) {
				if(!idToFourSfeirId.get(user_id)) {
					console.log(`user_id ${user_id} missing`)
				}

				if(!idToFourSfeirId.get(booked_by)) {
					console.log(`booked_by ${booked_by} missing`)
				}
				continue;
			}
			booking.user_id = idToFourSfeirId.get(user_id);
			booking.booked_by = idToFourSfeirId.get(booked_by) ?? null;
			booking.date = Temporal.PlainDate.from(date).toJSON()
			booking.created_at = new Date(created_at).toISOString()

			const key = datastore.key([KINDS.city, booking.city, KINDS.date, booking.date, KINDS.booking])

			await datastore.save({ key, data: booking })
			totalBookings++;
		}
		console.log(`imported ${totalBookings} bookings`)
	} catch (error) {
		console.error(`${path.join(__dirname, '/bookings.csv')} not found`)
	}
})