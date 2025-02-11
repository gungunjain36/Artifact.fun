import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { usePrivy } from "@privy-io/react-auth";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import CreateMeme from "./components/CreateMeme";
import Leaderboard from "./components/Leaderboard";
import MyPage from "./components/MyPage";
import ExploreMemes from "./components/ExploreMemes";
import UserRanking from "./components/UserRanking";
import MemeDetails from "./components/MemeDetails";
import "./App.css";

import type { Theme } from '@mui/material/styles'
import { ThemeProvider } from '@mui/material/styles'
import { PasskeyArgType } from '@safe-global/protocol-kit'
import { useState } from 'react'

import LoginWithPasskey from "./components/LoginWithPasskey";
import SafeAccountDetails from "./components/SafeAccountDetails";
import SafeThemeProvider from "./components/SafeThemeProvider";
import { createPasskey, storePasskeyInLocalStorage } from "./lib/passkeys";

function App() {
  // const { ready } = usePrivy();
  const [selectedPasskey, setSelectedPasskey] = useState<PasskeyArgType>();

  async function handleCreatePasskey() {
    const passkey = await createPasskey();
    storePasskeyInLocalStorage(passkey);
    setSelectedPasskey(passkey);
  }

  async function handleSelectPasskey(passkey: PasskeyArgType) {
    setSelectedPasskey(passkey);
  }

  // if (!ready) {
  //   return (
  //     <div className="flex justify-center items-center h-screen">
  //       <img src="/logo.svg" alt="logo" className="w-10 h-10" />
  //     </div>
  //   );
  // }

  return (
    <SafeThemeProvider>
      {(safeTheme: Theme) => (
        <ThemeProvider theme={safeTheme}>
          <Router>
            <div className="min-h-screen bg-black">
              <Navbar />
              <div className="container mx-auto p-4">
                {selectedPasskey ? (
                  <SafeAccountDetails passkey={selectedPasskey} />
                ) : (
                  <LoginWithPasskey
                    handleCreatePasskey={handleCreatePasskey}
                    handleSelectPasskey={handleSelectPasskey}
                  />
                )}
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/create" element={<CreateMeme />} />
                  <Route path="/my-page" element={<MyPage />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/explore" element={<ExploreMemes />} />
                  <Route path="/user-ranking" element={<UserRanking />} />
                  <Route path="/meme/:id" element={<MemeDetails />} />
                </Routes>
              </div>
            </div>
          </Router>
        </ThemeProvider>
      )}
    </SafeThemeProvider>
  );
}

export default App;
