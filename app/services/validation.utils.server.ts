export default function invariant(
  condition: unknown,
  // Not providing an inline default argument for message as the result is smaller
  /**
   * Can provide a string, or a function that returns a string for cases where
   * the message takes a fair amount of effort to compute
   */
  message: string,
  throwType: "error" | "response" = "response"
): asserts condition {
  if (condition) {
    return;
  }
  // Condition not passed

  // In production we strip the message but still throw
  if (throwType == "error") {
    throw new Error(message);
  }
  throw new Response(message, { status: 400 })
}