import Link from 'next/link';
import ModeToggle from './mode-toggle';

export default function Header() {
  return (
    <header className="max-w-xl mx-auto px-6 pt-10 pb-6">
      <div className="flex items-baseline justify-between gap-4">
        <Link href="/" className="font-headline text-xl text-ink lowercase">
          libera
        </Link>
        <Link
          href="/settings"
          className="text-sm text-ink-soft hover:text-ink hover:underline underline-offset-4"
        >
          Settings
        </Link>
      </div>

      <p className="mt-6 text-sm text-ink-soft leading-relaxed">
        Day five. Have you sat with yourself today?
      </p>

      <div className="mt-8">
        <ModeToggle />
      </div>
    </header>
  );
}
