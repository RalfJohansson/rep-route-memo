import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calculator } from "lucide-react";

interface PaceZones {
  vdot_score: number;
  pace_1k: string;
  pace_5k: string;
  pace_10k: string;
  pace_half_marathon: string;
  pace_marathon: string;
  pace_easy: string;
  pace_interval: string;
  pace_threshold: string;
  pace_tempo: string;
}

const Tools = () => {
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
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
        setPaceZones(data);
      }
    } catch (error: any) {
      console.error("Error fetching pace zones:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate VDOT based on 5k time using Jack Daniels formula
  const calculateVDOT = (time5kSeconds: number): number => {
    const velocity = 5000 / time5kSeconds; // meters per second
    const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity * velocity;
    const vdot = vo2 / (1 - Math.exp(-0.012778 * time5kSeconds) * 0.8);
    return Math.round(vdot);
  };

  // Calculate pace for different distances based on VDOT
  const calculatePace = (vdot: number, distance: number): string => {
    // Simplified Jack Daniels pace calculation
    const percentVO2Max = distance <= 1600 ? 0.98 : distance <= 5000 ? 0.95 : distance <= 10000 ? 0.90 : distance <= 21097 ? 0.85 : 0.80;
    const velocity = (vdot * percentVO2Max) / 0.182258;
    const paceSeconds = distance / velocity;
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.round(paceSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateZones = async () => {
    if (!minutes || !seconds) {
      toast.error("Fyll i tid på 5k");
      return;
    }

    const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
    const vdot = calculateVDOT(totalSeconds);

    // Calculate paces for different distances and training zones
    const zones: PaceZones = {
      vdot_score: vdot,
      pace_1k: calculatePace(vdot, 1000),
      pace_5k: calculatePace(vdot, 5000),
      pace_10k: calculatePace(vdot, 10000),
      pace_half_marathon: calculatePace(vdot, 21097),
      pace_marathon: calculatePace(vdot, 42195),
      pace_easy: calculatePace(vdot * 0.65, 1000), // Easy pace (65% of VDOT)
      pace_interval: calculatePace(vdot * 0.98, 1000), // Interval pace
      pace_threshold: calculatePace(vdot * 0.88, 1000), // Threshold pace
      pace_tempo: calculatePace(vdot * 0.88, 1000), // Tempo pace (same as threshold)
    };

    setPaceZones(zones);

    // Save to database
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        toast.error("Du måste vara inloggad");
        return;
      }

      const { error } = await supabase.from("pace_zones").insert({
        user_id: user.id,
        time_5k: totalSeconds,
        ...zones,
      });

      if (error) throw error;
      toast.success("Tempozoner sparade!");
    } catch (error: any) {
      toast.error("Kunde inte spara tempozoner");
      console.error(error);
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
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            VDOT Kalkylator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Din tid på 5k</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Minuter"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="Sekunder"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                />
              </div>
            </div>
          </div>
          <Button onClick={calculateZones} className="w-full">
            Beräkna tempozoner
          </Button>
        </CardContent>
      </Card>

      {paceZones && (
        <Card>
          <CardHeader>
            <CardTitle>Dina tempozoner</CardTitle>
            <p className="text-sm text-muted-foreground">VDOT: {paceZones.vdot_score}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">1k</p>
                <p className="text-muted-foreground">{paceZones.pace_1k}/km</p>
              </div>
              <div>
                <p className="text-sm font-medium">5k</p>
                <p className="text-muted-foreground">{paceZones.pace_5k}/km</p>
              </div>
              <div>
                <p className="text-sm font-medium">10k</p>
                <p className="text-muted-foreground">{paceZones.pace_10k}/km</p>
              </div>
              <div>
                <p className="text-sm font-medium">Halvmara</p>
                <p className="text-muted-foreground">{paceZones.pace_half_marathon}/km</p>
              </div>
              <div>
                <p className="text-sm font-medium">Marathon</p>
                <p className="text-muted-foreground">{paceZones.pace_marathon}/km</p>
              </div>
              <div>
                <p className="text-sm font-medium">Distansfart</p>
                <p className="text-muted-foreground">{paceZones.pace_easy}/km</p>
              </div>
              <div>
                <p className="text-sm font-medium">Intervall</p>
                <p className="text-muted-foreground">{paceZones.pace_interval}/km</p>
              </div>
              <div>
                <p className="text-sm font-medium">Tröskel</p>
                <p className="text-muted-foreground">{paceZones.pace_threshold}/km</p>
              </div>
              <div>
                <p className="text-sm font-medium">Tempo</p>
                <p className="text-muted-foreground">{paceZones.pace_tempo}/km</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Tools;
