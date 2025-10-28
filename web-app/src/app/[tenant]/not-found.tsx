export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl p-8 text-center">
      <h1 className="text-2xl font-semibold mb-2">We couldn't find that club</h1>
      <p className="text-muted-foreground mb-6">
        The tenant slug may be wrong or provisioning hasn't finished yet.
      </p>
      <a className="underline" href="/">Go home</a>
    </main>
  );
}
