import { Form } from "@remix-run/react";

export default function Login() {

	return (
		<main className="container">
			<article className="grid">
				<div>
					<hgroup>
						<h1>Log in</h1>
						<h2>{"Using google"}</h2>
					</hgroup>
					<Form action="/auth" method="post">

						<input type="submit" className="primary" value={"Login with Google"} />
					</Form>
				</div>
				<div className="hero--axolotl-blue"></div>
			</article>
		</main>
	);
}
