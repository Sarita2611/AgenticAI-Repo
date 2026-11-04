import React, { useState } from "react";
import { getStoredUser, STORAGE_KEY } from "./api.js";
import ChatPage from "./components/ChatPage.jsx";
import LoginPage from "./components/LoginPage.jsx";

export default function App() {
  const [user, setUser] = useState(getStoredUser);

  function login(nextUser) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }

  function logout() {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return user ? (
    <ChatPage user={user} onLogout={logout} />
  ) : (
    <LoginPage onLogin={login} />
  );
}
