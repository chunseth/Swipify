import Navbar from "./components/Navbar";
import AppRoutes from "./routes";
import { useTokenRefresh } from './hooks/useTokenRefresh';

const App = () => {
  useTokenRefresh();
  
  return (
    <div>
      <Navbar />
      <AppRoutes />
    </div>
  );
};

export default App;