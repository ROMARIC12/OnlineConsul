import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from './AdminDashboard';
import DoctorDashboard from './DoctorDashboard';
import SecretaryDashboard from './SecretaryDashboard';
import PatientDashboard from './PatientDashboard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If role is not yet loaded, show loading
  if (!role) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Handle super_admin as admin role for dashboard access
  const effectiveRole = role === 'super_admin' ? 'admin' : role;

  switch (effectiveRole) {
    case 'admin':
      return <AdminDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'secretary':
      return <SecretaryDashboard />;
    case 'patient':
    default:
      return <PatientDashboard />;
  }
}
