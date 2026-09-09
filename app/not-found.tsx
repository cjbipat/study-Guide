import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <Logo className="mx-auto h-14 w-14" />
        <p className="mt-6 text-sm font-bold uppercase tracking-widest text-primary">
          404
        </p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight">
          This card isn&apos;t in the deck
        </h1>
        <p className="mt-3 text-muted">
          The page you&apos;re after doesn&apos;t exist or moved.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button href="/dashboard" size="lg">
            Go to dashboard
          </Button>
          <Button href="/" variant="outline" size="lg">
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
