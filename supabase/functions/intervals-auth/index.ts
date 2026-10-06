import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    // ----- 1. Verify authenticated Supabase user -----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    const userId = user.id;

    // ----- 2. Read OAuth code from request body -----
    const { code } = await req.json();
    if (!code) {
      throw new Error("Missing authorization code");
    }

    // ----- 3. Get client credentials from secrets -----
    const clientId = Deno.env.get("INTERVALS_CLIENT_ID");
    const clientSecret = Deno.env.get("INTERVALS_CLIENT_SECRET");
    const redirectUri = "https://rep-route-memo.vercel.app/tools";

    if (!clientId || !clientSecret) {
      throw new Error("Intervals credentials not configured");
    }

    // ----- 4. Exchange code for access token -----
    const tokenResponse = await fetch("https://intervals.icu/api/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Intervals token exchange error:", errorText);
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    // Expected fields per Intervals.icu docs:
    // { access_token, token_type, expires_in (0 = long-lived), athlete: { id, firstname, lastname }, scope }
    const accessToken = tokenData.access_token;
    const athleteId = tokenData.athlete?.id;
    const scope = tokenData.scope ?? null;
    const expiresIn = Number(tokenData.expires_in) ?? 0;

    // Compute expires_at: if expires_in > 0 use it, else far future (10 years)
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresAt =
      expiresIn > 0
        ? nowSeconds + expiresIn
        : nowSeconds + 86400 * 365 * 10; // ~10 years from now

    if (!accessToken || athleteId === undefined) {
      throw new Error("Invalid token response from Intervals.icu");
    }

    // ----- 5. Upsert into public.user_integrations -----
    const { error: upsertError } = await supabase
      .from("user_integrations")
      .upsert(
        {
          user_id: userId,
          provider: "intervals",
          provider_user_id: athleteId,
          access_token: accessToken,
          refresh_token: "", // column is NOT NULL; store empty string when none
          scopes: scope,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) {
      console.error("Database error:", upsertError);
      throw new Error("Failed to store Intervals connection");
    }

    // ----- 6. Return success (no secrets) -----
    return new Response(
      JSON.stringify({
        success: true,
        athlete: { id: athleteId },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in intervals-auth:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});