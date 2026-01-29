import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import PlayerPage from "./pages/PlayerPage";
import Footer from "./components/Footer/Footer";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/player/:platform/:name" element={<PlayerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Footer GLOBAL (fuera de Routes) */}
      <Footer />
    </>
  );
}
