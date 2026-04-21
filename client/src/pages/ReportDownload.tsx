import { useEffect, useMemo, useState } from "react";
import { useSearch, Link } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Download,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/lib/trpc";

type JobStatus =
  | "queued"
  | "generating"
  | "completed"
  | "failed"
  | "expired"
  | string;

function formatBytes(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: JobStatus }) {
  const map: Record<string, { label: string; bg: string; fg: string; Icon: typeof Clock }> = {
    queued: { label: "Queued", bg: "bg-amber-100", fg: "text-amber-800", Icon: Clock },
    generating: { label: "Generating", bg: "bg-blue-100", fg: "text-blue-800", Icon: Loader2 },
    completed: { label: "Ready", bg: "bg-green-100", fg: "text-green-800", Icon: CheckCircle2 },
    failed: { label: "Failed", bg: "bg-red-100", fg: "text-red-800", Icon: AlertTriangle },
    expired: { label: "Expired", bg: "bg-slate-200", fg: "text-slate-700", Icon: AlertTriangle },
  };
  const info = map[status] ?? { label: status, bg: "bg-slate-100", fg: "text-slate-700", Icon: Clock };
  const spin = status === "generating";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${info.bg} ${info.fg}`}>
      <info.Icon size={12} className={spin ? "animate-spin" : ""} />
      {info.label}
    </span>
  );
}

export default function ReportDownload() {
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const jobId = params.get("jobId") ? parseInt(params.get("jobId")!, 10) : null;
  const submissionId = params.get("submissionId")
    ? parseInt(params.get("submissionId")!, 10)
    : null;

  const hasIdentifier = jobId !== null || submissionId !== null;

  // Poll job status every 5s while queued/generating
  const statusQuery = trpc.payments.getReportJobStatus.useQuery(
    { jobId: jobId! },
    {
      enabled: hasIdentifier && jobId !== null,
      refetchInterval: (query) => {
        const s = query.state.data?.status;
        return s === "queued" || s === "generating" ? 5000 : false;
      },
    }
  );

  const downloadQuery = trpc.payments.getReportDownloadUrl.useQuery(
    jobId !== null ? { jobId } : { submissionId: submissionId! },
    {
      enabled:
        hasIdentifier &&
        (statusQuery.data?.status === "completed" || (submissionId !== null && jobId === null)),
      retry: false,
    }
  );

  const [triggered, setTriggered] = useState(false);
  const [reportPreferences, setReportPreferences] = useState({
    includePhotos: true,
    includeComparables: true,
    format: "pdf" as const,
  });
  useEffect(() => {
    if (downloadQuery.data?.url && !triggered) {
      setTriggered(true);
      // Auto-trigger the download once the URL is available
      const a = document.createElement("a");
      a.href = downloadQuery.data.url;
      a.download = downloadQuery.data.fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }, [downloadQuery.data, triggered]);

  if (!hasIdentifier) {
    return (
      <div className="min-h-screen bg-[#F1F5F9]">
        <Navbar />
        <div className="container py-20 max-w-xl">
          <div className="p-8 rounded-xl bg-white shadow-lg text-center">
            <AlertTriangle size={32} className="text-amber-500 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">Missing report identifier</h1>
            <p className="text-slate-600 mb-6">
              Open the link from your completion email, or go back to your dashboard to find the report.
            </p>
            <Link href="/dashboard" className="btn-gold inline-flex items-center justify-center gap-2 px-6 py-3 rounded font-semibold">
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const status = statusQuery.data?.status as JobStatus | undefined;
  const isPolling = status === "queued" || status === "generating";
  const failed = status === "failed" || status === "expired";
  const completed = status === "completed" || (jobId === null && submissionId !== null);

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <Navbar />

      <section className="container py-20 max-w-2xl">
        <div className="p-8 rounded-xl bg-white shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <FileText size={28} className="text-[#7C3AED]" />
              <h1 className="font-display text-2xl font-bold">Appraisal Report</h1>
            </div>
            {status && <StatusBadge status={status} />}
          </div>

          {statusQuery.isLoading && jobId !== null && (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 size={16} className="animate-spin" /> Loading job status…
            </div>
          )}

          {statusQuery.error && jobId !== null && (
            <div className="p-4 rounded bg-red-50 text-red-700 text-sm">
              {statusQuery.error.message}
            </div>
          )}

          {!isPolling && !failed && completed && (
            <div className="mb-6 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-4">Report Preferences</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportPreferences.includePhotos}
                    onChange={(e) =>
                      setReportPreferences({ ...reportPreferences, includePhotos: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-slate-700">Include property photos</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportPreferences.includeComparables}
                    onChange={(e) =>
                      setReportPreferences({ ...reportPreferences, includeComparables: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-slate-700">Include comparable sales analysis</span>
                </label>
              </div>
            </div>
          )}

          {isPolling && (
            <div className="text-slate-600">
              <p className="mb-2">
                Your 50–60 page certified report is being generated. This typically takes a few
                minutes but is guaranteed within 24 hours.
              </p>
              <p className="text-sm text-slate-500">
                You can safely close this page — we&apos;ll email you when it&apos;s ready.
              </p>
              {statusQuery.data?.retryCount ? (
                <p className="text-xs text-amber-600 mt-3">
                  Retrying (attempt {statusQuery.data.retryCount + 1} / {statusQuery.data.maxRetries + 1})…
                </p>
              ) : null}
            </div>
          )}

          {failed && (
            <div className="text-slate-700">
              <div className="p-4 rounded bg-red-50 text-red-700 text-sm mb-4">
                {statusQuery.data?.errorMessage ||
                  (status === "expired"
                    ? "This report request expired before it could be generated."
                    : "Report generation failed.")}
              </div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 rounded border border-slate-300 hover:bg-slate-50"
              >
                Back to dashboard
              </Link>
            </div>
          )}

          {completed && (
            <div>
              <p className="text-slate-700 mb-4">
                Your report is ready. {downloadQuery.isFetching ? "Preparing secure download…" : ""}
              </p>

              {downloadQuery.isLoading && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 size={16} className="animate-spin" /> Generating signed download URL…
                </div>
              )}

              {downloadQuery.error && (
                <div className="p-4 rounded bg-red-50 text-red-700 text-sm">
                  {downloadQuery.error.message}
                </div>
              )}

              {downloadQuery.data && (
                <div className="space-y-4">
                  <div className="p-4 rounded bg-slate-50 border border-slate-200">
                    <div className="text-sm font-semibold truncate">{downloadQuery.data.fileName}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {formatBytes(downloadQuery.data.sizeBytes)}
                      {downloadQuery.data.completedAt
                        ? ` · Generated ${new Date(downloadQuery.data.completedAt).toLocaleString()}`
                        : ""}
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <a
                      href={downloadQuery.data.url}
                      download={downloadQuery.data.fileName}
                      rel="noopener"
                      className="btn-gold inline-flex items-center gap-2 px-6 py-3 rounded font-semibold"
                    >
                      <Download size={16} /> Download PDF
                    </a>
                    <button
                      onClick={() => downloadQuery.refetch()}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded border border-slate-300 hover:bg-slate-50"
                    >
                      <RefreshCw size={14} /> Regenerate link
                    </button>
                  </div>

                  <p className="text-xs text-slate-500">
                    The signed download link is short-lived for security. If the download fails,
                    click &ldquo;Regenerate link&rdquo; to mint a new one.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-slate-500">
          Need help?{" "}
          <Link href="/dashboard" className="text-[#7C3AED] hover:underline">
            View all your reports
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
