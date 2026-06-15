import { useState, DragEvent } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { RequestItem, EntityCompany, UserProfile } from "../types";
import { 
  FileText, 
  Briefcase, 
  AlertCircle, 
  Paperclip, 
  Trash2, 
  X, 
  FileCheck, 
  ChevronRight, 
  Loader2, 
  ShieldAlert,
  ArrowRight
} from "lucide-react";

interface CreateRequestModalProps {
  currentUser: UserProfile;
  entities: EntityCompany[];
  onClose: () => void;
  onRequestSubmitted: (newReq: RequestItem) => void;
}

export function CreateRequestModal({
  currentUser,
  entities,
  onClose,
  onRequestSubmitted
}: CreateRequestModalProps) {
  const [requestType, setRequestType] = useState("Secretary’s Certificate");
  const [customRequestType, setCustomRequestType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"standard" | "urgent" | "sameday">("standard");
  const [notes, setNotes] = useState("");

  // Attachments State
  const [attachments, setAttachments] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const getEntityName = (id: string) => {
    return entities.find(e => e.id === id)?.name || id;
  };

  // Simulated drag/drop file upload helpers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileNames: string[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        fileNames.push(e.dataTransfer.files[i].name);
      }
      setAttachments(prev => [...prev, ...fileNames]);
    }
  };

  const handleBrowseFiles = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (e: any) => {
      if (e.target.files) {
        const fileNames: string[] = [];
        for (let i = 0; i < e.target.files.length; i++) {
          fileNames.push(e.target.files[i].name);
        }
        setAttachments(prev => [...prev, ...fileNames]);
      }
    };
    input.click();
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setErrorMsg("");

    if (!purpose.trim()) {
      setErrorMsg("Please provide a brief purpose or subject matter.");
      return;
    }

    if (!description.trim()) {
      setErrorMsg("Please provide a description of your request background.");
      return;
    }

    setSaving(true);
    try {
      // Create beautifully formatted serial ID: e.g. REQ-2026-XXXX
      const serial = String(Math.floor(Math.random() * 9000) + 1000);
      const reqId = `REQ-2026-${serial}`;
      
      const finalRequestType = requestType === "Others" ? (customRequestType.trim() || "Others") : requestType;
      const detailsText = `${purpose.trim()}\n\n${description.trim()}`;

      const newRequest: RequestItem = {
        requestId: reqId,
        userId: currentUser.uid,
        entityId: currentUser.entityId,
        requestType: finalRequestType,
        priority: priority,
        status: "Submitted",
        description: detailsText,
        attachments: attachments,
        notes: notes.trim() || undefined,
        comments: [],
        createdAt: new Date().toISOString()
      };

      // Persistent save in Firestore
      try {
        await setDoc(doc(db, "requests", reqId), newRequest);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `requests/${reqId}`);
      }

      // Create instant pending notification for managers
      const notifId = `NOTIF-REQ-${Date.now()}`;
      try {
        await setDoc(doc(db, "notifications", notifId), {
          id: notifId,
          userId: "admin", // Admin alert channel
          title: "New Intake Request Filed",
          message: `${currentUser.name} submitted ${reqId} (${finalRequestType}) on behalf of ${getEntityName(currentUser.entityId)}.`,
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `notifications/${notifId}`);
      }

      onRequestSubmitted(newRequest);
    } catch (err: any) {
      console.error("Failed to save request: ", err);
      let errorDisplayMsg = err.message || "Could not log standard intake request.";
      // Extract human-readable info if it's the JSON from handleFirestoreError
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) {
          errorDisplayMsg = `${parsed.error} (Path: ${parsed.path})`;
        }
      } catch (_) {}
      setErrorMsg(errorDisplayMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" id="create-request-modal" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal max-w-2xl w-full bg-white rounded-xl shadow-premium border border-cream-dark overflow-hidden flex flex-col">
        
        {/* Modern Elegant Corporate Header */}
        <div className="bg-navy px-8 py-6 text-white relative">
          <div className="absolute top-0 right-0 p-6">
            <button 
              className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" 
              onClick={onClose}
              type="button"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-[10px] tracking-[0.2em] text-gold font-bold uppercase mb-1 font-sans">
            STLAF Request Intake Secretariat
          </p>
          <h2 className="font-serif text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileCheck className="text-gold" size={22} strokeWidth={2} />
            New Document Request
          </h2>
          <div className="mt-2.5 flex items-center gap-2 text-xs text-white/70">
            <span className="bg-white/10 px-2.5 py-0.5 rounded-full text-white/90 text-[11px] font-medium border border-white/5">
              Filing Company
            </span>
            <span className="font-semibold text-gold-light truncate max-w-[340px]">
              {getEntityName(currentUser.entityId)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[70vh]">
          <div className="p-8 space-y-6">
            
            {errorMsg && (
              <div className="bg-formal-red/5 text-formal-red border-l-4 border-formal-red p-4 rounded-r-md text-xs font-semibold flex items-start gap-2">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* Part 1: Document Classification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-cream-dark/50">
                <span className="text-[11px] tracking-wider uppercase text-charcoal-muted font-bold font-mono">01. Classification & Scope</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">
                    Request / Document Type <span>*</span>
                  </label>
                  <select 
                    className="form-select text-xs font-medium" 
                    value={requestType} 
                    onChange={e => setRequestType(e.target.value)}
                  >
                    <option value="Secretary’s Certificate">Secretary’s Certificate</option>
                    <option value="Board Resolution">Board Resolution</option>
                    <option value="Shareholders’ Resolution">Shareholders’ Resolution</option>
                    <option value="Minutes of the Meeting">Minutes of the Meeting</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                {requestType === "Others" && (
                  <div className="form-group md:col-span-2 animate-fadeIn" style={{ animationDuration: "0.2s" }}>
                    <label className="form-label">
                      Specify Document Type <span>*</span>
                    </label>
                    <input 
                      type="text"
                      className="form-input text-xs font-medium"
                      placeholder="e.g. Articles of Incorporation, Tax Compliance, By-laws" 
                      value={customRequestType}
                      onChange={e => setCustomRequestType(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    Priority / Audit Speed <span>*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      className={`px-3 py-2.5 rounded-md text-[11px] font-bold text-center border uppercase tracking-wider cursor-pointer transition-all ${
                        priority === "standard"
                          ? "border-gold bg-gold/5 text-gold"
                          : "border-cream-dark bg-white text-charcoal-light hover:bg-slate-50"
                      }`}
                      onClick={() => setPriority("standard")}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2.5 rounded-md text-[11px] font-bold text-center border uppercase tracking-wider cursor-pointer transition-all ${
                        priority === "urgent"
                          ? "border-formal-amber bg-formal-amber/5 text-formal-amber"
                          : "border-cream-dark bg-white text-charcoal-light hover:bg-slate-50"
                      }`}
                      onClick={() => setPriority("urgent")}
                    >
                      Urgent
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2.5 rounded-md text-[11px] font-bold text-center border uppercase tracking-wider cursor-pointer transition-all ${
                        priority === "sameday"
                          ? "border-formal-red bg-formal-red/5 text-formal-red animate-pulse"
                          : "border-cream-dark bg-white text-charcoal-light hover:bg-slate-50"
                      }`}
                      onClick={() => setPriority("sameday")}
                    >
                      Same Day
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Part 2: Purpose & Text */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-cream-dark/50">
                <span className="text-[11px] tracking-wider uppercase text-charcoal-muted font-bold font-mono">02. Matter Details</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Brief Purpose / Subject Title <span>*</span>
                </label>
                <div className="relative">
                  <input 
                    className="form-input text-xs font-medium" 
                    placeholder="e.g. BDO Bank Signatory Update - Authorization to open new account" 
                    value={purpose} 
                    onChange={e => setPurpose(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Detailed Background Description <span>*</span>
                </label>
                <textarea 
                  className="form-textarea text-xs leading-relaxed" 
                  placeholder="Specify board meeting dates, exact voting rules, corporate resolutions text required, or explicit authority terms..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  style={{ height: 110, resize: "vertical" }}
                  required
                />
              </div>
            </div>

            {/* Part 3: Support Attachments & Notes */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-cream-dark/50">
                <span className="text-[11px] tracking-wider uppercase text-charcoal-muted font-bold font-mono">03. Reference Materials (Optional)</span>
              </div>

              <div className="form-group">
                <label className="form-label font-medium text-charcoal-light">Notes / Special Directives</label>
                <textarea 
                  className="form-textarea text-xs" 
                  placeholder="e.g. Send physically certified copies via local courier to corporate secretary, or mention primary contact signatories..." 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  style={{ height: 60, resize: "none" }}
                />
              </div>

              {/* Upload Workspace */}
              <div className="form-group">
                <label className="form-label">Reference Documents</label>
                <div 
                  className={`upload-zone relative p-7 text-center rounded-lg border-2 border-dashed transition-all cursor-pointer ${
                    dragging 
                      ? "bg-gold/5 border-gold text-gold" 
                      : "bg-slate-50/50 border-cream-dark hover:bg-gold/5 hover:border-gold hover:text-gold text-charcoal-muted"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleBrowseFiles}
                >
                  <Paperclip className="mx-auto mb-2.5 text-gold-light/90" size={24} />
                  <div className="text-[12.5px] font-semibold text-charcoal leading-snug">
                    Drag legal frameworks here or <span className="text-gold underline">browse files</span>
                  </div>
                  <div className="text-[10px] text-charcoal-muted/80 mt-1 font-mono">PDF, DOCX, XLSX, JPG, PNG accepted</div>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-3.5 space-y-2">
                    <div className="text-xs font-semibold text-charcoal flex items-center gap-1.5 px-1">
                      <span>Staged Document Attachments</span>
                      <span className="bg-slate-100 text-charcoal-light px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {attachments.length}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-cream rounded-md border border-cream-dark/60 text-xs">
                          <span className="text-charcoal-light truncate max-w-[180px] font-mono select-all">
                            {file}
                          </span>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeAttachment(idx); }}
                            className="text-formal-red hover:bg-formal-red/10 p-1 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="bg-slate-50/70 border-t border-cream-dark px-8 py-5 flex items-center justify-between gap-4">
            <p className="text-[11px] text-charcoal-muted italic max-w-sm hidden sm:block">
              STLAF intake documents are protected with custom roles and enterprise grade Firestore security.
            </p>
            <div className="flex gap-3 justify-end w-full sm:w-auto">
              <button 
                type="button" 
                className="btn btn-ghost py-2.5 px-5 font-sans cursor-pointer transition-all" 
                onClick={onClose} 
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-gold py-2.5 px-6 font-sans cursor-pointer flex items-center gap-1.5 transition-all w-full sm:w-auto"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    Submitting Filing...
                  </>
                ) : (
                  <>
                    Submit Request
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
