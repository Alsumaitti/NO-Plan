import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, useClerk, useUser } from "@clerk/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/lib/AppContext";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DailyPlan from "@/pages/daily-plan";
import PrayerLaw from "@/pages/prayer";
import Tracker from "@/pages/tracker";
import MasterRules from "@/pages/master-rules";
import Review from "@/pages/review";
import Strategy from "@/pages/strategy";
import Settings from "@/pages/settings";
import Onboarding from "@/pages/onboarding";
import Landing from "@/pages/landing";
import LogsHub from "@/pages/logs-hub";
import LogsPrayer from "@/pages/logs-prayer";
import LogsTriggers from "@/pages/logs-triggers";
import LogsPriorities from "@/pages/logs-priorities";
import LogsBans from "@/pages/logs-bans";
import LogsReview from "@/pages/logs-review";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const clerkProxyUrl = (import.meta.env.VITE_CLERK_PROXY_URL as string | undefined) || undefined;
const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

// Graceful fallback screen when the publishable key is missing (e.g. a fresh
// Vercel deploy where the env var has not yet been set). Prevents a blank
// white screen and tells the operator exactly what to do.
function MissingClerkKeyScreen() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-parchment px-6 text-ink">
      <div className="max-w-lg w-full bg-card border border-border rounded-2xl shadow-xl p-8 space-y-4">
        <h1 className="text-2xl font-bold">Authentication not configured</h1>
        <p className="text-muted-foreground leading-relaxed">
          This deployment is missing the <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm">VITE_CLERK_PUBLISHABLE_KEY</code> environment variable.
        </p>
        <ol className="list-decimal ms-5 space-y-2 text-sm leading-relaxed">
          <li>Open your Vercel project → <strong>Settings → Environment Variables</strong>.</li>
          <li>
            Add <code className="font-mono">VITE_CLERK_PUBLISHABLE_KEY</code> (starts with <code className="font-mono">pk_</code>)
            and <code className="font-mono">CLERK_SECRET_KEY</code> (starts with <code className="font-mono">sk_</code>)
            from <a className="underline" href="https://dashboard.clerk.com" target="_blank" rel="noreferrer">dashboard.clerk.com</a>.
          </li>
          <li>Redeploy — Vite inlines the publishable key at build time, so env changes alone will not take effect.</li>
        </ol>
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          See <code className="font-mono">DEPLOY.md</code> for the full checklist.
        </p>
      </div>
    </div>
  );
}

const clerkAppearance = {
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#C9A94A",
    colorBackground: "#FAF8F3",
    colorInputBackground: "#FFFFFF",
    colorText: "#1C1B18",
    colorTextSecondary: "#6B6657",
    colorInputText: "#1C1B18",
    colorNeutral: "#8B8272",
    borderRadius: "12px",
    fontFamily: "'Tajawal', 'Cairo', sans-serif",
    fontFamilyButtons: "'Tajawal', 'Cairo', sans-serif",
    fontSize: "15px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "shadow-xl border border-[#E8E0CC] rounded-2xl w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: { color: "#1C1B18", fontFamily: "'Tajawal', sans-serif", fontWeight: "700" },
    headerSubtitle: { color: "#6B6657" },
    formButtonPrimary: { backgroundColor: "#C9A94A", color: "#1C1B18", fontWeight: "600" },
    footerActionText: { color: "#6B6657" },
    footerActionLink: { color: "#C9A94A" },
    dividerText: { color: "#8B8272" },
    formFieldLabel: { color: "#4A4539" },
    socialButtonsBlockButtonText: { color: "#1C1B18" },
    alertText: { color: "#1C1B18" },
    formFieldSuccessText: { color: "#2D7A4F" },
    otpCodeFieldInput: { color: "#1C1B18", borderColor: "#C9A94A" },
    identityPreviewText: { color: "#1C1B18" },
    formResendCodeLink: { color: "#C9A94A" },
  },
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

// Sign-in page
function SignInPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar.
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-md">
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      </div>
    </div>
  );
}

// Sign-up page
function SignUpPage() {
  // To update login providers, app branding, or OAuth settings use the Auth
  // pane in the workspace toolbar.
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-md">
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== uid) qc.clear();
      prevUserIdRef.current = uid;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

// Authenticated app content
function AppContent() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/daily" component={DailyPlan} />
        <Route path="/prayer" component={PrayerLaw} />
        <Route path="/tracker" component={Tracker} />
        <Route path="/logs" component={LogsHub} />
        <Route path="/logs/removals" component={Tracker} />
        <Route path="/logs/prayer" component={LogsPrayer} />
        <Route path="/logs/triggers" component={LogsTriggers} />
        <Route path="/logs/priorities" component={LogsPriorities} />
        <Route path="/logs/bans" component={LogsBans} />
        <Route path="/logs/review" component={LogsReview} />
        <Route path="/master" component={MasterRules} />
        <Route path="/review" component={Review} />
        <Route path="/strategy" component={Strategy} />
        <Route path="/settings" component={Settings} />
        <Route path="/onboarding" component={Onboarding} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

// Home route - Landing for guests, Dashboard for signed-in users
function HomeRoute() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return (
    <div className="min-h-[100dvh] bg-parchment flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (isSignedIn) return <AppContent />;
  return <Landing />;
}

// Protected routes (all paths except / and auth paths)
function ProtectedRoute() {
  const { isSignedIn, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/sign-in");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded) return (
    <div className="min-h-[100dvh] bg-parchment flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isSignedIn) return null;
  return <AppContent />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey as string}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <AppProvider>
          <TooltipProvider>
            <Switch>
              <Route path="/" component={HomeRoute} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route component={ProtectedRoute} />
            </Switch>
            <Toaster />
          </TooltipProvider>
        </AppProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  if (!clerkPubKey) return <MissingClerkKeyScreen />;
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
