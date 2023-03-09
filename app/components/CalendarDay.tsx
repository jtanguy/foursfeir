import { Link, useFetcher } from "@remix-run/react";
import { Temporal } from "@js-temporal/polyfill";
import cx from "classnames";

import { BsPlusCircleDotted } from "react-icons/bs";

import type { Database } from "db_types";
import Avatar from "./Avatar";

const periods = {
  day: "Journée",
  morning: "Matin",
  afternoon: "Après-midi",
} as const;

type Props = {
  date: Temporal.PlainDate;
  bookings: {
    date: string;
    period: keyof typeof periods;
    profiles: Database["public"]["Tables"]["profiles"]["Row"];
  }[];
  userId: string;
  city: string;
  capacity: number;
  className?: string;
};

export function CalendarDay({
  date,
  bookings,
  userId,
  city,
  capacity,
  className,
}: Props) {
  const sortedBookings = bookings.sort((a, b) =>
    b.period.localeCompare(a.period)
  );

  const self = sortedBookings.find((p) => p.profiles.id === userId);
  const hasBooking = self != null;

  const byPeriod = sortedBookings.reduce(
    (acc, booking) => ({
      ...acc,
      [booking.period]: [...acc[booking.period], booking.profiles],
    }),
    { day: [], morning: [], afternoon: [] }
  );

  const today = Temporal.Now.plainDateISO();
  const isToday = Temporal.PlainDate.compare(date, today) === 0;
  const isFuture = Temporal.PlainDate.compare(date, today) >= 0;

  const fetcher = useFetcher();

  const isSubmitting = fetcher.state !== "idle";

  const selfFormId = `${date.toString()}-self`;

  return (
    <article
      className={cx(
        "calendar-day",
        {
          "calendar-day--full": bookings.length === capacity,
          "calendar-day--today": isToday,
        },
        className
      )}
      aria-busy={isSubmitting}
    >
      <h2 className="day__name">
        {date.toLocaleString("fr-FR", {
          weekday: "short",
          day: "numeric",
        })}
      </h2>{" "}
      <>
        <div>
          {isFuture && (
            <fetcher.Form method="post" action={`/${city}`} id={selfFormId}>
              <input type="hidden" name="date" value={date.toString()} />
              <input
                type="hidden"
                name="action"
                value={hasBooking ? "remove" : "book"}
              />
            </fetcher.Form>
          )}
          <details className="calendar-people">
            <summary className="calendar-people__header">
              <ul className="calendar-people__list calendar-people__list--inline">
                {sortedBookings.map((booking) => (
                  <li
                    key={booking.profiles?.id}
                    data-tooltip={`${
                      booking.profiles?.full_name ?? booking.profiles.email
                    } - ${periods[booking.period]}`}
                  >
                    <Avatar
                      className={cx({
                        "avatar--partial": booking.period !== "day",
                      })}
                      profile={booking.profiles}
                    />
                  </li>
                ))}
                {!hasBooking && isFuture && (
                  <li>
                    <button
                      type="submit"
                      form={selfFormId}
                      name="period"
                      value="day"
                      className="inline-button calendar-people__book-self"
                    >
                      <BsPlusCircleDotted className="avatar" />
                    </button>
                  </li>
                )}
              </ul>
            </summary>
            {Object.keys(periods).map((period) => {
              const people = byPeriod[period];
              if (people.length > 0) {
                return (
                  <>
                    <h3>{periods[period]}</h3>
                    <ul
                      className="calendar-people__list calendar-people--expanded"
                      key={period}
                    >
                      {people.map((profile) => (
                        <li key={profile.id}>
                          <Avatar
                            className={cx({
                              "avatar--partial": period !== "day",
                            })}
                            profile={profile}
                          />
                          <span>{profile?.full_name ?? profile.email}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                );
              }
            })}
            {isFuture && (
              <div className="calendar-day__actions">
                <div>
                  {hasBooking ? (
                    <button
                      type="submit"
                      form={selfFormId}
                      className="calendar-people__book-self"
                    >
                      Se désinscrire
                    </button>
                  ) : (
                    <details role="list" className="calendar-people__book-self">
                      <summary aria-haspopup="listbox" role="button">
                        S'inscrire
                      </summary>
                      <ul role="listbox">
                        <li>
                          <button
                            type="submit"
                            form={selfFormId}
                            name="period"
                            value="day"
                            className="inline-button calendar-people__book-self"
                          >
                            Journée
                          </button>
                        </li>
                        <li>
                          <button
                            type="submit"
                            form={selfFormId}
                            name="period"
                            value="morning"
                            className="inline-button calendar-people__book-self"
                          >
                            Matin
                          </button>
                        </li>
                        <li>
                          <button
                            type="submit"
                            form={selfFormId}
                            name="period"
                            value="afternoon"
                            className="inline-button calendar-people__book-self"
                          >
                            Après-midi
                          </button>
                        </li>
                      </ul>
                    </details>
                  )}
                </div>
                <Link to={`/${city}/${date.toString()}`}>
                  Inscrire une autre personne
                </Link>
              </div>
            )}
          </details>
        </div>
      </>
      <progress
        value={bookings.length}
        max={capacity}
        className="calendar-day__gauge"
      />
    </article>
  );
}
