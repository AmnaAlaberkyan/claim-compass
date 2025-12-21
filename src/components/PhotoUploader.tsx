import { useState, useCallback } from 'react';
import { Upload, Image, AlertCircle, CheckCircle } from 'lucide-react';
import { QualityResult } from '@/types/claims';

interface PhotoUploaderProps {
  onPhotoSelected: (file: File, base64: string) => void;
  qualityResult?: QualityResult | null;
  isAnalyzing?: boolean;
  onRetry?: () => void;
}

export function PhotoUploader({ 
  onPhotoSelected, 
  qualityResult, 
  isAnalyzing,
  onRetry 
}: PhotoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setPreview(result);
      // Extract base64 without the data URL prefix
      const base64 = result.split(',')[1];
      onPhotoSelected(file, base64);
    };
    reader.readAsDataURL(file);
  }, [onPhotoSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const qualityFailed = qualityResult && !qualityResult.acceptable;
  const qualityPassed = qualityResult && qualityResult.acceptable;

  return (
    <div className="space-y-4">
      <div
        className={`drop-zone cursor-pointer text-center ${isDragging ? 'drop-zone-active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('photo-input')?.click()}
      >
        <input
          id="photo-input"
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
        
        {preview ? (
          <div className="relative">
            <img 
              src={preview} 
              alt="Damage preview" 
              className="max-h-64 mx-auto rounded-lg object-contain"
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-card/80 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Analyzing photo...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-foreground font-medium mb-1">Drop your damage photo here</p>
            <p className="text-sm text-muted-foreground">or click to browse</p>
          </div>
        )}
      </div>

      {/* Quality Result Feedback */}
      {qualityFailed && (
        <div className="card-apple p-4 border-l-4 border-l-destructive animate-fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-foreground mb-2">Photo Quality Issue</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Score: {qualityResult.score}/100 (minimum 70 required)
              </p>
              
              {qualityResult.issues.length > 0 && (
                <ul className="space-y-1 mb-3">
                  {qualityResult.issues.map((issue, idx) => (
                    <li key={idx} className="text-sm flex items-center gap-2">
                      <span className={`status-badge ${
                        issue.severity === 'high' ? 'severity-critical' :
                        issue.severity === 'medium' ? 'severity-medium' : 'severity-low'
                      }`}>
                        {issue.severity}
                      </span>
                      <span className="text-foreground">{issue.description}</span>
                    </li>
                  ))}
                </ul>
              )}
              
              <div className="bg-secondary/50 rounded-lg p-3 mb-3">
                <p className="text-sm text-foreground">
                  <strong>How to fix:</strong> {qualityResult.guidance}
                </p>
              </div>
              
              <button onClick={onRetry} className="btn-primary text-sm h-10">
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {qualityPassed && (
        <div className="card-apple p-4 border-l-4 border-l-success animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground">Photo Quality Passed</h4>
              <p className="text-sm text-muted-foreground">
                Score: {qualityResult.score}/100 — Proceeding to damage assessment
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
