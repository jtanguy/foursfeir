import { MetaFunction } from "@remix-run/node";
import { Link, Outlet } from "@remix-run/react";
import { RouteMatch } from "react-router";

export const meta: MetaFunction = () => [{ title: "FourSFEIR Admin" }];

export default function AdminLayout() {
  return (
    <>
      <main className="container">
        <h1> Administration FourSFEIR</h1>
        <Outlet />
      </main>
    </>
  );
}

export const handle = {
  breadcrumb: (match: RouteMatch) => <Link to={match.pathname}>admin</Link>,
};
