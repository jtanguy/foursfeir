#!/usr/bin/env zx
import fs from 'node:fs';
import path from 'node:path'
import { NIL, v5 } from "uuid"
import "temporal-polyfill"
import { date, z } from "zod";

import { parse } from 'csv-parse';
import { Datastore } from '@google-cloud/datastore'
import { createEnv } from '@t3-oss/env-core';
import { fakerFR as faker } from '@faker-js/faker';
import { Temporal } from 'temporal-polyfill';

export function emailToFoursfeirId(email) {
	const foursfeir_ns = v5('foursfeir', NIL)
	return v5(email, foursfeir_ns)
}

const env = createEnv({
	server: {
		NAMESPACE: z.string(),
		EMAIL_DOMAIN: z.string(),
		USER_EMAIL: z.string().email(),
		seed: z.coerce.number().default(42),
	},
	runtimeEnv: process.env
})

const argSchema = z.object({
	reset: z.boolean().default(false),
	"dry-run": z.boolean().optional(),
	// data volume
	cities: z.number().default(0),
	notices: z.number().default(2),
	profiles: z.number().default(0),
	"bookings-weeks": z.number().default(2),
	"bookings-fill": z.number().min(0).max(100).default(50),
})

const args = argSchema.parse(argv)

const datastore = new Datastore({
	projectId: "nte-foursfeir",
	namespace: env.NAMESPACE,
})

const __dirname = new URL('.', import.meta.url).pathname;

const KINDS = {
	city: "City",
	notice: "Notice",
	admin: "Admin",
	profile: "Profile",
	date: "Date",
	booking: "Booking"
}

if (args.reset) {
	console.log("Cleaning up the database")
	for (const k of Object.keys(KINDS)) {
		let query = datastore.createQuery(KINDS[k]).select('__key__')
		do {
			const [objects, metadata] = await datastore.runQuery(query)
			if (!Array.isArray(objects) || objects.length == 0) break;
			if (args['dry-run']) {
				console.log(`Would delete ${objects.length} objects of type ${k}`)
			} else {
				await datastore.delete(objects.map(o => o[datastore.KEY]))
				console.log(`Deleted ${objects.length} objects of type ${k}`)
			}
			if (metadata.moreResults === 'NO_MORE_RESULTS') {
				query = null
			} else {
				query = metadata.endCursor
			}
		} while (query != null)
	}
	process.exit(0)
}

if (args['dry-run']) {
	console.log("Running in dry-run mode")
}

let cities = []

if (args.cities > 0) {
	console.log(`Seeding ${args.cities} cities`)
	faker.seed(env.seed)
	for await (const _i of Array(argv.cities)) {
		const label = faker.location.city()
		const slug = faker.helpers.slugify(label).toLowerCase()
		const capacity = faker.number.int({ min: 10, max: 20 })
		const max_capacity = capacity + faker.number.int({ min: 0, max: 10 })

		const city = {
			label, slug, capacity, max_capacity, created_at: Temporal.Now.instant().toString()
		}
		cities.push(city)
		if (!args['dry-run']) {
			const key = datastore.key([KINDS.city, city.slug])
			await datastore.save({ key, data: city })
		} else {
			console.log(city)
		}
	}
}

let notices = []

if (args.notices > 0) {
	console.log("Seeding notices")
	faker.seed(env.seed)
	for await (const city of cities) {
		for await (const _i of Array(args.notices)) {
			const whenish = Temporal.PlainDate.from(faker.date.soon({ days: 30 }).toISOString().substring(0, 10))
			const when = whenish.dayOfWeek > 5 ? whenish.add({ days: 2 }) : whenish;
			const notice = {
				city: city.slug,
				date: when.toString(),
				message: `Journée ${faker.company.buzzAdjective()}`,
				temp_capacity: faker.datatype.boolean(0.8) ? faker.number.int({ min: 0, max: city.max_capacity }) : undefined,
				created_at: Temporal.Now.instant().toString()
			}
			notices.push(notice)
			if (!args['dry-run']) {
				const key = datastore.key([KINDS.city, notice.city, KINDS.notice, notice.date])
				await datastore.save({ key, data: notice })
			} else {
				console.log(notice)
			}
		}
	}
}


const root = {
	id: emailToFoursfeirId(env.USER_EMAIL),
	email: env.USER_EMAIL,
	full_name: "Root user",
};
if (!args['dry-run']) {
	const key = datastore.key([KINDS.profile, root.id])
	await datastore.save({ key, data: root })
}

let profiles = [root]
if (args.profiles > 0) {
	console.log("Seeding profiles")
	faker.seed(env.seed)
	for await (const _i of Array(args.profiles)) {
		const firstName = faker.person.firstName()
		const lastName = faker.person.lastName()
		const email = faker.internet.email({ firstName, lastName, provider: env.EMAIL_DOMAIN })
		const profile = {
			id: emailToFoursfeirId(email),
			email: email,
			full_name: faker.person.fullName({ firstName, lastName }),
			avatar_url: faker.image.personPortrait()
		}
		profiles.push(profile)
		if (!args['dry-run']) {
			const key = datastore.key([KINDS.profile, profile.id])
			await datastore.save({ key, data: profile })
		} else {
			console.log(profile)
		}
	}
}

console.log("Setting user as global admin")
if (!args['dry-run']) {
	const key = datastore.key([KINDS.admin])
	await datastore.save({ key, data: { id: emailToFoursfeirId(env.USER_EMAIL) } })
}

if (args['bookings-weeks'] > 0) {
	console.log("Seeding bookings")
	faker.seed(env.seed)
	for await (const city of cities) {
		const now = Temporal.Now.plainDateISO()
		const startOfNextWeek = now.add({ days: 8 - now.dayOfWeek })
		for await (const w of faker.helpers.multiple((_, i) => i)) {
			for (const d of [0, 1, 2, 3, 4]) {
				const day = startOfNextWeek.add({ weeks: w, days: d })
				const reducedCapacity = notices.find((n) => n.city === city.slug && n.date === day.toString())?.temp_capacity
				const capacity = reducedCapacity ?? city.max_capacity
				const nbToCreate = Math.floor(capacity * args['bookings-fill'] / 100)

				const newBookings = faker.helpers.arrayElements(profiles, nbToCreate).map(p => ({
					city: city.slug,
					date: day.toString(),
					user_id: p.id,
					created_at: faker.date.recent({ days: 10, refDate: day.toString() }).toISOString(),
					period: faker.helpers.weightedArrayElement([{ weight: 20, value: "day" }, { weight: 4, value: "afternoon" }, { weight: 6, value: "morning" }]),
					booked_by: null,
					guests: {}
				}))
				console.log(`Generating ${newBookings.length}/${nbToCreate} bookings for ${city.slug} on ${day.toString()}`)


				if (!args['dry-run']) {
					await Promise.all(newBookings.map((booking) => {
						const key = datastore.key([KINDS.city, booking.city, KINDS.date, booking.date, KINDS.booking])
						return datastore.save({ key, data: booking })
					}))
				}

			}

		}
	}
}

process.exit(0)


