import { useAppBridge } from "@shopify/app-bridge-react";
import { useEffect, useState } from "react";

export default function PhotoUpload() {
  const app = useAppBridge();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/photos/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.files) {
        const urls = result.files.map((f: { url: string }) => f.url);
        setUploadedUrls(urls);

        // Send the uploaded URLs back to the parent (POS extension or other)
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            {
              type: "PHOTOS_UPLOADED",
              photos: result.files,
            },
            "*"
          );
        }

        // Also try App Bridge toast
        app.toast?.show("Photos uploaded successfully!");

        // Close after a delay or provide close button
        setTimeout(() => {
          // Close if opened in modal
          if (window.opener) {
            window.close();
          }
        }, 2000);
      } else {
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      app.toast?.show(
        error instanceof Error ? error.message : "Failed to upload photos",
        { isError: true }
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "24px", marginBottom: "1rem" }}>
        Upload Device Photos
      </h1>

      <div style={{ marginBottom: "1.5rem" }}>
        <label
          htmlFor="photo-input"
          style={{
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "500",
          }}
        >
          Select Photos:
        </label>
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={{
            width: "100%",
            padding: "0.5rem",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      {files.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ marginBottom: "0.5rem" }}>
            Selected: {files.length} file(s)
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {files.map((file, index) => (
              <li
                key={index}
                style={{
                  padding: "0.5rem",
                  background: "#f5f5f5",
                  marginBottom: "0.25rem",
                  borderRadius: "4px",
                }}
              >
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploadedUrls.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontWeight: "500", marginBottom: "0.5rem" }}>
            Uploaded Photos:
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: "0.5rem",
            }}
          >
            {uploadedUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Uploaded ${index + 1}`}
                style={{
                  width: "100%",
                  height: "100px",
                  objectFit: "cover",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          style={{
            padding: "0.75rem 1.5rem",
            background: uploading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {uploading ? "Uploading..." : "Upload Photos"}
        </button>
        {uploadedUrls.length > 0 && (
          <button
            onClick={() => window.close()}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}






