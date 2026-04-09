import { Suspense } from "react";
import LoginForm from "./login-form";

function LoginFallback() {
  return (
    <div className="w-full max-w-[480px]">
      <div className="rounded-lg border border-[var(--warm-200)] bg-white p-8 md:p-10">
        <p className="text-center font-body text-sm text-[var(--text-muted)]">
          Loading…
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
