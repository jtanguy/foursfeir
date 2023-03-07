import cx from "classnames";
import BoringAvatar from "boring-avatars";

import type { Database } from "db_types";

type Props = {
  profile: Database["public"]["Tables"]["profiles"]["Row"];
  size?: number;
  className?: string;
};
export default function Avatar({ profile, size = 40, className }: Props) {
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
      <div className={cx("avatar", className)}>
        <BoringAvatar
          size={size}
          name={profile.full_name ?? profile.email}
          variant="bauhaus"
          colors={["#1a2a3a", "#e4426d", "#1d1d2b", "#769cec", "#586f8f"]}
        />
      </div>
    );
  }
}
