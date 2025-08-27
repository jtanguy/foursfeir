import { Form } from "@remix-run/react";
import { IoHomeSharp, IoHomeOutline } from "react-icons/io5";

type FavoriteCityFormProps = {
  city: string;
  isFavorite: boolean;
};

export function FavoriteCityForm({ city, isFavorite }: FavoriteCityFormProps) {
  return (
    <div>
      <Form method="post" action="/profiles" navigate={false} className="inline-form">
      <input type="hidden" name="city_slug" value={city} />
      <button
        className="icon"
        name="_action"
        value="favorite"
      >
        {isFavorite ? (
          <IoHomeSharp
            title="Favoris"
            aria-label="Favoris"
            style={{ color: 'gold' }}
          />
        ) : (
          <IoHomeOutline
            title="Favoris"
            aria-label="Favoris"
          />
        )}
      </button>
    </Form>
    </div>
  );
};