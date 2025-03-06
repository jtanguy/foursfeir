import { useFetcher } from "@remix-run/react";
import { useState } from "react";
import { FiTrash } from "react-icons/fi";
import { City } from "~/services/domain/city.interface";

type Props = {
  city: City;
};

export function DeleteCityConfirm({ city }: Props) {
  const fetcher = useFetcher();
  const [open, setOpen] = useState(false);

  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);
  return (
    <>
      <button type="button" className="icon danger" onClick={openModal}>
        <FiTrash aria-label="Supprimer le lieu" />
      </button>
      <dialog open={open}>
        <fetcher.Form method="post">
          <article>
            <header>
              <button
                aria-label="Close"
                rel="prev"
                type="button"
                onClick={closeModal}
              ></button>
              <h3>Supprimer {city.label}</h3>
            </header>
            <p>
              Vous êtes sur le point de suprrimer le lieu {city.label}. Ceci
              supprimera également tous les évènements, admins locaux et
              inscriptions associées.
            </p>
            <footer>
              <input type="hidden" name="_action" value="delete" />
              <button type="button" className="secondary" onClick={closeModal}>
                Annuler
              </button>
              <button name="slug" value={city.slug}>
                Supprimer
              </button>
            </footer>
          </article>
        </fetcher.Form>
      </dialog>
    </>
  );
}
