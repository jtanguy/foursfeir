import { useFetcher } from "@remix-run/react";
import { useState } from "react";
import cx from "classnames";
import { FaUserPen } from "react-icons/fa6";
import { AdminInfo } from "~/services/domain/admin.interface";
import { Profile } from "~/services/domain/profile.interface";
import Avatar from "./Avatar";
import { City } from "~/services/domain/city.interface";

type Props = {
  info: AdminInfo;
  profile: Profile;
  cities: City[];
};

export function UpdateAdmin({ info, profile, cities }: Props) {
  const fetcher = useFetcher();

  const [globalAdminSelected, setGlobalAdmin] = useState(
    info.type === "global",
  );
  const [open, setOpen] = useState(false);

  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        className="inline-button icon secondary"
        onClick={openModal}
      >
        <FaUserPen aria-label="Modifier l'admin" />
      </button>
      <dialog open={open}>
        <fetcher.Form method="post" onSubmit={closeModal}>
          <article>
            <header>
              <button
                aria-label="Close"
                rel="prev"
                type="button"
                onClick={closeModal}
              ></button>
              <h3>Modifier les droits de {profile.full_name}</h3>
            </header>
            <div className="grid">
              <Avatar
                className={cx("avatar--huge", {
                  "avatar--globaladmin": info.type === "global",
                })}
                profile={profile}
              />
              <div>
                <label>
                  <input
                    type="checkbox"
                    role="switch"
                    name="global"
                    defaultChecked={info.type === "global"}
                    onChange={(e) => setGlobalAdmin(e.currentTarget.checked)}
                  />{" "}
                  Global admin
                </label>
                <fieldset disabled={globalAdminSelected}>
                  <legend>Local admin</legend>
                  <ul>
                    {cities.map((city) => (
                      <li key={city.slug}>
                        <label>
                          <input
                            type="checkbox"
                            name="local"
                            value={city.slug}
                            defaultChecked={
                              info.type === "local" &&
                              info.cities.some((c) => c.slug === city.slug)
                            }
                          />
                          {city.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              </div>
            </div>
            <footer>
              <input type="hidden" name="_action" value="manage" />
              <input type="hidden" name="user_id" value={profile.user_id} />
              <button type="button" className="secondary" onClick={closeModal}>
                Annuler
              </button>
              <button>Mettre à jour</button>
            </footer>
          </article>
        </fetcher.Form>
      </dialog>
    </>
  );
}
