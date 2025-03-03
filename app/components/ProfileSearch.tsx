import { useFetcher } from "@remix-run/react";
import type { FuseResult } from "fuse.js";
import { useEffect, useState, Fragment } from "react";
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, Transition } from "@headlessui/react";
import { IoClose } from "react-icons/io5";
import { useDebounce } from "@uidotdev/usehooks";
import Avatar from "./Avatar";
import { Profile } from "~/services/db/profiles.server";
import { LuRefreshCw } from "react-icons/lu";

type ProfileSearchProps = {
	name?: string;
	profileSelector?: (profile: Profile | null) => string;
	debug?: boolean;
};

export type ProfileSearchLoaderData = {
	profiles: FuseResult<Profile>[];
};

export default function ProfileSearch({ name = "user_id", profileSelector = (p) => p?.id ?? "", debug = false }: ProfileSearchProps) {
	const fetcher = useFetcher<ProfileSearchLoaderData>();
	const [query, setQuery] = useState("");
	const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
	const debouncedQuery = useDebounce(query, 300);

	useEffect(() => {
		if (debouncedQuery.length <= 2) return;
		fetcher.submit({ search: debouncedQuery }, { method: "get", action: "/profiles" });
	}, [debouncedQuery]);

	const resetData = new FormData();
	resetData.set("_action", "refresh");
	const results = fetcher.data?.profiles ?? [];

	return (
		<div className="profile-search">
			<Combobox value={selectedProfile} onChange={setSelectedProfile}>
				<input type="hidden" name={name} value={profileSelector(selectedProfile)} />
				<div className="combobox-container">
					<div className="combobox-input-container">
						<ComboboxInput
							className="combobox-input"
							displayValue={(profile: Profile | null) => profile?.full_name ?? ""}
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
							{results.length === 0 && query !== "" ? (
								<div className="no-results">
									Aucun résultat trouvé.
									<button type="button" aria-busy={fetcher.state === "submitting"} onClick={() => fetcher.submit(resetData, { method: "post", action: "/profiles" })}>
										Rafraîchir
									</button>
								</div>
							) : (
								results.map(({ item: profile, score }) => (
									<ComboboxOption
										key={profile.id}
										className="combobox-option"
										value={profile}
									>
										<span className="option-content">
											<Avatar profile={profile} />
											<span className="option-text">
												{profile.full_name}
											</span>
											{debug && (
												<span className="option-debug">
													{score}
												</span>
											)}
										</span>
									</ComboboxOption>
								))
							)}
						</ComboboxOptions>
					</Transition>
				</div>
			</Combobox >
		</div >
	);
} 