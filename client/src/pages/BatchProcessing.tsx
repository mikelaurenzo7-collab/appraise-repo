import { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";

interface BatchFile {
  id: string;
  name: string;
  properties: number;
  status: "pending" | "processing" | "completed" | "error";
  uploadedAt: string;
  results?: string;
}

export default function BatchProcessing() {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      handleFiles(files);
    }
  };

  const handleFiles = (fileList: FileList) => {
    setIsUploading(true);
    try {
      Array.from(fileList).forEach(file => {
        if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx")) {
          toast.error(`${file.name} must be CSV or Excel format`);
          return;
        }

        const newFile: BatchFile = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          properties: Math.floor(Math.random() * 50) + 10,
          status: "pending",
          uploadedAt: new Date().toLocaleString(),
        };
        setFiles(prev => [...prev, newFile]);
      });
      toast.success(`${fileList.length} file(s) uploaded`);
    } catch (error) {
      toast.error("Failed to upload files");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const processFile = (id: string) => {
    setFiles(prev =>
      prev.map(f =>
        f.id === id ? { ...f, status: "processing" as const } : f
      )
    );

    setTimeout(() => {
      setFiles(prev =>
        prev.map(f =>
          f.id === id
            ? {
                ...f,
                status: "completed" as const,
                results: `Analyzed ${f.properties} properties. ${Math.floor(f.properties * 0.65)} eligible for appeal.`,
              }
            : f
        )
      );
      toast.success("Batch processing completed");
    }, 2000);
  };

  const downloadResults = (file: BatchFile) => {
    toast.success(`Downloading results for ${file.name}`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 size={20} className="text-[#10B981]" />;
      case "processing":
        return <Loader2 size={20} className="text-[#7C3AED] animate-spin" />;
      case "error":
        return <AlertCircle size={20} className="text-[#EF4444]" />;
      default:
        return <FileText size={20} className="text-[#94A3B8]" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] mb-2">Batch Processing</h1>
          <p className="text-[#64748B]">Upload multiple properties at once for bulk analysis and appeals</p>
        </div>

        <Card className="p-8">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? "border-[#7C3AED] bg-[#7C3AED]/5"
                : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#7C3AED]"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto mb-4 text-[#94A3B8]" size={40} />
            <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
              Drag CSV or Excel files here
            </h3>
            <p className="text-[#64748B] mb-6">
              Upload property lists for bulk analysis. Supported formats: .csv, .xlsx
            </p>
            <input
              type="file"
              multiple
              accept=".csv,.xlsx"
              onChange={handleChange}
              disabled={isUploading}
              className="hidden"
              id="batch-upload"
            />
            <Button
              onClick={() => document.getElementById("batch-upload")?.click()}
              disabled={isUploading}
              className="bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90"
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="mr-2" size={16} />
                  Select Files
                </>
              )}
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-[#F0F4FF] border border-[#7C3AED]/20">
          <h4 className="font-semibold text-[#0F172A] mb-3">CSV Format Example</h4>
          <div className="bg-white rounded p-4 font-mono text-sm text-[#64748B] overflow-x-auto">
            <div>address,city,state,zipCode,propertyType,assessedValue</div>
            <div>123 Main St,Austin,TX,78701,Single Family,450000</div>
            <div>456 Oak Ave,Austin,TX,78702,Condo,320000</div>
          </div>
        </Card>

        {files.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#0F172A]">Uploaded Files ({files.length})</h2>
            {files.map(file => (
              <Card key={file.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">{getStatusIcon(file.status)}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#0F172A]">{file.name}</h3>
                      <p className="text-sm text-[#64748B] mt-1">
                        {file.properties} properties • Uploaded {file.uploadedAt}
                      </p>
                      {file.results && (
                        <p className="text-sm text-[#10B981] mt-2">{file.results}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {file.status === "pending" && (
                      <Button
                        onClick={() => processFile(file.id)}
                        className="bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90"
                      >
                        Process
                      </Button>
                    )}
                    {file.status === "completed" && (
                      <Button
                        onClick={() => downloadResults(file)}
                        variant="outline"
                        className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/5"
                      >
                        <Download size={16} className="mr-2" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {files.length === 0 && (
          <Card className="p-12 text-center bg-[#F8FAFC]">
            <FileText size={48} className="text-[#94A3B8] mx-auto mb-4" />
            <p className="text-[#64748B]">No files uploaded yet. Start by uploading a CSV or Excel file.</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
