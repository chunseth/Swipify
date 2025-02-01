import React, { useEffect, useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { ref, set } from "firebase/database";
import { db } from "../services/firebase";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>("");
  const navigate = useNavigate();
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    error?: string;
    errorCode?: string;
    errorDetails?: any;
    lastAttempt?: {
      email: string;
      isSignUp: boolean;
      timestamp: string;  
    };
  }>({});
  const [_, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Check if this is a new sign in
        const isNewSignIn = sessionStorage.getItem('isNewSignIn');
        if (isNewSignIn) {
          sessionStorage.removeItem('isNewSignIn');
          navigate('/spotify-auth');
        } else {
          // Check Spotify token for existing users
          const spotifyToken = localStorage.getItem("spotifyAccessToken");
          if (spotifyToken) {
            setAuthStatus("You're signed in! Use the menu button ☰ to navigate to Dashboard.");
            navigate("/dashboard");
          } else {
            setAuthStatus("Please connect your Spotify account");
            navigate("/spotify-auth");
          }
        }
      } else {
        setAuthStatus("Please sign in to continue");
        // Clear all tokens when not authenticated
        localStorage.removeItem("spotifyAccessToken");
        localStorage.removeItem("spotifyRefreshToken");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        setDebugInfo(prev => ({
          ...prev,
          lastAttempt: {
            email,
            isSignUp: true,
            timestamp: new Date().toISOString(),
            authMethod: 'createUserWithEmailAndPassword'
          }
        }));
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        const userId = userCredential.user.uid;
        const userRef = ref(db, `users/${userId}`);
        await set(userRef, {
          email: email,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
        
        sessionStorage.setItem('isNewSignIn', 'true');
        
        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
        const redirectUri = import.meta.env.PROD 
          ? "https://swipifys.netlify.app/callback"
          : "http://localhost:3000/callback";
        const scopes = "user-read-private user-read-email playlist-read-private";
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=token`;
        window.location.href = authUrl;
        
      } else {
        setDebugInfo(prev => ({
          ...prev,
          lastAttempt: {
            email,
            isSignUp: false,
            timestamp: new Date().toISOString(),
            authMethod: 'signInWithEmailAndPassword'
          }
        }));
        await signInWithEmailAndPassword(auth, email, password);
        sessionStorage.setItem('isNewSignIn', 'true');
        // Same redirect for signin
        const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
        const redirectUri = import.meta.env.PROD 
          ? "https://swipifys.netlify.app/callback"
          : "http://localhost:3000/callback";
        const scopes = "user-read-private user-read-email playlist-read-private";
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&response_type=token`;
        window.location.href = authUrl;
      }
    } catch (error: any) {
      console.error('Full Firebase error:', error);
      
      setDebugInfo({
        error: error.message,
        errorCode: error.code,
        errorDetails: {
          name: error.name,
          stack: error.stack,
          message: error.message,
          code: error.code,
          customData: error.customData
        },
        lastAttempt: {
          email,
          isSignUp,
          timestamp: new Date().toISOString()
        }
      });
      
      setError(error.message || 'An error occurred during authentication');
      setAuthStatus("Authentication failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="auth-container bg-[#181818] p-8 rounded-xl shadow-xl w-full max-w-md border border-[#282828]">
        <h1 className="text-3xl font-bold mb-8 text-white text-center">
          {isSignUp ? "Sign Up" : "Sign In"}
        </h1>
        {authStatus && (
          <div className={`text-center mb-4 ${authStatus.includes("signed in") ? "text-[#1DB954]" : "text-gray-400"}`}>
            {authStatus}
          </div>
        )}
        <form onSubmit={handleAuth} className="space-y-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-3 bg-[#282828] text-white border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1DB954] placeholder-gray-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-4 py-3 bg-[#282828] text-white border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1DB954] placeholder-gray-400"
          />
          <button
            type="submit"
            className="w-full bg-[#1DB954] text-white py-3 rounded-full font-bold hover:bg-[#1ed760] transition duration-300 transform hover:scale-105"
          >
            {isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-6 text-center text-gray-400 hover:text-white transition duration-300"
        >
          {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
        </button>
      </div>
      
      {/* Debug Button and Panel */}
      <button 
        onClick={() => setShowDebug(!showDebug)} 
        style={{ 
          position: 'fixed', 
          bottom: '10px', 
          left: '64px',
          background: '#1DB954',
          padding: '8px',
          borderRadius: '4px',
          color: 'white',
          zIndex: 1000
        }}
      >
        Debug
      </button>
      
      {showDebug && (
        <div style={{
          position: 'fixed',
          bottom: '50px',
          left: '64px',
          background: '#282828',
          padding: '10px',
          borderRadius: '4px',
          maxWidth: '300px',
          zIndex: 1000,
          fontSize: '12px',
          color: 'white',
          marginBottom: '10px'
        }}>
          <h4>Auth Debug Info:</h4>
          <p>Last Attempt: {debugInfo.lastAttempt ? JSON.stringify(debugInfo.lastAttempt, null, 2) : 'None'}</p>
          <p>Error: {debugInfo.error || 'None'}</p>
          <p>Error Code: {debugInfo.errorCode || 'None'}</p>
          <p>Device: {navigator.userAgent}</p>
        </div>
      )}
    </div>
  );
};

export default Auth;