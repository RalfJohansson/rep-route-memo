import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "./integrations/supabase/client.ts"; // Importera supabase

// Exponera supabase globalt för enkel felsökning i konsolen (endast under utveckling)
if (import.meta.env.DEV) {
  window.supabase = supabase;
}

createRoot(document.getElementById("root")!).render(<App />);