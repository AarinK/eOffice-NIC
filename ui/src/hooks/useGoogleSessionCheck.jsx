import { useEffect } from "react";

export default function useGoogleSessionCheck(logoutCallback) {
  useEffect(() => {
    if (window.google && window.google.accounts) {
      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID",
        auto_select: true, // will auto-select if logged in
        callback: () => {}, // not needed for logout detection
      });

      // Disable auto-select
      window.google.accounts.id.disableAutoSelect();

      // Prompt to detect if session exists
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // No active Google session
          console.log("User logged out of Google globally");
          logoutCallback(); // run your app logout logic
        }
      });
    }
  }, [logoutCallback]);
}
