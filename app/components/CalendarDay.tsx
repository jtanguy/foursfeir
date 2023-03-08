import { Link, useFetcher } from "@remix-run/react";
import { Temporal } from "@js-temporal/polyfill";
import cx from "classnames";

import { BsPlusCircleDotted } from "react-icons/bs";

import type { Database } from "db_types";
import Avatar from "./Avatar";

type Props = {
  date: Temporal.PlainDate;
  people: {
    date: string;
    period: string;
    profiles: Database["public"]["Tables"]["profiles"]["Row"][];
  }[];
  userId: string;
  city: string;
  capacity: number;
  className?: string;
};
export function CalendarDay({
  date,
  people,
  userId,
  city,
  capacity,
  className,
}: Props) {
  const sortedBookings = people.sort((a, b) =>
    b.period.localeCompare(a.period)
  );

  const [self, others] = [
    sortedBookings.find((p) => p.profiles.id === userId),
    sortedBookings.filter((p) => p.profiles.id !== userId),
  ];
  const hasBooking = self != null;
  const today = Temporal.Now.plainDateISO();
  const isToday = Temporal.PlainDate.compare(date, today) === 0;
  const isFuture = Temporal.PlainDate.compare(date, today) >= 0;

  const fetcher = useFetcher();

  const isSubmitting = fetcher.state !== "idle";

  const selfFormId = `${date.toString()}-self`;
  const otherFormId = `${date.toString()}-other`;

  const periods = {
    day: "Journée",
    morning: "Matin",
    afternoon: "Après-midi",
  };

  return (
    <article
      className={cx(
        "calendar-day",
        {
          "calendar-day--full": people.length === capacity,
          "calendar-day--today": isToday,
        },
        className
      )}
      aria-busy={isSubmitting}
    >
      <span className="day__name">
        {date.toLocaleString("fr-FR", {
          weekday: "short",
          day: "numeric",
        })}
      </span>{" "}
      <>
        {isFuture ? (
          <div>
            <fetcher.Form method="post" action={`/${city}`} id={selfFormId}>
              <input type="hidden" name="date" value={date.toString()} />
              <input
                type="hidden"
                name="action"
                value={hasBooking ? "remove" : "book"}
              />
            </fetcher.Form>
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
                  {!hasBooking && (
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
              <ul className="calendar-people__list calendar-people--expanded">
                {others.map((booking) => (
                  <li key={booking.profiles?.id}>
                    <Avatar
                      className={cx({
                        "avatar--partial": booking.period !== "day",
                      })}
                      profile={booking.profiles}
                    />
                    <span>
                      {booking.profiles?.full_name ?? booking.profiles.email} -
                      ({periods[booking.period]})
                    </span>
                  </li>
                ))}
                <li>
                  {hasBooking ? (
                    <>
                      <Avatar
                        className={cx({
                          "avatar--partial": self.period !== "day",
                        })}
                        profile={self.profiles}
                      />{" "}
                      <button
                        type="submit"
                        form={selfFormId}
                        className="calendar-people__book-self"
                      >
                        Se désinscrire ({periods[self.period]})
                      </button>
                    </>
                  ) : (
                    <>
                      <BsPlusCircleDotted className="avatar" />{" "}
                      <details
                        role="list"
                        className="calendar-people__book-self"
                      >
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
                    </>
                  )}
                </li>
                <li>
                  <Link to={`/${city}/${date.toString()}`}>
                    Inscrire une autre personne
                  </Link>
                </li>
              </ul>
            </details>
          </div>
        ) : (
          <ul className="calendar-people__list calendar-people__header calendar-people__list--inline">
            {sortedBookings.map((booking) => (
              <li
                key={booking.profiles?.id}
                data-tooltip={`${booking.profiles?.full_name} - ${
                  periods[booking.period]
                }`}
              >
                <Avatar
                  className={cx({
                    "avatar--partial": booking.period !== "day",
                  })}
                  profile={booking.profiles}
                />
              </li>
            ))}
          </ul>
        )}
      </>
      <progress
        value={people.length}
        max={capacity}
        className="calendar-day__gauge"
      />
    </article>
  );
}
