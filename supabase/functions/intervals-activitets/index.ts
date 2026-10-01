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
    const intervalsApiKey = Deno.env.get("INTERVALS_API_KEY");

    if (!intervalsApiKey) {
      throw new Error("INTERVALS_API_KEY is not configured");
    }

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
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const url = new URL(req.url);

    const oldest = url.searchParams.get("oldest");
    const newest = url.searchParams.get("newest");

    const params = new URLSearchParams();

    if (oldest) params.set("oldest", oldest);
    if (newest) params.set("newest", newest);

    const intervalsUrl = new URL(
      "https://intervals.icu/api/v1/athlete/0/activities"
    );
    if (oldest) intervalsUrl.searchParams.set("oldest", oldest);
    if (newest) intervalsUrl.searchParams.set("newest", newest);

    const response = await fetch(intervalsUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Basic ${btoa(`API_KEY:${intervalsApiKey}`)}`,
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
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const activities = JSON.parse(responseText);

    const runs = activities.filter(
      (activity: any) =>
        activity.type === "Run" ||
        activity.type === "VirtualRun" ||
        activity.type === "TrailRun"
    );

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user.id,
        count: runs.length,
        activities: runs,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
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
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});