import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ScrollProgress from "./components/ScrollProgress";
import LeadChatWidget from "./components/LeadChatWidget";

// Critical path — loaded eagerly (above-the-fold conversion pages)
import Home from "./pages/Home";
import GetStarted from "./pages/GetStarted";
import AnalysisResults from "./pages/AnalysisResults";

// All other pages — lazy loaded for bundle splitting
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Pricing = lazy(() => import("./pages/Pricing"));
const TaxAppeals = lazy(() => import("./pages/TaxAppeals"));
const About = lazy(() => import("./pages/About"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ParalegalsDashboard = lazy(() => import("./pages/ParalegalsDashboard"));
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
const AppealScoring = lazy(() => import("./pages/AppealScoring"));
const PhotoAnalysis = lazy(() => import("./pages/PhotoAnalysis"));
const CountyGuides = lazy(() => import("./pages/CountyGuides"));
const ReferralProgram = lazy(() => import("./pages/ReferralProgram"));

// Named exports from LegalPages — each gets its own lazy chunk
const Privacy = lazy(() =>
  import("./pages/LegalPages").then((mod) => ({ default: mod.Privacy }))
);
const Terms = lazy(() =>
  import("./pages/LegalPages").then((mod) => ({ default: mod.Terms }))
);
const Disclaimer = lazy(() =>
  import("./pages/LegalPages").then((mod) => ({ default: mod.Disclaimer }))
);

// Minimal spinner shown during lazy chunk load
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="w-8 h-8 rounded-full border-2 border-[#7C3AED] border-t-transparent animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/appeal-scoring" component={AppealScoring} />
        <Route path="/photo-analysis" component={PhotoAnalysis} />
        <Route path="/referral" component={ReferralProgram} />
        <Route path="/county-guides" component={CountyGuides} />
        <Route path="/county-guides/:stateCode" component={CountyGuides} />
        <Route path="/county-guides/:stateCode/:countySlug" component={CountyGuides} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/disclaimer" component={Disclaimer} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <ScrollProgress />
          <Router />
          <LeadChatWidget />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
