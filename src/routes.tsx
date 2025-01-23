import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Rankings from "./pages/Rankings";
import NotFound from "./pages/NotFound";
import Auth from "./components/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import SpotifyAuth from "./components/SpotifyAuth";
import Callback from "./components/Callback";
import Compare from "./pages/Compare";
import Results from "./pages/Results";

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/spotify-auth" element={<SpotifyAuth />} />
    <Route path="/callback" element={<Callback />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/compare/:playlistId" element={<Compare />} />
      <Route path="/rankings/:playlistId" element={<Rankings />} /> {/* Add Rankings route */}
      <Route path="/results/:playlistId" element={<Results />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;