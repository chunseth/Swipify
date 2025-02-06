import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import { ref, get } from "firebase/database";

const Callback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      console.log("Callback component mounted");

      // Process the hash parameters from Spotify's redirect
      if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");

        if (accessToken) {
          localStorage.setItem("spotifyAccessToken", accessToken);
          const user = auth.currentUser;
          if (user) {
            // Query Firebase to see if the intro has been completed
            const introRef = ref(db, `users/${user.uid}/introShown`);
            const snapshot = await get(introRef);
            if (snapshot.exists() && snapshot.val() === true) {
              navigate("/dashboard", { replace: true });
            } else {
              navigate("/intro", { replace: true });
            }
          } else {
            // If no user detected, navigate to auth
            navigate("/auth", { replace: true });
          }
          return;
        }
      }
      
      // Fallback: if no token exists, redirect to authentication
      if (!localStorage.getItem("spotifyAccessToken")) {
        console.log("No access token found, redirecting to auth");
        navigate("/auth", { replace: true });
      }
    };

    processCallback();
  }, [navigate]);

  return <div>Processing Spotify authentication...</div>;
};

export default Callback;