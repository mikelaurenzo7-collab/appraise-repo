import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface PhotoUploadProps {
  submissionId: number;
  onPhotosUploaded?: (count: number) => void;
  maxPhotos?: number;
}

interface UploadedPhoto {
  id: string;
  url: string;
  caption: string;
  category: "exterior" | "interior" | "damage" | "comparison" | "other";
  order: number;
}

export default function PhotoUpload({
  submissionId,
  onPhotosUploaded,
  maxPhotos = 20,
}: PhotoUploadProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { value: "exterior", label: "Exterior", color: "bg-blue-100 text-blue-700" },
    { value: "interior", label: "Interior", color: "bg-purple-100 text-purple-700" },
    { value: "damage", label: "Damage/Issues", color: "bg-red-100 text-red-700" },
    { value: "comparison", label: "Comparison", color: "bg-green-100 text-green-700" },
    { value: "other", label: "Other", color: "bg-gray-100 text-gray-700" },
  ];

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

  const handleFiles = async (files: FileList) => {
    if (photos.length >= maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    const newFiles = Array.from(files).slice(0, maxPhotos - photos.length);

    setIsUploading(true);
    try {
      // Simulate upload - in production, call tRPC endpoint
      for (const file of newFiles) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const newPhoto: UploadedPhoto = {
            id: Math.random().toString(36).substr(2, 9),
            url: e.target?.result as string,
            caption: "",
            category: "other",
            order: photos.length + 1,
          };
          setPhotos((prev) => [...prev, newPhoto]);
        };
        reader.readAsDataURL(file);
      }

      toast.success(`${newFiles.length} photo(s) added`);
      onPhotosUploaded?.(newFiles.length);
    } catch (error) {
      toast.error("Failed to upload photos");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    toast.success("Photo removed");
  };

  const updatePhotoCaption = (id: string, caption: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption } : p))
    );
  };

  const updatePhotoCategory = (id: string, category: UploadedPhoto["category"]) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, category } : p))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-purple-600 mb-2">
          Upload Property Photos
        </h3>
        <p className="text-sm text-gray-600">
          Add photos to strengthen your appeal. Photos of damage, maintenance issues, and
          comparable properties significantly improve win rates.
        </p>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-purple-500 bg-purple-50"
            : "border-gray-300 bg-gray-50 hover:border-purple-400"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto mb-3 text-gray-400" size={32} />
        <p className="text-gray-700 font-medium mb-1">
          Drag photos here or click to browse
        </p>
        <p className="text-sm text-gray-500 mb-4">
          {photos.length}/{maxPhotos} photos uploaded
        </p>
        <Input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          disabled={isUploading || photos.length >= maxPhotos}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || photos.length >= maxPhotos}
          variant="outline"
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin mr-2" size={16} />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2" size={16} />
              Select Photos
            </>
          )}
        </Button>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Uploaded Photos ({photos.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => {
              const categoryInfo = categories.find((c) => c.value === photo.category);
              return (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="relative">
                    <img
                      src={photo.url}
                      alt="Property photo"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="p-3 space-y-3">
                    {/* Category */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">
                        Category
                      </label>
                      <select
                        value={photo.category}
                        onChange={(e) =>
                          updatePhotoCategory(
                            photo.id,
                            e.target.value as UploadedPhoto["category"]
                          )
                        }
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      >
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Caption */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">
                        Caption (optional)
                      </label>
                      <Input
                        type="text"
                        placeholder="Describe what's in this photo..."
                        value={photo.caption}
                        onChange={(e) => updatePhotoCaption(photo.id, e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    {/* Category Badge */}
                    <div>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${categoryInfo?.color}`}>
                        {categoryInfo?.label}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Info Box */}
      <Card className="bg-purple-50 border-purple-200 p-4">
        <div className="flex gap-3">
          <ImageIcon className="text-purple-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-purple-900">
            <p className="font-semibold mb-1">Tips for Better Photos</p>
            <ul className="list-disc list-inside space-y-1 text-purple-800">
              <li>Take photos in good lighting (daytime preferred)</li>
              <li>Include wide shots and close-ups of issues</li>
              <li>Photograph comparable properties in your neighborhood</li>
              <li>Document any maintenance issues or damage</li>
              <li>Include property address signs if visible</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
