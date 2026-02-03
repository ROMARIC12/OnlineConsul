import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface CreateUserFormProps {
  role: AppRole;
  onSuccess: () => void;
}

export function CreateUserForm({ role, onSuccess }: CreateUserFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/dashboard`;

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Échec de la création du compte');

      const userId = authData.user.id;

      // Assign role to user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
        });

      if (roleError) throw roleError;

      // Update profile with phone
      if (phone) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ phone })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating profile with phone:', profileError);
        }
      }

      // If doctor, create doctor record
      if (role === 'doctor') {
        const { error: doctorError } = await supabase
          .from('doctors')
          .insert({
            profile_id: userId,
            specialty: specialty || 'Médecine générale',
          });

        if (doctorError) {
          console.error('Error creating doctor record:', doctorError);
        }
      }

      // If patient, create patient record
      if (role === 'patient') {
        const { error: patientError } = await supabase
          .from('patients')
          .insert({
            profile_id: userId,
          });

        if (patientError) {
          console.error('Error creating patient record:', patientError);
        }
      }

      toast({
        title: 'Utilisateur créé',
        description: `Le compte a été créé avec succès.`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de la création du compte.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Adresse email</Label>
        <Input
          id="email"
          type="email"
          placeholder="utilisateur@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Numéro de téléphone</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="07 00 00 00 00"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />
      </div>

      {role === 'doctor' && (
        <div className="space-y-2">
          <Label htmlFor="specialty">Spécialité</Label>
          <Input
            id="specialty"
            placeholder="Médecine générale"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
          />
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Créer le compte
      </Button>
    </form>
  );
}
