import { Routes, Route } from "react-router-dom";
import Introduction from "./pages/Introduction";
import Navbar from "./components/Navbar";
import AppRoutes from "./routes";
import { useTokenRefresh } from "./hooks/useTokenRefresh";

const App = () => {
  useTokenRefresh();

  return (
    <Routes>
      {/* The introduction page (without Navbar) */}
      <Route path="/intro" element={<Introduction />} />

      {/* All other pages, wrapped with a navbar */}
      <Route path="/*" element={<Layout />} />
    </Routes>
  );
};

const Layout = () => (
  <>
    <Navbar />
    <AppRoutes />
  </>
);

export default App;