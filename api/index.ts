import { createApp } from "../backend/app.ts";
import { supabase } from "../database/supabaseClient.js";

const app = createApp({
  supabase,
  apiOnly: true,
  serveStatic: false,
  distDir: "",
});

export default app;
