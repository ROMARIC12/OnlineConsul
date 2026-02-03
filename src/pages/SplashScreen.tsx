import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { user, isLoading, role } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (user && role) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/role-select', { replace: true });
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, isLoading, role, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/20 via-background to-background">
      {/* Logo animé */}
      <div className="relative">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <Heart className="h-12 w-12 text-primary" />
        </div>
        <div className="absolute inset-0 h-24 w-24 rounded-full border-2 border-primary/30 animate-ping" />
      </div>

      {/* Nom de l'app */}
      <h1 className="mt-8 text-4xl font-bold text-primary">KôKô Santé</h1>
      <p className="mt-2 text-muted-foreground">Votre santé, notre priorité</p>

      {/* Loader */}
      <div className="mt-12 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Chargement...</span>
      </div>
    </div>
  );
}
