import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./components/Home";
import CreateMeme from "./components/CreateMeme";
import Leaderboard from "./components/Leaderboard";
import MyPage from "./components/MyPage";
import ExploreMemes from "./components/ExploreMemes";
import UserRanking from "./components/UserRanking";
import MemeDetails from "./components/MemeDetails";
import Landing from "./components/Landing";
import "./App.css";

function App() {
  const { ready } = usePrivy();

  if (!ready) {
    return <div>
      <div className="flex justify-center items-center h-screen">
        <img src="/logo.svg" alt="logo" className="w-10 h-10" />
      </div>
    </div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#FFFBEA] flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/home" element={<Home/>} />
            <Route path="/create" element={<CreateMeme />} />
            <Route path="/my-page" element={<MyPage />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/explore" element={<ExploreMemes />} />
            <Route path="/user-ranking" element={<UserRanking />} />
            <Route path="/meme/:id" element={<MemeDetails />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;