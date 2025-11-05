import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

interface PaceZones {
  pace_1k: string;
  pace_5k: string;
  pace_10k: string;
  pace_half_marathon: string;
  pace_marathon: string;
  pace_easy: string;
  pace_interval: string;
  pace_threshold: string;
  pace_tempo: string;
  pace_long_run: string;
}

const Tools = () => {
  const [time5kMinutes, setTime5kMinutes] = useState("");
  const [time5kSeconds, setTime5kSeconds] = useState("");
  const [paceZones, setPaceZones] = useState<PaceZones | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaceZones();
  }, []);

  const fetchPaceZones = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data, error } = await supabase
        .from("pace_zones")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPaceZones({
          pace_1k: data.pace_1k,
          pace_5k: data.pace_5k,
          pace_10k: data.pace_10k,
          pace_half_marathon: data.pace_half_marathon,
          pace_marathon: data.pace_marathon,
          pace_easy: data.pace_easy,
          pace_interval: data.pace_interval,
          pace_threshold: data.pace_threshold,
          pace_tempo: data.pace_tempo,
          pace_long_run: data.pace_long_run,
        });
      }
    } catch (error: any) {
      console.error("Error fetching pace zones:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateVDOT = (totalSeconds: number): number => {
    const velocity = 5000 / (totalSeconds / 60); // meters per minute
    const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity * velocity;
    const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * totalSeconds) + 0.2989558 * Math.exp(-0.1932605 * totalSeconds);
    return vo2 / percentMax;
  };

  const formatPace = (secondsPerKm: number): string => {
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculatePaceForDistance = (vdot: number, distanceFactor: number): string => {
    // Use VDOT to calculate velocity for 5K, then adjust for other distances
    // Higher factor = slower pace (longer distance)
    const velocity5k = 5000 / (calculateVDOT(parseInt(time5kMinutes) * 60 + parseInt(time5kSeconds)) * 10); // approximate base velocity
    const adjustedVelocity = velocity5k / distanceFactor; // Lower velocity = slower pace
    
    const minutesPerKm = 1000 / adjustedVelocity;
    const secondsPerKm = minutesPerKm * 60;
    return formatPace(secondsPerKm);
  };

  const handleCalculate = async () => {
    const minutes = parseInt(time5kMinutes);
    const seconds = parseInt(time5kSeconds);

    if (!minutes || minutes < 0 || isNaN(seconds) || seconds < 0 || seconds >= 60) {
      toast.error("Ange giltig tid (minuter och sekunder)");
      return;
    }

    const totalSeconds = minutes * 60 + seconds;
    const vdot = calculateVDOT(totalSeconds);

    const pace5kSecondsPerKm = totalSeconds / 5;
    
    const zones: PaceZones = {
      pace_1k: formatPace(pace5kSecondsPerKm * 0.94),           // 6% snabbare än 5K
      pace_5k: formatPace(pace5kSecondsPerKm),                  // Direkt från inmatad 5K-tid
      pace_10k: formatPace(pace5kSecondsPerKm * 1.04),          // 4% långsammare än 5K
      pace_interval: formatPace(pace5kSecondsPerKm * 0.96),     // 4% snabbare än 5K
      pace_threshold: formatPace(pace5kSecondsPerKm * 1.03),    // 3% långsammare än 5K
      pace_tempo: formatPace(pace5kSecondsPerKm * 1.06),        // 6% långsammare än 5K
      pace_half_marathon: formatPace(pace5kSecondsPerKm * 1.09), // 9% långsammare än 5K
      pace_marathon: formatPace(pace5kSecondsPerKm * 1.15),     // 15% långsammare än 5K
      pace_easy: formatPace(pace5kSecondsPerKm * 1.22),         // 22% långsammare än 5K (Distansfart)
      pace_long_run: formatPace(pace5kSecondsPerKm * 1.32),     // 32% långsammare än 5K (Lugn/Långpass)
    };

    setPaceZones(zones);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { error } = await supabase.from("pace_zones").insert({
        user_id: user.id,
        vdot_score: Math.round(vdot),
        time_5k: totalSeconds,
        ...zones,
      });

      if (error) throw error;
      toast.success("Tempozoner sparade!");
    } catch (error: any) {
      toast.error("Kunde inte spara tempozoner");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>VDOT Tempokalkylator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Din 5K-tid</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Minuter"
                  value={time5kMinutes}
                  onChange={(e) => setTime5kMinutes(e.target.value)}
                  min="0"
                />
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Sekunder"
                  value={time5kSeconds}
                  onChange={(e) => setTime5kSeconds(e.target.value)}
                  min="0"
                  max="59"
                />
              </div>
            </div>
          </div>
          <Button onClick={handleCalculate} className="w-full">
            Beräkna tempozoner
          </Button>
        </CardContent>
      </Card>

      {paceZones && (
        <Card>
          <CardHeader>
            <CardTitle>Dina tempozoner</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="w-full">
              <AccordionItem value="race-pace">
                <AccordionTrigger className="text-sm font-semibold">
                  Tävlingstempo
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">1K</p>
                      <p className="font-semibold">{paceZones.pace_1k} min/km</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">5K</p>
                      <p className="font-semibold">{paceZones.pace_5k} min/km</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">10K</p>
                      <p className="font-semibold">{paceZones.pace_10k} min/km</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Halvmaraton</p>
                      <p className="font-semibold">{paceZones.pace_half_marathon} min/km</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted col-span-2">
                      <p className="text-xs text-muted-foreground">Maraton</p>
                      <p className="font-semibold">{paceZones.pace_marathon} min/km</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="training-zones">
                <AccordionTrigger className="text-sm font-semibold">
                  Träningszoner
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Intervall</p>
                      <p className="font-semibold">{paceZones.pace_interval} min/km</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Tröskel</p>
                      <p className="font-semibold">{paceZones.pace_threshold} min/km</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Tempo</p>
                      <p className="font-semibold">{paceZones.pace_tempo} min/km</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground">Distansfart</p>
                      <p className="font-semibold">{paceZones.pace_easy} min/km</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted col-span-2">
                      <p className="text-xs text-muted-foreground">Lugn (Långpass)</p>
                      <p className="font-semibold">{paceZones.pace_long_run} min/km</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tools;
