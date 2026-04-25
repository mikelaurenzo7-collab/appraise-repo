/**
 * Photo Analysis Dashboard
 * AI-powered property photo analysis with defect detection,
 * cost-to-cure estimates, and annotation visualization.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation, useSearch } from "wouter";
import {
  Camera, AlertTriangle, CheckCircle2, ArrowLeft,
  Loader2, Upload, DollarSign, Wrench, Eye,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState, useRef } from "react";
import { toast } from "sonner";

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    major: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    minor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    cosmetic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[severity] || colors.minor}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function DefectCard({ defect }: { defect: any }) {
  return (
    <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white">{defect.category}</h4>
          <p className="text-xs text-white/50 mt-1">{defect.description}</p>
        </div>
        <SeverityBadge severity={defect.severity} />
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1 text-green-400">
          <DollarSign size={12} />
          <span>${defect.estimatedCost?.toLocaleString() || "N/A"}</span>
        </div>
        <div className="flex items-center gap-1 text-white/50">
          <Wrench size={12} />
          <span>{defect.repairType || "General repair"}</span>
        </div>
      </div>
      {defect.impactOnValue && (
        <div className="text-xs text-white/40">
          Value impact: {defect.impactOnValue}
        </div>
      )}
    </div>
  );
}

export default function PhotoAnalysis() {
  const { user, loading: authLoading } = useAuth();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const submissionId = Number(params.get("id"));
  const [, navigate] = useLocation();
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photosQuery = trpc.user.getPhotos.useQuery(
    { submissionId },
    { enabled: !!submissionId && !!user }
  );

  const uploadMutation = trpc.payments.uploadPhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo uploaded successfully");
      photosQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const analyzeMutation = trpc.user.analyzePhoto.useMutation({
    onSuccess: () => {
      toast.success("Photo analysis complete");
      photosQuery.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[oklch(0.13_0.03_270)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[oklch(0.72_0.19_310)]" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[oklch(0.13_0.03_270)]">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Sign in to view photo analysis</h1>
        </div>
      </div>
    );
  }

  if (!submissionId) {
    return (
      <div className="min-h-screen bg-[oklch(0.13_0.03_270)]">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No submission selected</h1>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const photos = photosQuery.data || [];
  const selectedPhoto = photos[selectedPhotoIndex] as any;

  const totalCostToCure = photos.reduce((sum: number, p: any) => {
    return sum + (p.defects || []).reduce((s: number, d: any) => s + (d.estimatedCost || 0), 0);
  }, 0);

  const totalDefects = photos.reduce((sum: number, p: any) => sum + (p.defects || []).length, 0);

  const criticalDefects = photos.reduce((sum: number, p: any) => {
    return sum + (p.defects || []).filter((d: any) => d.severity === "critical").length;
  }, 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > 16 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 16MB limit`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        await uploadMutation.mutateAsync({
          submissionId,
          fileName: file.name,
          fileData: base64,
          category: "exterior",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(0.13_0.03_270)]">
      <Navbar />
      <div className="container py-12">
        <button
          onClick={() => navigate(`/analysis?id=${submissionId}`)}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={16} />Back to Analysis
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Photo Analysis</h1>
            <p className="text-white/60">AI-powered defect detection and cost-to-cure estimation</p>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending} className="bg-[oklch(0.72_0.19_310)] hover:bg-[oklch(0.65_0.19_310)] text-white">
              {uploadMutation.isPending ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Upload size={16} className="mr-2" />}
              Upload Photos
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-[oklch(0.18_0.03_270)] border-white/10">
            <CardContent className="py-4 flex items-center gap-3">
              <Camera size={24} className="text-[oklch(0.72_0.19_310)]" />
              <div><div className="text-2xl font-bold text-white">{photos.length}</div><div className="text-xs text-white/50">Photos</div></div>
            </CardContent>
          </Card>
          <Card className="bg-[oklch(0.18_0.03_270)] border-white/10">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle size={24} className="text-yellow-400" />
              <div><div className="text-2xl font-bold text-white">{totalDefects}</div><div className="text-xs text-white/50">Defects Found</div></div>
            </CardContent>
          </Card>
          <Card className="bg-[oklch(0.18_0.03_270)] border-white/10">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle size={24} className="text-red-400" />
              <div><div className="text-2xl font-bold text-white">{criticalDefects}</div><div className="text-xs text-white/50">Critical Issues</div></div>
            </CardContent>
          </Card>
          <Card className="bg-[oklch(0.18_0.03_270)] border-white/10">
            <CardContent className="py-4 flex items-center gap-3">
              <DollarSign size={24} className="text-green-400" />
              <div><div className="text-2xl font-bold text-white">${totalCostToCure.toLocaleString()}</div><div className="text-xs text-white/50">Total Cost-to-Cure</div></div>
            </CardContent>
          </Card>
        </div>

        {photosQuery.isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[oklch(0.72_0.19_310)]" size={32} />
            <span className="ml-3 text-white/60">Loading photos...</span>
          </div>
        ) : photos.length === 0 ? (
          <Card className="bg-[oklch(0.18_0.03_270)] border-white/10">
            <CardContent className="py-16 text-center">
              <Camera size={48} className="mx-auto mb-4 text-white/20" />
              <h3 className="text-lg font-semibold text-white mb-2">No Photos Yet</h3>
              <p className="text-white/50 mb-6">Upload property photos to get AI-powered defect analysis and cost-to-cure estimates.</p>
              <Button onClick={() => fileInputRef.current?.click()} className="bg-[oklch(0.72_0.19_310)] hover:bg-[oklch(0.65_0.19_310)] text-white">
                <Upload size={16} className="mr-2" />Upload Your First Photo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Photo Thumbnails */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Photos ({photos.length})</h3>
              {photos.map((photo: any, index: number) => (
                <div key={photo.id} onClick={() => setSelectedPhotoIndex(index)}
                  className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${index === selectedPhotoIndex ? "border-[oklch(0.72_0.19_310)] shadow-lg shadow-[oklch(0.72_0.19_310)]/20" : "border-white/10 hover:border-white/30"}`}>
                  <div className="aspect-video bg-[oklch(0.18_0.03_270)] relative">
                    {photo.url ? <img src={photo.url} alt={photo.fileName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Camera size={24} className="text-white/20" /></div>}
                    {(photo.defects || []).length > 0 && <div className="absolute top-2 right-2 bg-red-500/80 text-white text-xs px-2 py-0.5 rounded-full">{photo.defects.length} defects</div>}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2"><span className="text-xs text-white/80">{photo.category || "Uncategorized"}</span></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Photo Detail */}
            <div className="lg:col-span-2 space-y-6">
              {selectedPhoto && (
                <>
                  <Card className="bg-[oklch(0.18_0.03_270)] border-white/10">
                    <CardContent className="p-0">
                      <div className="aspect-video bg-black relative rounded-t-lg overflow-hidden">
                        {selectedPhoto.url ? <img src={selectedPhoto.url} alt={selectedPhoto.fileName} className="w-full h-full object-contain" /> : <div className="w-full h-full flex items-center justify-center"><Camera size={48} className="text-white/20" /></div>}
                      </div>
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-white">{selectedPhoto.fileName}</h3>
                          <p className="text-xs text-white/50">Category: {selectedPhoto.category || "Uncategorized"}</p>
                        </div>
                        <div className="flex gap-2">
                          {!selectedPhoto.analyzed && (
                            <Button size="sm" onClick={() => analyzeMutation.mutate({ photoId: selectedPhoto.id })} disabled={analyzeMutation.isPending} className="bg-[oklch(0.72_0.19_310)] hover:bg-[oklch(0.65_0.19_310)] text-white">
                              {analyzeMutation.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Eye size={14} className="mr-1" />}Analyze
                            </Button>
                          )}
                          {selectedPhoto.analyzed && <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={14} />Analyzed</span>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {selectedPhoto.aiDescription && (
                    <Card className="bg-[oklch(0.18_0.03_270)] border-white/10">
                      <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><Eye size={16} className="text-[oklch(0.72_0.19_310)]" />AI Analysis</CardTitle></CardHeader>
                      <CardContent><p className="text-sm text-white/70 leading-relaxed">{selectedPhoto.aiDescription}</p></CardContent>
                    </Card>
                  )}

                  {(selectedPhoto.defects || []).length > 0 && (
                    <Card className="bg-[oklch(0.18_0.03_270)] border-white/10">
                      <CardHeader><CardTitle className="text-white text-sm flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-400" />Detected Defects ({selectedPhoto.defects.length})</CardTitle></CardHeader>
                      <CardContent className="space-y-3">{selectedPhoto.defects.map((defect: any, i: number) => <DefectCard key={i} defect={defect} />)}</CardContent>
                    </Card>
                  )}

                  {selectedPhoto.analyzed && (selectedPhoto.defects || []).length === 0 && (
                    <Card className="bg-[oklch(0.18_0.03_270)] border-white/10">
                      <CardContent className="py-8 text-center"><CheckCircle2 size={32} className="mx-auto mb-3 text-green-400" /><p className="text-sm text-white/70">No defects detected in this photo.</p></CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
