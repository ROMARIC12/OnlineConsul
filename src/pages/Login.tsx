import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Heart, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, user, role, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user && role) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, role, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Basic validation
    if (!email.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      setIsLoading(false);
      return;
    }

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      let errorMessage = 'Une erreur est survenue';
      
      if (signInError.message === 'Invalid login credentials') {
        errorMessage = 'Email ou mot de passe incorrect';
      } else if (signInError.message.includes('Email not confirmed')) {
        errorMessage = 'Veuillez confirmer votre email avant de vous connecter';
      } else {
        errorMessage = signInError.message;
      }
      
      setError(errorMessage);
      setIsLoading(false);
      return;
    }

    toast({
      title: 'Connexion réussie',
      description: 'Bienvenue sur KôKô Santé',
    });
    navigate('/dashboard');
    setIsLoading(false);
  };

  // Check for expected role from registration flow
  const expectedRole = sessionStorage.getItem('selectedRole');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/10 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-primary">KôKô Santé</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Connectez-vous à votre espace
              {expectedRole && (
                <span className="block mt-1 text-primary font-medium">
                  {expectedRole === 'patient' && 'Patient'}
                  {expectedRole === 'doctor' && 'Médecin'}
                  {expectedRole === 'secretary' && 'Secrétariat'}
                </span>
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
                  autoComplete="email"
                />
              </div>
            </div>
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
                  autoComplete="current-password"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Se connecter
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              Pas encore de compte ?{' '}
              <Link to="/register" className="text-primary hover:underline font-medium">
                Créer un compte
              </Link>
            </p>
            <Link 
              to="/role-select" 
              className="text-sm text-center text-muted-foreground hover:text-primary"
            >
              ← Retour au choix du profil
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
