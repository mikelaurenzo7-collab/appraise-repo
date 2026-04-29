/**
 * Per-route error boundary.
 *
 * Catches errors thrown by a single page component so a crash in one route
 * (e.g. AdminDashboard) doesn't take down the whole SPA. The root
 * ErrorBoundary remains the last line of defense; this one renders a
 * compact, friendly message inside the existing page layout instead of a
 * full-screen stack trace.
 *
 * Resets automatically when the user navigates to a new route by way of the
 * `resetKey` prop, which we pass the current location.
 */

import { Component, ReactNode } from "react";
import { Link } from "wouter";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  /** Pass a value (e.g. current pathname) that changes when the route changes. */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="flex flex-col items-center w-full max-w-md text-center">
          <AlertTriangle size={40} className="text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            Something went wrong on this page
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            We logged the error. You can reload to try again or head back to the homepage.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
              )}
            >
              <RotateCcw size={16} />
              Try again
            </button>
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "border border-border hover:bg-muted cursor-pointer"
              )}
            >
              <Home size={16} />
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default PageErrorBoundary;
