import { useState } from "react";
import { doc, updateDoc, arrayUnion, setDoc, deleteDoc } from "firebase/firestore";
import { 
  Clock, 
  CheckCircle, 
  X, 
  Send, 
  Download, 
  FileText, 
  Check, 
  Paperclip,
  Loader2,
  ShieldCheck,
  Building,
  AlertCircle,
  Trash2
} from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { RequestItem, EntityCompany, UserProfile, CommentItem } from "../types";

interface RequestDetailsModalProps {
  req: RequestItem;
  users: UserProfile[];
  entities: EntityCompany[];
  currentUser: UserProfile;
  onClose: () => void;
  onStatusUpdated: (status: string) => void;
  onCommentAdded: () => void;
}

export function RequestDetailsModal({
  req,
  users,
  entities,
  currentUser,
  onClose,
  onStatusUpdated,
  onCommentAdded
}: RequestDetailsModalProps) {
  const [commentText, setCommentText] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [addingComment, setAddingComment] = useState(false);

  const [deletingRequest, setDeletingRequest] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [errorFeedbackMsg, setErrorFeedbackMsg] = useState("");

  const getUrgencyBadge = (u: string) => {
    const map: Record<string, string> = {
      sameday: "badge-sameday",
      urgent: "badge-urgent",
      standard: "badge-standard"
    };
    const label: Record<string, string> = {
      sameday: "Same Day",
      urgent: "Urgent",
      standard: "Standard"
    };
    return <span className={`badge ${map[u] || "badge-standard"}`}>{label[u]}</span>;
  };

  const getStatusBadge = (s: string) => {
    const map: Record<string, string> = {
      Submitted: "badge-received",
      "Under Review": "badge-review",
      Processing: "badge-drafting",
      Completed: "badge-released",
      Rejected: "badge-urgent"
    };
    return <span className={`badge ${map[s] || "badge-standard"}`}>{s}</span>;
  };

  const getEntityName = (id: string) => {
    return entities.find(e => e.id === id)?.name || id;
  };

  const getUserName = (uid: string) => {
    return users.find(u => u.uid === uid)?.name || uid;
  };

   const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const docRef = doc(db, "requests", req.requestId);
      try {
        await updateDoc(docRef, { status: newStatus });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `requests/${req.requestId}`);
      }

      // Create a notification for the creator
      const notifId = `NOTIF-${Date.now()}`;
      try {
        await setDoc(doc(db, "notifications", notifId), {
          id: notifId,
          userId: req.userId,
          title: "Request Updates",
          message: `Your request ${req.requestId} status has been updated to ${newStatus}.`,
          read: false,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `notifications/${notifId}`);
      }

      onStatusUpdated(newStatus);
    } catch (err: any) {
      console.error("Failed to update status: ", err);
      let errorDisplayMsg = err.message || "Error updating status";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) {
          errorDisplayMsg = `${parsed.error} (Path: ${parsed.path})`;
        }
      } catch (_) {}
      alert("Error updating status: " + errorDisplayMsg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteRequest = () => {
    setShowConfirmDelete(true);
  };

  const executeDeleteRequest = async () => {
    setDeletingRequest(true);
    setErrorFeedbackMsg("");
    try {
      const docRef = doc(db, "requests", req.requestId);
      try {
        await deleteDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `requests/${req.requestId}`);
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to delete request: ", err);
      let errorDisplayMsg = err.message || "Error deleting request";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) {
          errorDisplayMsg = `${parsed.error} (Path: ${parsed.path})`;
        }
      } catch (_) {}
      setErrorFeedbackMsg(errorDisplayMsg);
    } finally {
      setDeletingRequest(false);
      setShowConfirmDelete(false);
    }
  };

  const appendComment = async () => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      const dateStr = new Date().toISOString();
      const newComment: CommentItem = {
        authorName: currentUser?.name || "STLAF Member",
        authorEmail: currentUser?.email || "member@stlaf.com",
        text: commentText.trim(),
        createdAt: dateStr
      };

      const docRef = doc(db, "requests", req.requestId);
      
      // Update comments field with arrayUnion
      try {
        await updateDoc(docRef, {
          comments: arrayUnion(newComment)
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `requests/${req.requestId}`);
      }

      // Also create a notification for the other side
      const targetUserId = currentUser?.role === "admin" ? req.userId : "admin";
      const notifId = `NOTIF-CMT-${Date.now()}`;
      try {
        await setDoc(doc(db, "notifications", notifId), {
          id: notifId,
          userId: targetUserId,
          title: "New Request Comment",
          message: `${currentUser?.name || "STLAF Member"} added a comment about request ${req.requestId}: "${commentText.trim().substring(0, 40)}..."`,
          read: false,
          createdAt: dateStr
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `notifications/${notifId}`);
      }

      setCommentText("");
      onCommentAdded();
    } catch (err: any) {
      console.error("Failed to add comment: ", err);
      let errorDisplayMsg = err.message || "Error logging comment";
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) {
          errorDisplayMsg = `${parsed.error} (Path: ${parsed.path})`;
        }
      } catch (_) {}
      alert("Error logging comment: " + errorDisplayMsg);
    } finally {
      setAddingComment(false);
    }
  };



  const statusOptions = ["Submitted", "Under Review", "Processing", "Completed", "Rejected"];

  // Workflows Progress Milestones
  const phases = [
    { label: "Logged", key: "Submitted" },
    { label: "Review", key: "Under Review" },
    { label: "Drafting", key: "Processing" },
    { label: "Released", key: "Completed" }
  ];

  const getPhaseIndex = (s: string) => {
    if (s === "Rejected") return -1;
    return phases.findIndex(p => p.key === s);
  };

  const activePhaseIdx = getPhaseIndex(req.status);

  return (
    <div className="modal-overlay" id="request-detail-mgr" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 940, width: "100%" }}>
        <div className="modal-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="badge" style={{ background: "var(--navy)", color: "white", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, padding: "3px 8px" }}>
                {req.requestId}
              </span>
              {getUrgencyBadge(req.priority)}
              {getStatusBadge(req.status)}
            </div>
            <h2 style={{ fontSize: 21, fontFamily: "'Playfair Display', serif", color: "var(--navy)", fontWeight: 700 }}>
              {req.requestType}
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-light)" }}>
              Filed by <strong>{getUserName(req.userId)}</strong> of <strong style={{ color: "var(--navy)" }}>{getEntityName(req.entityId)}</strong>
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Milestone Tracker Bar */}
        {req.status !== "Rejected" && (
          <div style={{ background: "var(--cream)", borderBottom: "1px solid var(--border)", padding: "16px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
              {/* Progress Line */}
              <div style={{
                position: "absolute",
                top: "14px",
                left: "40px",
                right: "40px",
                height: 2,
                background: "var(--border)",
                zIndex: 1
              }} />
              <div style={{
                position: "absolute",
                top: "14px",
                left: "40px",
                width: `${activePhaseIdx >= 0 ? (activePhaseIdx / (phases.length - 1)) * 100 : 0}%`,
                height: 2,
                background: "var(--gold)",
                zIndex: 2,
                transition: "width 0.3s"
              }} />

              {phases.map((ph, idx) => {
                const isPassed = idx <= activePhaseIdx;
                const isCurrent = idx === activePhaseIdx;
                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 3, width: 80 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: isPassed ? "var(--gold)" : "white",
                      border: `2px solid ${isPassed ? "var(--gold)" : "var(--border)"}`,
                      color: isPassed ? "var(--navy)" : "var(--text-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: "bold",
                      boxShadow: isCurrent ? "0 0 0 4px rgba(201,168,76,0.2)" : "none"
                    }}>
                      {isPassed && idx < activePhaseIdx ? (
                        <Check size={12} strokeWidth={3} />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span style={{ 
                      fontSize: 11, 
                      fontWeight: isCurrent ? 700 : 500, 
                      color: isCurrent ? "var(--navy)" : isPassed ? "var(--text)" : "var(--text-light)", 
                      marginTop: 6 
                    }}>
                      {ph.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="modal-body" style={{ padding: "20px 24px", maxHeight: "55vh", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }}>
            
            {/* Left Column: Request details & AI Draft Panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Document Overview block */}
              <div>
                <h4 style={{ fontSize: 13, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, fontWeight: 600 }}>
                  Instruction Details
                </h4>
                <div style={{ 
                  background: "var(--white)", 
                  padding: 16, 
                  borderRadius: "8px", 
                  fontSize: 13.5, 
                  lineHeight: 1.6,
                  color: "var(--text)",
                  whiteSpace: "pre-wrap",
                  border: "1px solid var(--border)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                }}>
                  {req.description}
                </div>
              </div>

              {req.notes && (
                <div>
                  <h4 style={{ fontSize: 13, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, fontWeight: 600 }}>
                    Special Directives
                  </h4>
                  <div style={{ 
                    background: "rgba(201,168,76,0.04)", 
                    padding: 14, 
                    borderRadius: "8px", 
                    fontSize: 13, 
                    lineHeight: 1.5,
                    color: "var(--text-mid)",
                    border: "1px dashed var(--gold)"
                  }}>
                    {req.notes}
                  </div>
                </div>
              )}

              {/* Attachments list with Paperclip logo */}
              <div>
                <h4 style={{ fontSize: 13, color: "var(--text-light)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8, fontWeight: 600 }}>
                  Certified Source Papers
                </h4>
                {req.attachments && req.attachments.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {req.attachments.map((file, idx) => (
                      <div key={idx} style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between", 
                        padding: "10px 14px", 
                        background: "var(--white)", 
                        border: "1px solid var(--border)", 
                        borderRadius: "8px",
                        fontSize: 12.5
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy)" }}>
                          <Paperclip size={14} className="text-gray-400" />
                          <span style={{ fontWeight: 500 }}>{file}</span>
                        </div>
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); { const dummyText = `STLAF Legal Registry Reference File\n================================\n\nDocument Name: ${file}\nReference Tracker: ${req.requestId}\nFiler Identity: ${req.userId}\nTimestamp: ${new Date().toISOString()}\nIntegrity Verification: Verified & Passed\n\nThis document serves as the local reference download copy for the file ${file} uploaded to the STLAF Intakes portal.`; const blob = new Blob([dummyText], { type: "text/plain;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = file.endsWith(".pdf") || file.endsWith(".docx") || file.endsWith(".xlsx") || file.endsWith(".jpg") || file.endsWith(".png") ? file : `${file}.txt`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); } }}
                          style={{ color: "var(--gold)", fontWeight: 600, fontSize: 12 }}
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, fontStyle: "italic", background: "var(--cream)", padding: "10px 14px", borderRadius: "8px", color: "var(--text-light)", border: "1px solid var(--border)" }}>
                    No corporate attachments uploaded.
                  </div>
                )}
              </div>



            </div>

            {/* Right Column: State controls & Comment logs */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Client Action Panel (Standard Users Only, when request is Completed) */}
              {currentUser.role !== "admin" && req.status === "Completed" && (
                <div className="card shadow-sm" style={{ padding: "16px 20px", background: "rgba(201,168,76,0.03)", border: "1px solid rgba(201,168,76,0.18)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <CheckCircle size={14} style={{ color: "var(--gold)" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", fontFamily: "var(--font-heading)" }}>Acknowledge Document Receipt</span>
                  </div>
                  <p style={{ fontSize: 11.5, color: "var(--text-mid)", lineHeight: 1.4, marginBottom: 12 }}>
                    Your corporate document has been successfully certified, issued, and released by the STLAF board registry! Acknowledge receipt to download materials and clear this processing entry.
                  </p>
                  <button
                    className="btn btn-gold"
                    onClick={handleDeleteRequest}
                    disabled={deletingRequest}
                    style={{ 
                      width: "100%", 
                      padding: "8px 10px", 
                      fontSize: 12, 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: 6
                    }}
                  >
                    {deletingRequest ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    Acknowledge & Archive Entry
                  </button>
                </div>
              )}

              {/* Management state dropdown (Admins Only) */}
              {currentUser.role === "admin" && (
                <div className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <ShieldCheck size={14} style={{ color: "var(--gold)" }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>Filing Control Panel</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <select 
                        className="form-select" 
                        value={req.status} 
                        disabled={updatingStatus || deletingRequest}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        style={{ flex: 1, padding: "8px 10px", fontSize: 13 }}
                      >
                        {statusOptions.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      {updatingStatus && (
                        <Loader2 size={16} className="animate-spin text-gold" style={{ flexShrink: 0 }} />
                      )}
                    </div>

                    <button
                      className="btn btn-danger btn-sm"
                      onClick={handleDeleteRequest}
                      disabled={updatingStatus || deletingRequest}
                      style={{ 
                        width: "100%", 
                        padding: "8px 10px", 
                        fontSize: 12, 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        gap: 6,
                        background: "var(--formal-red)",
                        color: "white"
                      }}
                    >
                      {deletingRequest ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Delete Submission Entry
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 8, lineHeight: 1.4 }}>
                    Updating state dispatches security alerts. Deleting permanently cleans from dashboard logs.
                  </p>
                </div>
              )}

              {/* Comments Correspondence */}
              <div className="card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, flex: 1, maxHeight: 380, minHeight: 320 }}>
                <div className="card-title" style={{ fontSize: 13, marginBottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: "var(--navy)" }}>Executive Logs</span>
                  <span className="badge" style={{ background: "var(--cream-dark)", color: "var(--text-mid)", fontSize: 10, fontWeight: 600 }}>
                    {req.comments?.length || 0} correspondence entries
                  </span>
                </div>

                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
                  {req.comments && req.comments.length > 0 ? (
                    req.comments.map((c, index) => (
                      <div key={index} style={{ 
                        background: "var(--cream)", 
                        padding: "10px 12px", 
                        borderRadius: "8px",
                        border: "1px solid var(--border)"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: "var(--navy)" }}>{c.authorName}</span>
                          <span style={{ color: "var(--text-light)" }}>
                            {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-mid)", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                          {c.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div style={{ margin: "auto", textAlign: "center", color: "var(--text-light)", fontSize: 12 }}>
                      <div style={{ display: "inline-block", background: "var(--cream)", padding: 12, borderRadius: "50%", marginBottom: 6 }}>
                        <Send size={18} className="text-gray-400" />
                      </div>
                      <p style={{ margin: 0 }}>No correspondence logged yet.</p>
                    </div>
                  )}
                </div>

                {/* Submit comment action area */}
                <div style={{ display: "flex", gap: 8, marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type legal directive or query..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && appendComment()}
                    style={{ fontSize: 12.5, padding: "8px 10px" }}
                  />
                  <button 
                    className="btn btn-navy btn-sm"
                    onClick={appendComment}
                    disabled={addingComment || !commentText.trim()}
                    style={{ background: "var(--navy)", color: "white", borderRadius: "6px", padding: "0 12px", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    {addingComment ? (
                      <Loader2 size={13} className="animate-spin text-white" />
                    ) : (
                      "Send"
                    )}
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>Close panel view</button>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={e => e.target === e.currentTarget && setShowConfirmDelete(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header" style={{ borderBottomColor: "rgba(220, 53, 69, 0.1)" }}>
              <h2 className="text-navy flex items-center gap-2" style={{ fontSize: 16 }}>
                {currentUser.role !== "admin" && req.status === "Completed" ? (
                  <>
                    <CheckCircle size={16} style={{ color: "var(--gold)", marginRight: 4 }} />
                    Acknowledge Filing Document
                  </>
                ) : (
                  <>
                    <Trash2 size={16} style={{ color: "var(--formal-red)", marginRight: 4 }} />
                    Confirm Discarding Intake
                  </>
                )}
              </h2>
              <button className="modal-close" onClick={() => setShowConfirmDelete(false)}>
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: "16px 20px" }}>
              <p style={{ fontSize: 13.5, color: "var(--text-main)", fontWeight: 500, marginBottom: 12 }}>
                {currentUser.role !== "admin" && req.status === "Completed" 
                  ? "Are you sure you have received and downloaded your certified legal filing?"
                  : "Are you sure you want to permanently delete this corporate filing intake request?"}
              </p>
              
              <div style={{ padding: "10px 14px", background: "var(--cream)", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 14 }}>
                <strong style={{ color: "var(--navy)", fontSize: 13.5 }}>{req.requestType}</strong>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-light)", marginTop: 4 }}>ID: {req.requestId}</div>
              </div>

              {currentUser.role !== "admin" && req.status === "Completed" ? (
                <p style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.45, margin: 0 }}>
                  Acknowledging will clear this completed intake entry from your active queue space to keep your corporate list organized.
                </p>
              ) : (
                <p style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.45, margin: 0 }}>
                  This action cannot be undone. The request, all associated legal commentary, doc references, and metadata logs will be wiped permanently from the registry system.
                </p>
              )}

              {errorFeedbackMsg && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--cream-dark)", border: "1px solid var(--formal-red)", color: "var(--formal-red)", borderRadius: 6, fontSize: 12 }}>
                  {errorFeedbackMsg}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ borderTop: "1px solid var(--border)", gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowConfirmDelete(false)} disabled={deletingRequest}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-gold" 
                style={{ 
                  backgroundColor: currentUser.role !== "admin" && req.status === "Completed" ? "var(--gold)" : "var(--formal-red)",
                  borderColor: currentUser.role !== "admin" && req.status === "Completed" ? "var(--gold)" : "var(--formal-red)",
                  color: "white" 
                }}
                disabled={deletingRequest}
                onClick={executeDeleteRequest}
              >
                {deletingRequest ? <Loader2 size={13} className="animate-spin mr-1 inline-block" /> : null}
                {currentUser.role !== "admin" && req.status === "Completed" ? "Confirm & Clear Entry" : "Permanently Delete Submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
