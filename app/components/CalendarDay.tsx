import { Link, useFetcher } from "@remix-run/react";
import { Temporal } from "@js-temporal/polyfill";
import cx from "classnames";
import { BsPlusCircleDotted } from "react-icons/bs";

import { periods } from "~/constants";
import type { Database } from "db_types";
import Avatar from "./Avatar";
import { Fragment } from "react";
import { getOccupancy } from "~/bookingUtils";

type Props = {
  date: Temporal.PlainDate;
  bookings: {
    date: string;
    period: keyof typeof periods;
    profile: Database["public"]["Tables"]["profiles"]["Row"];
    guests: Record<keyof typeof periods, number>;
  }[];
  userId: string;
  city: string;
  notice?: string;
  capacity: number;
  maxCapacity: number;
  className?: string;
};

export function CalendarDay({
  date,
  bookings,
  userId,
  city,
  notice,
  capacity,
  maxCapacity,
  className,
}: Props) {
  const fetcher = useFetcher();
  const sortedBookings = bookings.sort((a, b) =>
    b.period.localeCompare(a.period)
  );

  const self = sortedBookings.find((p) => p.profile.id === userId);
  const hasBooking = self != null;

  const byPeriod = sortedBookings.reduce(
    (acc, booking) => ({
      ...acc,
      [booking.period]: [...acc[booking.period], booking],
    }),
    { day: [], morning: [], afternoon: [] }
  );

  const today = Temporal.Now.plainDateISO();
  const isToday = Temporal.PlainDate.compare(date, today) === 0;
  const isFuture = Temporal.PlainDate.compare(date, today) >= 0;

  const isSubmitting = fetcher.state !== "idle";

  const selfFormId = `${date.toString()}-self`;

  const occupancy = getOccupancy(bookings);

  const isVisuallyFull = occupancy >= capacity;
  const isFull = occupancy >= maxCapacity;

  const formatter = new Intl.ListFormat("fr-FR");

  return (
    <article
      className={cx(
        "calendar-day",
        {
          "calendar-day--full": isVisuallyFull,
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
        {notice && <> &mdash; {notice}</>}
      </h2>
      {"   "}
      {fetcher.state === "idle" && fetcher.data?.error && (
        <span className="error">{fetcher.data?.message}</span>
      )}
      <>
        <div>
          {isFuture && (
            <fetcher.Form method="post" id={selfFormId}>
              <input type="hidden" name="date" value={date.toString()} />
              <input
                type="hidden"
                name="_action"
                value={hasBooking ? "remove" : "book"}
              />
            </fetcher.Form>
          )}
          <details className="calendar-people">
            <summary className="calendar-people__header">
              <ul className="calendar-people__list calendar-people__list--inline">
                {sortedBookings.map((booking) => (
                  <li
                    key={booking.profile?.id}
                    data-tooltip={`${
                      booking.profile?.full_name ?? booking.profile.email
                    } - ${periods[booking.period]}`}
                  >
                    <Avatar
                      className={cx({
                        "avatar--partial": booking.period !== "day",
                      })}
                      profile={booking.profile}
                    />
                  </li>
                ))}
                {!hasBooking && isFuture && !isFull && (
                  <li>
                    <button
                      type="submit"
                      form={selfFormId}
                      name="period"
                      value="day"
                      className="inline-button no-button calendar-people__book-self"
                    >
                      <BsPlusCircleDotted className="avatar icon" />
                    </button>
                  </li>
                )}
              </ul>
            </summary>
            {Object.keys(periods).map((period) => {
              const bookings = byPeriod[period];
              if (bookings.length > 0) {
                return (
                  <Fragment key={period}>
                    <h3>{periods[period]}</h3>
                    <ul
                      className="calendar-people__list calendar-people--expanded"
                      key={period}
                    >
                      {bookings.map(({ profile, guests }) => {
                        const guestsString = formatter.format(
                          Object.entries(guests)
                            .filter((p) => p[1] > 0)
                            .map((p) => `${p[1]} ${periods[p[0]]}`)
                        );
                        return (
                          <li key={profile.id}>
                            <Avatar
                              className={cx({
                                "avatar--partial": period !== "day",
                              })}
                              profile={profile}
                            />
                            <span>{profile?.full_name ?? profile.email}</span>
                            {guestsString && ` (+${guestsString})`}
                          </li>
                        );
                      })}
                    </ul>
                  </Fragment>
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
                            className="inline-button no-button calendar-people__book-self"
                            disabled={isFull}
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
                            className="inline-button no-button calendar-people__book-self"
                            disabled={isFull}
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
                            className="inline-button no-button calendar-people__book-self"
                            disabled={isFull}
                          >
                            Après-midi
                          </button>
                        </li>
                      </ul>
                    </details>
                  )}
                </div>
                <Link to={`/${city}/${date.toString()}`}>Détails</Link>
              </div>
            )}
          </details>
        </div>
      </>
      <progress
        value={occupancy}
        max={capacity}
        className="calendar-day__gauge"
      />
    </article>
  );
}
