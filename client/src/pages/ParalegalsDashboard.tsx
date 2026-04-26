/**
 * Paralegals Dashboard
 * Workload management, filing tracking, and appeal status monitoring.
 * Pulls live data from trpc.admin.listFilingQueue so assignments and
 * completions round-trip to the database.
 */

import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  User,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type QueueStatus = "queued" | "in-progress" | "completed" | "blocked";

type FilingRow = {
  queueId: number;
  poaFilingId: number;
  submissionId: number;
  status: QueueStatus;
  priority: "low" | "normal" | "high" | "urgent";
  assignedTo: string | null;
  deadline: Date | null;
  queuedAt: Date;
  completedAt: Date | null;
  county: string;
  state: string;
  address: string;
  ownerEmail: string;
  ownerPhone: string | null;
  filingType: "poa" | "pro-se";
  notes: string | null;
};

const PARALEGALS = ["Sarah Chen", "Marcus Johnson", "Elena Rodriguez"];

function daysUntil(deadline: Date | null | undefined): number | null {
  if (!deadline) return null;
  const d = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function getStatusColor(status: QueueStatus | string) {
  switch (status) {
    case "queued":
      return "bg-yellow-100 text-yellow-800";
    case "in-progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "blocked":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStatusIcon(status: QueueStatus | string) {
  switch (status) {
    case "queued":
      return <Clock size={16} />;
    case "in-progress":
      return <Loader2 size={16} className="animate-spin" />;
    case "completed":
      return <CheckCircle2 size={16} />;
    case "blocked":
      return <AlertCircle size={16} />;
    default:
      return null;
  }
}

export default function ParalegalsDashboard() {
  const { user, loading } = useAuth();
  const [selectedTab, setSelectedTab] = useState("queue");

  const queueQuery = trpc.admin.listFilingQueue.useQuery(undefined, {
    enabled: user?.role === "admin",
    refetchInterval: 30_000,
  });
  const utils = trpc.useUtils();

  const assignMutation = trpc.admin.assignFiling.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(`Filing assigned to ${variables.assignedTo}`);
      utils.admin.listFilingQueue.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to assign filing"),
  });

  const completeMutation = trpc.admin.completeFiling.useMutation({
    onSuccess: () => {
      toast.success("Filing marked complete");
      utils.admin.listFilingQueue.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to mark complete"),
  });

  const filings = useMemo<FilingRow[]>(
    () => (queueQuery.data as FilingRow[] | undefined) ?? [],
    [queueQuery.data]
  );

  const counts = useMemo(() => {
    const byStatus = (s: QueueStatus) => filings.filter((f) => f.status === s).length;
    const urgent = filings.filter((f) => {
      const d = daysUntil(f.deadline);
      return d !== null && d <= 7;
    }).length;
    return {
      queued: byStatus("queued"),
      inProgress: byStatus("in-progress"),
      completed: byStatus("completed"),
      urgent,
    };
  }, [filings]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <Loader2 className="animate-spin text-[#7C3AED]" size={32} />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <Card className="p-8 max-w-md">
          <AlertCircle size={32} className="text-red-600 mb-4" />
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-[#64748B]">
            This dashboard is only available to administrators.
          </p>
        </Card>
      </div>
    );
  }

  const handleAssign = (queueId: number, paralegal: string) => {
    if (!paralegal) return;
    assignMutation.mutate({ queueId, assignedTo: paralegal });
  };

  const handleComplete = (queueId: number) => {
    completeMutation.mutate({ queueId });
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Paralegals Dashboard</h1>
          <p className="text-[#64748B]">
            Manage filing queue, track deadlines, and monitor appeal progress
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B] mb-1">Queued Filings</p>
                <p className="text-3xl font-bold text-[#0F172A]">{counts.queued}</p>
              </div>
              <Clock size={32} className="text-yellow-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B] mb-1">In Progress</p>
                <p className="text-3xl font-bold text-[#0F172A]">{counts.inProgress}</p>
              </div>
              <Loader2
                size={32}
                className={`text-blue-600 ${counts.inProgress > 0 ? "animate-spin" : ""}`}
              />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B] mb-1">Completed</p>
                <p className="text-3xl font-bold text-[#0F172A]">{counts.completed}</p>
              </div>
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B] mb-1">Urgent Deadlines</p>
                <p className="text-3xl font-bold text-[#0F172A]">{counts.urgent}</p>
              </div>
              <AlertCircle size={32} className="text-red-600" />
            </div>
          </Card>
        </div>

        {queueQuery.isLoading && (
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-10 flex items-center justify-center mb-4">
            <Loader2 className="animate-spin text-[#7C3AED]" size={28} />
          </div>
        )}

        {queueQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 mb-4">
            Could not load filing queue. Please refresh the page.
          </div>
        )}

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="queue">Filing Queue</TabsTrigger>
            <TabsTrigger value="workload">Team Workload</TabsTrigger>
            <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">Pending Filings</h2>
              {filings.length === 0 ? (
                <div className="text-center py-10">
                  <FileText size={28} className="mx-auto text-[#94A3B8] mb-3" />
                  <p className="text-sm text-[#64748B]">
                    No filings in queue. New POA filings will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filings.map((filing) => {
                    const due = daysUntil(filing.deadline);
                    const deadlineLabel = filing.deadline
                      ? `Due ${new Date(filing.deadline).toLocaleDateString()}`
                      : "No deadline set";
                    return (
                      <div
                        key={filing.queueId}
                        className="border border-[#E2E8F0] rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3 gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-bold text-[#0F172A] truncate">
                                Submission #{filing.submissionId}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 ${getStatusColor(
                                  filing.status
                                )}`}
                              >
                                {getStatusIcon(filing.status)}
                                {filing.status}
                              </span>
                              {filing.priority !== "normal" && (
                                <span className="text-xs px-2 py-1 rounded-full font-semibold bg-[#EDE9FE] text-[#6D28D9] uppercase">
                                  {filing.priority}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-[#64748B] flex items-center gap-1 truncate">
                              <MapPin size={14} />
                              {filing.address || "Unknown address"}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-[#0F172A]">
                              {filing.county}
                              {filing.state ? `, ${filing.state}` : ""}
                            </p>
                            <p className="text-xs text-[#94A3B8]">
                              {filing.filingType === "poa"
                                ? "Power of Attorney"
                                : "Pro Se"}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4 py-3 border-t border-b border-[#E2E8F0]">
                          <div className="flex items-center gap-2 text-sm min-w-0">
                            <Mail size={14} className="text-[#64748B] shrink-0" />
                            <span className="text-[#64748B] truncate">
                              {filing.ownerEmail || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm min-w-0">
                            <Phone size={14} className="text-[#64748B] shrink-0" />
                            <span className="text-[#64748B] truncate">
                              {filing.ownerPhone || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar size={14} className="text-[#64748B] shrink-0" />
                            <span
                              className={`${
                                due !== null && due <= 7
                                  ? "text-red-600 font-semibold"
                                  : "text-[#64748B]"
                              }`}
                            >
                              {deadlineLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                          <div className="text-xs text-[#94A3B8]">
                            {filing.assignedTo
                              ? `Assigned to ${filing.assignedTo}`
                              : "Unassigned"}
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {filing.status !== "completed" && (
                              <select
                                defaultValue=""
                                disabled={assignMutation.isPending}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAssign(filing.queueId, e.target.value);
                                    e.currentTarget.value = "";
                                  }
                                }}
                                className="px-3 py-2 border border-[#E2E8F0] rounded text-sm"
                              >
                                <option value="">
                                  {filing.assignedTo ? "Reassign..." : "Assign to paralegal..."}
                                </option>
                                {PARALEGALS.map((p) => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                            )}
                            {filing.status === "in-progress" && (
                              <Button
                                onClick={() => handleComplete(filing.queueId)}
                                disabled={completeMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="workload">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">Team Workload</h2>
              <div className="space-y-4">
                {PARALEGALS.map((paralegal) => {
                  const active = filings.filter(
                    (f) => f.assignedTo === paralegal && f.status !== "completed"
                  );
                  const pct = filings.length
                    ? Math.min(100, (active.length / filings.length) * 100)
                    : 0;
                  return (
                    <div
                      key={paralegal}
                      className="border border-[#E2E8F0] rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User size={20} className="text-[#7C3AED]" />
                          <span className="font-bold text-[#0F172A]">{paralegal}</span>
                        </div>
                        <span className="text-sm font-semibold text-[#64748B]">
                          {active.length} active filing{active.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="w-full bg-[#E2E8F0] rounded-full h-2">
                        <div
                          className="bg-[#7C3AED] h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="deadlines">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">Upcoming Deadlines</h2>
              {filings.filter((f) => f.deadline).length === 0 ? (
                <p className="text-sm text-[#64748B]">No deadlines set on any filings.</p>
              ) : (
                <div className="space-y-3">
                  {filings
                    .filter((f) => f.deadline)
                    .sort(
                      (a, b) =>
                        new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
                    )
                    .map((filing) => {
                      const due = daysUntil(filing.deadline);
                      const isUrgent = due !== null && due <= 7;
                      return (
                        <div
                          key={filing.queueId}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            isUrgent
                              ? "bg-red-50 border border-red-200"
                              : "bg-[#F1F5F9] border border-[#E2E8F0]"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-[#0F172A] truncate">
                              Submission #{filing.submissionId} — {filing.county}
                              {filing.state ? `, ${filing.state}` : ""}
                            </p>
                            <p className="text-sm text-[#64748B] truncate">
                              {filing.address}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-4">
                            <p
                              className={`font-bold ${
                                isUrgent ? "text-red-600" : "text-[#0F172A]"
                              }`}
                            >
                              {due !== null ? `${due} days` : "—"}
                            </p>
                            <p className="text-xs text-[#94A3B8]">
                              {filing.deadline
                                ? new Date(filing.deadline).toLocaleDateString()
                                : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
