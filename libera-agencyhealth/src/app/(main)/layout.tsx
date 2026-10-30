import Sidebar from '@/components/sidebar';
import Topbar from '@/components/topbar';
import BottomNav from '@/components/bottom-nav';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <div className="flex min-h-screen pt-24 pb-20 md:pb-0">
        <Sidebar />
        <main className="flex-1 px-6 md:px-12 py-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
      <BottomNav />
    </>
  );
}
