# Clerk auth: "External Account was not found" / needs_identifier

## Why users see this error

When someone clicks **"Continue with Google"** on the **Sign in** page but no Clerk user exists yet for that Google account, Clerk returns:

- **UI:** "The External Account was not found."
- **API:** `status: "needs_identifier"`, `supported_first_factors: [{ "strategy": "oauth_google" }]`.

So the flow fails when:

1. The user is **new** (they never signed up) and they use **Sign in** instead of **Sign up**, or  
2. Google is only enabled for **sign-in** in Clerk, so Clerk does not create a new user on first Google login.

## Fix 1: Clerk Dashboard (required for new users)

Ensure Google creates users on first use:

1. Open [Clerk Dashboard](https://dashboard.clerk.com/) → your application.
2. Go to **User & Authentication** → **Social connections** (or **SSO connections**).
3. Open the **Google** connection.
4. Turn on **"Enable for sign-up and sign-in"** (not only sign-in).
   - If only sign-in is enabled, Clerk will not create a user when a new person uses Google → "External Account was not found."
5. Save.

In **production**, also:

- Use **custom** Google OAuth credentials (Client ID / Secret from Google Cloud Console).
- Add your production redirect URIs in Google Cloud Console and in Clerk.
- Ensure the Google OAuth app is set to **"In production"** if you need more than test users.

Reference: [Clerk – Add Google as a social connection](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google).

## Fix 2: In-app UX (this repo)

The sign-in page now includes a short note and link:

- **"First time here? Sign up to create your account with Google, then you can sign in next time."**  
- Link to **Sign up** so users who hit the error know to use Sign up first.

No code change is required for Fix 1; it is a one-time Clerk Dashboard setting.
