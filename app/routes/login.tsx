import { LoaderFunctionArgs, json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";

export function loader({ }: LoaderFunctionArgs) {
	return json({ method: process.env.OFFLINE === "true" ? 'offline' : 'google' })
}

export default function Login() {
	const { method } = useLoaderData<typeof loader>()
	const isOffline = method === "offline"

	const headerText = isOffline ? "Using offline data" : "Using google"
	const submitText = isOffline ? "Login with offline data" : "Login with Google"
	return (
		<main className="container">
			<article className="grid">
				<div>
					<hgroup>
						<h1>Log in</h1>
						<h2>{headerText}</h2>
					</hgroup>
					<Form action="/auth" method="post">

						{isOffline &&
							<input type="email" name="email" />
						}
						<input type="submit" className="primary" value={submitText} />
					</Form>
				</div>
				<div className="hero--axolotl-blue"></div>
			</article>
		</main>
	);
}
