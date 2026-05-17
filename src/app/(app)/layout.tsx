import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: nutritionist } = await supabase
    .from('nutritionists')
    .select('full_name, role, clinic_id, clinics(name)')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userName={nutritionist?.full_name ?? user.email ?? ''}
        clinicName={(nutritionist?.clinics as unknown as { name: string } | null)?.name ?? ''}
      />
      <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--paper)' }}>
        {children}
      </main>
    </div>
  );
}
