import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Lock } from 'lucide-react';

export default function Profile() {
  return (
    <>
      <DashboardHeader title="Mon Profil" />
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <Tabs defaultValue="info" className="w-full max-w-2xl">
          <TabsList className="mb-6">
            <TabsTrigger value="info" className="gap-2">
              <User className="h-4 w-4" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="password" className="gap-2">
              <Lock className="h-4 w-4" />
              Mot de passe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
                <CardDescription>
                  Modifiez vos informations de profil
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Changer le mot de passe</CardTitle>
                <CardDescription>
                  Mettez à jour votre mot de passe pour sécuriser votre compte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PasswordChangeForm />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
