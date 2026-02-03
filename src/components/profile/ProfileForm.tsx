import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Camera } from 'lucide-react';

export function ProfileForm() {
  const { profile, user, refreshUserData } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const { toast } = useToast();

  // Fetch photo URL based on role
  useEffect(() => {
    const fetchPhotoUrl = async () => {
      if (!user) return;
      
      // Try to get from doctors table first
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('photo_url')
        .eq('profile_id', user.id)
        .single();
      
      if (doctorData?.photo_url) {
        setPhotoUrl(doctorData.photo_url);
      }
    };
    
    fetchPhotoUrl();
  }, [user]);

  // Update local state when profile loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name);
      setLastName(profile.last_name);
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner une image.',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'L\'image ne doit pas dépasser 5 Mo.',
      });
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      // Use user id as folder name to match storage policy
      const filePath = `${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newPhotoUrl = publicUrl.publicUrl;
      setPhotoUrl(newPhotoUrl);

      // Update doctor photo_url if user is a doctor
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (doctorData) {
        await supabase
          .from('doctors')
          .update({ photo_url: newPhotoUrl })
          .eq('id', doctorData.id);
      }

      toast({
        title: 'Photo mise à jour',
        description: 'Votre photo de profil a été enregistrée.',
      });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de télécharger la photo.',
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profil mis à jour',
        description: 'Vos informations ont été enregistrées.',
      });

      refreshUserData?.();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le profil.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photo Upload */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarImage src={photoUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
            {isUploadingPhoto ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={isUploadingPhoto}
            />
          </label>
        </div>
        <p className="text-sm text-muted-foreground">
          Cliquez sur l'icône pour changer votre photo
        </p>
      </div>

      {/* Name Fields (Read-only as per user request) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            value={firstName}
            disabled
            className="bg-muted cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">Non modifiable</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={lastName}
            disabled
            className="bg-muted cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">Non modifiable</p>
        </div>
      </div>

      {/* Email (Read-only) */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={user?.email || ''}
          disabled
          className="bg-muted cursor-not-allowed"
        />
        <p className="text-xs text-muted-foreground">Non modifiable</p>
      </div>

      {/* Phone (Editable) */}
      <div className="space-y-2">
        <Label htmlFor="phone">Numéro de téléphone</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+225 XX XX XX XX XX"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Enregistrer les modifications
      </Button>
    </form>
  );
}
