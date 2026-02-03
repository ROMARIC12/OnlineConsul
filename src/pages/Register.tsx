import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ClinicSelector } from '@/components/clinic/ClinicSelector';
import { Loader2, Mail, Lock, User, Phone, Heart, Building2, Stethoscope, Calendar } from 'lucide-react';

type SelectedRole = 'patient' | 'doctor' | 'secretary' | 'admin';

const SPECIALTIES = [
  'Médecine générale',
  'Cardiologie',
  'Dermatologie',
  'Gynécologie',
  'Pédiatrie',
  'Ophtalmologie',
  'ORL',
  'Neurologie',
  'Psychiatrie',
  'Rhumatologie',
  'Gastro-entérologie',
];

export default function Register() {
  const [selectedRole, setSelectedRole] = useState<SelectedRole>('patient');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Role-specific fields
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  
  // Clinic selection
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedClinicIds, setSelectedClinicIds] = useState<string[]>([]);
  
  // Consents
  const [acceptCGU, setAcceptCGU] = useState(false);
  const [acceptMedicalDisclaimer, setAcceptMedicalDisclaimer] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check for pre-selected role from RoleSelect page
  useEffect(() => {
    const storedRole = sessionStorage.getItem('selectedRole') as SelectedRole | null;
    if (storedRole && ['patient', 'doctor', 'secretary'].includes(storedRole)) {
      setSelectedRole(storedRole);
    }
  }, []);

  // Reset clinic selection when role changes
  useEffect(() => {
    setSelectedClinicId('');
    setSelectedClinicIds([]);
  }, [selectedRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 6 caractères',
      });
      return;
    }

    if (!acceptCGU || !acceptMedicalDisclaimer) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Vous devez accepter les CGU et le disclaimer médical',
      });
      return;
    }

    // Validate clinic selection for secretary
    if (selectedRole === 'secretary' && !selectedClinicId) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner un centre de santé',
      });
      return;
    }

    // Validate clinic selection for doctor
    if (selectedRole === 'doctor' && selectedClinicIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner au moins un centre de santé',
      });
      return;
    }

    setIsLoading(true);

    const redirectUrl = `${window.location.origin}/dashboard`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        },
      },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur d\'inscription',
        description: error.message === 'User already registered'
          ? 'Un compte existe déjà avec cet email'
          : error.message,
      });
      setIsLoading(false);
      return;
    }

    if (data.user) {
      try {
        // Insert role
        await supabase.from('user_roles').insert({
          user_id: data.user.id,
          role: selectedRole,
        });

        // Update profile with phone
        await supabase.from('profiles').update({ phone }).eq('id', data.user.id);

        // Insert consents
        await supabase.from('user_consents').insert([
          { user_id: data.user.id, consent_type: 'cgu' },
          { user_id: data.user.id, consent_type: 'medical_disclaimer' },
        ]);

        // Role-specific data
        if (selectedRole === 'patient') {
          await supabase.from('patients').insert({
            profile_id: data.user.id,
            date_of_birth: dateOfBirth || null,
            gender: gender || null,
            emergency_contact: emergencyContact || null,
          });
        } else if (selectedRole === 'doctor') {
          // Insert doctor data
          const { data: doctorData } = await supabase.from('doctors').insert({
            profile_id: data.user.id,
            specialty: specialty,
            license_number: licenseNumber || null,
            is_verified: false,
          }).select('id').single();

          // Associate doctor with selected clinics
          if (doctorData && selectedClinicIds.length > 0) {
            const clinicDoctorEntries = selectedClinicIds.map(clinicId => ({
              clinic_id: clinicId,
              doctor_id: doctorData.id,
              is_active: true,
            }));
            await supabase.from('clinic_doctors').insert(clinicDoctorEntries);
          }
        } else if (selectedRole === 'secretary') {
          // Associate secretary with selected clinic
          if (selectedClinicId) {
            await supabase.from('clinic_secretaries').insert({
              clinic_id: selectedClinicId,
              secretary_id: data.user.id,
              is_active: true,
            });
          }
        }

      } catch (roleError) {
        console.error('Error setting up user:', roleError);
      }
    }

    toast({
      title: 'Compte créé avec succès',
      description: 'Vous pouvez maintenant vous connecter',
    });
    sessionStorage.removeItem('selectedRole');
    navigate('/login');
    setIsLoading(false);
  };

  const getRoleTitle = () => {
    switch (selectedRole) {
      case 'patient': return 'Créer un compte Patient';
      case 'doctor': return 'Créer un compte Médecin';
      case 'secretary': return 'Créer un compte Secrétariat';
      default: return 'Créer un compte';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-primary">KôKô Santé</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              {getRoleTitle()}
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Role Selector */}
            <div className="space-y-2">
              <Label>Type de compte</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as SelectedRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Patient
                    </div>
                  </SelectItem>
                  <SelectItem value="doctor">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Médecin
                    </div>
                  </SelectItem>
                  <SelectItem value="secretary">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Secrétariat / Clinique
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Common Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="Jean"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="jean.dupont@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="07 00 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Patient-specific fields */}
            {selectedRole === 'patient' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date de naissance</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="dob"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Genre</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Homme</SelectItem>
                        <SelectItem value="F">Femme</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency">Contact d'urgence</Label>
                  <Input
                    id="emergency"
                    placeholder="Numéro d'un proche"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Doctor-specific fields */}
            {selectedRole === 'doctor' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="specialty">Spécialité</Label>
                  <Select value={specialty} onValueChange={setSpecialty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une spécialité" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((spec) => (
                        <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license">Numéro de licence</Label>
                  <Input
                    id="license"
                    placeholder="Numéro d'ordre"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                  />
                </div>
                
                {/* Clinic selection for doctors (multiple) */}
                <ClinicSelector
                  mode="multiple"
                  value={selectedClinicIds}
                  onChange={(v) => setSelectedClinicIds(v as string[])}
                  label="Centres de santé où vous exercez"
                  required
                />
              </>
            )}

            {/* Secretary-specific fields */}
            {selectedRole === 'secretary' && (
              <ClinicSelector
                mode="single"
                value={selectedClinicId}
                onChange={(v) => setSelectedClinicId(v as string)}
                label="Centre de santé de rattachement"
                required
                placeholder="Sélectionner votre centre"
              />
            )}

            {/* Password Fields */}
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Consents */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="cgu"
                  checked={acceptCGU}
                  onCheckedChange={(checked) => setAcceptCGU(checked as boolean)}
                />
                <Label htmlFor="cgu" className="text-sm leading-tight">
                  J'accepte les <a href="#" className="text-primary hover:underline">Conditions Générales d'Utilisation</a>
                </Label>
              </div>
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="medical"
                  checked={acceptMedicalDisclaimer}
                  onCheckedChange={(checked) => setAcceptMedicalDisclaimer(checked as boolean)}
                />
                <Label htmlFor="medical" className="text-sm leading-tight">
                  Je comprends que cette plateforme ne fournit pas de diagnostic ni de conseils médicaux personnalisés
                </Label>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !acceptCGU || !acceptMedicalDisclaimer}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer le compte
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
