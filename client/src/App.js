import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/ProfilePage";
import VideoBackground from "./components/VideoBackground";
import "./App.css";
import "./components/VideoBackground.css";
import "./components/InputArea.css";

function App() {
  return (
    <Router>
      <div className="app-container">
        <VideoBackground />
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
