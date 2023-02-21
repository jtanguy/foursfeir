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
  const [self, others] = [
    people.find((p) => p.profiles.id === userId),
    people.filter((p) => p.profiles.id !== userId),
  ];
  const hasBooking = self != null;
  const today = Temporal.Now.plainDateISO();
  const isToday = Temporal.PlainDate.compare(date, today) === 0;
  const isFuture = Temporal.PlainDate.compare(date, today) >= 0;

  const fetcher = useFetcher();

  const isSubmitting = fetcher.state !== "idle";

  // const [open, setOpen] =

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
            <details className="calendar-people">
              <summary className="calendar-people__header">
                <ul className="calendar-people__list calendar-people__list--inline">
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
                        <BsPlusCircleDotted className="avatar"/>
                      </button>
                    </li>
                  )}
                </ul>
              </summary>
              <ul className="calendar-people__list calendar-people--expanded">
                {others.map((person) => (
                  <li key={person.profiles?.id}>
                    <img
                      className="avatar"
                      referrerPolicy="no-referrer"
                      alt=""
                      src={person.profiles?.avatar_url}
                    />
                    <span>
                      {person.profiles?.full_name}
                    </span>
                  </li>
                ))}
                <li>
                  {hasBooking ? (
                    <>
                      <img
                        className="avatar"
                        referrerPolicy="no-referrer"
                        alt={self.profiles?.full_name}
                        src={self.profiles?.avatar_url}
                      />{" "}
                      <button className="calendar-people__book-self">
                        Se désinscrire
                      </button>
                    </>
                  ) : (
                    <>
                      <BsPlusCircleDotted className="avatar" />{" "}
                      <button className="calendar-people__book-self">
                        S'inscrire
                      </button>
                    </>
                  )}
                </li>
              </ul>
            </details>
          </fetcher.Form>
        ) : (
          <ul className="calendar-people__list calendar-people__header calendar-people__list--inline">
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
