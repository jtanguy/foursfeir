import { NIL, v5 } from "uuid"

export function emailToFoursfeirId(email: string): string {
	const foursfeir_ns = v5('foursfeir', NIL)
	return v5(email, foursfeir_ns)
}