import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Accessibility, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string | null;
  pmr_access: boolean | null;
}

interface ClinicSelectorProps {
  mode: 'single' | 'multiple';
  value: string | string[];
  onChange: (value: string | string[]) => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

export function ClinicSelector({
  mode,
  value,
  onChange,
  label = 'Centre de santé',
  required = false,
  placeholder = 'Sélectionner un centre',
}: ClinicSelectorProps) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClinics = async () => {
      setIsLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from('clinics')
        .select('id, name, address, city, pmr_access')
        // Le filtrage "public" est déjà appliqué côté DB via RLS. On ne rajoute pas de filtre ici
        // pour éviter des cas où la colonne est NULL ou où la condition diverge.
        .order('name');

      if (error) {
        console.error('ClinicSelector: failed to load clinics', error);
        setClinics([]);
        setLoadError("Impossible de charger la liste des centres");
      } else {
        setClinics(data || []);
      }

      setIsLoading(false);
    };

    fetchClinics();
  }, []);

  // Single selection mode
  if (mode === 'single') {
    return (
      <div className="space-y-2">
        {label && (
          <Label>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <Select
          value={value as string}
          onValueChange={(v) => onChange(v)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoading ? 'Chargement...' : placeholder} />
          </SelectTrigger>
          <SelectContent>
            {loadError ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {loadError}
              </div>
            ) : clinics.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Aucun centre disponible
              </div>
            ) : (
              clinics.map((clinic) => (
                <SelectItem key={clinic.id} value={clinic.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{clinic.name}</span>
                    {clinic.city && (
                      <span className="text-muted-foreground">- {clinic.city}</span>
                    )}
                    {clinic.pmr_access && (
                      <Accessibility className="h-3 w-3 text-primary" />
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Multiple selection mode
  const selectedIds = Array.isArray(value) ? value : [];

  const handleToggle = (clinicId: string) => {
    if (selectedIds.includes(clinicId)) {
      onChange(selectedIds.filter((id) => id !== clinicId));
    } else {
      onChange([...selectedIds, clinicId]);
    }
  };

  const removeClinic = (clinicId: string) => {
    onChange(selectedIds.filter((id) => id !== clinicId));
  };

  const selectedClinics = clinics.filter((c) => selectedIds.includes(c.id));

  return (
    <div className="space-y-3">
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      {/* Selected clinics badges */}
      {selectedClinics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedClinics.map((clinic) => (
            <Badge
              key={clinic.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <Building2 className="h-3 w-3" />
              {clinic.name}
              <button
                type="button"
                onClick={() => removeClinic(clinic.id)}
                className="ml-1 hover:bg-muted-foreground/20 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Clinic list with checkboxes */}
      <ScrollArea className="h-[200px] border rounded-md p-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-4">Chargement...</p>
        ) : loadError ? (
          <p className="text-center text-muted-foreground py-4">{loadError}</p>
        ) : clinics.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Aucun centre disponible
          </p>
        ) : (
          <div className="space-y-2">
            {clinics.map((clinic) => (
              <div
                key={clinic.id}
                className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`clinic-${clinic.id}`}
                  checked={selectedIds.includes(clinic.id)}
                  onCheckedChange={() => handleToggle(clinic.id)}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`clinic-${clinic.id}`}
                    className="font-medium cursor-pointer"
                  >
                    {clinic.name}
                  </Label>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {clinic.address}
                    {clinic.city && `, ${clinic.city}`}
                  </p>
                </div>
                {clinic.pmr_access && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Accessibility className="h-3 w-3" />
                    PMR
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {required && selectedIds.length === 0 && (
        <p className="text-xs text-destructive">
          Veuillez sélectionner au moins un centre
        </p>
      )}
    </div>
  );
}
