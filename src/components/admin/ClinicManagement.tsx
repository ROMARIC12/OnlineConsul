import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, Edit, Phone, MapPin, Users, Accessibility } from 'lucide-react';

interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  city: string | null;
  is_public: boolean | null;
  pmr_access: boolean | null;
  created_at: string;
  doctors_count?: number;
}

export function ClinicManagement() {
  const { toast } = useToast();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClinic, setEditingClinic] = useState<Clinic | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Abidjan');
  const [isPublic, setIsPublic] = useState(true);
  const [pmrAccess, setPmrAccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchClinics = async () => {
    try {
      const { data: clinicsData } = await supabase
        .from('clinics')
        .select('*')
        .order('name');

      // Get doctor counts for each clinic
      const clinicsWithCounts = await Promise.all(
        (clinicsData || []).map(async (clinic) => {
          const { count } = await supabase
            .from('clinic_doctors')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinic.id)
            .eq('is_active', true);

          return { ...clinic, doctors_count: count || 0 };
        })
      );

      setClinics(clinicsWithCounts);
    } catch (error) {
      console.error('Error fetching clinics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClinics();
  }, []);

  const resetForm = () => {
    setName('');
    setAddress('');
    setPhone('');
    setCity('Abidjan');
    setIsPublic(true);
    setPmrAccess(false);
    setEditingClinic(null);
  };

  const handleEdit = (clinic: Clinic) => {
    setEditingClinic(clinic);
    setName(clinic.name);
    setAddress(clinic.address);
    setPhone(clinic.phone || '');
    setCity(clinic.city || 'Abidjan');
    setIsPublic(clinic.is_public ?? true);
    setPmrAccess(clinic.pmr_access ?? false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name || !address) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Le nom et l\'adresse sont requis.',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingClinic) {
        // Update
        const { error } = await supabase
          .from('clinics')
          .update({
            name,
            address,
            phone: phone || null,
            city,
            is_public: isPublic,
            pmr_access: pmrAccess,
          })
          .eq('id', editingClinic.id);

        if (error) throw error;
        toast({ title: 'Clinique mise à jour' });
      } else {
        // Create
        const { error } = await supabase
          .from('clinics')
          .insert({
            name,
            address,
            phone: phone || null,
            city,
            is_public: isPublic,
            pmr_access: pmrAccess,
          });

        if (error) throw error;
        toast({ title: 'Clinique créée' });
      }

      setDialogOpen(false);
      resetForm();
      fetchClinics();
    } catch (error: any) {
      console.error('Error saving clinic:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de sauvegarder.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Gestion des Cliniques
          </CardTitle>
          <CardDescription>
            Gérez les établissements de santé
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClinic ? 'Modifier la clinique' : 'Nouvelle clinique'}
              </DialogTitle>
              <DialogDescription>
                Remplissez les informations de l'établissement
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Nom de l'établissement</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Clinique Santé Plus"
                />
              </div>

              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Avenue de la Santé"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Abidjan"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07 00 00 00 00"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="public"
                    checked={isPublic}
                    onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                  />
                  <Label htmlFor="public">Visible publiquement</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pmr"
                    checked={pmrAccess}
                    onCheckedChange={(checked) => setPmrAccess(checked as boolean)}
                  />
                  <Label htmlFor="pmr">Accès PMR</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : clinics.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aucune clinique enregistrée</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {clinics.map((clinic) => (
                <div
                  key={clinic.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{clinic.name}</h4>
                        {clinic.pmr_access && (
                          <Badge variant="outline" className="gap-1">
                            <Accessibility className="h-3 w-3" />
                            PMR
                          </Badge>
                        )}
                        {!clinic.is_public && (
                          <Badge variant="secondary">Privé</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {clinic.address}, {clinic.city}
                        </span>
                        {clinic.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {clinic.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {clinic.doctors_count} médecin(s)
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(clinic)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
