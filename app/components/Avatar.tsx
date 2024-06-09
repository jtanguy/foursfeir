import cx from "classnames";
import { ReactElement, JSXElementConstructor, ReactNode } from "react";
import { Profile } from "~/services/db/profiles.server";

type Props = {
  profile: Profile
  className?: string;
};
export default function Avatar({ profile, className }: Props) {
  if (profile.avatar_url != null && profile.avatar_url.length > 0) {
    return (
      <img
        className={cx("avatar", className)}
        referrerPolicy="no-referrer"
        alt={profile.full_name ?? profile.email}
        src={profile.avatar_url}
      />
    );
  } else {
    return (
      <img
        className={cx("avatar", className)}
        referrerPolicy="no-referrer"
        alt={profile.full_name ?? profile.email}
        src={`/avatars?name=${profile.full_name ?? profile.email}`}
      />
    );
  }
}
