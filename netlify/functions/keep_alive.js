// Scheduled Netlify Function — runs every 5 days to prevent Supabase free-tier pausing.
// Configured in netlify.toml under [functions.keep_alive].

const { createClient } = require("@supabase/supabase-js");

exports.handler = async function () {
  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: "missing env vars" };
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    await supabase.from("user_data").select("user_id").limit(1);
    console.log("keep_alive: Supabase pinged successfully");
    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("keep_alive error:", err.message);
    return { statusCode: 500, body: err.message };
  }
};
