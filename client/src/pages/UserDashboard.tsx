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
    </div>
  );
}
