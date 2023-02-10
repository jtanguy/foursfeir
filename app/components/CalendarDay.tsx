import { useFetcher } from "@remix-run/react";
import { Temporal } from "@js-temporal/polyfill";
import cx from "classnames";
import { BsPlusCircleDotted } from "react-icons/bs";

import type { Database } from "db_types";

type Props = {
  date: Temporal.PlainDate;
  people: {
    date: string;
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
  const hasBooking = people.some((p) => p.profiles.id === userId);
  const today = Temporal.Now.plainDateISO();
  const isToday = Temporal.PlainDate.compare(date, today) === 0;
  const isFuture = Temporal.PlainDate.compare(date, today) >= 0;

  const fetcher = useFetcher();

  const isSubmitting = fetcher.state !== "idle";

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
          <fetcher.Form method="post" action={`/${city}`}>
            <input type="hidden" name="date" value={date.toString()} />
            <input
              type="hidden"
              name="action"
              value={hasBooking ? "remove" : "book"}
            />
            <ul className="calendar-people">
              {people.map((person) => {
                const isSelf = person.profiles.id === userId;
                return (
                  <li
                    key={person.profiles?.id}
                    data-tooltip={
                      isSelf ? "Se désinscrire" : person.profiles?.full_name
                    }
                    data-placement={isSelf ? "bottom" : "top"}
                  >
                    {isSelf ? (
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
                );
              })}
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
      <progress
        value={people.length}
        max={capacity}
        className="calendar-day__gauge"
      />
    </article>
  );
}
