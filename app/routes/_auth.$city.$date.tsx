import { ChangeEvent, Fragment, useState } from "react";
import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useFetcher,
  useLoaderData,
  useNavigation,
  useParams,
  useSearchParams,
} from "@remix-run/react";
import { RouteMatch } from "react-router";
import cx from "classnames";
import { zfd } from "zod-form-data";
import { z } from "zod";

import { FiUserMinus } from "react-icons/fi";
import Avatar from "~/components/Avatar";

import daily from "~/styles/daily.css?url";
import { getUserFromRequest } from "~/services/auth.server";
import {
  cityService,
  bookingService,
  profileService,
  adminService,
} from "~/services/application/services.server";
import {
  Period,
  isOverflowBooking,
  periods,
  groupBookings,
  indexBookings,
  getOccupancy,
} from "~/services/domain/booking.interface";
import invariant from "~/services/validation.utils.server";
import { emailToFoursfeirId } from "~/services/domain/profile.interface";
import { Temporal } from "temporal-polyfill";
import ProfileSearch from "~/components/ProfileSearch";
import type { Profile } from "~/services/domain/profile.interface";
import { Collator } from "~/services/collator.utils";



export const meta: MetaFunction<typeof loader> = ({ data, params }) => [
  { title: `FourSFEIR | ${data?.city.label} | ${params.date}` },
];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  invariant(params.city, "No city given");
  invariant(params.date, "No date given");
  const date = Temporal.PlainDate.from(params.date);

  // Validate date format
  z.string().date().parse(params.date);

  const user = await getUserFromRequest(request);

  const [city, notice, rawBookings, admin] = await Promise.all([
    cityService.getCity(params.city),
    cityService.getNotice(params.city, date),
    bookingService.getBookings(params.city, date),
    adminService.isUserAdmin(user.user_id, params.city),
  ]);

  const bookings = indexBookings(rawBookings);

  const profiles = await Promise.all(
    bookings.map((b) => profileService.loader.load(b.user_id))
  );
  const occupancy = getOccupancy(bookings);
  const grouped = groupBookings(bookings);

  return json({
    city: city,
    notice: notice?.message,
    tempCapacity: notice?.temp_capacity,
    bookings: grouped,
    selfBooking: bookings.find((b) => b.user_id === user.user_id),
    occupancy,
    profiles: profiles.filter((p: Profile | null): p is Profile => p != null),
    user,
    admin,
  });
};

const schema = zfd.formData(
  z.discriminatedUnion("_action", [
    z.object({
      _action: z.literal("book"),
      period: zfd.text(z.enum(["day", "morning", "afternoon"])),
      for_user: z.object({
        id: zfd.text(z.string().uuid()).optional(),
        email: zfd.text(z.string().email()),
        full_name: zfd.text(z.string().min(2).max(100)),
      }),
    }),
    z.object({
      _action: z.literal("invite"),
      period: zfd.text(z.enum(["day", "morning", "afternoon"])),
      guests: z
        .object({
          day: zfd.numeric(z.number().int().min(0).max(10)).optional(),
          morning: zfd.numeric(z.number().int().min(0).max(10)).optional(),
          afternoon: zfd.numeric(z.number().int().min(0).max(10)).optional(),
        })
        .optional(),
    }),
    z.object({
      _action: z.literal("remove"),
      user_id: zfd.text(z.string().uuid()),
    }),
  ]),
);

export const action = async ({ request, params }: ActionFunctionArgs) => {
  invariant(params.city, "No city given");
  invariant(params.date, "No date given");
  const user = await getUserFromRequest(request);
  const date = Temporal.PlainDate.from(params.date);
  const f = schema.parse(await request.formData());

  if (f._action === "book") {
    if (f.for_user) {
      const otherId = f.for_user.id ?? emailToFoursfeirId(f.for_user.email);
      const other = await profileService.getProfileById(otherId);

      if (other == null) {
        await profileService.createProfile({
          user_id: otherId,
          email: f.for_user.email,
          full_name: f.for_user.full_name,
        });
      }

      await bookingService.upsertBooking({
        city: params.city,
        date: date,
        user_id: otherId,
        period: f.period,
        booked_by: emailToFoursfeirId(user.email),
        guests: {},
        created_at: Temporal.Now.instant(),
      });
    }

    return new Response(null, { status: 201 });
  }

  if (f._action === "invite") {
    const other = await profileService.getProfileById(user.user_id);

    if (!other) {
      await profileService.createProfile({
        user_id: emailToFoursfeirId(user.email),
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
      });
    }

    await bookingService.upsertBooking({
      city: params.city,
      date: Temporal.PlainDate.from(params.date),
      user_id: emailToFoursfeirId(user.email),
      period: f.period,
      booked_by: null,
      guests: f.guests ?? {},
      created_at: Temporal.Now.instant(),
    });
    return new Response(null, { status: 202 });
  }

  const admin = await adminService.isUserAdmin(user.user_id, params.city!);
  if (admin && f._action === "remove") {
    await bookingService.deleteBooking({ city: params.city, user_id: f.user_id, date: Temporal.PlainDate.from(params.date) });
    return new Response(null, { status: 202 });
  }
};

export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: daily,
  },
];

export default function Current() {
  const { date: dateStr } = useParams();
  const {
    bookings,
    selfBooking,
    city,
    occupancy,
    notice,
    tempCapacity,
    profiles,
    admin,
  } = useLoaderData<typeof loader>();
  const { capacity, max_capacity: maxCapacity } = city;
  const navigation = useNavigation();
  const deleteFetcher = useFetcher();
  const [searchParams, setSearchParams] = useSearchParams();

  const sortSchema = z.enum(["created_at", "period"]).nullable();
  const sort = sortSchema.safeParse(searchParams.get("sort")).data ?? "period";

  const day = Temporal.PlainDate.from(dateStr!);
  const today = Temporal.Now.plainDateISO();
  const isFuture = Temporal.PlainDate.compare(day, today) >= 0;

  const actualMaxCapacity = tempCapacity ?? maxCapacity;

  const isFull = occupancy >= actualMaxCapacity;

  const [showNameInput, setShowNameInput] = useState(false);
  const [selfPeriod, setSelfPeriod] = useState(selfBooking?.period ?? "day");

  const formatter = new Intl.ListFormat("fr-FR");

  const handleSelfPeriodChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelfPeriod(event.target.value as Period);
  };

  const handleColleagueEmailChange = (
    profileOrEmail: Profile | { email: string } | null,
  ) => {
    if (profileOrEmail == null || "user_id" in profileOrEmail) {
      setShowNameInput(false);
    } else {
      setShowNameInput(true);
    }
  };

  return (
    <>
      <h2>
        {day.toLocaleString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </h2>

      {notice && (
        <h3>
          Note: {notice}.{" "}
          {tempCapacity != null && <>Capacité réduite à {actualMaxCapacity}</>}
        </h3>
      )}

      <p>
        {occupancy}/{Math.min(capacity, actualMaxCapacity)} inscrits.{" "}
        {occupancy > capacity && (
          <>Attention: débordement dans les autres salles à prévoir</>
        )}
      </p>
      <div className="grid">
        <div className="calendar-people">
          {sort === "period" ? (
            // Tri par période
            (["morning", "day", "afternoon"] as Period[]).map((period) => {
              const periodBookings = bookings[period];
              if (periodBookings.length === 0) return null;

              return (
                <Fragment key={period}>
                  <h3>{periods[period]}</h3>
                  <ul className="calendar-people__list">
                    {periodBookings
                      .sort(
                        Collator.byKey("created_at", Collator.string)
                      )
                      .map((booking) => {
                        const profile = profiles.find(
                          (p) => p.user_id === booking.user_id,
                        )!;
                        const isDeleteSubmitting =
                          deleteFetcher.state !== "idle" &&
                          deleteFetcher.formData?.get("user_id") == profile.user_id;
                        const isOverflow = isOverflowBooking(booking as any, capacity);
                        const guestsString = formatter.format(
                          Object.entries(booking.guests)
                            .filter((p): p is [string, number] => typeof p[1] === "number" && p[1] > 0)
                            .map((p: [string, number]) => `${p[1]} ${periods[p[0] as Period]}`),
                        );

                        return (
                          <li key={profile.user_id} aria-busy={isDeleteSubmitting}>
                            <Avatar
                              className={cx("avatar", {
                                "avatar--overflow": isOverflow,
                                "avatar--partial": booking.period != "day",
                              })}
                              profile={profile}
                            />
                            <span>{profile.full_name ?? profile.email}</span>
                            {guestsString && ` (+${guestsString})`}
                            {isOverflow && ` (Surnuméraire)`}
                            {admin && isFuture && (
                              <span>
                                {" "}
                                <deleteFetcher.Form
                                  method="post"
                                  className="inline-form"
                                >
                                  <input
                                    type="hidden"
                                    name="user_id"
                                    value={profile.user_id}
                                  />

                                  <button
                                    className="inline-button icon"
                                    name="_action"
                                    value="remove"
                                  >
                                    <FiUserMinus
                                      title="Désinscrire"
                                      aria-label="Désinscrire"
                                    />
                                  </button>
                                </deleteFetcher.Form>
                              </span>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                </Fragment>
              );
            })
          ) : (
            // Tri par date d'inscription
            <>
              <h3>Inscrits</h3>
              <ul className="calendar-people__list">
                {Object.values(bookings)
                  .flat()
                  .sort(
                    Collator.byKey("created_at", Collator.string)
                  )
                  .map((booking) => {
                    const profile = profiles.find(
                      (p) => p.user_id === booking.user_id,
                    )!;
                    const isDeleteSubmitting =
                      deleteFetcher.state !== "idle" &&
                      deleteFetcher.formData?.get("user_id") == profile.user_id;
                    const isOverflow = isOverflowBooking(booking as any, capacity);
                    const guestsString = formatter.format(
                      Object.entries(booking.guests)
                        .filter((p): p is [string, number] => typeof p[1] === "number" && p[1] > 0)
                        .map((p: [string, number]) => `${p[1]} ${periods[p[0] as Period]}`),
                    );
                    return (
                      <li key={profile.user_id} aria-busy={isDeleteSubmitting}>
                        <Avatar
                          className={cx("avatar", {
                            "avatar--overflow": isOverflow,
                            "avatar--partial": booking.period != "day",
                          })}
                          profile={profile}
                        />
                        <span>
                          {profile.full_name ?? profile.email} (
                          {periods[booking.period]})
                        </span>
                        {guestsString && ` (+${guestsString})`}
                        {isOverflow && ` (Surnuméraire)`}
                        {admin && isFuture && (
                          <span>
                            {" "}
                            <deleteFetcher.Form
                              method="post"
                              className="inline-form"
                            >
                              <input
                                type="hidden"
                                name="user_id"
                                value={profile.user_id}
                              />

                              <button
                                className="inline-button icon"
                                name="_action"
                                value="remove"
                              >
                                <FiUserMinus
                                  title="Désinscrire"
                                  aria-label="Désinscrire"
                                />
                              </button>
                            </deleteFetcher.Form>
                          </span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </>
          )}
        </div>
        <div>
          <label htmlFor="sort-select">Trier par :</label>
          <Form className="inline">
            <select
              id="sort-select"
              name="sort"
              onChange={(e) => {
                setSearchParams({ sort: e.target.value });
              }}
              defaultValue={sort ?? "period"}
            >
              <option value="period">Période</option>
              <option value="created_at">Ordre d&apos;inscription</option>
            </select>
          </Form>
        </div>
      </div>

      {isFuture && (
        <div className="grid">
          <Form method="post">
            <input type="hidden" name="_action" value="invite" />
            <fieldset className="guest-form">
              <legend>Je m&apos;inscris</legend>
              <fieldset role="group">
                <legend>Mon inscription</legend>
                <label>
                  <input
                    type="radio"
                    name="period"
                    value="day"
                    checked={selfPeriod === "day"}
                    onChange={handleSelfPeriodChange}
                  />
                  Journée
                </label>
                <label>
                  <input
                    type="radio"
                    name="period"
                    value="morning"
                    checked={selfPeriod === "morning"}
                    onChange={handleSelfPeriodChange}
                  />
                  Matin
                </label>
                <label>
                  <input
                    type="radio"
                    name="period"
                    value="afternoon"
                    checked={selfPeriod === "afternoon"}
                    onChange={handleSelfPeriodChange}
                  />
                  Après-midi
                </label>
              </fieldset>

              <details>
                <summary>J'ai des invités/invitées avec moi</summary>
                <fieldset role="group">
                  <legend>Invités/invitées</legend>
                  <label>
                    Journée
                    <input
                      type="number"
                      name="guests.day"
                      min="0"
                      max={capacity - occupancy}
                      defaultValue={selfBooking?.guests?.day ?? 0}
                      disabled={selfPeriod !== "day"}
                    />
                  </label>
                  <label>
                    Matin
                    <input
                      type="number"
                      name="guests.morning"
                      min="0"
                      max={capacity - occupancy}
                      defaultValue={selfBooking?.guests?.morning ?? 0}
                      disabled={selfPeriod === "afternoon"}
                    />
                  </label>
                  <label>
                    Après-midi
                    <input
                      type="number"
                      name="guests.afternoon"
                      min="0"
                      max={capacity - occupancy}
                      defaultValue={selfBooking?.guests?.afternoon ?? 0}
                      disabled={selfPeriod === "morning"}
                    />
                  </label>
                </fieldset>
              </details>

              <button
                type="submit"
                disabled={isFull}
                aria-busy={navigation.state === "submitting"}
              >
                M'inscrire
              </button>
            </fieldset>
          </Form>
          <Form method="post">
            <input type="hidden" name="_action" value="book" />
            <fieldset className="colleague-form">
              <legend>J&apos;inscris un/une autre Sferian à sa place</legend>
              <label htmlFor="colleague-email">
                Email
                <ProfileSearch
                  name="for_user"
                  onChange={handleColleagueEmailChange}
                />
              </label>
              {showNameInput && (
                <div>
                  <label htmlFor="colleague-name">Nom</label>
                  <input
                    id="colleague-name"
                    type="text"
                    name="for_user[full_name]"
                  />
                </div>
              )}
              <fieldset role="group">
                <legend>Période</legend>
                <label>
                  <input
                    type="radio"
                    name="period"
                    value="day"
                    defaultChecked
                  />
                  Journée
                </label>
                <label>
                  <input type="radio" name="period" value="morning" />
                  Matin
                </label>
                <label>
                  <input type="radio" name="period" value="afternoon" />
                  Après-midi
                </label>
              </fieldset>

              <button
                type="submit"
                disabled={isFull}
                aria-busy={navigation.state === "submitting"}
              >
                Inscrire
              </button>
            </fieldset>
          </Form>
        </div>
      )}
    </>
  );
}

export const handle = {
  breadcrumb: (match: RouteMatch) => <>{match.params.date}</>,
};
