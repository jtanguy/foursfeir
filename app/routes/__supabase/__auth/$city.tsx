import { ActionArgs, LoaderFunction, redirect } from "@remix-run/node";
import { json, Response } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { createServerClient } from "utils/supabase.server";

import { zfd } from "zod-form-data";
import { z } from "zod";

const schema = zfd.formData({
  date: zfd.text(),
  action: zfd.text(z.enum(["book", "remove"])),
});

export const action = async ({ request, params }: ActionArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const { action, date } = await schema.parse(await request.formData());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw redirect("/login");

  if (action === "book") {
    await supabase
      .from("bookings")
      .insert([{ city: params.city, date: date, user_id: user.id }]);
  } else {
    const res = await supabase.from("bookings").delete().match({
      user_id: user.id,
      city: params.city,
      date: date,
    });
    console.log(res);
  }
  return null;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  if (!params.city) throw new Response("No city given", { status: 400 });

  const response = new Response();
  const supabase = createServerClient({ request, response });

  const { data, error } = await supabase
    .from("cities")
    .select("slug, label")
    .eq("slug", params.city);

  if (error) throw error;

  if (data.length === 0)
    throw new Response(`Could not find city ${params.city}`, { status: 404 });

  return json({
    city: data[0].label ?? params.slug,
  });
};

export default function City() {
  const { city: label } = useLoaderData<typeof loader>();

  return (
    <>
      <main className="container">
        <h1> Réservations à {label}</h1>
        <Outlet />
      </main>
    </>
  );
}

export const handle = {
  breadcrumb: (match) => <Link to={match.pathname}>{match.params.city}</Link>,
};
