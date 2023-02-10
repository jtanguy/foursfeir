import { Temporal } from "@js-temporal/polyfill";
import { useFetcher } from "@remix-run/react";
import cx from "classnames";

import { Database } from "db_types";
import { BsPlusCircleDotted } from "react-icons/bs";

type Props = {
  date: Temporal.PlainDate;
  people: Database["public"]["Tables"]["profiles"]["Row"][];
  userId: string;
  city: string;
  capacity: number;
};
export function CalendarDay({ date, people, userId, city, capacity }: Props) {
  const hasBooking = people.some((p) => p.profiles.id === userId);
  const isWeekDay = date.dayOfWeek < 6;
  const today = Temporal.Now.plainDateISO();
  const isToday = Temporal.PlainDate.compare(date, today) === 0;
  const isFuture = Temporal.PlainDate.compare(date, today) >= 0;

  const fetcher = useFetcher();

  const isSubmitting = fetcher.state !== "idle";

  return (
    <article
      className={cx("calendar-day", {
        "calendar-day--full": people.length === capacity,
        "calendar-day--today": isToday,
      })}
      aria-busy={isSubmitting}
    >
      <span className="day__name">
        {date.toLocaleString("fr-FR", {
          weekday: "short",
          day: "numeric",
        })}
      </span>{" "}
      {isWeekDay && (
        <>
          {isFuture ? (
            <fetcher.Form method="post" action={`/${city}`}>
              <input type="hidden" name="date" value={date.toString()} />
              <input
                type="hidden"
                name="action"
                value={hasBooking ? "remove" : "book"}
              />
              <ul className="calendar-people">
                {people.map((person) => (
                  <li
                    key={person.profiles?.id}
                    data-tooltip={
                      person.profiles.id === userId
                        ? "Cliquez pour vous désinscrire"
                        : person.profiles?.full_name
                    }
                    data-placement={
                      person.profiles.id === userId ? "bottom" : "top"
                    }
                  >
                    {person.profiles.id === userId ? (
                      <button className="calendar-people__book-self">
                        <img
                          className="avatar"
                          referrerPolicy="no-referrer"
                          alt={person.profiles?.full_name}
                          src={person.profiles?.avatar_url}
                        />
                      </button>
                    ) : (
                      <img
                        className="avatar"
                        referrerPolicy="no-referrer"
                        alt={person.profiles?.full_name}
                        src={person.profiles?.avatar_url}
                      />
                    )}
                  </li>
                ))}
                {!hasBooking && (
                  <li>
                    <button className="calendar-people__book-self">
                      <BsPlusCircleDotted />
                    </button>
                  </li>
                )}
              </ul>
            </fetcher.Form>
          ) : (
            <ul className="calendar-people">
              {people.map((person) => (
                <li key={person.profiles?.id}>
                  <img
                    className="avatar"
                    referrerPolicy="no-referrer"
                    alt={person.profiles?.full_name}
                    src={person.profiles?.avatar_url}
                    data-tooltip={person.profiles?.full_name}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {isWeekDay && (
        <progress
          value={people.length}
          max={capacity}
          className="calendar-day__gauge"
        />
      )}
    </article>
  );
}
