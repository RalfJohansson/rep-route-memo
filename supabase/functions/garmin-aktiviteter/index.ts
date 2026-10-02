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

    const newest =
      url.searchParams.get("newest") ?? new Date().toISOString().slice(0, 10);

    const oldest =
      url.searchParams.get("oldest") ?? new Date().toISOString().slice(0, 10);

    const intervalsUrl = new URL(
      "https://intervals.icu/api/v1/athlete/0/activities"
    );

    intervalsUrl.searchParams.set("oldest", oldest);
    intervalsUrl.searchParams.set("newest", newest);

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

    // Filter for running activities only: Run, VirtualRun, TrailRun
    const runs = activities.filter(
      (activity: any) =>
        activity.type === "Run" ||
        activity.type === "VirtualRun" ||
        activity.type === "TrailRun"
    );

    // Map to include the fields needed by Home.tsx
    const mappedActivities = runs.map((activity: any) => ({
      id: activity.id,
      name: activity.name,
      start_date_local: activity.start_date_local,
      type: activity.type,
      distance: activity.distance,
      moving_time: activity.moving_time,
      average_speed: activity.average_speed,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      device_name: activity.device_name,
      source: activity.source,
      athlete_max_hr: activity.athlete_max_hr,
      external_id: activity.external_id,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user.id,
        oldest: oldest,
        newest: newest,
        count: mappedActivities.length,
        activities: mappedActivities,
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
    console.error("garmin-aktiviteter error:", error);

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