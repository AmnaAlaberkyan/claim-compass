import { useState, useRef, useEffect, useCallback } from 'react';
import { Detection, Annotations, SeverityLevel, DamageLabel, DamagePart } from '@/types/annotations';
import { BoxVerification, VerificationStatus, ReasonCode, REASON_CODE_LABELS } from '@/types/verification';
import { 
  X, Eye, EyeOff, RotateCcw, Save, AlertTriangle, SlidersHorizontal,
  Check, Bot, UserCheck, Pencil, Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface DamageOverlayProps {
  imageUrl: string;
  annotations: Annotations | null;
  editable?: boolean;
  onSave?: (annotations: Annotations) => void;
  onReset?: () => void;
  onMarkUncertain?: () => void;
  // Verification props
  boxVerifications?: BoxVerification[];
  onVerifyBox?: (detectionId: string) => void;
  onRejectBox?: (detectionId: string, reasonCode: ReasonCode, notes?: string) => void;
  onEditBox?: (detectionId: string, edits: BoxVerification['editedValues'], reasonCode: ReasonCode) => void;
  onMarkBoxUncertain?: (detectionId: string) => void;
  onLinkBoxToPart?: (detectionId: string, partIndex: number | null) => void;
  highlightedBoxId?: string | null;
  partLabels?: string[];
  showVerificationControls?: boolean;
}

const severityColors: Record<SeverityLevel, string> = {
  minor: 'border-success/70 bg-success/10',
  moderate: 'border-warning/70 bg-warning/10',
  severe: 'border-destructive/70 bg-destructive/10',
};

const severityLabelColors: Record<SeverityLevel, string> = {
  minor: 'bg-success/90 text-success-foreground',
  moderate: 'bg-warning/90 text-warning-foreground',
  severe: 'bg-destructive/90 text-destructive-foreground',
};

const verificationBorderColors: Record<VerificationStatus, string> = {
  proposed: '',
  verified: 'ring-2 ring-success ring-offset-1',
  rejected: 'ring-2 ring-destructive ring-offset-1 opacity-40',
  needs_review: 'ring-2 ring-warning ring-offset-1',
};

const DAMAGE_LABELS: DamageLabel[] = ['scratch', 'dent', 'crack', 'broken', 'paint_transfer', 'misalignment', 'unknown'];
const SEVERITY_LEVELS: SeverityLevel[] = ['minor', 'moderate', 'severe'];

export function DamageOverlay({
  imageUrl,
  annotations,
  editable = false,
  onSave,
  onReset,
  onMarkUncertain,
  boxVerifications = [],
  onVerifyBox,
  onRejectBox,
  onEditBox,
  onMarkBoxUncertain,
  onLinkBoxToPart,
  highlightedBoxId,
  partLabels = [],
  showVerificationControls = false,
}: DamageOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageDims, setImageDims] = useState({ width: 0, height: 0 });
  const [showOverlay, setShowOverlay] = useState(true);
  const [localDetections, setLocalDetections] = useState<Detection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });
  const [hasChanges, setHasChanges] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null);
  const [rejectingBoxId, setRejectingBoxId] = useState<string | null>(null);
  const [linkingBoxId, setLinkingBoxId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<BoxVerification['editedValues']>({});
  const [rejectForm, setRejectForm] = useState<{ reasonCode: ReasonCode; notes: string }>({
    reasonCode: 'false_positive',
    notes: '',
  });

  const filteredDetections = localDetections.filter(d => d.confidence >= confidenceThreshold);

  const getBoxVerification = (detectionId: string): BoxVerification | undefined => {
    return boxVerifications.find(v => v.detectionId === detectionId);
  };

  useEffect(() => {
    if (annotations?.detections) {
      setLocalDetections([...annotations.detections]);
      setHasChanges(false);
    }
  }, [annotations]);

  const updateImageDims = useCallback(() => {
    if (imageRef.current) {
      setImageDims({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    updateImageDims();
    window.addEventListener('resize', updateImageDims);
    return () => window.removeEventListener('resize', updateImageDims);
  }, [updateImageDims]);

  const handleImageLoad = () => {
    updateImageDims();
  };

  const getPixelCoords = (box: Detection['box']) => ({
    left: box.x * imageDims.width,
    top: box.y * imageDims.height,
    width: box.w * imageDims.width,
    height: box.h * imageDims.height,
  });

  const getNormalizedCoords = (pixelX: number, pixelY: number) => ({
    x: Math.max(0, Math.min(1, pixelX / imageDims.width)),
    y: Math.max(0, Math.min(1, pixelY / imageDims.height)),
  });

  const handleMouseDown = (e: React.MouseEvent, detection: Detection, handle?: string) => {
    if (!editable) return;
    e.stopPropagation();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setSelectedId(detection.id);
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
    } else {
      setIsDragging(true);
    }
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (!editable) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setSelectedId(null);
    setIsDrawing(true);
    setDrawStart({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!editable) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (isDragging && selectedId) {
      const dx = (currentX - dragStart.x) / imageDims.width;
      const dy = (currentY - dragStart.y) / imageDims.height;

      setLocalDetections(prev => prev.map(d => {
        if (d.id !== selectedId) return d;
        return {
          ...d,
          box: {
            ...d.box,
            x: Math.max(0, Math.min(1 - d.box.w, d.box.x + dx)),
            y: Math.max(0, Math.min(1 - d.box.h, d.box.y + dy)),
          }
        };
      }));
      setDragStart({ x: currentX, y: currentY });
      setHasChanges(true);
    }

    if (isResizing && selectedId && resizeHandle) {
      const normalized = getNormalizedCoords(currentX, currentY);
      
      setLocalDetections(prev => prev.map(d => {
        if (d.id !== selectedId) return d;
        
        let newBox = { ...d.box };
        
        if (resizeHandle.includes('e')) {
          newBox.w = Math.max(0.05, normalized.x - d.box.x);
        }
        if (resizeHandle.includes('w')) {
          const newX = Math.min(normalized.x, d.box.x + d.box.w - 0.05);
          newBox.w = d.box.x + d.box.w - newX;
          newBox.x = newX;
        }
        if (resizeHandle.includes('s')) {
          newBox.h = Math.max(0.05, normalized.y - d.box.y);
        }
        if (resizeHandle.includes('n')) {
          const newY = Math.min(normalized.y, d.box.y + d.box.h - 0.05);
          newBox.h = d.box.y + d.box.h - newY;
          newBox.y = newY;
        }
        
        return { ...d, box: newBox };
      }));
      setHasChanges(true);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDrawing) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;
        
        const startNorm = getNormalizedCoords(drawStart.x, drawStart.y);
        const endNorm = getNormalizedCoords(endX, endY);
        
        const minW = 0.05;
        const minH = 0.05;
        const w = Math.abs(endNorm.x - startNorm.x);
        const h = Math.abs(endNorm.y - startNorm.y);
        
        if (w >= minW && h >= minH) {
          const newDetection: Detection = {
            id: `det_${Date.now()}`,
            label: 'unknown',
            part: 'unknown',
            severity: 'moderate',
            confidence: 0.5,
            box: {
              x: Math.min(startNorm.x, endNorm.x),
              y: Math.min(startNorm.y, endNorm.y),
              w,
              h,
            }
          };
          setLocalDetections(prev => [...prev, newDetection]);
          setSelectedId(newDetection.id);
          setHasChanges(true);
        }
      }
    }

    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setIsDrawing(false);
  };

  const handleDelete = (id: string) => {
    setLocalDetections(prev => prev.filter(d => d.id !== id));
    setSelectedId(null);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        detections: localDetections,
        notes: annotations?.notes,
      });
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    if (annotations?.detections) {
      setLocalDetections([...annotations.detections]);
      setHasChanges(false);
    }
    if (onReset) onReset();
  };

  const handleBoxClick = (e: React.MouseEvent, detection: Detection) => {
    e.stopPropagation();
    setSelectedId(detection.id);
  };

  const handleRejectBoxSubmit = (detectionId: string) => {
    onRejectBox?.(detectionId, rejectForm.reasonCode, rejectForm.notes || undefined);
    setRejectingBoxId(null);
    setRejectForm({ reasonCode: 'false_positive', notes: '' });
  };

  const handleEditBoxSubmit = (detectionId: string) => {
    onEditBox?.(detectionId, editForm, 'other');
    setEditingBoxId(null);
    setEditForm({});
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showOverlay ? 'Hide' : 'Show'} Overlay
          </button>
          
          {editable && (
            <div className="flex items-center gap-2">
              {onMarkUncertain && (
                <button
                  onClick={onMarkUncertain}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-warning hover:bg-warning/10 rounded-lg transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Mark Uncertain
                </button>
              )}
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to AI
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors",
                  hasChanges 
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <Save className="w-4 h-4" />
                Save Annotations
              </button>
            </div>
          )}
        </div>

        {/* Confidence threshold slider */}
        {showOverlay && localDetections.length > 0 && (
          <div className="flex items-center gap-3 px-1">
            <SlidersHorizontal className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Confidence</span>
            <Slider
              value={[confidenceThreshold]}
              onValueChange={(value) => setConfidenceThreshold(value[0])}
              min={0}
              max={1}
              step={0.05}
              className="flex-1 max-w-[200px]"
            />
            <span className="text-xs font-mono text-muted-foreground w-10 text-right">
              ≥{(confidenceThreshold * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Image with overlays */}
      <div 
        ref={containerRef}
        className="relative rounded-lg overflow-hidden bg-muted select-none"
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: editable ? 'crosshair' : 'default' }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Damage photo"
          className="w-full h-auto max-h-[500px] object-contain"
          onLoad={handleImageLoad}
          draggable={false}
        />

        {/* Detection boxes */}
        {showOverlay && imageDims.width > 0 && filteredDetections.map(detection => {
          const coords = getPixelCoords(detection.box);
          const isSelected = selectedId === detection.id;
          const isHighlighted = highlightedBoxId === detection.id;
          const verification = getBoxVerification(detection.id);
          const status = verification?.status || 'proposed';
          const isVerified = status === 'verified';
          const isRejected = status === 'rejected';
          
          return (
            <div
              key={detection.id}
              className={cn(
                "absolute border-2 rounded transition-all",
                severityColors[detection.severity],
                isSelected && editable && "ring-2 ring-primary ring-offset-1",
                isHighlighted && "ring-2 ring-primary ring-offset-2 animate-pulse",
                editable && "cursor-move",
                showVerificationControls && verificationBorderColors[status]
              )}
              style={{
                left: coords.left,
                top: coords.top,
                width: coords.width,
                height: coords.height,
              }}
              onMouseDown={(e) => editable ? handleMouseDown(e, detection) : handleBoxClick(e, detection)}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Label pill with verification badge */}
              <div 
                className={cn(
                  "absolute -top-6 left-0 flex items-center gap-1"
                )}
              >
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap",
                  severityLabelColors[detection.severity]
                )}>
                  {verification?.editedValues?.label || detection.label} · {verification?.editedValues?.part || detection.part}
                </span>
                {showVerificationControls && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[9px] px-1 py-0 h-4",
                      status === 'proposed' && "bg-muted/80",
                      status === 'verified' && "bg-success/20 text-success border-success/30",
                      status === 'rejected' && "bg-destructive/20 text-destructive border-destructive/30",
                      status === 'needs_review' && "bg-warning/20 text-warning border-warning/30"
                    )}
                  >
                    {status === 'proposed' ? <Bot className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
                  </Badge>
                )}
              </div>

              {/* Delete button (edit mode) */}
              {editable && isSelected && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(detection.id); }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Verification actions (verification mode) */}
              {showVerificationControls && isSelected && !isVerified && (
                <div className="absolute -bottom-8 left-0 flex items-center gap-1 bg-card/95 backdrop-blur-sm rounded-md p-1 shadow-lg border border-border">
                  {/* Verify */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onVerifyBox?.(detection.id); }}
                    className="p-1 rounded text-success hover:bg-success/10"
                    title="Verify"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>

                  {/* Reject */}
                  <Popover open={rejectingBoxId === detection.id} onOpenChange={(open) => setRejectingBoxId(open ? detection.id : null)}>
                    <PopoverTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-destructive hover:bg-destructive/10"
                        title="Reject"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                      <p className="text-sm font-medium mb-2">Reject Detection</p>
                      <div className="space-y-2">
                        <Select
                          value={rejectForm.reasonCode}
                          onValueChange={(v) => setRejectForm(f => ({ ...f, reasonCode: v as ReasonCode }))}
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(REASON_CODE_LABELS).map(([code, label]) => (
                              <SelectItem key={code} value={code} className="text-xs">{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => handleRejectBoxSubmit(detection.id)}
                          className="w-full btn-destructive text-xs py-1.5"
                        >
                          Reject
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Edit */}
                  <Popover open={editingBoxId === detection.id} onOpenChange={(open) => {
                    setEditingBoxId(open ? detection.id : null);
                    if (open) {
                      setEditForm({
                        label: detection.label,
                        part: detection.part,
                        severity: detection.severity,
                        confidence: detection.confidence,
                      });
                    }
                  }}>
                    <PopoverTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-3" align="start">
                      <p className="text-sm font-medium mb-2">Edit Detection</p>
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground">Label</label>
                          <Select
                            value={editForm.label || detection.label}
                            onValueChange={(v) => setEditForm(f => ({ ...f, label: v }))}
                          >
                            <SelectTrigger className="text-xs h-8 mt-0.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAMAGE_LABELS.map(l => (
                                <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Part</label>
                          <Input
                            value={editForm.part || ''}
                            onChange={(e) => setEditForm(f => ({ ...f, part: e.target.value }))}
                            className="text-xs h-8 mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Severity</label>
                          <Select
                            value={editForm.severity || detection.severity}
                            onValueChange={(v) => setEditForm(f => ({ ...f, severity: v }))}
                          >
                            <SelectTrigger className="text-xs h-8 mt-0.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SEVERITY_LEVELS.map(s => (
                                <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <button
                          onClick={() => handleEditBoxSubmit(detection.id)}
                          className="w-full btn-primary text-xs py-1.5"
                        >
                          Save
                        </button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Mark uncertain */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onMarkBoxUncertain?.(detection.id); }}
                    className="p-1 rounded text-warning hover:bg-warning/10"
                    title="Mark Uncertain"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </button>

                  {/* Link to part */}
                  {partLabels.length > 0 && (
                    <Popover open={linkingBoxId === detection.id} onOpenChange={(open) => setLinkingBoxId(open ? detection.id : null)}>
                      <PopoverTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="Link to Part"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="start">
                        <p className="text-xs font-medium mb-1.5">Link to part</p>
                        <div className="space-y-0.5 max-h-32 overflow-y-auto">
                          {partLabels.map((label, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                onLinkBoxToPart?.(detection.id, idx);
                                setLinkingBoxId(null);
                              }}
                              className="w-full text-left text-xs p-1.5 rounded hover:bg-muted truncate"
                            >
                              {label}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              onLinkBoxToPart?.(detection.id, null);
                              setLinkingBoxId(null);
                            }}
                            className="w-full text-left text-xs p-1.5 rounded hover:bg-muted text-muted-foreground"
                          >
                            Unlink
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              )}

              {/* Resize handles */}
              {editable && isSelected && (
                <>
                  {['nw', 'ne', 'sw', 'se'].map(handle => (
                    <div
                      key={handle}
                      className="absolute w-3 h-3 bg-primary rounded-sm cursor-nwse-resize"
                      style={{
                        top: handle.includes('n') ? -5 : 'auto',
                        bottom: handle.includes('s') ? -5 : 'auto',
                        left: handle.includes('w') ? -5 : 'auto',
                        right: handle.includes('e') ? -5 : 'auto',
                        cursor: handle === 'ne' || handle === 'sw' ? 'nesw-resize' : 'nwse-resize',
                      }}
                      onMouseDown={(e) => handleMouseDown(e, detection, handle)}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}

        {/* Drawing preview */}
        {isDrawing && (
          <div
            className="absolute border-2 border-dashed border-primary/50 bg-primary/10 rounded pointer-events-none"
            style={{
              left: Math.min(drawStart.x, dragStart.x),
              top: Math.min(drawStart.y, dragStart.y),
              width: Math.abs(dragStart.x - drawStart.x),
              height: Math.abs(dragStart.y - drawStart.y),
            }}
          />
        )}
      </div>

      {/* Detection count with verification stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredDetections.length} of {localDetections.length} detection{localDetections.length !== 1 ? 's' : ''} shown
          {confidenceThreshold > 0 && <span className="text-primary ml-1">(≥{(confidenceThreshold * 100).toFixed(0)}% confidence)</span>}
          {hasChanges && <span className="text-warning ml-2">• Unsaved changes</span>}
        </span>
        {showVerificationControls && boxVerifications.length > 0 && (
          <span className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
              {boxVerifications.filter(v => v.status === 'verified').length} verified
            </Badge>
            <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
              {boxVerifications.filter(v => v.status === 'rejected').length} rejected
            </Badge>
          </span>
        )}
      </div>
    </div>
  );
}
