import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CreditCard, ShieldCheck, Truck, Wallet } from "lucide-react";
import { getDefaultRouteForRole, useAuth } from "@/lib/auth";
import { getSupabaseConfigError, isSupabaseConfigured } from "@/lib/supabase";

const roleCards = [
  {
    title: "Admin Access",
    description: "Manage fleet, monitor delivery operations, and review payment performance.",
    icon: ShieldCheck,
  },
  {
    title: "Driver Access",
    description: "Capture stops, goods delivered, payment collections, and proof images on mobile.",
    icon: Truck,
  },
  {
    title: "Finance Access",
    description: "Track collections, credits, customer ledgers, and outstanding balances.",
    icon: Wallet,
  },
];

const Login = () => {
  const navigate = useNavigate();
  const { authState, signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authState) {
      navigate(getDefaultRouteForRole(authState.role), { replace: true });
    }
  }, [authState, navigate]);

  const handleSupabaseLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await signInWithPassword(email, password);

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(133,169,71,0.22),_transparent_28%),linear-gradient(180deg,_#f7f8f4_0%,_#edf5ef_40%,_#f7f8f4_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="overflow-hidden rounded-[36px] border border-white/60 bg-[linear-gradient(135deg,_rgba(18,53,36,0.98),_rgba(62,123,85,0.9))] px-6 py-8 text-white shadow-[0_24px_80px_rgba(18,53,36,0.18)] lg:px-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              Delivery Tracker Login
            </div>
            <h1 className="mt-5 max-w-xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              Sign in to dispatch, deliver, and reconcile collections from one dashboard.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-emerald-50/85 sm:text-lg">
              This app separates operational and finance workflows while preserving a shared view of
              vehicles, invoice references, payments, credits, and outstanding balances.
            </p>

            <div className="mt-8 grid gap-4">
              {roleCards.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-[28px] border border-white/10 bg-white/10 p-5">
                  <div className="flex items-start gap-4">
                    <span className="rounded-2xl bg-white/10 p-3">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold">{title}</h2>
                      <p className="mt-1 text-sm text-emerald-50/80">{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[36px] border border-white/60 bg-white/90 p-6 shadow-[0_24px_80px_rgba(18,53,36,0.08)] backdrop-blur lg:p-8">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Cloud Access</p>
              <h2 className="mt-3 text-3xl font-semibold text-slate-950">Sign in with your work account</h2>
              <p className="mt-3 text-sm text-slate-600">
                Use the email and password from your Supabase-authenticated team account.
              </p>
            </div>

            {isSupabaseConfigured ? (
              <form onSubmit={handleSupabaseLogin} className="mt-8 space-y-4">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  placeholder="Email address"
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  placeholder="Password"
                />
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center rounded-full bg-emerald-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              <div className="mt-8 rounded-[28px] border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
                  <div>
                    <p className="font-semibold text-slate-950">Deployment setup incomplete</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {getSupabaseConfigError() ??
                        "Supabase environment variables are missing, so production login is unavailable."}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel, then redeploy.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Login;
