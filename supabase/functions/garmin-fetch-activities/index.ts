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

    console.log('Fetching Garmin activities for user:', user.id, 'date:', date, 'requested activityType:', activityType);

    if (!date) {
      console.error('Error: Missing date in request body');
      throw new Error('Missing date parameter');
    }

    // Get Garmin connection
    const { data: connection, error: connectionError } = await supabaseClient
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'garmin')
      .single();

    if (connectionError || !connection) {
      console.error('Error: Garmin not connected or connection error:', connectionError);
      throw new Error('Garmin not connected');
    }

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    let accessToken = connection.access_token;

    if (connection.expires_at < now) {
      console.log('Token expired, refreshing...');
      
      // Refresh token
      const refreshResponse = await fetch('https://services.garmin.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: Deno.env.get('GARMIN_CLIENT_ID'),
          client_secret: Deno.env.get('GARMIN_CLIENT_SECRET'),
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
          redirect_uri: Deno.env.get('GARMIN_REDIRECT_URI'),
        }).toString(),
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Failed to refresh Garmin token:', refreshResponse.status, errorText);
        throw new Error(`Failed to refresh Garmin token: ${errorText}`);
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;

      // Update connection with new tokens
      const { error: updateError } = await supabaseClient
        .from('user_integrations')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token,
          expires_at: refreshData.expires_in ? Math.floor(Date.now() / 1000) + refreshData.expires_in : 0,
        })
        .eq('user_id', user.id)
        .eq('provider', 'garmin');

      if (updateError) {
        console.error('Error updating Garmin connection after refresh:', updateError);
        throw new Error('Failed to update Garmin connection after token refresh');
      }

      console.log('Token refreshed successfully');
    }

    // Parse date to get start and end of day in UTC
    const [year, month, day] = date.split('-').map(Number);
    const startOfDayUTC = new Date(Date.UTC(year, month - 1, day));
    const endOfDayUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    const startTimeInSeconds = Math.floor(startOfDayUTC.getTime() / 1000);
    const endTimeInSeconds = Math.floor(endOfDayUTC.getTime() / 1000);

    // Fetch activities from Garmin
    const activitiesResponse = await fetch(
      `https://connectapi.garmin.com/activity-service/search/activities?startTimeInSeconds=${startTimeInSeconds}&endTimeInSeconds=${endTimeInSeconds}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text();
      console.error('Failed to fetch Garmin activities:', activitiesResponse.status, errorText);
      throw new Error(`Failed to fetch Garmin activities: ${errorText}`);
    }

    const activitiesData = await activitiesResponse.json();

    // Garmin returns a list of activities under 'activities' property? Let's assume the response is { activities: [...] }
    // We'll check the structure and adjust if needed.
    const activities = activitiesData.activities || [];

    console.log('Found activities:', activities.length);

    // Map Garmin activities to the expected format
    const filteredActivities = activities
      .filter((activity: any) => {
        // Garmin activity type might be different; we'll map to Strava-like types for simplicity
        // We'll assume we have a way to map Garmin activityType to our internal categories
        // For now, we'll just pass through if activityType is not specified, or try to match
        if (!activityType) return true;
        
        // We'll need a mapping from Garmin activity type to our categories (Run, WeightTraining, etc.)
        // Since we don't have a mapping, we'll do a simple string comparison for now.
        // In a real app, we would have a mapping table.
        return activity.activityType?.toLowerCase() === activityType.toLowerCase();
      })
      .map((activity: any) => ({
        id: activity.activityId,
        name: activity.activityName || 'Unnamed Activity',
        distance: (activity.distance?.meters / 1000).toFixed(2) || '0', // Convert meters to km
        moving_time: activity.duration?.seconds || 0, // Garmin returns duration in seconds
        start_date: activity.startTimeInSeconds ? new Date(activity.startTimeInSeconds * 1000).toISOString() : new Date().toISOString(),
        type: mapGarminActivityType(activity.activityType), // Map to our internal type
      }));

    return new Response(
      JSON.stringify({ activities: filteredActivities }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in garmin-fetch-activities catch block:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to map Garmin activity type to our internal categories (Run, WeightTraining, etc.)
function mapGarminActivityType(garminType: string | undefined): string {
  if (!garminType) return 'Other';
  
  const lowerType = garminType.toLowerCase();
  if (lowerType.includes('running') || lowerType.includes('run')) {
    return 'Run';
  }
  if (lowerType.includes('walking') || lowerType.includes('walk')) {
    return 'Walk';
  }
  if (lowerType.includes('cycling') || lowerType.includes('bike')) {
    return 'Ride';
  }
  if (lowerType.includes('swimming') || lowerType.includes('swim')) {
    return 'Swim';
  }
  if (lowerType.includes('strength') || lowerType.includes('weight training')) {
    return 'WeightTraining';
  }
  // Add more mappings as needed
  return 'Other';
}