import { useFetcher } from "@remix-run/react";
import { useEffect, useState, Fragment } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Transition,
} from "@headlessui/react";
import { IoClose } from "react-icons/io5";
import { useDebounce } from "@uidotdev/usehooks";
import Avatar from "./Avatar";
import { Profile } from "~/services/domain/profile.interface";

type ProfileSearchProps = {
  id?: string;
  name?: string;
  onChange?: (profile: Profile | { email: string } | null) => void;
  restrictExisting?: boolean;
  debug?: boolean;
};

export type ProfileSearchLoaderData = {
  profiles: { profile: Profile, score: number }[];
};

export default function ProfileSearch({
  id,
  name,
  onChange = () => { },
  restrictExisting = false,
  debug = false,
}: ProfileSearchProps) {
  const fetcher = useFetcher<ProfileSearchLoaderData>();
  const [query, setQuery] = useState("");
  const [selectedProfile, setSelectedProfileRaw] = useState<Profile | null>(
    null,
  );
  const debouncedQuery = useDebounce(query, 300);

  const profileDisplayValue = (p: Profile | null) =>
    p?.full_name ?? p?.email ?? "";

  useEffect(() => {
    if (debouncedQuery.length <= 2) return;
    fetcher.submit(
      { search: debouncedQuery },
      { method: "get", action: "/profiles" },
    );
  }, [debouncedQuery]);

  const setSelectedProfile = (profile: Profile | null) => {
    setSelectedProfileRaw(profile);
    onChange(profile);
  };

  const resetData = new FormData();
  resetData.set("_action", "refresh");
  const results = fetcher.data?.profiles ?? [];

  return (
    <div id={id} className="profile-search">
      <Combobox
        value={selectedProfile}
        name={name}
        onChange={setSelectedProfile}
      >
        <div className="combobox-container">
          <div className="combobox-input-container">
            <ComboboxInput
              className="combobox-input"
              displayValue={profileDisplayValue}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un profil..."
              autoComplete="off"
            />
            {selectedProfile && (
              <button
                type="button"
                className="clear-button"
                onClick={() => setSelectedProfile(null)}
                tabIndex={-1}
              >
                <IoClose className="clear-icon" aria-hidden="true" />
              </button>
            )}
          </div>
          <Transition
            as={Fragment}
            leave="transition"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery("")}
          >
            <ComboboxOptions className="combobox-options">
              {results.map(({ profile, score }) => (
                <ComboboxOption
                  key={profile.user_id}
                  className="combobox-option"
                  value={profile}
                >
                  <span className="option-content">
                    <Avatar profile={profile} />
                    <span className="option-text">{profile.full_name}</span>
                    {debug && <span className="option-debug">{score}</span>}
                  </span>
                </ComboboxOption>
              ))}
              {query !== "" && !restrictExisting && (
                <ComboboxOption
                  className="combobox-option"
                  value={{ email: query }}
                >
                  <span className="option-content">
                    <span className="option-text">Ajouter {query}</span>
                  </span>
                </ComboboxOption>
              )}
              {query !== "" && results.length === 0 && restrictExisting && (
                <div className="no-results">
                  Aucun résultat trouvé.
                  <button
                    type="button"
                    aria-busy={fetcher.state === "submitting"}
                    onClick={() =>
                      fetcher.submit(resetData, {
                        method: "post",
                        action: "/profiles",
                      })
                    }
                  >
                    Rafraîchir
                  </button>
                </div>
              )}
            </ComboboxOptions>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}
