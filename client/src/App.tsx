import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import HowItWorks from "./pages/HowItWorks";
import Pricing from "./pages/Pricing";
import TaxAppeals from "./pages/TaxAppeals";
import About from "./pages/About";
import GetStarted from "./pages/GetStarted";
import AnalysisResults from "./pages/AnalysisResults";
import AdminDashboard from "./pages/AdminDashboard";
import ParalegalsDashboard from "./pages/ParalegalsDashboard";
import UserDashboard from "./pages/UserDashboard";
import DeadlineCalendar from "./pages/DeadlineCalendar";
import Portfolio from "./pages/Portfolio";
import PaymentHistory from "./pages/PaymentHistory";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Testimonials from "./pages/Testimonials";
import BatchProcessing from "./pages/BatchProcessing";
import AppealFilingWorkflow from "./pages/AppealFilingWorkflow";
import ReportDownload from "./pages/ReportDownload";
import FilingStatus from "./pages/FilingStatus";
import { Privacy, Terms, Disclaimer } from "./pages/LegalPages";
import LeadChatWidget from "./components/LeadChatWidget";
import ScrollProgress from "./components/ScrollProgress";

function Router() {
  // make sure to consider if you need authentication for certain routes
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
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      <Route path="/disclaimer" component={Disclaimer} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
