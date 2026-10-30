import { createClient } from '@/lib/supabase/server';
import FilterToggles from '@/components/filter-toggles';
import type { Filters } from '@/app/actions/filters';

const DEFAULT_FILTERS: Filters = {
  blackAndWhite: true,
  halfSpeedScroll: false,
  restrictNotifications: true,
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let streak = 120;
  let filters: Filters = DEFAULT_FILTERS;

  if (user) {
    const [{ data: profile }, { data: streakRow }] = await Promise.all([
      supabase.from('users').select('filter_settings').eq('id', user.id).single(),
      supabase.from('streaks').select('current_streak').eq('user_id', user.id).single(),
    ]);
    streak = streakRow?.current_streak ?? streak;
    filters = (profile?.filter_settings as Filters) ?? DEFAULT_FILTERS;
  }

  return (
    <div className="max-w-5xl mx-auto w-full">
      {/* Hero — lavender to amber gradient */}
      <section className="mb-16">
        <h1
          className="font-headline text-5xl md:text-7xl font-bold leading-snug mb-4"
          style={{
            background: 'linear-gradient(15deg, #cdc5f0 0%, #d4a574 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Celestial Settings
        </h1>
        <p className="text-on-surface-variant text-lg max-w-xl font-light">
          Fine-tune your environment to maintain focus and preserve the sanctuary of your digital
          life.
        </p>
      </section>

      {/* Profile + Connected services (asymmetric grid) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
        {/* Zen Identity */}
        <div className="md:col-span-7 p-8 rounded-xl bg-surface-container-low glow-edge relative overflow-hidden group">
          <div className="absolute -right-8 -top-8 w-48 h-48 nebula-gradient rounded-full blur-[80px] opacity-15 transition-opacity duration-700 group-hover:opacity-30" />
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <span className="text-on-surface-variant text-[10px] uppercase tracking-[0.2em] font-medium mb-2 block">
                User Identity
              </span>
              <h3 className="font-headline text-3xl font-bold mb-8">Alex Rivera</h3>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-tertiary font-headline text-5xl font-bold">
                  {streak} Days
                </p>
                <p className="text-on-surface-variant text-sm font-medium">Total Streak</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-tertiary/8 flex items-center justify-center zen-pulse">
                <span className="material-symbols-outlined text-tertiary text-3xl">
                  temp_preferences_custom
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Ecosystem */}
        <div className="md:col-span-5 p-8 rounded-xl bg-surface-container glow-edge flex flex-col justify-between">
          <div>
            <span className="text-on-surface-variant text-[10px] uppercase tracking-[0.2em] font-medium mb-6 block">
              Connected Ecosystem
            </span>
            <ul className="space-y-6">
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#FC4C02]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#FC4C02]">directions_run</span>
                  </div>
                  <div>
                    <p className="text-on-surface font-semibold text-sm">Strava</p>
                    <p className="text-tertiary text-[10px] font-medium">Synced</p>
                  </div>
                </div>
                <span
                  className="material-symbols-outlined text-on-surface-variant text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#FF2D55]/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#FF2D55]">favorite</span>
                  </div>
                  <div>
                    <p className="text-on-surface font-semibold text-sm">Apple Health</p>
                    <p className="text-tertiary text-[10px] font-medium">Synced</p>
                  </div>
                </div>
                <span
                  className="material-symbols-outlined text-on-surface-variant text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </li>
            </ul>
          </div>
          <button className="mt-8 py-3 w-full rounded-full border border-outline-variant/15 text-on-surface-variant text-xs font-bold uppercase tracking-widest hover:bg-surface-bright transition-colors duration-500 glow-edge">
            Manage Integration
          </button>
        </div>
      </div>

      {/* Android Focus Filter */}
      <section className="mb-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-headline text-3xl font-bold mb-2">Android Focus Filter</h2>
            <p className="text-on-surface-variant text-sm">
              Modify device behavior to reduce dopamine loops.
            </p>
          </div>
          <div className="px-4 py-2 rounded-full glass-panel glow-edge-warm">
            <span className="text-tertiary text-xs font-bold tracking-widest">ACTIVE PROTECTION</span>
          </div>
        </div>
        <FilterToggles initial={filters} authed={!!user} />
      </section>

      {/* Deep Stillness Algorithm */}
      <section className="mt-12 p-12 rounded-xl bg-gradient-to-br from-surface-container to-surface flex flex-col md:flex-row items-center gap-12 glow-edge">
        <div className="flex-1 text-center md:text-left">
          <h3 className="font-headline text-2xl font-bold mb-4">Deep Stillness Algorithm</h3>
          <p className="text-on-surface-variant leading-relaxed mb-6">
            Your current filter configuration is projected to reduce screen time by{' '}
            <span className="text-tertiary font-bold">42 minutes daily</span>. These barriers are
            not restrictions—they are the walls of your digital sanctuary.
          </p>
          <div className="flex flex-wrap gap-4 justify-center md:justify-start">
            <button className="px-8 py-3 rounded-full bg-primary text-on-primary-fixed font-bold text-sm tracking-wide transition-all duration-500 hover:scale-105 shadow-[0_4px_20px_rgba(205,197,240,0.1)]">
              Update Profile
            </button>
            <button className="px-8 py-3 rounded-full border border-outline-variant/20 text-on-surface font-semibold text-sm transition-all duration-500 hover:bg-surface-variant glow-edge">
              View Analytics
            </button>
          </div>
        </div>
        <div className="w-full md:w-1/3 aspect-square rounded-xl overflow-hidden relative bg-gradient-to-br from-secondary-container/30 to-tertiary/10 grayscale hover:grayscale-0 transition-all duration-1000">
          <div className="absolute inset-0 bg-gradient-to-br from-tertiary/15 via-surface to-secondary/15 mix-blend-overlay" />
        </div>
      </section>
    </div>
  );
}
