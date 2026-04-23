"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Upload, X, Image as ImageIcon, File, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface FileUploaderProps {
  onUpload: (urls: string[]) => void
  maxFiles?: number
  maxSize?: number
  accept?: Record<string, string[]>
  folder?: string
  className?: string
}

interface UploadedFile {
  url: string
  name: string
  type: string
}

export function FileUploader({
  onUpload,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = {
    "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    "application/pdf": [".pdf"],
  },
  folder = "movesmart",
  className,
}: FileUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return

      setUploading(true)
      setProgress(0)

      try {
        const formData = new FormData()
        acceptedFiles.forEach((file) => {
          formData.append("files", file)
        })
        formData.append("folder", folder)

        // Simulate progress
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90))
        }, 200)

        const response = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        })

        clearInterval(progressInterval)

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const data = await response.json()
        setProgress(100)

        const newFiles: UploadedFile[] = []
        
        if (data.url) {
          // Single file
          newFiles.push({
            url: data.url,
            name: acceptedFiles[0].name,
            type: acceptedFiles[0].type,
          })
        } else if (data.uploaded) {
          // Multiple files
          data.uploaded.forEach((upload: { url: string }, index: number) => {
            newFiles.push({
              url: upload.url,
              name: acceptedFiles[index].name,
              type: acceptedFiles[index].type,
            })
          })
        }

        setUploadedFiles((prev) => [...prev, ...newFiles])
        onUpload(newFiles.map((f) => f.url))
        toast.success(`${newFiles.length} file(s) uploaded successfully`)
      } catch {
        toast.error("Failed to upload files")
      } finally {
        setUploading(false)
        setProgress(0)
      }
    },
    [folder, onUpload]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: maxFiles - uploadedFiles.length,
    maxSize,
    accept,
    disabled: uploading || uploadedFiles.length >= maxFiles,
  })

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const isImage = (type: string) => type.startsWith("image/")

  return (
    <div className={cn("space-y-4", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          (uploading || uploadedFiles.length >= maxFiles) &&
            "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <div className="text-sm">
            {isDragActive ? (
              <p className="text-primary">Drop files here</p>
            ) : (
              <>
                <p className="font-medium">
                  Drag & drop files or click to browse
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Max {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB each
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="relative group border rounded-lg overflow-hidden"
            >
              {isImage(file.type) ? (
                <img
                  src={file.url}
                  alt={file.name}
                  className="w-full h-24 object-cover"
                />
              ) : (
                <div className="w-full h-24 flex items-center justify-center bg-muted">
                  <File className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-2">
                <p className="text-xs truncate">{file.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
