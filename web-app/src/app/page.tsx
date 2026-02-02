import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container pt-16 text-center">
      <h1 className="text-5xl font-heading font-black mb-4 uppercase italic">Team Platform</h1>
      <p className="text-xl text-muted-foreground mb-8 font-mono">
        Multi-tenant team management for grassroots sports
      </p>

      <div className="card max-w-[600px] mx-auto mb-12">
        <h2 className="text-2xl font-bold mb-4 uppercase">Demo Tenants</h2>
        <div className="flex flex-col gap-3">
          <Link href="/demo" className="btn btn-primary w-full">
            View Demo Club
          </Link>
          <Link href="/syston-tigers" className="btn btn-outline w-full">
            Syston Tigers (Example)
          </Link>
        </div>
      </div>

      <div className="mt-12">
        <Link href="/admin/onboard" className="btn btn-secondary">
          Set Up Your Club
        </Link>
      </div>
    </div>
  );
}
