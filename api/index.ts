import { createApp } from "../backend/app.js";
import { supabase } from "../database/supabaseClient.js";

const app = createApp({
  supabase,
  apiOnly: true,
  serveStatic: false,
  distDir: "",
});

export default app;
