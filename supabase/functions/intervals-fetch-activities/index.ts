import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error('Error: User not authenticated');
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Read user's intervals connection from intervals_connections table
    const { data: connection, error: connectionError } = await supabaseClient
      .from('intervals_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      console.error('Error: Intervals not connected or connection error:', connectionError);
      return new Response(
        JSON.stringify({ error: 'Intervals not connected' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { access_token, athlete_id } = connection;

    if (!access_token) {
      console.error('Error: Missing access_token');
      return new Response(
        JSON.stringify({ error: 'Missing access token' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body for date range parameters
    const { oldest, newest } = await req.json();

    // If not provided, fetch last 30 days
    const now = Math.floor(Date.now() / 1000);
    const defaultNewest = now;
    const defaultOldest = now - 30 * 24 * 60 * 60; // 30 days ago

    const searchOldest = oldest ?? defaultOldest;
    const searchNewest = newest ?? defaultNewest;

    console.log('Fetching Intervals activities for user:', user.id, 'athlete_id:', athlete_id);
    console.log('Date range - oldest:', new Date(searchOldest * 1000).toISOString(), 'newest:', new Date(searchNewest * 1000).toISOString());

    // Call Intervals.icu API
    const intervalsResponse = await fetch(
      `https://intervals.icu/api/v1/athlete/0/activities?oldest=${searchOldest}&newest=${searchNewest}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!intervalsResponse.ok) {
      const errorText = await intervalsResponse.text();
      console.error('Intervals.icu API error:', intervalsResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: 'Intervals.icu API request failed',
          status: intervalsResponse.status,
          details: errorText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const activities = await intervalsResponse.json();

    console.log('Found activities:', activities.length);
    console.log('Raw activity types from Intervals.icu:', activities.map((a: any) => a.type));

    // Filter for running activities: Run, VirtualRun, TrailRun
    const runningActivities = activities.filter((activity: any) => {
      const type = activity.type;
      return type === 'Run' || type === 'VirtualRun' || type === 'TrailRun';
    });

    console.log('Filtered running activities:', runningActivities.length);

    // Return activities with original Intervals.icu values (no conversion yet)
    const formattedActivities = runningActivities.map((activity: any) => ({
      id: activity.id,
      name: activity.name,
      type: activity.type,
      distance: activity.distance,
      moving_time: activity.moving_time,
      start_date_local: activity.start_date_local,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        user_id: user.id,
        count: runningActivities.length,
        activities: formattedActivities,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in intervals-fetch-activities catch block:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});