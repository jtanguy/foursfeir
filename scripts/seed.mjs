#!/usr/bin/env zx
import { Datastore } from '@google-cloud/datastore'

const datastore = new Datastore({
	projectId: "nte-foursfeir",
})

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
	const cities = await fs.readJSON(path.join(__dirname, './data/cities.json'))
	for await (const city of cities) {
		const key = datastore.key([KINDS.city, city.slug])
		await datastore.save({ key, data: city })
	}
	console.log(`Saved ${cities.length} cities`)
})

await spinner('Importing notices', async () => {
	const notices = await fs.readJSON(path.join(__dirname, './data/notices.json'))
	for await (const notice of notices) {
		const key = datastore.key([KINDS.city, notice.city, KINDS.notice, notice.date])
		await datastore.save({ key, data: notice })
	}
	console.log(`Saved ${notices.length} notices`)
})

await spinner('Importing profiles', async () => {
	const profiles = await fs.readJSON(path.join(__dirname, './data/profiles.json'))
	for await (const profile of profiles) {
		const key = datastore.key([KINDS.profile, profile.id])
		await datastore.save({ key, data: profile })
	}
	console.log(`Saved ${profiles.length} profiles`)
})

await spinner('Importing admins', async () => {
	const admins = await fs.readJSON(path.join(__dirname, './data/admins.json'))
	for await (const admin of admins) {
		const key = datastore.key([KINDS.city, admin.city, KINDS.admin])
		await datastore.save({ key, data: admin })
	}
	console.log(`Saved ${admins.length} admins`)
})

await spinner('Importing bookings', async () => {
	const bookings = await fs.readJSON(path.join(__dirname, './data/bookings.json'))
	for await (const booking of bookings) {
		const key = datastore.key([KINDS.city, booking.city, KINDS.date, booking.date, KINDS.booking])
		await datastore.save({ key, data: booking })
	}
	console.log(`Saved ${bookings.length} bookings`)
})