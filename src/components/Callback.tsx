import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Callback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("Callback component mounted");
    
    // Only process if we have a hash
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      
      if (accessToken) {
        localStorage.setItem("spotifyAccessToken", accessToken);
        navigate("/dashboard", { replace: true });
        return;
      }
    }
    
    // Only redirect to auth if we don't have a token in localStorage
    if (!localStorage.getItem("spotifyAccessToken")) {
      console.log("No access token found, redirecting to auth");
      navigate("/auth", { replace: true });
    }
  }, [navigate]);

  return <div>Processing Spotify authentication...</div>;
};

export default Callback;