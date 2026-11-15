import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
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

    // Fetch the Intervals access token before deleting the local connection
    const { data: connection, error: fetchError } = await supabase
      .from("intervals_connections")
      .select("access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let revoked = false;
    let revokeError: string | null = null;

    if (connection?.access_token) {
      // Call Intervals.icu disconnect endpoint to revoke the token
      try {
        const revokeResponse = await fetch(
          "https://intervals.icu/api/v1/disconnect-app",
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${connection.access_token}`,
            },
          }
        );

        if (revokeResponse.ok) {
          revoked = true;
        } else {
          revokeError = `Intervals returned status ${revokeResponse.status}`;
        }
      } catch (err) {
        revokeError = `Network error calling Intervals disconnect: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // Delete the local connection regardless of revocation result
    const { error: deleteError } = await supabase
      .from("intervals_connections")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Database error:", deleteError);
      throw new Error("Failed to disconnect Intervals");
    }

    return new Response(
      JSON.stringify({
        success: true,
        revoked,
        revokeError,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in intervals-disconnect:", error);
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