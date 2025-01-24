import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div style={{ marginLeft: '64px', padding: '20px' }}>
      <h1>Welcome to Swipify</h1>
      <p>Compare and rank your favorite songs!</p>
      <Link to="/dashboard">Go to Dashboard</Link>
    </div>
  );
};

export default Home;