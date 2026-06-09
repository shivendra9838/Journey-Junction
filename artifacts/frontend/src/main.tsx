import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "leaflet/dist/leaflet.css";
import App from "./App";
import "./index.css";

import { GoogleOAuthProvider } from "@react-oauth/google";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
}

createRoot(document.getElementById("root")!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""}>
    <App />
  </GoogleOAuthProvider>
);
