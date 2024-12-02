import { ChangeEvent, Fragment, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  useFetcher,
  useLoaderData,
  useNavigation,
  useParams,
} from "@remix-run/react";
import { RouteMatch } from "react-router"
import cx from "classnames";
import { zfd } from "zod-form-data";
import { z } from "zod";

import { FiUserMinus } from "react-icons/fi";
import Avatar from "~/components/Avatar";

import daily from "~/styles/daily.css?url";
import { getUserFromRequest } from "~/services/auth.server";
import { findIsAdmin } from "~/services/db/admins.server";
import { getCity, getNoticeFor } from "~/services/db/cities.server";
import { createBooking, deleteBooking, getBookingsFor, getOccupancy, withIndex } from "~/services/db/bookings.server";
import { Period, isOverflowBooking, periods , groupBookings } from "~/services/bookings.utils";
import { getProfiles, isProfile, profileLoader, saveProfile } from "~/services/db/profiles.server";
import invariant from "~/services/validation.utils.server";
import { emailToFoursfeirId } from "~/services/profiles.utils";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  invariant(params.city, "No city given")
  invariant(params.date, "No date given")
  const user = await getUserFromRequest(request)


  const [
    city,
    notice,
    rawBookings,
    admin
  ] = await Promise.all([
    getCity(params.city),
    getNoticeFor(params.city, params.date),
    getBookingsFor(params.city, params.date),
    findIsAdmin(user.id, params.city)
  ]);

  const profiles = await getProfiles()

  const bookings = rawBookings.map(withIndex)
  const occupancy = getOccupancy(bookings);
  const grouped = groupBookings(bookings)

  return json({
    notice: notice?.message,
    capacity: city.capacity,
    tempCapacity: notice?.temp_capacity,
    maxCapacity: city.max_capacity,
    bookings: grouped,
    selfBooking: bookings.find(b => b.user_id === user.id),
    occupancy,
    profiles: profiles.filter(isProfile) ?? [],
    user,
    admin,
  });
};

const schema = zfd.formData(
  z.discriminatedUnion("_action", [
    z.object({
      _action: z.literal("book"),
      period: zfd.text(z.enum(["day", "morning", "afternoon"])),
      for_user: zfd.text(z.string().email()),
      for_user_name: zfd.text().optional(),
    }),
    z.object({
      _action: z.literal("invite"),
      period: zfd.text(z.enum(["day", "morning", "afternoon"])),
      guests: z
        .object({
          day: zfd.numeric().optional(),
          morning: zfd.numeric().optional(),
          afternoon: zfd.numeric().optional(),
        })
        .optional(),
    }),
    z.object({
      _action: z.literal("remove"),
      booking_id: zfd.text(),
    }),
  ])
);

export const action = async ({ request, params }: ActionFunctionArgs) => {
  invariant(params.city, "No city given")
  invariant(params.date, "No date given")
  const user = await getUserFromRequest(request)

  const f = schema.parse(await request.formData());

  if (f._action === "book") {

    if (f.for_user) {
      const otherId = emailToFoursfeirId(f.for_user);
      const other = await profileLoader.load(otherId)

      if (other == null) {
        profileLoader.clear(otherId)
        // Create profile on the fly
        await saveProfile({
          email: f.for_user,
          full_name: f.for_user_name ?? f.for_user,
        })
      }

      const previousBookings = await getBookingsFor(params.city, params.date, otherId)

      if(previousBookings.length > 0) {
        await Promise.all(previousBookings.map(({booking_id, city, date}) => deleteBooking({booking_id, city, date})))
      }

      await createBooking({
        city: params.city,
        date: params.date,
        user_id: otherId,
        period: f.period,
        booked_by: emailToFoursfeirId(user.email),
        guests: {},
        created_at: previousBookings?.[0]?.created_at ?? new Date().toISOString()
      })
    }

    return new Response(null, { status: 201 });
  }

  if (f._action === "invite") {
    const previousBookings = await getBookingsFor(params.city, params.date, user.id)

    if(previousBookings.length > 0) {
      await Promise.all(previousBookings.map(({booking_id, city, date}) => deleteBooking({booking_id, city, date})))
    }

    const other = await profileLoader.load(user.id)

    if(!other) {
      profileLoader.clear(user.id)
      // we could remove this because the profile is created when the user logged
      await saveProfile({
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url
      })
    }

    await createBooking({
      city: params.city,
      date: params.date,
      user_id: emailToFoursfeirId(user.email),
      period: f.period,
      booked_by: null,
      guests: f.guests ?? {},
      created_at: previousBookings?.[0]?.created_at ?? new Date().toISOString()
    })
    return new Response(null, { status: 202 });
  }


  const admin = await findIsAdmin(user!.id, params.city!)
  if (admin && f._action === "remove") {
    await deleteBooking({ booking_id: f.booking_id, city: params.city, date: params.date })
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
  const { bookings, selfBooking, occupancy, capacity, notice, tempCapacity, maxCapacity, profiles, admin } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const deleteFetcher = useFetcher();

  const day = Temporal.PlainDate.from(dateStr!);
  const today = Temporal.Now.plainDateISO()
  const isFuture = Temporal.PlainDate.compare(day, today) >= 0;

  const actualMaxCapacity = tempCapacity ?? maxCapacity

  const isFull = occupancy >= actualMaxCapacity;

  const [showNameInput, setShowNameInput] = useState(false);
  const [selfPeriod, setSelfPeriod] = useState(selfBooking?.period ?? "day");


  const formatter = new Intl.ListFormat("fr-FR");

  const handleSelfPeriodChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelfPeriod(event.target.value as Period);
  };

  const handleColleagueEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const emailStr = event.target.value.trim();
    const isEmailLike = emailStr.includes("@");
    const profileExists =
      profiles.some((p) => p.email.startsWith(emailStr));

    if (isEmailLike && !profileExists) {
      setShowNameInput(true);
    } else {
      setShowNameInput(false);
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
          Note: {notice}. {tempCapacity != null && <>Capacité réduite à {actualMaxCapacity}</>}
        </h3>
      )}

      <p>
        {occupancy}/{Math.min(capacity, actualMaxCapacity)} inscrits.{" "}
        {occupancy > capacity && (
          <>Attention: débordement dans les autres salles à prévoir</>
        )}
      </p>

      <div className="calendar-people">
        {(['morning', 'day', 'afternoon'] as Period[]).map((period) => {
          const periodBookings = bookings[period];
          if (periodBookings.length > 0) {
            return (
              <Fragment key={period}>
                <h3>{periods[period]}</h3>
                <ul className="calendar-people__list" key={period}>
                  {periodBookings.map((booking) => {
                    const profile = profiles.find(p => p.id === booking.user_id)!

                    const isDeleteSubmitting =
                      deleteFetcher.state !== "idle" &&
                      deleteFetcher.formData?.get("user_id") == profile.id;
                    const isOverflow = isOverflowBooking(booking, capacity);
                    const guestsString = formatter.format(
                      Object.entries(booking.guests)
                        .filter((p) => p[1] > 0)
                        .map((p) => `${p[1]} ${periods[p[0] as Period]}`)
                    );
                    return (
                      <li key={profile.id} aria-busy={isDeleteSubmitting}>
                        <Avatar
                          className={cx('avatar', {
                            "avatar--overflow": isOverflow,
                            "avatar--partial": period != "day",
                          })}
                          profile={profile}
                        />
                        <span>{profile.full_name ?? profile.email}</span>
                        {guestsString && ` (+${guestsString})`}
                        {isOverflow && ` (Surnuméraire)`}
                        {admin && isFuture && (
                          <span>
                            <deleteFetcher.Form
                              method="post"
                              className="inline-form"
                            >
                              <input
                                type="hidden"
                                name="booking_id"
                                value={booking.booking_id}
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
          }
        })}
      </div>

      {isFuture && (
        <div className="grid">
          <Form method="post">
            <input type="hidden" name="_action" value="invite" />
            <fieldset className="guest-form">
              <legend>Inscrire un invité/une invitée</legend>
              <fieldset>
                <legend>Ma période</legend>
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

              <fieldset>
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

              <button
                type="submit"
                disabled={isFull}
                aria-busy={navigation.state === "submitting"}
              >
                Inscrire
              </button>
            </fieldset>
          </Form>
          <Form method="post">
            <input type="hidden" name="_action" value="book" />
            <fieldset className="colleague-form">
              <legend>Inscrire un Sfeirien/une Sfeirienne</legend>
              <label>
                Email
                <input
                  type="email"
                  placeholder="example@sfeir.com"
                  name="for_user"
                  list="other"
                  onChange={handleColleagueEmailChange}
                />
              </label>
              <datalist id="other">
                {profiles.map((p) => {
                  return (
                    <option value={p.email!} key={p.id}>
                      {p.full_name ?? p.email}
                    </option>
                  );
                })}
              </datalist>
              {showNameInput && (
                <label>
                  Nom
                  <input type="text" name="for_user_name" />
                </label>
              )}
              <fieldset>
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
