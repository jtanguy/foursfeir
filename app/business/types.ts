import type { Temporal } from "@js-temporal/polyfill";

type CityId = string;
type UserId = string;
enum PeriodEnum {
  day = "Journée",
  morning = "Matin",
  afternoon = "Après-midi",
}
type Period = keyof typeof PeriodEnum;

type CityBooked = {
  type: "CityBooked";
  city: CityId;
  user: UserId;
  date: Temporal.PlainDate;
  booked_by: UserId;
  period: Period;
};
type CityUnBooked = {
  type: "CityBooked";
  city: CityId;
  user: UserId;
  date: Temporal.PlainDate;
};

export type Event = CityBooked | CityUnBooked;

type BookCity = {
  type: "BookCity";
  city: CityId;
  user: UserId;
  date: Temporal.PlainDate;
  target_user: UserId;
  period: Period;
};

export type Command = BookCity;

export type State = {};

interface Tagged {
  type: string;
}

export abstract class Decider<
  St extends Record<string, unknown>,
  Cmd extends Tagged,
  Ev extends Tagged
> {
  private _state: St;
  constructor(initialState: St) {
    this._state = initialState;
  }

  abstract decide(cmd: Cmd, state: St): Ev[];
  abstract evolve(ev: Ev, currentState: St): St;
}

class EmptyDecider extends Decider<{}, never, never> {
  decide(cmd: never, state: {}): never[] {
    throw new Error("Method not implemented.");
  }
  evolve(ev: never, currentState: {}): {} {
    throw new Error("Method not implemented.");
  }
}

export default new EmptyDecider({});
