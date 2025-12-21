import { useState } from 'react';
import { DamagedPart } from '@/types/claims';
import { Detection } from '@/types/annotations';
import { 
  PartVerification, 
  VerificationStatus, 
  ReasonCode, 
  REASON_CODE_LABELS 
} from '@/types/verification';
import { 
  Check, 
  X, 
  Pencil, 
  Link2, 
  Bot, 
  UserCheck,
  ChevronDown,
  AlertCircle,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface PartsVerificationTableProps {
  damagedParts: DamagedPart[];
  detections: Detection[];
  verifications: PartVerification[];
  onVerify: (partIndex: number) => void;
  onReject: (partIndex: number, reasonCode: ReasonCode, notes?: string) => void;
  onEdit: (partIndex: number, edits: PartVerification['editedValues'], reasonCode: ReasonCode) => void;
  onLinkEvidence: (partIndex: number, detectionIds: string[]) => void;
  onSelectDetection?: (detectionId: string) => void;
  selectedDetectionId?: string | null;
}

const STATUS_STYLES: Record<VerificationStatus, string> = {
  proposed: 'bg-muted text-muted-foreground',
  verified: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  needs_review: 'bg-warning/10 text-warning border-warning/20',
};

const STATUS_LABELS: Record<VerificationStatus, string> = {
  proposed: 'Proposed',
  verified: 'Verified',
  rejected: 'Rejected',
  needs_review: 'Needs 2nd Review',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function PartsVerificationTable({
  damagedParts,
  detections,
  verifications,
  onVerify,
  onReject,
  onEdit,
  onLinkEvidence,
  onSelectDetection,
  selectedDetectionId,
}: PartsVerificationTableProps) {
  const [editingPart, setEditingPart] = useState<number | null>(null);
  const [rejectingPart, setRejectingPart] = useState<number | null>(null);
  const [linkingPart, setLinkingPart] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<PartVerification['editedValues']>({});
  const [rejectForm, setRejectForm] = useState<{ reasonCode: ReasonCode; notes: string }>({
    reasonCode: 'wrong_part',
    notes: '',
  });

  const getVerification = (index: number): PartVerification | undefined => {
    return verifications.find(v => v.partIndex === index);
  };

  const getLinkedDetections = (partIndex: number): Detection[] => {
    const verification = getVerification(partIndex);
    if (!verification) return [];
    return detections.filter(d => verification.linkedBoxIds.includes(d.id));
  };

  const handleVerify = (index: number) => {
    onVerify(index);
  };

  const handleRejectSubmit = (index: number) => {
    onReject(index, rejectForm.reasonCode, rejectForm.notes || undefined);
    setRejectingPart(null);
    setRejectForm({ reasonCode: 'wrong_part', notes: '' });
  };

  const handleEditSubmit = (index: number, reasonCode: ReasonCode) => {
    onEdit(index, editForm, reasonCode);
    setEditingPart(null);
    setEditForm({});
  };

  const handleLinkToggle = (partIndex: number, detectionId: string) => {
    const verification = getVerification(partIndex);
    const currentLinks = verification?.linkedBoxIds || [];
    const newLinks = currentLinks.includes(detectionId)
      ? currentLinks.filter(id => id !== detectionId)
      : [...currentLinks, detectionId];
    onLinkEvidence(partIndex, newLinks);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          Parts Verification
          <Badge variant="outline" className="font-normal">
            {verifications.filter(v => v.status === 'verified').length}/{damagedParts.length} verified
          </Badge>
        </h3>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[180px]">Part</TableHead>
              <TableHead className="w-[80px] text-center">Severity</TableHead>
              <TableHead className="w-[80px] text-center">Confidence</TableHead>
              <TableHead className="w-[100px]">Evidence</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[140px]">Reason</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {damagedParts.map((part, index) => {
              const verification = getVerification(index);
              const status = verification?.status || 'proposed';
              const linkedDetections = getLinkedDetections(index);
              const isVerified = status === 'verified';
              const displayPart = verification?.editedValues?.part || part.part;
              const displaySeverity = verification?.editedValues?.severity ?? part.severity;

              return (
                <TableRow 
                  key={index}
                  className={cn(
                    "transition-colors",
                    isVerified && "bg-success/5"
                  )}
                >
                  {/* Part Name */}
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {status === 'proposed' ? (
                        <Bot className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{displayPart}</p>
                        <p className="text-xs text-muted-foreground">
                          {verification?.editedValues?.damage_type || part.damage_type}
                        </p>
                      </div>
                      {verification?.editedValues && (
                        <Badge variant="secondary" className="text-[10px] px-1">
                          Edited
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* Severity */}
                  <TableCell className="text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                      displaySeverity <= 3 ? "bg-success/10 text-success" :
                      displaySeverity <= 6 ? "bg-warning/10 text-warning" :
                      "bg-destructive/10 text-destructive"
                    )}>
                      {displaySeverity}
                    </span>
                  </TableCell>

                  {/* Confidence */}
                  <TableCell className="text-center">
                    <span className="text-sm text-muted-foreground">
                      {part.confidence}%
                    </span>
                  </TableCell>

                  {/* Evidence (Linked Boxes) */}
                  <TableCell>
                    <Popover open={linkingPart === index} onOpenChange={(open) => setLinkingPart(open ? index : null)}>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <Link2 className="w-3.5 h-3.5" />
                          <span>{linkedDetections.length} box{linkedDetections.length !== 1 ? 'es' : ''}</span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3" align="start">
                        <p className="text-sm font-medium mb-2">Link detection boxes</p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {detections.map(det => (
                            <label 
                              key={det.id} 
                              className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                              onMouseEnter={() => onSelectDetection?.(det.id)}
                              onMouseLeave={() => onSelectDetection?.('')}
                            >
                              <input
                                type="checkbox"
                                checked={verification?.linkedBoxIds.includes(det.id) || false}
                                onChange={() => handleLinkToggle(index, det.id)}
                                className="rounded border-border"
                              />
                              <Eye className="w-3 h-3 text-muted-foreground" />
                              <span className="truncate">{det.label} - {det.part}</span>
                            </label>
                          ))}
                          {detections.length === 0 && (
                            <p className="text-xs text-muted-foreground">No detections available</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", STATUS_STYLES[status])}
                    >
                      {status === 'proposed' && <Bot className="w-3 h-3 mr-1" />}
                      {status === 'verified' && <UserCheck className="w-3 h-3 mr-1" />}
                      {STATUS_LABELS[status]}
                    </Badge>
                  </TableCell>

                  {/* Reason Code */}
                  <TableCell>
                    {verification?.reasonCode && (
                      <span className="text-xs text-muted-foreground">
                        {REASON_CODE_LABELS[verification.reasonCode]}
                      </span>
                    )}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    {status !== 'verified' && (
                      <div className="flex items-center justify-end gap-1">
                        {/* Verify */}
                        <button
                          onClick={() => handleVerify(index)}
                          className="p-1.5 rounded-md text-success hover:bg-success/10 transition-colors"
                          title="Verify"
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        {/* Reject */}
                        <Popover open={rejectingPart === index} onOpenChange={(open) => setRejectingPart(open ? index : null)}>
                          <PopoverTrigger asChild>
                            <button
                              className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-4" align="end">
                            <p className="text-sm font-medium mb-3">Reject Part</p>
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-muted-foreground">Reason Code</label>
                                <Select
                                  value={rejectForm.reasonCode}
                                  onValueChange={(v) => setRejectForm(f => ({ ...f, reasonCode: v as ReasonCode }))}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(REASON_CODE_LABELS).map(([code, label]) => (
                                      <SelectItem key={code} value={code}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Notes (optional)</label>
                                <Textarea
                                  value={rejectForm.notes}
                                  onChange={(e) => setRejectForm(f => ({ ...f, notes: e.target.value }))}
                                  placeholder="Additional notes..."
                                  className="mt-1 h-20 resize-none"
                                />
                              </div>
                              <button
                                onClick={() => handleRejectSubmit(index)}
                                className="w-full btn-destructive text-sm py-2"
                              >
                                Confirm Rejection
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>

                        {/* Edit */}
                        <Popover open={editingPart === index} onOpenChange={(open) => {
                          setEditingPart(open ? index : null);
                          if (open) {
                            setEditForm({
                              part: part.part,
                              damage_type: part.damage_type,
                              severity: part.severity,
                            });
                          }
                        }}>
                          <PopoverTrigger asChild>
                            <button
                              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-72 p-4" align="end">
                            <p className="text-sm font-medium mb-3">Edit Part</p>
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-muted-foreground">Part Name</label>
                                <Input
                                  value={editForm.part || ''}
                                  onChange={(e) => setEditForm(f => ({ ...f, part: e.target.value }))}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Damage Type</label>
                                <Input
                                  value={editForm.damage_type || ''}
                                  onChange={(e) => setEditForm(f => ({ ...f, damage_type: e.target.value }))}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Severity (1-10)</label>
                                <Input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={editForm.severity || ''}
                                  onChange={(e) => setEditForm(f => ({ ...f, severity: parseInt(e.target.value) || 1 }))}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">Reason for Edit</label>
                                <Select
                                  defaultValue="severity_incorrect"
                                  onValueChange={(v) => {}}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(REASON_CODE_LABELS).map(([code, label]) => (
                                      <SelectItem key={code} value={code}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <button
                                onClick={() => handleEditSubmit(index, 'severity_incorrect')}
                                className="w-full btn-primary text-sm py-2"
                              >
                                Save Changes
                              </button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    {status === 'verified' && (
                      <span className="text-xs text-success flex items-center justify-end gap-1">
                        <Check className="w-3 h-3" />
                        Locked
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
