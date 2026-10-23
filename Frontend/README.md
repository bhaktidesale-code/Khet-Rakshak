# Khet Rakshak UI

Khet Rakshak is a responsive web interface for farmers and agricultural service teams. This README covers the frontend UI in `Frontend/` only. It describes the screens and interactions currently present in the code; it is not documentation for the API, database, or deployment infrastructure.

## UI at a glance

The app is built with React, TypeScript, and Vite. It uses Tailwind CSS for styling, Lucide for icons, and Motion for interface animation. The layout adapts to mobile and desktop screens.

### Shared interface

- Landing page with a sign-in entry point and a notice about services that are not connected yet.
- Header and navigation that change based on the signed-in role.
- Language selector for English, Hindi, Marathi, Gujarati, Punjabi, Tamil, Telugu, Kannada, and Bengali. Translation coverage varies by screen.
- Light/dark theme toggle and larger-text toggle.
- Profile menu, sign-in/sign-out entry points, and an in-app notifications drawer.
- Offline status banner when the app's network status is set to offline.

### Screens and role areas

- **Guest:** landing page and sign-in/create-account screen.
- **Profile setup:** collect or complete the signed-in user's name and village.
- **Farmer:** dashboard, farm list/setup, booking list, drone analysis, sensor dashboard, crop advisory, expert consultation, and expenses.
- **Drone pilot:** assigned visits screen, with an empty state when no assignments are returned.
- **Outlet manager:** placeholder screen explaining that management tools are not available yet.
- **Administrator:** account and pilot-access management UI.

The app also includes pilot-access pending and access-denied states. The visible screen is selected within the React app; this frontend does not define a separate URL route for each screen.

## Current UI behavior and limits

Some screens are working interface prototypes, while other actions need connected services or data:

- Sign-in uses Google through Firebase Authentication. Phone OTP sign-in and profile verification are not used.
- The frontend requests the signed-in account and role from the configured API. The role shown in the UI does not grant permissions by itself.
- Farm entries, bookings, wallet balance, notifications, and much of the dashboard content are held in frontend state. They are not durable records and may reset when the page reloads.
- Drone booking currently shows an unavailable message and does not create a booking.
- Sensor, advisory, analysis, consultation, and expense screens provide interface content, but should not be treated as connected live farm data or completed service workflows.
- Pilot assignments, profile updates, and administrator actions require the API. Manager tools are currently a placeholder.
- The landing-page farm preview and `farm-health-demo` screen are public demonstrations for Shindkheda Cotton Farm. They use the existing bundled `Cotton_4.jpeg` sample; its stored capitalization is preserved. The dashboard has no connected farm, sensor, weather, or history API. Its trend charts are explicitly illustrative demo data, and the report is printable sample content rather than a saved farm record.

## Run the UI locally

Requirements: Node.js and npm.

From this directory (`Frontend/`):

```bash
npm install
```

Copy `.env.example` to `.env`, then fill in the configuration for the Firebase Web app and API you intend to use. Start the development server:

```bash
npm run dev
```

Vite serves the app at `http://localhost:3000` by default. Stop it with `Ctrl+C`. The development server is configured to listen on all network interfaces; use a trusted network when sharing it.

Useful commands:

```bash
npm run dev       # Start the local development server
npm run lint      # Check TypeScript types
npm run build     # Create the production UI bundle in dist/
npm run preview   # Preview the built bundle locally
```

## Frontend environment variables

Vite exposes variables prefixed with `VITE_` to code running in the browser. These values are configuration, not secrets.

| Variable | Purpose |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Firebase Web app identifier used by Firebase client SDK. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain for the Web app. |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project identifier. |
| `VITE_FIREBASE_APP_ID` | Firebase Web app identifier. |
| `VITE_API_URL` | Backend base origin used for API requests, such as `https://your-api-host.example.com`. Do not append `/api`. In development only, omission defaults to `http://localhost:5000`; production builds require this value. |

The Firebase values in `.env.example` are public client configuration placeholders. Do not put Firebase Admin credentials, service-account keys, database passwords, or other server secrets in a `VITE_*` variable. Vite reads `.env` when it starts, so restart the dev server after editing the file.

Firebase sign-in requires a configured Firebase project, the Google provider enabled, and the deployed hostname listed in Firebase Authentication's authorized domains. Profile setup requires a name and village; a mobile number is not required. Existing accounts that were created only with phone authentication need Google sign-in linked to their existing Firebase account before phone authentication is disabled for that account. Screens that load account, pilot, or administrator data also need a compatible API at `VITE_API_URL` and an account with the required role. During local development, start the Express API from `Backend` on port 5000. A browser `Failed to fetch` message means the API could not be reached or the browser blocked it; check that the API is running and that its `FRONTEND_URL` exactly matches the frontend origin. For a production build, set `VITE_API_URL` to the deployed API origin before building; deployed builds do not fall back to a developer's `localhost`.

## Frontend structure

```text
src/
  App.tsx                 Main app state and screen selection
  main.tsx                React entry point
  index.css               Global styles
  translations.ts         UI translation strings
  types.ts                Shared frontend types
  components/             Screen and navigation components
  services/               Firebase authentication and API client
```

## Build output

`npm run build` writes static frontend assets to `dist/`. For Vercel, set the project Root Directory to `Frontend`, add the Firebase web configuration and `VITE_API_URL` under Project Settings → Environment Variables, then redeploy. `VITE_API_URL` is the backend origin only, for example `https://your-service.onrender.com`; the frontend appends paths such as `/api/auth/me` itself. Configure its production value before building because Vite embeds it into the bundle.
