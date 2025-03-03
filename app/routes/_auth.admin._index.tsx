import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData } from "@remix-run/react";
import cx from "classnames"
import { env } from "config";
import { useState } from "react";
import { FaCog, FaUserMinus } from "react-icons/fa";
import { LuExternalLink } from "react-icons/lu";
import { z } from "zod";
import { zfd } from "zod-form-data";
import Avatar from "~/components/Avatar";
import { DeleteCityConfirm } from "~/components/DeleteCityConfirm";
import ProfileSearch from "~/components/ProfileSearch";
import { UpdateAdmin } from "~/components/UpdateAdmin";
import { getUserFromRequest } from "~/services/auth.server";
import { Collator } from "~/services/collator.utils";
import { AdminInfo, createAdmin, deleteAdmin, getAdminTnfo, getAllAdmins, isUserSuperAdmin, updateAdmin } from "~/services/db/admins.server";
import { createCity, deleteCity, getCities } from "~/services/db/cities.server";
import { profileLoader } from "~/services/db/profiles.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const user = await getUserFromRequest(request)

	const adminInfo = await getAdminTnfo(user.id)
	const admins = await getAllAdmins()
	const cities = await getCities()

	const adminsWithProfile = await Promise.all(admins.map(async info => {
		const profile = await profileLoader.load(info.user_id)
		return { ...info, profile }
	}
	))
	const sortedAdmins = adminsWithProfile.toSorted(Collator.lexi([
		Collator.admin,
		Collator.byKey("profile", Collator.wrapMaybe(Collator.email))
	]))

	if (adminInfo == null) {
		throw redirect("/")
	}

	return json({ adminInfo, cities, admins: sortedAdmins })
}

const schema = zfd.formData(
	z.discriminatedUnion("_action", [
		z.object({
			_action: z.literal("create"),
			label: zfd.text(z.string().min(1).max(100)),
			slug: zfd.text(z.string()
				.min(2)
				.max(50)
				.regex(/^[a-z0-9-]+$/, { message: "Le slug ne peut contenir que des minuscules, des chiffres et des tirets" })
				.refine(slug => !["admin", "me", "profiles", "login", "logout", "auth"].includes(slug), {
					message: "Ce slug est réservé",
					path: ["slug"]
				})),
			capacity: zfd.numeric(z.number().int().min(0)),
			max_capacity: zfd.numeric(z.number().int().min(0)),
		}),
		z.object({
			_action: z.literal("delete"),
			slug: zfd.text(z.string().min(2).max(50))
		}),
		z.object({
			_action: z.literal("promote"),
			user_id: zfd.text(z.string().uuid()),
			global: zfd.checkbox(),
			local: zfd.repeatableOfType(zfd.text(z.string().min(2).max(50)))
		}),
		z.object({
			_action: z.literal("demote"),
			user_id: zfd.text(z.string().uuid())
		}),
		z.object({
			_action: z.literal("manage"),
			user_id: zfd.text(z.string().uuid()),
			global: zfd.checkbox(),
			local: zfd.repeatableOfType(zfd.text(z.string().min(2).max(50)))
		})
	])
).refine((data) => data._action !== "create" || data.capacity <= data.max_capacity, {
	message: "La capacité max doit être supérieure à la capacité",
	path: ["capacity"]
})
	.refine(data => data._action !== "promote" || (data.global == false || data.local.length === 0), {
		message: "Vous devez sélectionner au moins un lieu ou global",
		path: ["global"]
	})
	.refine(data => data._action !== "manage" || (data.global == false || data.local.length === 0), {
		message: "Vous devez sélectionner au moins un lieu ou global",
		path: ["global"]
	});

export const action = async ({ request }: ActionFunctionArgs) => {
	const user = await getUserFromRequest(request)

	const isAdmin = await isUserSuperAdmin(user.id)
	if (!isAdmin) throw new Response("Forbidden", { status: 403 })

	const f = schema.parse(await request.formData())

	if (f._action === "create") {
		const { _action, ...data } = f
		await createCity(data)
		return new Response(null, { status: 201 });
	}
	if (f._action === "delete") {
		await deleteCity(f.slug)
		return new Response(null, { status: 202 })
	}
	if (f._action === "promote") {
		const allCities = await getCities()
		const newInfo: AdminInfo = f.global ?
			{ type: "global", user_id: f.user_id }
			:
			{
				type: "local", user_id: f.user_id, cities: allCities.filter(c => f.local.includes(c.slug))
			}
		await createAdmin(newInfo)
		return new Response(null, { status: 201 });
	}
	if (f._action === "demote") {
		await deleteAdmin(f.user_id)
		return new Response(null, { status: 202 })
	}
	if (f._action === "manage") {
		const allCities = await getCities()
		const newInfo: AdminInfo = f.global ?
			{ type: "global", user_id: f.user_id }
			:
			{
				type: "local", user_id: f.user_id, cities: allCities.filter(c => f.local.includes(c.slug))
			}
		await updateAdmin(newInfo)
		return new Response(null, { status: 201 });
	}
}



export default function AdminIndex() {
	const { adminInfo, cities, admins } = useLoaderData<typeof loader>()

	const isSuperAdmin = adminInfo.type === "global"
	const administeredCities = isSuperAdmin ? cities : adminInfo.cities

	const [globalAdminSelected, setGlobalAdmin] = useState(false)

	return (
		<>
			<div className="grid">
				<div className="overflow-auto">
					<h4>Mes lieux</h4>
					<table className="striped overflow-auto" >
						<thead>
							<tr>
								<th scope="col">Nom</th>
								<th scope="col">Capacité</th>
								<th scope="col">Capacité max</th>
								<th scope="col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{administeredCities.map((city) => {
								return (
									<tr key={city.slug}>
										<td><Link to={`/admin/${city.slug}`}>{city.label}</Link></td>
										<td>{city.capacity}</td>
										<td>{city.max_capacity}</td>
										<td>
											<Link className="secondary" to={`/${city.slug}`}><LuExternalLink title="Visiter" /></Link>
											<DeleteCityConfirm city={city} />
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
				<div>
					<h4>Administrateurs FourSFEIR</h4>
					<table className="striped overflow-auto" >
						<thead>
							<tr>
								<th scope="col">Nom</th>
								<th scope="col">Type</th>
								<th scope="col">Actions</th>
							</tr>
						</thead>
						<tbody>
							{admins.map(info => (
								<tr
									key={info.user_id}
								>
									<td>
										{info.profile && <Avatar
											className={cx({
												"avatar--globaladmin": info.type === "global",
											})}
											profile={info.profile}
										/>}
										{" "}
										{info.profile?.full_name}
									</td>
									<td>
										{info.type === "global" && "Global"}
										{info.type === "local" && `${info.cities.map(c => c.label)}`}
									</td>
									<td>
										{info.user_id !== adminInfo.user_id && <div className="grid">
											{info.profile && <UpdateAdmin profile={info.profile} info={info} cities={cities} />}
											<Form method="post" className="admin-form">
												<input type="hidden" name="user_id" value={info.user_id} />
												<button
													className="inline-button icon danger"
													name="_action"
													value="demote"
												>
													<FaUserMinus title="Retirer des admins" />
												</button>
											</Form>
										</div>}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
			{isSuperAdmin && <div>
				<h4>Actions</h4>
				<div className="grid">
					<details>
						<summary role="button">Créer un lieu</summary>
						<Form method="post">
							<label>
								Nom
								<input type="text" name="label" />
							</label>
							<label>
								URL slug
								<input type="text" name="slug" />
							</label>
							<div className="grid">
								<label>
									Capacité normale
									<input type="number" min="0" name="capacity" />
								</label>
								<label>
									Capacité max
									<input type="number" min="0" name="max_capacity" />
								</label>
							</div>

							<button
								name="_action"
								value="create"
							>
								Créer
							</button>
						</Form>
					</details>
					<details>
						<summary role="button">Ajouter des admins</summary>
						<Form method="post">
							<label>
								Utilisateur•ice
								<ProfileSearch name="user_id" />
							</label>
							<div className="grid">
								<label>
									<input type="checkbox" role="switch" name="global" onChange={(e) => setGlobalAdmin(e.currentTarget.checked)} />
									{" "}
									Global admin
								</label>
								<fieldset disabled={globalAdminSelected}>
									<legend>Local admin</legend>
									<ul>
										{cities.map((city) =>
											<li key={city.slug}>
												<label>
													<input type="checkbox" name="local" value={city.slug} />
													{city.label}
												</label>
											</li>
										)}
									</ul>
								</fieldset>
							</div>

							<button
								name="_action"
								value="promote"
							>
								Ajouter
							</button>
						</Form>
					</details>
				</div>

			</div>
			}
		</>
	)
}