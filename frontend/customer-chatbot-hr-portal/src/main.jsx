import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./stylesheet/base.css";
import "./stylesheet/login.css";
import "./stylesheet/chat.css";
import "./stylesheet/responsive.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
