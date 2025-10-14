import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogOut, User as UserIcon, Save } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    setEmail(user.email || "");

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setFullName(data.full_name || "");
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (error) {
      toast.error("Kunde inte uppdatera profil");
    } else {
      toast.success("Profil uppdaterad!");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Kunde inte logga ut");
    } else {
      toast.success("Du har loggats ut");
      navigate("/auth");
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-6 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-full">
            <UserIcon className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{fullName || "Min profil"}</h1>
            <p className="text-white/90">{email}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Redigera profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Namn</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ditt namn"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-post</Label>
            <Input id="email" value={email} disabled className="bg-muted" />
          </div>
          <Button
            onClick={handleUpdateProfile}
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-secondary"
          >
            <Save className="h-4 w-4 mr-2" />
            Spara ändringar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logga ut
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;