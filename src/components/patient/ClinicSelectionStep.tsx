import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, MapPin, Phone, Accessibility, Users, Search, ChevronRight } from 'lucide-react';

interface Clinic {
  id: string;
  name: string;
  address: string;
  city: string | null;
  phone: string | null;
  pmr_access: boolean | null;
  doctors_count?: number;
}

interface ClinicSelectionStepProps {
  onSelectClinic: (clinic: Clinic) => void;
  selectedClinicId?: string;
}

export function ClinicSelectionStep({ onSelectClinic, selectedClinicId }: ClinicSelectionStepProps) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        // Fetch clinics - RLS already filters to public clinics
        const { data: clinicsData, error } = await supabase
          .from('clinics')
          .select('id, name, address, city, phone, pmr_access')
          .order('name');

        if (error) {
          console.error('Error fetching clinics:', error);
          setIsLoading(false);
          return;
        }

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

        // Show all public clinics (even those without doctors yet)
        setClinics(clinicsWithCounts);

        // Extract unique cities
        const uniqueCities = [...new Set(clinicsWithCounts.map(c => c.city).filter(Boolean) as string[])];
        setCities(uniqueCities);
      } catch (error) {
        console.error('Error fetching clinics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClinics();
  }, []);

  // Filter clinics
  const filteredClinics = clinics.filter((clinic) => {
    const matchesSearch =
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.address.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCity = selectedCity === 'all' || clinic.city === selectedCity;
    
    return matchesSearch && matchesCity;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un centre de santé..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {cities.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCity === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCity('all')}
            >
              Toutes les villes
            </Button>
            {cities.map((city) => (
              <Button
                key={city}
                variant={selectedCity === city ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCity(city)}
              >
                {city}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Clinic List */}
      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Chargement des centres...</p>
          </div>
        ) : filteredClinics.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Aucun centre trouvé</p>
          </div>
        ) : (
          <div className="space-y-3 pr-4">
            {filteredClinics.map((clinic) => (
              <Card
                key={clinic.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedClinicId === clinic.id
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => onSelectClinic(clinic)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{clinic.name}</h3>
                        {clinic.pmr_access && (
                          <Badge variant="outline" className="gap-1">
                            <Accessibility className="h-3 w-3" />
                            PMR
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {clinic.address}
                          {clinic.city && `, ${clinic.city}`}
                        </p>
                        {clinic.phone && (
                          <p className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {clinic.phone}
                          </p>
                        )}
                        <p className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {clinic.doctors_count} médecin{clinic.doctors_count !== 1 ? 's' : ''} disponible{clinic.doctors_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    
                    <Button
                      variant={selectedClinicId === clinic.id ? 'default' : 'ghost'}
                      size="icon"
                      className="shrink-0"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
