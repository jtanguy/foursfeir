import { Temporal } from "@js-temporal/polyfill";
import { useFetcher } from "@remix-run/react";
import cx from "classnames";

import { Database } from "db_types";
import { FiLoader, FiMinus, FiPlus } from "react-icons/fi";

type Props = {
  date: Temporal.PlainDate;
  people: Database["public"]["Tables"]["profiles"]["Row"][];
  edit: boolean;
  userId: string;
  city: string;
  capacity: number;
};
export function CalendarDay({
  date,
  people,
  edit,
  userId,
  city,
  capacity,
}: Props) {
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
                    data-tooltip={person.profiles?.full_name}
                  >
                    <img
                      className="avatar"
                      referrerPolicy="no-referrer"
                      alt={person.profiles?.full_name}
                      src={person.profiles?.avatar_url}
                    />
                  </li>
                ))}
              </ul>
              {edit && (
                <button className="day__book">
                  {isSubmitting ? (
                    <FiLoader className="loading" />
                  ) : hasBooking ? (
                    <FiMinus />
                  ) : (
                    <FiPlus />
                  )}
                </button>
              )}
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
