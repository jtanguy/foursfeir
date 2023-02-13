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

  const pluralRules = new Intl.PluralRules("fr-FR");
  const formattedPeople: string = {
    one: `${people.length} inscrit`,
    other: `${people.length} inscrits`,
  }[pluralRules.select(people.length)];

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
              {!hasBooking && (
                <li>
                  <button className="inline-button calendar-people__book-self">
                    <BsPlusCircleDotted />
                  </button>
                </li>
              )}
            </ul>
            <details role="list" dir="rtl" className="calendar-day__actions">
              <summary aria-haspopup="listbox" aria-label="Actions">
                &nbsp;
              </summary>
              <ul role="listbox" dir="ltr">
                <li>{formattedPeople}</li>
                <li>
                  <button className="inline-button calendar-day__action">
                    {hasBooking ? "Se désinscrire" : "S'inscrire"}
                  </button>
                </li>
              </ul>
            </details>
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
