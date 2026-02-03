import { useState, useEffect } from 'react';
import { DollarSign, Save, CreditCard, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PricingSettingsProps {
  doctorId: string;
}

interface DoctorSettings {
  consultation_price_min: number;
  consultation_price_max: number;
  accepts_insurance: boolean;
  accepts_mobile_money: boolean;
  bio: string;
  languages: string[];
}

export function PricingSettings({ doctorId }: PricingSettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<DoctorSettings>({
    consultation_price_min: 10000,
    consultation_price_max: 25000,
    accepts_insurance: false,
    accepts_mobile_money: true,
    bio: '',
    languages: ['Français'],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [doctorId]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('consultation_price_min, consultation_price_max, accepts_insurance, accepts_mobile_money, bio, languages')
        .eq('id', doctorId)
        .single();

      if (error) throw error;
      
      if (data) {
        setSettings({
          consultation_price_min: data.consultation_price_min || 10000,
          consultation_price_max: data.consultation_price_max || 25000,
          accepts_insurance: data.accepts_insurance || false,
          accepts_mobile_money: data.accepts_mobile_money || true,
          bio: data.bio || '',
          languages: data.languages || ['Français'],
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('doctors')
        .update({
          consultation_price_min: settings.consultation_price_min,
          consultation_price_max: settings.consultation_price_max,
          accepts_insurance: settings.accepts_insurance,
          accepts_mobile_money: settings.accepts_mobile_money,
          bio: settings.bio,
          languages: settings.languages,
        })
        .eq('id', doctorId);

      if (error) throw error;

      toast({
        title: 'Paramètres enregistrés',
        description: 'Vos tarifs et paramètres ont été mis à jour.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'enregistrer les paramètres.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageChange = (value: string) => {
    const langs = value.split(',').map(l => l.trim()).filter(Boolean);
    setSettings({ ...settings, languages: langs });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement des paramètres...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <CardTitle>Tarifs et paramètres</CardTitle>
        </div>
        <CardDescription>
          Configurez vos tarifs de consultation et modes de paiement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pricing */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Tarifs de consultation
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tarif minimum (FCFA)</Label>
              <Input
                type="number"
                value={settings.consultation_price_min}
                onChange={(e) => setSettings({
                  ...settings,
                  consultation_price_min: parseInt(e.target.value) || 0,
                })}
                min={0}
                step={1000}
              />
            </div>
            <div>
              <Label>Tarif maximum (FCFA)</Label>
              <Input
                type="number"
                value={settings.consultation_price_max}
                onChange={(e) => setSettings({
                  ...settings,
                  consultation_price_max: parseInt(e.target.value) || 0,
                })}
                min={0}
                step={1000}
              />
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Modes de paiement acceptés
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Mobile Money</p>
                <p className="text-sm text-muted-foreground">
                  Orange Money, MTN, Wave, Moov
                </p>
              </div>
              <Switch
                checked={settings.accepts_mobile_money}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  accepts_mobile_money: checked,
                })}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Assurance maladie</p>
                <p className="text-sm text-muted-foreground">
                  Prise en charge par les mutuelles
                </p>
              </div>
              <Switch
                checked={settings.accepts_insurance}
                onCheckedChange={(checked) => setSettings({
                  ...settings,
                  accepts_insurance: checked,
                })}
              />
            </div>
          </div>
        </div>

        {/* Bio & Languages */}
        <div className="space-y-4">
          <div>
            <Label>Biographie / Description</Label>
            <Textarea
              value={settings.bio}
              onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
              placeholder="Présentez-vous en quelques mots..."
              className="mt-1"
              rows={4}
            />
          </div>
          
          <div>
            <Label>Langues parlées (séparées par des virgules)</Label>
            <Input
              value={settings.languages.join(', ')}
              onChange={(e) => handleLanguageChange(e.target.value)}
              placeholder="Français, Anglais, Dioula..."
              className="mt-1"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={saveSettings} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
