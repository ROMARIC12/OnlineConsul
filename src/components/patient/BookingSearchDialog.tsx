import { useState, useEffect, useCallback } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface Doctor {
  id: string;
  specialty: string;
  photo_url?: string | null;
  profile?: {
    first_name: string;
    last_name: string;
  };
}

interface BookingSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectDoctor: (doctor: Doctor) => void;
}

// Floating label select component
function FloatingSelect({
  label,
  value,
  options,
  onSelect,
  onClear,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  onClear: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayValue = value || `${label} (Tout)`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-4 border border-border rounded-lg text-left flex items-center justify-between bg-background"
      >
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-sm">{displayValue}</span>
        </div>
        <div className="flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Header */}
          <div className="bg-[hsl(210,50%,50%)] text-white py-4 text-center font-medium">
            {label}
          </div>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={label}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Options */}
          <ScrollArea className="flex-1">
            <div className="divide-y">
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setIsOpen(false);
                }}
                className="w-full px-6 py-4 text-left hover:bg-muted"
              >
                Tout
              </button>
              {filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onSelect(opt);
                    setIsOpen(false);
                  }}
                  className="w-full px-6 py-4 text-left hover:bg-muted"
                >
                  {opt}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export function BookingSearchDialog({ open, onClose, onSelectDoctor }: BookingSearchDialogProps) {
  const [specialty, setSpecialty] = useState('');
  const [region, setRegion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Fetch specialties and regions
  useEffect(() => {
    const fetchFilters = async () => {
      // Fetch specialties
      const { data: doctorsData } = await supabase
        .from('doctors')
        .select('specialty')
        .eq('is_verified', true);
      
      const specs = [...new Set(doctorsData?.map(d => d.specialty).filter(Boolean) || [])];
      setSpecialties(specs);

      // Fetch regions (cities)
      const { data: clinicsData } = await supabase
        .from('clinics')
        .select('city')
        .not('city', 'is', null);
      
      const cities = [...new Set(clinicsData?.map(c => c.city).filter(Boolean) || [])];
      setRegions(cities as string[]);
    };

    if (open) {
      fetchFilters();
    }
  }, [open]);

  // Search doctors
  const searchDoctors = useCallback(async () => {
    setIsSearching(true);
    
    let query = supabase
      .from('doctors')
      .select(`
        id,
        specialty,
        photo_url,
        profile:profiles(first_name, last_name)
      `)
      .eq('is_verified', true);

    if (specialty) {
      query = query.eq('specialty', specialty);
    }

    if (searchQuery) {
      query = query.or(`specialty.ilike.%${searchQuery}%`);
    }

    const { data } = await query.limit(20);
    setDoctors(data as Doctor[] || []);
    setIsSearching(false);
    setShowResults(true);
  }, [specialty, searchQuery]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold">Prendre rendez-vous</h1>
        <div className="w-10" />
      </header>

      {showResults ? (
        // Results View
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Filters summary */}
            <div className="space-y-3">
              <FloatingSelect
                label="Nom du Professionnel ou du Cabinet, Spécialité"
                value={searchQuery}
                options={specialties}
                onSelect={(v) => {
                  setSearchQuery(v);
                  searchDoctors();
                }}
                onClear={() => {
                  setSearchQuery('');
                  searchDoctors();
                }}
              />

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-muted-foreground text-sm">Ou</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <FloatingSelect
                label="Spécialité"
                value={specialty}
                options={specialties}
                onSelect={(v) => {
                  setSpecialty(v);
                  searchDoctors();
                }}
                onClear={() => {
                  setSpecialty('');
                  searchDoctors();
                }}
              />

              <FloatingSelect
                label="Région"
                value={region}
                options={regions}
                onSelect={setRegion}
                onClear={() => setRegion('')}
              />
            </div>

            {/* Search Button */}
            <Button
              onClick={searchDoctors}
              className="w-full py-6 text-base font-medium rounded-xl bg-[hsl(0,70%,70%)] hover:bg-[hsl(0,70%,65%)] text-white border-0"
            >
              Trouver un professionnel de santé
            </Button>

            {/* Results */}
            {isSearching ? (
              <div className="py-8 text-center text-muted-foreground">
                Recherche...
              </div>
            ) : (
              <div className="space-y-2 pt-4">
                {doctors.map((doctor) => {
                  const fullName = `${doctor.profile?.first_name || ''} ${doctor.profile?.last_name || ''}`.trim();
                  const initials = `${doctor.profile?.first_name?.[0] || ''}${doctor.profile?.last_name?.[0] || ''}`;
                  
                  return (
                    <button
                      key={doctor.id}
                      onClick={() => onSelectDoctor(doctor)}
                      className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={doctor.photo_url || undefined} />
                        <AvatarFallback className="bg-[hsl(210,30%,85%)] text-[hsl(210,30%,35%)]">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{fullName ? `Pr ${fullName}` : 'Dr'}</p>
                        <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      ) : (
        // Initial Search Form
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <FloatingSelect
              label="Nom du Professionnel ou du Cabinet, Spécialité"
              value={searchQuery}
              options={specialties}
              onSelect={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-sm">Ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <FloatingSelect
              label="Spécialité"
              value={specialty}
              options={specialties}
              onSelect={setSpecialty}
              onClear={() => setSpecialty('')}
            />

            <FloatingSelect
              label="Région"
              value={region}
              options={regions}
              onSelect={setRegion}
              onClear={() => setRegion('')}
            />

            <Button
              onClick={searchDoctors}
              className="w-full py-6 text-base font-medium rounded-xl bg-[hsl(0,70%,70%)] hover:bg-[hsl(0,70%,65%)] text-white border-0"
            >
              Trouver un professionnel de santé
            </Button>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
