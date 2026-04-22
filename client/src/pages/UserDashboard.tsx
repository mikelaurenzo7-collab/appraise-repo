import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  TrendingDown,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Gavel,
  Trophy,
  XCircle,
  FilePlus2,
  MapPin,
  DollarSign,
  Eye,
  Download,
  Share2,
  TrendingUp,
  Home,
  BarChart3,
  Award,
} from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/_core/hooks/useAuth";
import { Copy, CheckCircle } from "lucide-react";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";

type SubmissionStatus =
  | "pending"
  | "analyzing"
  | "analyzed"
  | "contacted"
  | "appeal-filed"
  | "hearing-scheduled"
  | "won"
  | "lost"
  | "withdrawn"
  | "archived";

// Mock data for demonstration
const mockReports = [
  {
    id: "1",
    address: "4521 Shoal Creek, Austin TX",
    county: "Travis County",
    status: "won" as SubmissionStatus,
    assessedValue: 687000,
    ourEstimate: 599000,
    savings: 88000,
    annualSavings: 2200,
    filingDate: new Date("2024-01-15"),
    hearingDate: new Date("2024-03-20"),
  },
  {
    id: "2",
    address: "1234 Oak Lane, Dallas TX",
    county: "Dallas County",
    status: "hearing-scheduled" as SubmissionStatus,
    assessedValue: 450000,
    ourEstimate: 380000,
    savings: 70000,
    annualSavings: 1750,
    filingDate: new Date("2024-02-01"),
    hearingDate: new Date("2024-05-15"),
  },
  {
    id: "3",
    address: "789 Maple Drive, Houston TX",
    county: "Harris County",
    status: "analyzed" as SubmissionStatus,
    assessedValue: 520000,
    ourEstimate: 445000,
    savings: 75000,
    annualSavings: 1875,
    filingDate: null,
    hearingDate: null,
  },
];

const mockMarketData = [
  { label: "Local Market Trend", value: "+2.3%", change: "up", icon: TrendingUp },
  { label: "Avg Assessment", value: "$485k", change: "neutral", icon: Home },
  { label: "Your Savings", value: "$5,825", change: "up", icon: DollarSign },
  { label: "Success Rate", value: "66.7%", change: "up", icon: Award },
];

const mockAppealTimeline = [
  {
    date: "Jan 15, 2024",
    event: "Appeal Filed",
    status: "completed" as const,
    details: {
      filingMethod: "Power of Attorney",
      county: "Travis County",
      trackingNumber: "TX-2024-001847",
      filedWith: "Travis Central Appraisal District",
      documentLink: "/documents/appeal-form-001847.pdf",
    },
  },
  {
    date: "Mar 20, 2024",
    event: "Hearing Scheduled",
    status: "completed" as const,
    details: {
      hearingLocation: "Travis CAD Hearing Room B, 8:30 AM",
      address: "8949 Burnet Rd, Austin, TX 78758",
      representation: "Our attorney will represent you",
      preparedDocuments: "Appraisal report, comparable sales analysis, market data",
      documentLink: "/documents/hearing-notice-001847.pdf",
    },
  },
  {
    date: "Apr 10, 2024",
    event: "Hearing Held",
    status: "completed" as const,
    details: {
      outcome: "Favorable - Assessment reduced",
      originalAssessment: "$687,000",
      newAssessment: "$599,000",
      reduction: "$88,000 (12.8%)",
      annualTaxSavings: "$2,200",
      notes: "Appraiser acknowledged comparable sales data was outdated",
    },
  },
  {
    date: "May 1, 2024",
    event: "Decision Received",
    status: "completed" as const,
    details: {
      decisionStatus: "APPROVED",
      effectiveDate: "2024 Tax Year",
      estimatedSavings: "$2,200 annually",
      totalSavings: "$88,000 over 40 years",
      nextSteps: "New assessment will appear on 2024 tax bill",
      documentLink: "/documents/decision-letter-001847.pdf",
    },
  },
];

const mockReferralStats = {
  totalReferrals: 12,
  commissionEarned: 4200,
  pendingCommission: 1850,
  referralLink: "https://appraiseai.com/ref/michael-lorenzo",
};

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const map: Record<SubmissionStatus, { label: string; cls: string; Icon: typeof Clock }> = {
    pending: { label: "Pending", cls: "text-slate-500", Icon: Clock },
    analyzing: { label: "Analyzing", cls: "text-purple-600", Icon: Loader2 },
    analyzed: { label: "Analyzed", cls: "text-green-600", Icon: CheckCircle2 },
    contacted: { label: "Contacted", cls: "text-blue-600", Icon: CheckCircle2 },
    "appeal-filed": { label: "Appeal Filed", cls: "text-amber-600", Icon: FilePlus2 },
    "hearing-scheduled": { label: "Hearing Scheduled", cls: "text-amber-700", Icon: Gavel },
    won: { label: "Won", cls: "text-green-700", Icon: Trophy },
    lost: { label: "Lost", cls: "text-red-600", Icon: XCircle },
    withdrawn: { label: "Withdrawn", cls: "text-slate-500", Icon: XCircle },
    archived: { label: "Archived", cls: "text-slate-400", Icon: AlertCircle },
  };
  const info = map[status] ?? { label: status, cls: "text-slate-500", Icon: AlertCircle };
  const spin = status === "analyzing";
  return (
    <div className={`flex items-center gap-2 ${info.cls}`}>
      <info.Icon size={14} className={spin ? "animate-spin" : ""} />
      {info.label}
    </div>
  );
}

export default function UserDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | "all">("all");
  const [copiedRef, setCopiedRef] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<typeof mockReports[0] | null>(null);
  const itemsPerPage = 6;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">Please log in to view your dashboard</p>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filter and search
  const filteredReports = useMemo(() => {
    return mockReports.filter((report) => {
      const matchesSearch = report.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.county.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate portfolio stats
  const stats = {
    totalProperties: mockReports.length,
    winRate: Math.round((mockReports.filter((r) => r.status === "won").length / mockReports.length) * 100),
    totalSavings: mockReports.reduce((sum, r) => sum + r.savings, 0),
    annualSavings: mockReports.reduce((sum, r) => sum + r.annualSavings, 0),
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome back, {user?.name || "User"}
          </h1>
          <p className="text-muted-foreground text-lg">
            Your property tax appeal portfolio at a glance
          </p>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <Card className="bg-card border-border p-6">
            <div className="text-sm text-muted-foreground mb-2">Total Properties</div>
            <div className="text-3xl font-bold text-foreground">{stats.totalProperties}</div>
          </Card>
          <Card className="bg-card border-border p-6">
            <div className="text-sm text-muted-foreground mb-2">Success Rate</div>
            <div className="text-3xl font-bold text-green-500">{stats.winRate}%</div>
          </Card>
          <Card className="bg-card border-border p-6">
            <div className="text-sm text-muted-foreground mb-2">Total Savings</div>
            <div className="text-3xl font-bold text-purple-500">${(stats.totalSavings / 1000).toFixed(0)}k</div>
          </Card>
          <Card className="bg-card border-border p-6">
            <div className="text-sm text-muted-foreground mb-2">Annual Savings</div>
            <div className="text-3xl font-bold text-gold-500">${stats.annualSavings.toLocaleString()}</div>
          </Card>
        </div>

        {/* Appeal Timeline + Referral Earnings Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Appeal Timeline */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-foreground mb-6">Recent Appeal Activity</h2>
            <Card className="bg-card border-border p-6">
              <div className="space-y-6">
                {mockAppealTimeline.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full ${
                          item.status === "completed" ? "bg-teal-500" : "bg-purple-600"
                        } mt-1 ring-4 ring-card`} />
                        {idx < mockAppealTimeline.length - 1 && (
                          <div className="w-0.5 h-16 bg-border mt-2" />
                        )}
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="text-sm font-bold text-foreground">{item.event}</div>
                        <div className="text-xs text-muted-foreground mb-3">{item.date}</div>

                        {/* Robust Details for Paid Users */}
                        {item.details && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/50 space-y-2">
                            {item.details.filingMethod && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Filing Method:</span>
                                <span className="font-semibold text-foreground">{item.details.filingMethod}</span>
                              </div>
                            )}
                            {item.details.county && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">County:</span>
                                <span className="font-semibold text-foreground">{item.details.county}</span>
                              </div>
                            )}
                            {item.details.trackingNumber && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Tracking #:</span>
                                <span className="font-mono font-semibold text-teal-400">{item.details.trackingNumber}</span>
                              </div>
                            )}
                            {item.details.filedWith && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Filed With:</span>
                                <span className="font-semibold text-foreground">{item.details.filedWith}</span>
                              </div>
                            )}
                            {item.details.hearingLocation && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Hearing:</span>
                                <span className="font-semibold text-foreground">{item.details.hearingLocation}</span>
                              </div>
                            )}
                            {item.details.address && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Address:</span>
                                <span className="font-semibold text-foreground">{item.details.address}</span>
                              </div>
                            )}
                            {item.details.representation && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Representation:</span>
                                <span className="font-semibold text-teal-400">{item.details.representation}</span>
                              </div>
                            )}
                            {item.details.preparedDocuments && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Documents:</span>
                                <span className="font-semibold text-foreground">{item.details.preparedDocuments}</span>
                              </div>
                            )}
                            {item.details.outcome && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Outcome:</span>
                                <span className="font-semibold text-teal-400">{item.details.outcome}</span>
                              </div>
                            )}
                            {item.details.originalAssessment && (
                              <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t border-border/50">
                                <div>
                                  <div className="text-muted-foreground">Original Assessment</div>
                                  <div className="font-bold text-foreground">{item.details.originalAssessment}</div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">New Assessment</div>
                                  <div className="font-bold text-teal-400">{item.details.newAssessment}</div>
                                </div>
                              </div>
                            )}
                            {item.details.reduction && (
                              <div className="flex justify-between text-xs font-bold mt-2 p-2 bg-teal-500/10 rounded border border-teal-500/30">
                                <span className="text-muted-foreground">Reduction:</span>
                                <span className="text-teal-400">{item.details.reduction}</span>
                              </div>
                            )}
                            {item.details.annualTaxSavings && (
                              <div className="flex justify-between text-xs font-bold mt-2 p-2 bg-gold-400/10 rounded border border-gold-400/30">
                                <span className="text-muted-foreground">Annual Tax Savings:</span>
                                <span className="text-gold-400">{item.details.annualTaxSavings}</span>
                              </div>
                            )}
                            {item.details.totalSavings && (
                              <div className="flex justify-between text-xs font-bold mt-2 p-2 bg-purple-600/10 rounded border border-purple-600/30">
                                <span className="text-muted-foreground">Total Savings (40yr):</span>
                                <span className="text-purple-400">{item.details.totalSavings}</span>
                              </div>
                            )}
                            {item.details.decisionStatus && (
                              <div className="flex justify-between text-xs font-bold mt-2 p-2 bg-teal-500/10 rounded border border-teal-500/30">
                                <span className="text-muted-foreground">Decision:</span>
                                <span className="text-teal-400">{item.details.decisionStatus}</span>
                              </div>
                            )}
                            {item.details.effectiveDate && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Effective:</span>
                                <span className="font-semibold text-foreground">{item.details.effectiveDate}</span>
                              </div>
                            )}
                            {item.details.estimatedSavings && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Est. Savings:</span>
                                <span className="font-semibold text-teal-400">{item.details.estimatedSavings}</span>
                              </div>
                            )}
                            {item.details.nextSteps && (
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Next Steps:</span>
                                <span className="font-semibold text-foreground">{item.details.nextSteps}</span>
                              </div>
                            )}
                            {item.details.notes && (
                              <div className="text-xs text-muted-foreground italic mt-2 p-2 bg-muted rounded">
                                💡 {item.details.notes}
                              </div>
                            )}
                            {item.details.documentLink && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <a
                                  href={item.details.documentLink}
                                  className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
                                >
                                  <FileText size={12} /> View Document
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Referral Earnings */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6">Referral Earnings</h2>
            <Card className="bg-gradient-to-br from-purple-600/10 to-teal-600/10 border-purple-600/30 p-6">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Earned</div>
                  <div className="text-3xl font-bold text-gold-400">${mockReferralStats.commissionEarned.toLocaleString()}</div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="text-xs text-muted-foreground mb-1">Pending Payout</div>
                  <div className="text-lg font-semibold text-foreground">${mockReferralStats.pendingCommission.toLocaleString()}</div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="text-xs text-muted-foreground mb-2">Referrals</div>
                  <div className="text-2xl font-bold text-foreground">{mockReferralStats.totalReferrals}</div>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="text-xs text-muted-foreground mb-2">Your Link</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={mockReferralStats.referralLink}
                      readOnly
                      className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded text-foreground"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(mockReferralStats.referralLink);
                        setCopiedRef(true);
                        setTimeout(() => setCopiedRef(false), 2000);
                      }}
                      className="p-1 rounded hover:bg-purple-600/20 transition-colors"
                    >
                      {copiedRef ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Market Data */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Market Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {mockMarketData.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="bg-card border-border p-6 hover:border-purple-600/50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <Icon className="w-5 h-5 text-purple-600" />
                    <span className={`text-xs font-semibold ${item.change === "up" ? "text-green-500" : "text-slate-500"}`}>
                      {item.change === "up" ? "↑" : "→"}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">{item.label}</div>
                  <div className="text-2xl font-bold text-foreground">{item.value}</div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by address or county..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-purple-600"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as SubmissionStatus | "all");
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:border-purple-600"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="analyzing">Analyzing</option>
            <option value="analyzed">Analyzed</option>
            <option value="appeal-filed">Appeal Filed</option>
            <option value="hearing-scheduled">Hearing Scheduled</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <Link href="/get-started">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <FilePlus2 className="w-4 h-4 mr-2" />
              New Analysis
            </Button>
          </Link>
        </div>

        {/* Reports Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">Your Reports</h2>
          {paginatedReports.length === 0 ? (
            <Card className="bg-card border-border p-12 text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No reports found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your filters or create a new analysis</p>
              <Link href="/get-started">
                <Button>Create Your First Analysis</Button>
              </Link>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {paginatedReports.map((report) => (
                  <Card
                    key={report.id}
                    className="bg-card border-border hover:border-purple-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-600/10 overflow-hidden"
                  >
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <h3 className="font-bold text-foreground">{report.address}</h3>
                          </div>
                          <div className="text-sm text-muted-foreground">{report.county}</div>
                        </div>
                        <div className="text-xs font-semibold">
                          <StatusBadge status={report.status} />
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border my-4" />

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Assessed</div>
                          <div className="font-bold text-foreground">${(report.assessedValue / 1000).toFixed(0)}k</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Our Estimate</div>
                          <div className="font-bold text-purple-400">${(report.ourEstimate / 1000).toFixed(0)}k</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Savings</div>
                          <div className="font-bold text-green-400">${(report.savings / 1000).toFixed(0)}k</div>
                        </div>
                      </div>

                      {/* Annual Savings & Filing Info */}
                      <div className="bg-background/50 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gold-400" />
                            <span className="text-sm text-muted-foreground">Annual Savings</span>
                          </div>
                          <span className="font-bold text-gold-400">${report.annualSavings.toLocaleString()}</span>
                        </div>
                        {report.filingDate && (
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Filed: {report.filingDate.toLocaleDateString()}</span>
                            {report.hearingDate && <span>Hearing: {report.hearingDate.toLocaleDateString()}</span>}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-background border-border hover:border-purple-600/50"
                          onClick={() => {
                            setSelectedReport(report);
                            setPreviewOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 bg-background border-border hover:border-purple-600/50"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-background border-border hover:border-purple-600/50"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((page) =>
                    page ? (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        onClick={() => handlePageChange(page)}
                        className={page === currentPage ? "bg-purple-600" : ""}
                      >
                        {page}
                      </Button>
                    ) : null
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />

      {/* Report Preview Modal */}
      {selectedReport && (
        <ReportPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          reportUrl={`/reports/${selectedReport.id}.pdf`}
          reportName={`${selectedReport.address} - Appraisal Report`}
          address={selectedReport.address}
        />
      )}
    </div>
  );
}
