import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Callback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    console.log("Access Token:", accessToken); // Log access token
    console.log("Refresh Token:", refreshToken); // Log refresh token

    if (accessToken) {
      localStorage.setItem("spotifyAccessToken", accessToken);
      if (refreshToken) {
        localStorage.setItem("spotifyRefreshToken", refreshToken); // Save refresh token
      }
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  }, [navigate]);

  return <div>Loading...</div>;
};

export default Callback;