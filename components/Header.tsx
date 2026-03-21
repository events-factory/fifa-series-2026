import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-primary-700 shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <Link href="/" className="w-fit flex items-center gap-1">
          <span className="text-xl font-extrabold text-white tracking-wide">FIFA</span>
          <span className="text-xl font-extrabold text-white tracking-wide"> Series</span>
        </Link>
      </div>
    </header>
  );
}
