import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";
import { FormStrategy } from "remix-auth-form"
import { sessionStorage } from "~/services/session.server";
import { Profile } from "./db/profiles.server";
import { emailToFoursfeirId } from "./profiles.utils";

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
const authenticator = new Authenticator<Profile>(sessionStorage);

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
authenticator.use(googleStrategy)

function getUserFromRequest(request: Request): Promise<Profile> {
  return authenticator.isAuthenticated(request, { failureRedirect: '/login' })
}


export { authenticator, getUserFromRequest }