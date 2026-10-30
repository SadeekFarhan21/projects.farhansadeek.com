'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type Filters = {
  blackAndWhite: boolean;
  halfSpeedScroll: boolean;
  restrictNotifications: boolean;
};

export async function updateFilters(next: Filters) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('users')
    .update({ filter_settings: next })
    .eq('id', user.id);
  if (error) throw error;

  revalidatePath('/settings');
}
