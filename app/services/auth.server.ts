import { Authenticator } from "remix-auth";
import { GoogleStrategy } from "remix-auth-google";
import { sessionStorage } from "~/services/session.server";
import { Profile } from "./domain/profile.interface";
import { emailToFoursfeirId } from "./domain/profile.interface";
import { env } from "config";

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
const authenticator = new Authenticator<Profile>(sessionStorage);

const googleStrategy = new GoogleStrategy<Profile>(
  {
    clientID: env.GOOGLE_AUTH_ID,
    clientSecret: env.GOOGLE_AUTH_SECRET,
    callbackURL: env.GOOGLE_AUTH_CALLBACK_URL,
  },
  async ({ profile }) => {
    // Profule data is extracted from the Google profile. It is persisted on the first booking
    const foursfeirProfile = {
      user_id: emailToFoursfeirId(profile.emails[0].value),
      avatar_url: profile.photos.at(0)?.value,
      email: profile.emails[0].value,
      full_name: profile.displayName,
    };
    return foursfeirProfile;
  },
);
authenticator.use(googleStrategy);

function getUserFromRequest(request: Request): Promise<Profile> {
  return authenticator.isAuthenticated(request, { failureRedirect: "/login" });
}

export { authenticator, getUserFromRequest };
