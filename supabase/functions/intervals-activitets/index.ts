import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: req.headers.get("Authorization") ?? "",
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Not authenticated" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Read user's intervals connection from intervals_connections table
    const { data: connection, error: connectionError } = await supabase
      .from("intervals_connections")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (connectionError || !connection) {
      return new Response(
        JSON.stringify({ error: "Intervals not connected" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { access_token, athlete_id } = connection;

    if (!access_token) {
      return new Response(
        JSON.stringify({ error: "Missing access token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const url = new URL(req.url);

    const newest =
      url.searchParams.get("newest") ??
      new Date().toISOString().slice(0, 10);

    const oldest =
      url.searchParams.get("oldest") ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

    const intervalsUrl = new URL(
      `https://intervals.icu/api/v1/athlete/${athlete_id}/activities`
    );

    intervalsUrl.searchParams.set("oldest", oldest);
    intervalsUrl.searchParams.set("newest", newest);

    const response = await fetch(intervalsUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: "application/json",
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "Intervals.icu API error:",
        response.status,
        responseText
      );

      return new Response(
        JSON.stringify({
          error: "Intervals.icu API request failed",
          status: response.status,
          details: responseText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const activities = JSON.parse(responseText);

    // Return all activities (no filtering by type)
    return new Response(
      JSON.stringify({
        success: true,
        user_id: user.id,
        count: activities.length,
        activities: activities,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("intervals-activities error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});