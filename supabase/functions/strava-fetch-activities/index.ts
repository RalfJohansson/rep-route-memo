import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      console.error('Error: User not authenticated');
      throw new Error('Not authenticated');
    }

    const { date, activityType } = await req.json(); // Destructure activityType

    if (!date) {
      console.error('Error: Missing date in request body');
      throw new Error('Missing date parameter');
    }

    console.log('Fetching Strava activities for user:', user.id, 'date:', date, 'activityType:', activityType);

    // Get Strava connection
    const { data: connection, error: connectionError } = await supabaseClient
      .from('strava_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connectionError || !connection) {
      console.error('Error: Strava not connected or connection error:', connectionError);
      throw new Error('Strava not connected');
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    let accessToken = connection.access_token;

    if (connection.expires_at < now) {
      console.log('Token expired, refreshing...');
      
      // Refresh token
      const refreshResponse = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: Deno.env.get('STRAVA_CLIENT_ID'),
          client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Failed to refresh Strava token:', refreshResponse.status, errorText);
        throw new Error(`Failed to refresh Strava token: ${errorText}`);
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update connection with new tokens
      const { error: updateError } = await supabaseClient
        .from('strava_connections')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: refreshData.expires_at,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating Strava connection after refresh:', updateError);
        throw new Error('Failed to update Strava connection after token refresh');
      }

      console.log('Token refreshed successfully');
    }

    // Parse date to get start and end of day in UTC
    // Construct date directly in UTC to avoid local timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const startOfDayUTC = new Date(Date.UTC(year, month - 1, day)); // month is 0-indexed
    const endOfDayUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const after = Math.floor(startOfDayUTC.getTime() / 1000);
    const before = Math.floor(endOfDayUTC.getTime() / 1000);

    console.log('Fetching activities between UTC timestamps:', new Date(after * 1000).toISOString(), 'and', new Date(before * 1000).toISOString());

    // Fetch activities from Strava
    const activitiesResponse = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text();
      console.error('Failed to fetch Strava activities:', activitiesResponse.status, errorText);
      throw new Error(`Failed to fetch Strava activities: ${errorText}`);
    }

    const activities = await activitiesResponse.json();

    console.log('Found activities:', activities.length);

    // Filter activities based on activityType and format data
    const filteredActivities = activities
      .filter((activity: any) => {
        if (activityType) {
          return activity.type === activityType;
        }
        return true; // If no specific type is requested, return all
      })
      .map((activity: any) => ({
        id: activity.id,
        name: activity.name,
        distance: (activity.distance / 1000).toFixed(2), // Convert meters to km
        moving_time: activity.moving_time, // Time in seconds
        start_date: activity.start_date_local,
        type: activity.type,
      }));

    return new Response(
      JSON.stringify({ activities: filteredActivities }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in strava-fetch-activities catch block:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});