import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ReportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportUrl: string;
  reportName: string;
  address: string;
}

export function ReportPreviewModal({
  open,
  onOpenChange,
  reportUrl,
  reportName,
  address,
}: ReportPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 58; // Typical report is 50-60 pages

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{reportName}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{address}</p>
        </DialogHeader>

        <div className="flex flex-col h-full gap-4">
          {/* PDF Viewer Placeholder */}
          <div className="flex-1 bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-white mb-4">Page {currentPage} of {totalPages}</p>
              <p className="text-slate-400 text-sm">
                PDF preview loading...
              </p>
              <div className="mt-6 w-full h-96 bg-slate-800 rounded flex items-center justify-center">
                <div className="text-slate-500">
                  <p className="mb-2">Report Preview</p>
                  <p className="text-xs">(Full PDF available for download)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={reportUrl}
                download={reportName}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
