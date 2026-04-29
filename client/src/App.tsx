import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import PageErrorBoundary from "./components/PageErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LeadChatWidget from "./components/LeadChatWidget";
import ScrollProgress from "./components/ScrollProgress";
import { ShimmerCard } from "./components/ShimmerSkeleton";

// Eager: landing + 404 (instant first paint, smallest fallback surface).
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// Lazy: everything else. Each becomes its own chunk so the initial JS
// payload is the landing page only — every other route loads on demand.
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Pricing = lazy(() => import("./pages/Pricing"));
const TaxAppeals = lazy(() => import("./pages/TaxAppeals"));
const About = lazy(() => import("./pages/About"));
const GetStarted = lazy(() => import("./pages/GetStarted"));
const AnalysisResults = lazy(() => import("./pages/AnalysisResults"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ParalegalsDashboard = lazy(() => import("./pages/ParalegalsDashboard"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const DeadlineCalendar = lazy(() => import("./pages/DeadlineCalendar"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Testimonials = lazy(() => import("./pages/Testimonials"));
const BatchProcessing = lazy(() => import("./pages/BatchProcessing"));
const AppealFilingWorkflow = lazy(() => import("./pages/AppealFilingWorkflow"));
const ReportDownload = lazy(() => import("./pages/ReportDownload"));
const FilingStatus = lazy(() => import("./pages/FilingStatus"));
const LegalPrivacy = lazy(() =>
  import("./pages/LegalPages").then((m) => ({ default: m.Privacy }))
);
const LegalTerms = lazy(() =>
  import("./pages/LegalPages").then((m) => ({ default: m.Terms }))
);
const LegalDisclaimer = lazy(() =>
  import("./pages/LegalPages").then((m) => ({ default: m.Disclaimer }))
);

function RouteFallback() {
  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <ShimmerCard lines={6} />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/tax-appeals" component={TaxAppeals} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/about" component={About} />
      <Route path="/get-started" component={GetStarted} />
      <Route path="/analysis" component={AnalysisResults} />
      <Route path="/dashboard" component={UserDashboard} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/paralegals" component={ParalegalsDashboard} />
      <Route path="/deadlines" component={DeadlineCalendar} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/payments" component={PaymentHistory} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:id">
        {(params) => <BlogPost id={params.id} />}
      </Route>
      <Route path="/testimonials" component={Testimonials} />
      <Route path="/batch" component={BatchProcessing} />
      <Route path="/filing-status" component={FilingStatus} />
      <Route path="/report" component={ReportDownload} />
      <Route path="/appeal-workflow/:submissionId">
        {(params) => <AppealFilingWorkflow submissionId={params.submissionId} />}
      </Route>
      <Route path="/privacy" component={LegalPrivacy} />
      <Route path="/terms" component={LegalTerms} />
      <Route path="/disclaimer" component={LegalDisclaimer} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedShell() {
  // Per-route boundary resets when location changes, so an error on /admin
  // doesn't cascade into a permanent broken state when the user navigates away.
  const [location] = useLocation();
  return (
    <PageErrorBoundary resetKey={location}>
      <Suspense fallback={<RouteFallback />}>
        <Router />
      </Suspense>
    </PageErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <ScrollProgress />
          <RoutedShell />
          <LeadChatWidget />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
