import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  FileText,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Share2,
  Plus,
} from "lucide-react";
import { Link } from "wouter";

// Mock data for demonstration
const mockReports = [
  {
    id: "sub-001",
    address: "4521 Shoal Creek, Austin TX",
    county: "Travis County",
    status: "won",
    assessedValue: 687000,
    ourEstimate: 599000,
    savings: 88000,
    annualSavings: 2200,
    filingDate: "2026-02-15",
    hearingDate: "2026-04-10",
    tier: "poa",
  },
  {
    id: "sub-002",
    address: "1847 Oak Ridge, Dallas TX",
    county: "Dallas County",
    status: "hearing_scheduled",
    assessedValue: 450000,
    ourEstimate: 425000,
    savings: 25000,
    annualSavings: 625,
    filingDate: "2026-03-01",
    hearingDate: "2026-05-20",
    tier: "poa",
  },
  {
    id: "sub-003",
    address: "2156 Park Avenue, Chicago IL",
    county: "Cook County",
    status: "filed",
    assessedValue: 520000,
    ourEstimate: 480000,
    savings: 40000,
    annualSavings: 1000,
    filingDate: "2026-03-10",
    hearingDate: null,
    tier: "pro_se",
  },
  {
    id: "sub-004",
    address: "892 Elm Street, New York NY",
    county: "New York County",
    status: "pending",
    assessedValue: 1200000,
    ourEstimate: 1050000,
    savings: 150000,
    annualSavings: 3750,
    filingDate: null,
    hearingDate: null,
    tier: "poa",
  },
];

const statusConfig = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-700", icon: Clock },
  filed: { label: "Filed", color: "bg-blue-500/20 text-blue-700", icon: FileText },
  hearing_scheduled: { label: "Hearing Scheduled", color: "bg-purple-500/20 text-purple-700", icon: Calendar },
  won: { label: "Won", color: "bg-green-500/20 text-green-700", icon: CheckCircle2 },
  lost: { label: "Lost", color: "bg-red-500/20 text-red-700", icon: AlertCircle },
};

export default function PortfolioDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const itemsPerPage = 6;

  // Calculate portfolio stats
  const stats = useMemo(() => {
    const totalReports = mockReports.length;
    const wonReports = mockReports.filter((r) => r.status === "won").length;
    const totalSavings = mockReports.reduce((sum, r) => sum + r.annualSavings, 0);
    const totalAssessed = mockReports.reduce((sum, r) => sum + r.assessedValue, 0);
    const avgSavingsPerProperty = totalReports > 0 ? totalSavings / totalReports : 0;

    return {
      totalReports,
      wonReports,
      winRate: totalReports > 0 ? Math.round((wonReports / totalReports) * 100) : 0,
      totalSavings,
      totalAssessed,
      avgSavingsPerProperty,
    };
  }, []);

  // Filter and sort reports
  const filteredReports = useMemo(() => {
    let filtered = mockReports.filter((report) => {
      const matchesSearch =
        report.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.county.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "savings-high":
          return b.annualSavings - a.annualSavings;
        case "savings-low":
          return a.annualSavings - b.annualSavings;
        case "date-desc":
          return new Date(b.filingDate || "2099").getTime() - new Date(a.filingDate || "2099").getTime();
        case "date-asc":
          return new Date(a.filingDate || "2099").getTime() - new Date(b.filingDate || "2099").getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, statusFilter, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Handle report selection
  const toggleReportSelection = (reportId: string) => {
    setSelectedReports((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedReports.length === paginatedReports.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(paginatedReports.map((r) => r.id));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Sign in to view your portfolio</h1>
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur">
        <div className="container py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black text-foreground mb-2">Portfolio Dashboard</h1>
              <p className="text-muted-foreground">Manage your property tax appeals across all states</p>
            </div>
            <Link href="/get-started">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                New Analysis
              </Button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-purple-600/20 to-purple-600/5 border-purple-600/30 p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Properties</div>
              <div className="text-3xl font-black text-purple-400">{stats.totalReports}</div>
            </Card>
            <Card className="bg-gradient-to-br from-green-600/20 to-green-600/5 border-green-600/30 p-4">
              <div className="text-sm text-muted-foreground mb-1">Appeals Won</div>
              <div className="text-3xl font-black text-green-400">{stats.wonReports}</div>
              <div className="text-xs text-muted-foreground mt-1">{stats.winRate}% success rate</div>
            </Card>
            <Card className="bg-gradient-to-br from-gold-600/20 to-gold-600/5 border-gold-600/30 p-4">
              <div className="text-sm text-muted-foreground mb-1">Annual Savings</div>
              <div className="text-3xl font-black text-gold-400">${(stats.totalSavings / 1000).toFixed(1)}k</div>
            </Card>
            <Card className="bg-gradient-to-br from-teal-600/20 to-teal-600/5 border-teal-600/30 p-4">
              <div className="text-sm text-muted-foreground mb-1">Avg Savings/Property</div>
              <div className="text-3xl font-black text-teal-400">${(stats.avgSavingsPerProperty / 1000).toFixed(1)}k</div>
            </Card>
            <Card className="bg-gradient-to-br from-blue-600/20 to-blue-600/5 border-blue-600/30 p-4">
              <div className="text-sm text-muted-foreground mb-1">Total Assessed Value</div>
              <div className="text-3xl font-black text-blue-400">${(stats.totalAssessed / 1000000).toFixed(1)}M</div>
            </Card>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="border-b border-border bg-card/30 backdrop-blur">
        <div className="container py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by address or county..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background border-border"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="filed">Filed</SelectItem>
                <SelectItem value="hearing_scheduled">Hearing Scheduled</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="savings-high">Highest Savings</SelectItem>
                <SelectItem value="savings-low">Lowest Savings</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground flex items-center justify-end">
              {filteredReports.length} of {mockReports.length} properties
            </div>
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="container py-8">
        {paginatedReports.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold text-foreground mb-2">No reports found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or search query</p>
            <Link href="/get-started">
              <Button>Create Your First Analysis</Button>
            </Link>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {paginatedReports.map((report) => {
              const statusInfo = statusConfig[report.status as keyof typeof statusConfig];
              const StatusIcon = statusInfo.icon;

              return (
                <Card
                  key={report.id}
                  className="bg-card border-border hover:border-purple-600/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-600/10 overflow-hidden group"
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
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo.label}
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
                        <div className="text-xs text-muted-foreground mb-1">Potential Savings</div>
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
                          <span>Filed: {new Date(report.filingDate).toLocaleDateString()}</span>
                          {report.hearingDate && <span>Hearing: {new Date(report.hearingDate).toLocaleDateString()}</span>}
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
                        View Report
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
              );
            })}
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
  );
}
