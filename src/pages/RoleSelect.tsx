import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, User, Stethoscope, Building2, Shield, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

type Role = 'patient' | 'doctor' | 'secretary' | 'admin';

const roles: { value: Role; title: string; description: string; icon: typeof User; color: string }[] = [
  {
    value: 'patient',
    title: 'Patient',
    description: 'Prenez rendez-vous et gérez votre suivi médical',
    icon: User,
    color: 'bg-blue-500',
  },
  {
    value: 'doctor',
    title: 'Médecin',
    description: 'Gérez vos consultations et votre agenda',
    icon: Stethoscope,
    color: 'bg-green-500',
  },
  {
    value: 'secretary',
    title: 'Secrétariat / Clinique',
    description: 'Gérez les rendez-vous et l\'accueil des patients',
    icon: Building2,
    color: 'bg-amber-500',
  },
  {
    value: 'admin',
    title: 'Administrateur',
    description: 'Accès réservé aux administrateurs',
    icon: Shield,
    color: 'bg-purple-500',
  },
];

export default function RoleSelect() {
  const navigate = useNavigate();
  const { user, role: userRole, isLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Redirect if already logged in with a role
  useEffect(() => {
    if (!isLoading && user && userRole) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, userRole, isLoading, navigate]);

  const handleContinue = () => {
    if (selectedRole) {
      sessionStorage.setItem('selectedRole', selectedRole);
      navigate('/register');
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-primary">Bienvenue sur KôKô Santé</h1>
        <p className="mt-2 text-muted-foreground">Choisissez votre profil pour continuer</p>
      </div>

      {/* Role Cards */}
      <div className="grid gap-4 md:grid-cols-2 max-w-2xl w-full">
        {roles.map((role) => (
          <Card
            key={role.value}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedRole === role.value
                ? 'ring-2 ring-primary border-primary'
                : 'hover:border-primary/50'
            }`}
            onClick={() => setSelectedRole(role.value)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${role.color} flex items-center justify-center`}>
                  <role.icon className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg">{role.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{role.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 w-full max-w-md">
        <Button
          size="lg"
          className="w-full gap-2"
          disabled={!selectedRole}
          onClick={handleContinue}
        >
          Créer un compte
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full"
          onClick={handleLogin}
        >
          J'ai déjà un compte - Se connecter
        </Button>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-muted-foreground text-center max-w-md">
        En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
      </p>
    </div>
  );
}
