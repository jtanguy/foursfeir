import { Fragment, useState } from "react";
import { Temporal } from "@js-temporal/polyfill";
import type { ActionArgs, LinksFunction, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  useFetcher,
  useLoaderData,
  useNavigation,
  useParams,
} from "@remix-run/react";
import cx from "classnames";
import { zfd } from "zod-form-data";
import { z } from "zod";

import { periods } from "~/constants";
import { createServerClient } from "utils/supabase.server";
import Avatar from "~/components/Avatar";

import daily from "~/styles/daily.css";
import { getOccupancy } from "~/bookingUtils";
import { FiUserMinus } from "react-icons/fi";

export const loader = async ({ request, params }: LoaderArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: bookings },
    { data: cities },
    { data: notices },
    { data: isAdmin },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "period, profile:user_id(id, email, full_name, avatar_url), guests"
      )
      .eq("city", params.city)
      .eq("date", params.date)
      .order("created_at", { ascending: true }),
    supabase
      .from("cities")
      .select("capacity, max_capacity")
      .eq("slug", params.city),
    supabase
      .from("notices")
      .select("message, temp_capacity")
      .eq("city", params.city)
      .eq("date", params.date),
    supabase.rpc("is_admin", {
      user_id: user!.id,
      city: params.city!,
    }),
  ]);

  const excludedIds: string[] = [
    user!.id,
    ...(bookings ?? []).map((b) => b.profile.id),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .not("id", "in", `(${excludedIds.join(",")})`);

  return json({
    bookings: bookings ?? [],
    capacity: cities[0].capacity,
    notice: notices[0]?.message,
    maxCapacity: notices[0]?.temp_capacity ?? cities[0].max_capacity,
    profiles: profiles ?? [],
    user,
    isAdmin,
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
      user_id: zfd.text(),
    }),
  ])
);

export const action = async ({ request, params }: ActionArgs) => {
  if (!params.city) throw new Response("No city given", { status: 400 });
  if (!params.date) throw new Response("No date given", { status: 400 });
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const f = schema.parse(await request.formData());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw redirect("/");
  }

  if (f._action === "book") {
    const { data: other } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", f.for_user);

    let otherId: string;

    if (other == null || other.length === 0) {
      // Other email absent
      const { data: created } = await supabase
        .from("profiles")
        .insert([{ email: f.for_user, full_name: f.for_user_name }])
        .select();
      otherId = created[0].id;
    } else {
      otherId = other[0].id;
    }

    await supabase.from("bookings").insert([
      {
        city: params.city,
        date: params.date,
        user_id: otherId,
        period: f.period,
        booked_by: user.id,
      },
    ]);

    return new Response(null, { status: 201 });
  }

  if (f._action === "invite") {
    await supabase.from("bookings").upsert({
      city: params.city,
      date: params.date,
      user_id: user.id,
      period: f.period,
      guests: f.guests,
    });
    return new Response(null, { status: 202 });
  }

  const { data: isAdmin } = await supabase.rpc("is_admin", {
    user_id: user!.id,
    city: params.city!,
  });
  if (isAdmin && f._action === "remove") {
    await supabase.from("bookings").delete().match({
      user_id: f.user_id,
      city: params.city,
      date: params.date,
    });
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
  const { bookings, capacity, notice, maxCapacity, profiles, user, isAdmin } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const deleteFetcher = useFetcher();

  const [showNameInput, setShowNameInput] = useState(false);

  const day = Temporal.PlainDate.from(dateStr);
  const today = Temporal.Now.plainDateISO();
  const isFuture = Temporal.PlainDate.compare(day, today) >= 0;

  const selfBooking = bookings.find((b) => b.profile.id === user.id);
  const [selfPeriod, setSelfPeriod] = useState(selfBooking?.period ?? "day");

  const byPeriod = bookings.reduce(
    (acc, booking, index) => ({
      ...acc,
      [booking.period]: [...acc[booking.period], { index: index, ...booking }],
    }),
    { day: [], morning: [], afternoon: [] }
  );

  const occupancy = getOccupancy(bookings);

  const isFull = occupancy >= maxCapacity;

  const formatter = new Intl.ListFormat("fr-FR");

  const handleSelfPeriodChange = (event) => {
    setSelfPeriod(event.target.value);
  };

  const handleColleagueEmailChange = (event) => {
    const emailStr = event.target.value.trim();
    const isEmailLike = emailStr.includes("@");
    const profileExists =
      profiles.some((p) => p.email.startsWith(emailStr)) ||
      bookings.some((b) => b.profile.email.startsWith(emailStr));

    if (!isEmailLike && showNameInput) {
      setShowNameInput(false);
    }

    if (isEmailLike && !showNameInput && !profileExists) {
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
          Note: {notice}. Capacité réduite à {maxCapacity}
        </h3>
      )}

      <p>
        {occupancy}/{Math.min(capacity, maxCapacity)} inscrits.{" "}
        {occupancy > capacity && (
          <>Attention: débordement dans les autres salles à prévoir</>
        )}
      </p>

      <div className="calendar-people">
        {Object.keys(periods).map((period) => {
          const bookings = byPeriod[period];
          if (bookings.length > 0) {
            return (
              <Fragment key={period}>
                <h3>{periods[period]}</h3>
                <ul className="calendar-people__list" key={period}>
                  {bookings.map(({ index, profile, guests }) => {
                    const isDeleteSubmitting =
                      deleteFetcher.state !== "idle" &&
                      deleteFetcher.formData?.get("user_id") == profile.id;
                    const isOverflow = index >= capacity;
                    const guestsString = formatter.format(
                      Object.entries(guests)
                        .filter((p) => p[1] > 0)
                        .map((p) => `${p[1]} ${periods[p[0]]}`)
                    );
                    return (
                      <li key={profile.id} aria-busy={isDeleteSubmitting}>
                        <Avatar
                          className={cx({
                            "avatar--overflow": index >= capacity,
                            "avatar--partial": period !== "day",
                          })}
                          profile={profile}
                        />
                        <span>
                          {profile?.full_name ?? profile.email}
                        </span>
                        {guestsString && ` (+${guestsString})`}
                        {isOverflow && ` (Surnuméraire)`}
                        {isAdmin && (
                          <span>
                            <deleteFetcher.Form
                              method="post"
                              className="inline-form"
                            >
                              <input
                                type="hidden"
                                name="user_id"
                                value={profile.id}
                              />

                              <button
                                className="inline-button icon"
                                role="button"
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
                    max={capacity - bookings.length}
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
                    max={capacity - bookings.length}
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
                    max={capacity - bookings.length}
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
  breadcrumb: (match) => <>{match.params.date}</>,
};
