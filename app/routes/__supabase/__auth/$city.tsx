import type { ActionArgs, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json, Response } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { zfd } from "zod-form-data";
import { z } from "zod";
import { createServerClient } from "utils/supabase.server";

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

const schema = zfd.formData({
  date: zfd.text(),
  period: zfd.text(z.enum(["day", "morning", "afternoon"])).optional(),
  action: zfd.text(z.enum(["book", "remove"])),
  for_user: zfd.text().optional(),
});

export const action = async ({ request, params }: ActionArgs) => {
  const response = new Response();
  const supabase = createServerClient({ request, response });

  const { action, date, period, for_user } = schema.parse(
    await request.formData()
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw redirect("/login");

  if (action === "book") {
    if (for_user) {
      const {data: other}  =  await supabase.from('profiles').select('id').eq('email', for_user)

      let otherId: string;

      if(other == null || other.length === 0){
        // Other email absent
        const {data: created} = await supabase.from('profiles').insert([
          {email: for_user}
        ]).select()
        otherId = created[0].id
      } else {
        otherId = other[0].id
      }

      await supabase
        .from("bookings")
        .insert([
          { city: params.city, date: date, user_id: otherId, period: period, booked_by: user.id },
        ]);
    } else {
      // Self booking
      await supabase
        .from("bookings")
        .insert([
          { city: params.city, date: date, user_id: user.id, period: period },
        ]);
    }
  } else {
    await supabase.from("bookings").delete().match({
      user_id: user.id,
      city: params.city,
      date: date,
    });
  }
  return null;
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
