import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";
import { FormStrategy } from "remix-auth-form"
import { sessionStorage } from "~/services/session.server";
import { Profile, emailToFoursfeirId } from "./db/profiles.server";

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
let authenticator = new Authenticator<Profile>(sessionStorage);

const googleStrategy = new GoogleStrategy<Profile>(
  {
    clientID: process.env.GOOGLE_AUTH_ID!,
    clientSecret: process.env.GOOGLE_AUTH_SECRET!,
    callbackURL: process.env.GOOGLE_AUTH_CALLBACK_URL!,
  },
  async ({ profile }) => {
    // Get the user data from your DB or API using the tokens and profile
    // return User.findOrCreate({ email: profile.emails[0].value })
    const foursfeirProfile = {
      id: emailToFoursfeirId(profile.emails[0].value),
      avatar_url: profile.photos.at(0)?.value,
      email: profile.emails[0].value,
      full_name: profile.displayName,
      updatedAt: new Date()
    }
    return foursfeirProfile
  }
)

const emailStrategy = new FormStrategy<Profile>(async ({ form }) => {
  const email = form.get('email')
  const profiles = await import('../../scripts/data/profiles.json')
  const user = profiles.default.find(p => p.email === email)
  if (!user) {
    throw new Error('User not found')
  }
  console.log("Found user " + email)
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name ?? user.email,
    avatar_url: user.avatar_url ?? undefined,
    updatedAt: new Date()
  }
})

function getUserFromRequest(request: Request): Promise<Profile> {
  return authenticator.isAuthenticated(request, { failureRedirect: '/login' })
}


if (process.env.OFFLINE === "true") {
  console.log("Using offline strategy for login")
  authenticator.use(emailStrategy, 'offline')
} else {
  console.log('Using google strategy for login')
  authenticator.use(googleStrategy)
}

export { authenticator, getUserFromRequest }