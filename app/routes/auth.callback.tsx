import { LoaderFunctionArgs, redirect } from '@remix-run/node'
import { authenticator } from '~/services/auth.server'

export async function loader({ request }: LoaderFunctionArgs) {
	const method = process.env.OFFLINE === "true" ? "offline" : "google"
	return authenticator.authenticate(method, request, {
		successRedirect: '/',
		failureRedirect: '/login',
	})
}