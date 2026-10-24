import Link from 'next/link';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import ThemeToggle from '@/components/ThemeToggle';

export default function InfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-card/90 px-4 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between"><Link href="/" aria-label="KazaVibe home"><Logo size={30} /></Link>
          <div className="flex items-center gap-2"><ThemeToggle /><Link href="/login" className="btn-ghost btn-sm">Log in</Link><Link href="/register" className="btn btn-sm">Sign up</Link></div></div>
      </header>
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
