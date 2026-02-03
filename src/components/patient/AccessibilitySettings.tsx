import { useState, useEffect } from 'react';
import { Settings, Eye, Type, Volume2, Moon, Sun, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AccessibilitySettingsProps {
  onClose?: () => void;
}

interface UserPreferences {
  font_size: 'small' | 'medium' | 'large' | 'xlarge';
  high_contrast: boolean;
  use_voice_assistant: boolean;
  theme: 'light' | 'dark' | 'system';
}

const FONT_SIZES = {
  small: '14px',
  medium: '16px',
  large: '18px',
  xlarge: '20px',
};

export function AccessibilitySettings({ onClose }: AccessibilitySettingsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<UserPreferences>({
    font_size: 'medium',
    high_contrast: false,
    use_voice_assistant: false,
    theme: 'system',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  useEffect(() => {
    // Apply preferences to document
    applyPreferences();
  }, [preferences]);

  const fetchPreferences = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setPreferences({
          font_size: (data.font_size as UserPreferences['font_size']) || 'medium',
          high_contrast: data.high_contrast || false,
          use_voice_assistant: data.use_voice_assistant || false,
          theme: 'system', // Theme is handled by the system
        });
      }
    } catch (error) {
      // If no preferences exist, use defaults
      console.log('No existing preferences, using defaults');
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreferences = () => {
    // Apply font size
    document.documentElement.style.setProperty('--base-font-size', FONT_SIZES[preferences.font_size]);
    
    // Apply high contrast
    if (preferences.high_contrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    // Apply theme
    if (preferences.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (preferences.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          font_size: preferences.font_size,
          high_contrast: preferences.high_contrast,
          use_voice_assistant: preferences.use_voice_assistant,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: 'Préférences enregistrées',
        description: 'Vos paramètres d\'accessibilité ont été sauvegardés.',
      });

      onClose?.();
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'enregistrer les préférences.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getFontSizeLabel = (size: string) => {
    switch (size) {
      case 'small': return 'Petit';
      case 'medium': return 'Normal';
      case 'large': return 'Grand';
      case 'xlarge': return 'Très grand';
      default: return 'Normal';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Chargement des préférences...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <CardTitle>Accessibilité</CardTitle>
        </div>
        <CardDescription>
          Personnalisez l'affichage selon vos besoins
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Thème
          </Label>
          <RadioGroup
            value={preferences.theme}
            onValueChange={(value: 'light' | 'dark' | 'system') => 
              setPreferences({ ...preferences, theme: value })
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex items-center gap-1 cursor-pointer">
                <Sun className="h-4 w-4" />
                Clair
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex items-center gap-1 cursor-pointer">
                <Moon className="h-4 w-4" />
                Sombre
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="flex items-center gap-1 cursor-pointer">
                <Monitor className="h-4 w-4" />
                Système
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Font Size */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Taille du texte : {getFontSizeLabel(preferences.font_size)}
          </Label>
          <RadioGroup
            value={preferences.font_size}
            onValueChange={(value: 'small' | 'medium' | 'large' | 'xlarge') => 
              setPreferences({ ...preferences, font_size: value })
            }
            className="grid grid-cols-4 gap-2"
          >
            {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
              <div key={size}>
                <RadioGroupItem
                  value={size}
                  id={size}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={size}
                  className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all
                    peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5
                    hover:bg-muted/50`}
                  style={{ fontSize: FONT_SIZES[size] }}
                >
                  Aa
                </Label>
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground text-center">
            Petit → Normal → Grand → Très grand
          </p>
        </div>

        {/* High Contrast */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Eye className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Contraste élevé</p>
              <p className="text-sm text-muted-foreground">
                Améliore la lisibilité pour les malvoyants
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.high_contrast}
            onCheckedChange={(checked) => setPreferences({
              ...preferences,
              high_contrast: checked,
            })}
          />
        </div>

        {/* Voice Assistant */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Assistant vocal</p>
              <p className="text-sm text-muted-foreground">
                Lecture des textes à voix haute (bientôt disponible)
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.use_voice_assistant}
            onCheckedChange={(checked) => setPreferences({
              ...preferences,
              use_voice_assistant: checked,
            })}
            disabled
          />
        </div>

        {/* Preview */}
        <div className="p-4 border rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground mb-2">Aperçu :</p>
          <p style={{ fontSize: FONT_SIZES[preferences.font_size] }}>
            Bienvenue sur KôKô Santé. Prenez rendez-vous facilement avec nos médecins.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
          )}
          <Button onClick={savePreferences} disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
