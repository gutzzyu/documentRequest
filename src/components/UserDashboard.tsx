import { useState } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Bell, 
  Plus, 
  FilterX, 
  ChevronRight, 
  ShieldAlert, 
  Layers,
  Search
} from "lucide-react";
import { RequestItem, NotificationItem, EntityCompany } from "../types";

interface UserDashboardProps {
  requests: RequestItem[];
  notifications: NotificationItem[];
  entities: EntityCompany[];
  onNewRequestClick: () => void;
  onViewRequestClick: (req: RequestItem) => void;
}

export function UserDashboard({
  requests,
  notifications,
  entities,
  onNewRequestClick,
  onViewRequestClick
}: UserDashboardProps) {
  const [filterType, setFilterType] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ackConfirmReq, setAckConfirmReq] = useState<RequestItem | null>(null);
  const [clearing, setClearing] = useState(false);

  const myRequestsCount = requests.length;
  const pendingCount = requests.filter(r => r.status !== "Completed" && r.status !== "Rejected").length;
  const completedCount = requests.filter(r => r.status === "Completed").length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const standardTypes = [
      "Secretary’s Certificate",
      "Board Resolution",
      "Shareholders’ Resolution",
      "Minutes of the Meeting"
    ];
    if (filterType) {
      if (filterType === "Others") {
        if (standardTypes.includes(r.requestType)) return false;
      } else {
        if (r.requestType !== filterType) return false;
      }
    }
    if (filterPriority && r.priority !== filterPriority) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      const matchType = r.requestType.toLowerCase().includes(term);
      const matchId = (r.requestId || "").toLowerCase().includes(term);
      const matchNotes = (r.notes || "").toLowerCase().includes(term);
      if (!matchType && !matchId && !matchNotes) return false;
    }
    return true;
  });

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

  return (
    <div className="page" id="user-dashboard-view">
      {/* Metrics Row */}
      <div className="stats-row" id="user-metrics">
        <div className="stat-card blue shadow-sm" id="card-my-requests">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="stat-label">My Requests</div>
            <span style={{ color: "var(--blue)", background: "var(--blue-soft)", padding: 6, borderRadius: 6, flexShrink: 0 }}>
              <FileText size={16} />
            </span>
          </div>
          <div className="stat-value">{myRequestsCount}</div>
          <div className="stat-note">Submitted filings total</div>
        </div>

        <div className="stat-card amber shadow-sm" id="card-pending-requests">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="stat-label">Pending Reviews</div>
            <span style={{ color: "var(--amber)", background: "var(--amber-soft)", padding: 6, borderRadius: 6, flexShrink: 0 }}>
              <Clock size={16} />
            </span>
          </div>
          <div className="stat-value">{pendingCount}</div>
          <div className="stat-note">Active queue workflows</div>
        </div>

        <div className="stat-card green shadow-sm" id="card-completed-requests">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="stat-label">Released / Certified</div>
            <span style={{ color: "var(--green)", background: "var(--green-soft)", padding: 6, borderRadius: 6, flexShrink: 0 }}>
              <CheckCircle size={16} />
            </span>
          </div>
          <div className="stat-value">{completedCount}</div>
          <div className="stat-note">Filing actions completed</div>
        </div>

        <div className="stat-card red shadow-sm" id="card-alerts">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="stat-label">Important Alerts</div>
            <span style={{ color: "var(--red)", background: "var(--red-soft)", padding: 6, borderRadius: 6, flexShrink: 0 }}>
              <Bell size={16} />
            </span>
          </div>
          <div className="stat-value">{unreadNotifications}</div>
          <div className="stat-note">Workspace logs to clear</div>
        </div>
      </div>

      {/* Main Container */}
      <div className="card shadow-sm" id="user-requests-log" style={{ minHeight: 320 }}>
        <div className="card-title" id="user-table-header" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 16 }}>Request Portfolio History</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-light)" }}>
              Submit, track and view historic corporate documents assigned to your delegation
            </span>
          </div>
          <button className="btn btn-gold shadow-sm" id="btn-user-new-request" onClick={onNewRequestClick}>
            <Plus size={16} style={{ marginRight: 2 }} />
            New Request
          </button>
        </div>

        {/* Filters & Search bar */}
        <div className="filter-bar" id="user-filters" style={{ marginBottom: 20, gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: 260, flexGrow: 1, maxWidth: 360 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-light)", display: "flex", alignItems: "center" }}>
              <Search size={14} />
            </span>
            <input 
              type="text"
              placeholder="Search request type, ID or notes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 30, fontSize: 13, height: 38, width: "100%" }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery("")} 
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-light)", cursor: "pointer", fontSize: 14 }}
              >
                ×
              </button>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="form-select"
              style={{ minWidth: 260 }}
            >
              <option value="">All Filing Categories</option>
              <option value="Secretary’s Certificate">Secretary’s Certificate</option>
              <option value="Board Resolution">Board Resolution</option>
              <option value="Shareholders’ Resolution">Shareholders’ Resolution</option>
              <option value="Minutes of the Meeting">Minutes of the Meeting</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div>
            <select 
              value={filterPriority} 
              onChange={e => setFilterPriority(e.target.value)}
              className="form-select"
              style={{ width: 150 }}
            >
              <option value="">All Priorities</option>
              <option value="standard">Standard Level</option>
              <option value="urgent">Urgent Board Action</option>
              <option value="sameday">Same-Day Critical</option>
            </select>
          </div>

          <div>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="form-select"
              style={{ width: 150 }}
            >
              <option value="">All Action States</option>
              <option value="Submitted">Submitted / Logged</option>
              <option value="Under Review">Under Review</option>
              <option value="Processing">Processing Draft</option>
              <option value="Completed">Completed / Issued</option>
              <option value="Rejected">Declined</option>
            </select>
          </div>

          {(filterType || filterPriority || filterStatus || searchQuery) && (
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => {
                setFilterType("");
                setFilterPriority("");
                setFilterStatus("");
                setSearchQuery("");
              }}
              style={{ padding: "8px 12px", borderStyle: "dashed", borderColor: "var(--gold)" }}
            >
              <FilterX size={13} style={{ marginRight: 4 }} />
              Reset filters
            </button>
          )}
        </div>

        {/* Table representation */}
        <div style={{ overflowX: "auto" }}>
          <table className="table" id="user-requests-tbl">
            <thead>
              <tr>
                <th style={{ width: "140px" }}>Request Identifier</th>
                <th>Request Type</th>
                <th>Filing Matter Description</th>
                <th>Timeline Logged</th>
                <th>Urgency</th>
                <th>Workflow Status</th>
                <th style={{ textAlign: "right", paddingRight: 16 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((r) => (
                <tr key={r.requestId} style={{ cursor: "pointer" }} onClick={() => onViewRequestClick(r)}>
                  <td>
                    <span style={{ 
                      fontFamily: "var(--font-mono)", 
                      fontWeight: 600, 
                      color: "var(--navy)", 
                      fontSize: 12.5,
                      background: "var(--cream)",
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--border)"
                    }}>
                      {r.requestId}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontWeight: 600, color: "var(--navy)" }}>{r.requestType}</strong>
                  </td>
                  <td>
                    <div className="truncate" style={{ maxWidth: "240px", fontSize: 12.5, color: "var(--text-mid)" }}>
                      {r.description.replace(/^(.*?)\n\n/, "") || r.description}
                    </div>
                  </td>
                  <td style={{ color: "var(--text-mid)", fontSize: 12.5 }}>
                    {new Date(r.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}
                  </td>
                  <td>{getUrgencyBadge(r.priority)}</td>
                  <td>{getStatusBadge(r.status)}</td>
                  <td style={{ textAlign: "right", paddingRight: 16 }}>
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
                      {r.status === "Completed" && (
                        <button 
                          className="btn btn-success btn-sm font-sans"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAckConfirmReq(r);
                          }}
                          style={{ fontSize: 10, padding: "4px 8px", borderRadius: "4px" }}
                        >
                          <CheckCircle size={11} className="mr-1 inline-block" />
                          Ack Receipt
                        </button>
                      )}
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewRequestClick(r);
                        }}
                        style={{ fontSize: 11, padding: "4px 10px", borderRadius: "4px" }}
                      >
                        Inspect
                        <ChevronRight size={12} style={{ marginLeft: 3 }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "64px 16px" }}>
                    <div style={{ display: "inline-block", background: "var(--cream)", padding: 18, borderRadius: "50%", marginBottom: 12, color: "var(--text-light)" }}>
                      <Layers size={32} strokeWidth={1.5} />
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--text-mid)", fontSize: 15 }}>No matching filing records</div>
                    <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 4, maxWidth: 360, margin: "4px auto 0" }}>
                      Clear filing parameters above, or submit a brand-new corporate intake file to begin processing credentials.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Ack Receipt Modal overlay */}
      {ackConfirmReq && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={e => e.target === e.currentTarget && setAckConfirmReq(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header" style={{ borderBottomColor: "rgba(16, 185, 129, 0.1)" }}>
              <h2 className="text-navy flex items-center gap-2" style={{ fontSize: 16 }}>
                <CheckCircle size={16} style={{ color: "var(--light-accent-color, #10b981)", marginRight: 4 }} />
                Acknowledge Receipt
              </h2>
              <button className="modal-close" onClick={() => setAckConfirmReq(null)}>
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: "16px 20px" }}>
              <p style={{ fontSize: 13.5, color: "var(--text-main)", fontWeight: 500, marginBottom: 12 }}>
                Confirm document delivery and download for filing request:
              </p>
              <div style={{ padding: "10px 14px", background: "var(--cream)", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 14 }}>
                <strong style={{ color: "var(--navy)", fontSize: 13.5 }}>{ackConfirmReq.requestType}</strong>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-light)", marginTop: 4 }}>ID Reference: {ackConfirmReq.requestId}</div>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-light)", lineHeight: 1.45, margin: 0 }}>
                Acknowledging receipt confirms that you have successfully received your certified copies and resolutions. The completed workflow will be safely archived and cleared from your active portfolio table to maintain storage space.
              </p>
            </div>
            <div className="modal-footer" style={{ borderTop: "1px solid var(--border)", gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setAckConfirmReq(null)} disabled={clearing}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-gold" 
                style={{ backgroundColor: "var(--gold)", color: "white" }}
                disabled={clearing}
                onClick={async () => {
                  setClearing(true);
                  try {
                    await deleteDoc(doc(db, "requests", ackConfirmReq.requestId));
                    setAckConfirmReq(null);
                  } catch (err: any) {
                    console.error("Error clearing request:", err);
                    alert("Failed to clear request: " + err.message);
                  } finally {
                    setClearing(false);
                  }
                }}
              >
                {clearing ? "Processing..." : "Confirm & Arrange Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
