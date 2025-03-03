import { json, MetaFunction, type LoaderFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { Temporal } from "temporal-polyfill";
import { getUserFromRequest } from "~/services/auth.server";
import { getBookingsForUser } from "~/services/db/bookings.server";
import { getCities } from "~/services/db/cities.server";

export const meta: MetaFunction = () => [
	{ title: "FourSFEIR | Mes réservations" }
]

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const user = await getUserFromRequest(request);
	const url = new URL(request.url);
	const monthParam = url.searchParams.get("month");

	let month: Temporal.PlainYearMonth;
	if (monthParam) {
		month = Temporal.PlainYearMonth.from(monthParam);
	} else {
		month = Temporal.Now.plainDateISO().toPlainYearMonth();
	}

	const cities = await getCities();
	const bookings = await getBookingsForUser(user.id, month);

	return json({ bookings, cities, date: month.toString() });
};

export default function MeRoute() {
	const { bookings, cities, date: month } = useLoaderData<typeof loader>();
	const currentMonth = Temporal.PlainYearMonth.from(month);
	const prevMonth = currentMonth.subtract({ months: 1 });
	const nextMonth = currentMonth.add({ months: 1 });

	const dates = Array.from({ length: currentMonth.daysInMonth }, (_, i) => {
		const date = currentMonth.toPlainDate({ day: i + 1 });
		// Skip weekends
		if (date.dayOfWeek > 5) return null;
		return date;
	}).filter((date): date is Temporal.PlainDate => date !== null);

	return (
		<main className="container">
			<h2>Mes réservations</h2>

			<h3>{currentMonth.toLocaleString('fr', { calendar: "iso8601", month: 'long', year: 'numeric' })}</h3>

			{bookings.length === 0 ? (
				<p>Aucune réservation ce mois-ci</p>
			) : (
				<table className="calendar--compact">
					<thead>
						<tr>
							<th>Lieu</th>
							{dates.map(date => (
								<th key={date.toString()}>
									{date.toLocaleString('fr', { weekday: 'narrow', day: 'numeric' })}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{cities.map(city => (
							<tr key={city.slug}>
								<td>{city.label}</td>
								{dates.map(date => {
									const booking = bookings.find(b =>
										b.city === city.slug &&
										b.date === date.toString()
									);
									return (
										<td key={date.toString()}>
											{booking ? '✓' : ''}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			)}

			<Form>
				<div className="grid">
					<button
						name="month"
						value={prevMonth.toString()}
						className="outline"
					>
						← {prevMonth.toLocaleString('fr', { calendar: "iso8601", month: 'long', year: 'numeric' })}
					</button>
					<button
						name="month"
						value={nextMonth.toString()}
						className="outline"
					>
						{nextMonth.toLocaleString('fr', { calendar: "iso8601", month: 'long', year: 'numeric' })} →
					</button>
				</div>
			</Form>
		</main>
	);
}
