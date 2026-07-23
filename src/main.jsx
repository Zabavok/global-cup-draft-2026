import React from "react";
import { createRoot } from "react-dom/client";
import DraftGame from "../app/page.jsx";
import "../app/globals.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DraftGame />
  </React.StrictMode>,
);
