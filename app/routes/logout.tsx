import { ActionFunctionArgs, redirect } from "@remix-run/node"
import { authenticator } from "~/services/auth.server"

export let loader = () => redirect('/')

export let action = ({ request }: ActionFunctionArgs) => {
	return authenticator.logout(request, { redirectTo: '/' })
}
