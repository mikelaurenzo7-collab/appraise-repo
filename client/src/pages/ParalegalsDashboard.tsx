/**
 * Paralegals Dashboard
 * Workload management, filing tracking, and appeal status monitoring
 * Accessible only to admin users
 */

import { useState, useEffect } from "react";
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
  DollarSign,
  User,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface QueuedFiling {
  id: number;
  submissionId: number;
  status: "queued" | "in-progress" | "completed" | "failed";
  priority: number;
  assignedTo: string | null;
  deadline: Date;
  county: string;
  state: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  address: string;
  filingType: "poa" | "pro-se";
  queuedAt: Date;
  completedAt: Date | null;
}

export default function ParalegalsDashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("queue");
  const [paralegals, setParalegals] = useState<string[]>([
    "Sarah Chen",
    "Marcus Johnson",
    "Elena Rodriguez",
  ]);
  const [selectedParalegals, setSelectedParalegals] = useState<string[]>([]);

  // Mock data - replace with real tRPC queries
  const [queuedFilings] = useState<QueuedFiling[]>([
    {
      id: 1,
      submissionId: 101,
      status: "queued",
      priority: 1,
      assignedTo: null,
      deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      county: "Travis County",
      state: "TX",
      ownerName: "John Smith",
      ownerEmail: "john@example.com",
      ownerPhone: "(512) 555-0123",
      address: "123 Oak St, Austin, TX 78701",
      filingType: "poa",
      queuedAt: new Date(),
      completedAt: null,
    },
    {
      id: 2,
      submissionId: 102,
      status: "in-progress",
      priority: 2,
      assignedTo: "Sarah Chen",
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      county: "Cook County",
      state: "IL",
      ownerName: "Jane Doe",
      ownerEmail: "jane@example.com",
      ownerPhone: "(312) 555-0456",
      address: "456 Elm Ave, Chicago, IL 60601",
      filingType: "poa",
      queuedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      completedAt: null,
    },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "queued":
        return "bg-yellow-100 text-yellow-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queued":
        return <Clock size={16} />;
      case "in-progress":
        return <Loader2 size={16} className="animate-spin" />;
      case "completed":
        return <CheckCircle2 size={16} />;
      case "failed":
        return <AlertCircle size={16} />;
      default:
        return null;
    }
  };

  const handleAssignFiling = (filingId: number, paralegal: string) => {
    toast.success(`Filing #${filingId} assigned to ${paralegal}`);
  };

  const handleMarkComplete = (filingId: number) => {
    toast.success(`Filing #${filingId} marked as complete`);
  };

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

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0F172A] mb-2">
            Paralegals Dashboard
          </h1>
          <p className="text-[#64748B]">
            Manage filing queue, track deadlines, and monitor appeal progress
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B] mb-1">Queued Filings</p>
                <p className="text-3xl font-bold text-[#0F172A]">
                  {queuedFilings.filter((f) => f.status === "queued").length}
                </p>
              </div>
              <Clock size={32} className="text-yellow-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B] mb-1">In Progress</p>
                <p className="text-3xl font-bold text-[#0F172A]">
                  {queuedFilings.filter((f) => f.status === "in-progress").length}
                </p>
              </div>
              <Loader2 size={32} className="text-blue-600 animate-spin" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B] mb-1">Completed</p>
                <p className="text-3xl font-bold text-[#0F172A]">
                  {queuedFilings.filter((f) => f.status === "completed").length}
                </p>
              </div>
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#64748B] mb-1">Urgent Deadlines</p>
                <p className="text-3xl font-bold text-[#0F172A]">
                  {queuedFilings.filter(
                    (f) =>
                      new Date(f.deadline).getTime() - Date.now() <
                      7 * 24 * 60 * 60 * 1000
                  ).length}
                </p>
              </div>
              <AlertCircle size={32} className="text-red-600" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="queue">Filing Queue</TabsTrigger>
            <TabsTrigger value="workload">Team Workload</TabsTrigger>
            <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
          </TabsList>

          {/* Filing Queue Tab */}
          <TabsContent value="queue">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">
                Pending Filings
              </h2>
              <div className="space-y-4">
                {queuedFilings.map((filing) => (
                  <div
                    key={filing.id}
                    className="border border-[#E2E8F0] rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-[#0F172A]">
                            {filing.ownerName}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 ${getStatusColor(
                              filing.status
                            )}`}
                          >
                            {getStatusIcon(filing.status)}
                            {filing.status}
                          </span>
                        </div>
                        <p className="text-sm text-[#64748B] flex items-center gap-1">
                          <MapPin size={14} />
                          {filing.address}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#0F172A]">
                          {filing.county}, {filing.state}
                        </p>
                        <p className="text-xs text-[#94A3B8]">
                          {filing.filingType === "poa"
                            ? "Power of Attorney"
                            : "Pro Se"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 py-3 border-t border-b border-[#E2E8F0]">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail size={14} className="text-[#64748B]" />
                        <span className="text-[#64748B]">{filing.ownerEmail}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone size={14} className="text-[#64748B]" />
                        <span className="text-[#64748B]">{filing.ownerPhone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-[#64748B]" />
                        <span className="text-[#64748B]">
                          Due {new Date(filing.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {filing.status === "queued" && (
                        <>
                          <select
                            onChange={(e) =>
                              handleAssignFiling(filing.id, e.target.value)
                            }
                            className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded text-sm"
                          >
                            <option>Assign to paralegal...</option>
                            {paralegals.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                      {filing.status === "in-progress" && (
                        <Button
                          onClick={() => handleMarkComplete(filing.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Team Workload Tab */}
          <TabsContent value="workload">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">
                Team Workload
              </h2>
              <div className="space-y-4">
                {paralegals.map((paralegal) => {
                  const assignedCount = queuedFilings.filter(
                    (f) => f.assignedTo === paralegal
                  ).length;
                  return (
                    <div
                      key={paralegal}
                      className="border border-[#E2E8F0] rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User size={20} className="text-[#7C3AED]" />
                          <span className="font-bold text-[#0F172A]">
                            {paralegal}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-[#64748B]">
                          {assignedCount} filing{assignedCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="w-full bg-[#E2E8F0] rounded-full h-2">
                        <div
                          className="bg-[#7C3AED] h-2 rounded-full transition-all"
                          style={{
                            width: `${(assignedCount / queuedFilings.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* Deadlines Tab */}
          <TabsContent value="deadlines">
            <Card className="p-6">
              <h2 className="text-lg font-bold text-[#0F172A] mb-4">
                Upcoming Deadlines
              </h2>
              <div className="space-y-3">
                {queuedFilings
                  .sort(
                    (a, b) =>
                      new Date(a.deadline).getTime() -
                      new Date(b.deadline).getTime()
                  )
                  .map((filing) => {
                    const daysUntil = Math.ceil(
                      (new Date(filing.deadline).getTime() - Date.now()) /
                        (24 * 60 * 60 * 1000)
                    );
                    const isUrgent = daysUntil <= 7;

                    return (
                      <div
                        key={filing.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          isUrgent
                            ? "bg-red-50 border border-red-200"
                            : "bg-[#F1F5F9] border border-[#E2E8F0]"
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-[#0F172A]">
                            {filing.ownerName} - {filing.county}, {filing.state}
                          </p>
                          <p className="text-sm text-[#64748B]">
                            {filing.address}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold ${
                              isUrgent
                                ? "text-red-600"
                                : "text-[#0F172A]"
                            }`}
                          >
                            {daysUntil} days
                          </p>
                          <p className="text-xs text-[#94A3B8]">
                            {new Date(filing.deadline).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
