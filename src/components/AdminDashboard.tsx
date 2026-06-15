import { useState } from "react";
import { 
  Users as UsersIcon, 
  Building2, 
  FileText, 
  Clock, 
  AlertTriangle, 
  Plus, 
  FilterX, 
  ChevronRight, 
  Database,
  Search,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";
import { RequestItem, EntityCompany, UserProfile } from "../types";

interface AdminDashboardProps {
  requests: RequestItem[];
  users: UserProfile[];
  entities: EntityCompany[];
  onViewRequestClick: (req: RequestItem) => void;
  onSeedDemo: () => void;
}

export function AdminDashboard({
  requests,
  users,
  entities,
  onViewRequestClick,
  onSeedDemo
}: AdminDashboardProps) {
  const [filterEntityId, setFilterEntityId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const getUserName = (uid: string) => {
    return users.find(u => u.uid === uid)?.name || uid;
  };

  const getEntityName = (id: string) => {
    return entities.find(e => e.id === id)?.name || id;
  };

  // Calc metrics count
  const totalUsersCount = users.length;
  const totalClientsCount = entities.filter(e => e.status === "active").length;
  const totalRequestsCount = requests.length;
  const pendingRequestsCount = requests.filter(r => r.status !== "Completed" && r.status !== "Rejected").length;
  const urgentRequestsCount = requests.filter(r => (r.priority === "urgent" || r.priority === "sameday") && r.status !== "Completed" && r.status !== "Rejected").length;

  const filteredRequests = requests.filter(r => {
    if (filterEntityId && r.entityId !== filterEntityId) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterPriority && r.priority !== filterPriority) return false;
    if (filterDate) {
      const matchDateStr = new Date(r.createdAt).toDateString();
      const selectedDateStr = new Date(filterDate).toDateString();
      if (matchDateStr !== selectedDateStr) return false;
    }
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      const userName = getUserName(r.userId).toLowerCase();
      const entityName = getEntityName(r.entityId).toLowerCase();
      const matchType = r.requestType.toLowerCase().includes(term);
      const matchId = r.requestId.toLowerCase().includes(term);
      const matchName = userName.includes(term);
      const matchEntity = entityName.includes(term);
      if (!matchType && !matchId && !matchName && !matchEntity) return false;
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
    <div className="page" id="admin-dashboard-view">
      {/* Metrics Row */}
      <div className="stats-row" id="admin-metrics" style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        <div className="stat-card blue shadow-sm" id="card-admin-users">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="stat-label">System Users</div>
            <span style={{ color: "var(--blue)", background: "var(--blue-soft)", padding: 6, borderRadius: 6, flexShrink: 0 }}>
              <UsersIcon size={14} />
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: 26, marginTop: 4 }}>{totalUsersCount}</div>
          <div className="stat-note">Profiles registered</div>
        </div>

        <div className="stat-card green shadow-sm" id="card-admin-clients">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="stat-label">Entities</div>
            <span style={{ color: "var(--green)", background: "var(--green-soft)", padding: 6, borderRadius: 6, flexShrink: 0 }}>
              <Building2 size={14} />
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: 26, marginTop: 4 }}>{totalClientsCount}</div>
          <div className="stat-note">Affiliate companies</div>
        </div>

        <div className="stat-card blue shadow-sm" id="card-admin-requests">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="stat-label">Total Submissions</div>
            <span style={{ color: "var(--text-mid)", background: "var(--cream-dark)", padding: 6, borderRadius: 6, flexShrink: 0 }}>
              <FileSpreadsheet size={14} />
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: 26, marginTop: 4 }}>{totalRequestsCount}</div>
          <div className="stat-note">Filing history total</div>
        </div>

        <div className="stat-card amber shadow-sm" id="card-admin-pending">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="stat-label">Pending Action</div>
            <span style={{ color: "var(--amber)", background: "var(--amber-soft)", padding: 6, borderRadius: 6, flexShrink: 0 }}>
              <Clock size={14} />
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: 26, marginTop: 4 }}>{pendingRequestsCount}</div>
          <div className="stat-note">To be processed</div>
        </div>

        <div className="stat-card red shadow-sm" id="card-admin-urgent">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div className="stat-label">Urgent Critical</div>
            <span style={{ color: "var(--red)", background: "var(--red-soft)", padding: 6, borderRadius: 6, flexShrink: 0 }}>
              <AlertTriangle size={14} />
            </span>
          </div>
          <div className="stat-value" style={{ fontSize: 26, marginTop: 4 }}>{urgentRequestsCount}</div>
          <div className="stat-note">Backlog priority action</div>
        </div>
      </div>

      {/* Main Request Pipeline Panel */}
      <div className="card shadow-sm" id="admin-requests-log">
        <div className="card-title" id="admin-table-header" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 16 }}>Central Corporate Secretariat Pipeline</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-light)" }}>
              Filing authorizations, certificates, and resolutions across verified associate entities
            </span>
          </div>
          {requests.length === 0 && (
            <button className="btn btn-navy btn-sm shadow-sm" onClick={onSeedDemo}>
              <Database size={13} style={{ marginRight: 4 }} />
              Seed Demo Filing Records
            </button>
          )}
        </div>

        {/* Filters & Search bar */}
        <div className="filter-bar" id="admin-filters" style={{ marginBottom: 20, gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", minWidth: 260, flexGrow: 1, maxWidth: 360 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-light)", display: "flex", alignItems: "center" }}>
              <Search size={14} />
            </span>
            <input 
              type="text"
              placeholder="Search type, hash, affiliation, sender..."
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

          <div>
            <select 
              value={filterEntityId} 
              onChange={e => setFilterEntityId(e.target.value)}
              className="form-select"
              style={{ width: 180 }}
            >
              <option value="">All Corporate Entities</option>
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="form-select"
              style={{ width: 155 }}
            >
              <option value="">All Action States</option>
              <option value="Submitted">Submitted / Logged</option>
              <option value="Under Review">Under Review</option>
              <option value="Processing">Processing Draft</option>
              <option value="Completed">Completed / Issued</option>
              <option value="Rejected">Declined</option>
            </select>
          </div>

          <div>
            <select 
              value={filterPriority} 
              onChange={e => setFilterPriority(e.target.value)}
              className="form-select"
              style={{ width: 140 }}
            >
              <option value="">All Priorities</option>
              <option value="standard">Standard Level</option>
              <option value="urgent">Urgent</option>
              <option value="sameday">Same Day</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0 8px", background: "white", height: 38 }}>
            <span style={{ color: "var(--text-light)", fontSize: 12, fontWeight: 500 }}>Date Filed:</span>
            <input 
              type="date"
              className="form-input"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              style={{ width: 125, border: "none", fontSize: 12, padding: "5px 0" }}
            />
          </div>

          {(filterEntityId || filterStatus || filterPriority || filterDate || searchQuery) && (
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => {
                setFilterEntityId("");
                setFilterStatus("");
                setFilterPriority("");
                setFilterDate("");
                setSearchQuery("");
              }}
              style={{ padding: "8px 12px", borderStyle: "dashed", borderColor: "var(--gold)" }}
            >
              <FilterX size={13} style={{ marginRight: 4 }} />
              Reset Filters
            </button>
          )}
        </div>

        {/* Request Queue Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="table" id="admin-requests-tbl">
            <thead>
              <tr>
                <th style={{ width: "130px" }}>Request Hash</th>
                <th>Sender / Delegation Affiliation</th>
                <th>Filing Action Type</th>
                <th>Priority</th>
                <th>Workflow Status</th>
                <th>Logged On</th>
                <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
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
                      fontSize: 12,
                      background: "var(--cream)",
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--border)"
                    }}>
                      {r.requestId}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontSize: 13.5, color: "var(--navy)", display: "block" }}>
                      {getUserName(r.userId)}
                    </strong>
                    <span style={{ fontSize: 11, color: "var(--text-light)" }}>
                      {getEntityName(r.entityId)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, color: "var(--navy)" }}>{r.requestType}</span>
                  </td>
                  <td>{getUrgencyBadge(r.priority)}</td>
                  <td>{getStatusBadge(r.status)}</td>
                  <td style={{ color: "var(--text-mid)", fontSize: 12.5 }}>
                    {new Date(r.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })}
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 16 }}>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewRequestClick(r);
                      }}
                      style={{ padding: "5px 11px", fontSize: 11, borderRadius: "4px", background: "var(--navy)", color: "white" }}
                    >
                      Manage
                      <ChevronRight size={12} style={{ marginLeft: 3 }} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "64px 16px" }}>
                    <div style={{ display: "inline-block", background: "var(--cream)", padding: 18, borderRadius: "50%", marginBottom: 12, color: "var(--text-light)" }}>
                      <FileText size={32} strokeWidth={1.5} />
                    </div>
                    <div style={{ fontWeight: 600, color: "var(--text-mid)", fontSize: 15 }}>No matching filing records registered</div>
                    <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 4, maxWidth: 360, margin: "4px auto 0" }}>
                      Adjust filters or wait for employees to log new requests.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
