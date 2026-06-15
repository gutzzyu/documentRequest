import { useState } from "react";
import { doc, updateDoc, setDoc } from "firebase/firestore";
import { 
  Users, 
  ShieldCheck, 
  UserX, 
  Edit, 
  UserCheck, 
  X,
  Shield,
  Loader2,
  Mail,
  Building,
  Search
} from "lucide-react";
import { db } from "../firebase";
import { UserProfile, EntityCompany } from "../types";

interface UserManagementProps {
  users: UserProfile[];
  entities: EntityCompany[];
  currentUser: UserProfile;
  onRefresh: () => void;
}

export function UserManagement({
  users,
  entities,
  currentUser,
  onRefresh
}: UserManagementProps) {
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editEntityId, setEditEntityId] = useState("");
  const [editStatus, setEditStatus] = useState<"pending" | "active" | "disabled">("pending");
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getEntityName = (id: string) => {
    return entities.find(e => e.id === id)?.name || id;
  };

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    const entityName = getEntityName(u.entityId).toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(term) ||
      (u.email || "").toLowerCase().includes(term) ||
      entityName.includes(term) ||
      (u.role || "").toLowerCase().includes(term) ||
      (u.status || "").toLowerCase().includes(term)
    );
  });

  const handleEditClick = (u: UserProfile) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditEntityId(u.entityId);
    setEditStatus(u.status);
  };

  const handleUpdateUserSubmit = async (e: any) => {
    e.preventDefault();
    if (!editingUser) return;
    setSaving(true);
    try {
      const docRef = doc(db, "users", editingUser.uid);
      await updateDoc(docRef, {
        name: editName.trim(),
        entityId: editEntityId,
        status: editStatus
      });

      // Send a targeted notification
      const notifId = `NOTIF-MGT-${Date.now()}`;
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        userId: editingUser.uid,
        title: "Account Status Changed",
        message: `Your STLAF portal account has been updated by an administrator. Status set to: ${editStatus}.`,
        read: false,
        createdAt: new Date().toISOString()
      });

      setEditingUser(null);
      onRefresh();
    } catch (err: any) {
      console.error("Failed to update user:", err);
      alert("Error updating user: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = async (u: UserProfile, newRole: "admin" | "user") => {
    if (u.uid === currentUser.uid) {
      alert("You cannot change your own authorization credentials.");
      return;
    }
    if (!window.confirm(`Are you sure you want to make ${u.name} a ${newRole}?`)) return;

    try {
      const docRef = doc(db, "users", u.uid);
      await updateDoc(docRef, { role: newRole });
      
      const notifId = `NOTIF-MGT-RL-${Date.now()}`;
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        userId: u.uid,
        title: "Authorization Level Shifted",
        message: `An administrator has set your security role to: ${newRole}.`,
        read: false,
        createdAt: new Date().toISOString()
      });

      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    }
  };

  const handleSoftDeleteToggle = async (u: UserProfile, isDisable: boolean) => {
    if (u.uid === currentUser.uid) {
      alert("You cannot lock your own account.");
      return;
    }
    const actionText = isDisable ? "Disable" : "Enable";
    if (!window.confirm(`Are you sure you want to ${actionText} ${u.name}?`)) return;

    try {
      const docRef = doc(db, "users", u.uid);
      await updateDoc(docRef, { 
        status: isDisable ? "disabled" : "active" 
      });
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    }
  };

  const handleApproveUser = async (u: UserProfile) => {
    try {
      const docRef = doc(db, "users", u.uid);
      await updateDoc(docRef, { status: "active" });

      // Notify user
      const notifId = `NOTIF-APP-${Date.now()}`;
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        userId: u.uid,
        title: "Account Approved",
        message: "Congratulations! Your registration has been approved and you can now access the workspace portal.",
        read: false,
        createdAt: new Date().toISOString()
      });

      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert("Approval error: " + err.message);
    }
  };

  const getStatusStyle = (s: string) => {
    if (s === "active") return { background: "var(--green-soft)", color: "var(--green)", border: "1px solid rgba(21,128,61,0.12)" };
    if (s === "pending") return { background: "var(--amber-soft)", color: "var(--amber)", border: "1px solid rgba(217,119,6,0.2)" };
    return { background: "var(--red-soft)", color: "var(--red)", border: "1px solid rgba(192,57,43,0.12)" };
  };

  return (
    <div className="page" id="user-management-panel">
      <div className="card shadow-sm">
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 16 }}>Workspace Associate Directories</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-light)" }}>
              Manage delegate credentials, approve new registrations, shift security classifications, or suspend inactive accounts
            </span>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: 18, display: "flex", gap: 12 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-light)", display: "flex", alignItems: "center" }}>
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search associate name, email, role or affiliation..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: 34, fontSize: 13, height: 38, width: "100%" }}
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery("")} 
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-light)", cursor: "pointer", fontSize: 14 }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* User Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: "240px" }}>Associate Identity Details</th>
                <th>Corporate Affiliation</th>
                <th>Security Clearance</th>
                <th>State Status</th>
                <th style={{ textAlign: "right", paddingRight: 16 }}>Authorized Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.uid}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        background: u.status === "active" ? "rgba(201,168,76,0.1)" : "var(--cream-dark)",
                        color: u.status === "active" ? "var(--gold)" : "var(--text-light)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        border: "1.5px solid var(--border)",
                        flexShrink: 0
                      }}>
                        {(u?.name || u?.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong style={{ fontSize: 13.5, color: "var(--navy)", display: "block" }}>{u.name}</strong>
                        <div style={{ fontSize: 11.5, color: "var(--text-light)", display: "flex", alignItems: "center", gap: 3 }}>
                          <Mail size={11} />
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 500, color: "var(--text)" }}>
                      <Building size={12} className="text-gray-400" />
                      {getEntityName(u.entityId)}
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ 
                      background: u.role === "admin" ? "rgba(201,168,76,0.12)" : "var(--cream-dark)", 
                      color: u.role === "admin" ? "var(--gold)" : "var(--text-mid)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: 10,
                      gap: 4
                    }}>
                      {u.role === "admin" ? <ShieldCheck size={11} /> : <Shield size={11} />}
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={getStatusStyle(u.status)}>
                      {u.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingRight: 8, flexWrap: "wrap" }}>
                      {u.status === "pending" && (
                        <button 
                          className="btn btn-success btn-sm shadow-sm"
                          onClick={() => handleApproveUser(u)}
                          style={{ padding: "5px 10px" }}
                        >
                          <UserCheck size={12} style={{ marginRight: 3 }} />
                          Approve Setup
                        </button>
                      )}

                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleEditClick(u)}
                        style={{ padding: "5px 10px" }}
                      >
                        <Edit size={11} style={{ marginRight: 3 }} />
                        Edit Meta
                      </button>

                      {u.role === "admin" ? (
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRoleToggle(u, "user")}
                          title="Demote to standard client representative status"
                          style={{ padding: "5px 10px", fontSize: 11 }}
                        >
                          Revoke Access
                        </button>
                      ) : (
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleRoleToggle(u, "admin")}
                          title="Elevate security credentials"
                          style={{ padding: "5px 10px", fontSize: 11 }}
                        >
                          Grant Admin
                        </button>
                      )}

                      {u.status === "disabled" ? (
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => handleSoftDeleteToggle(u, false)}
                          style={{ padding: "5px 10px" }}
                        >
                          Restore
                        </button>
                      ) : (
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleSoftDeleteToggle(u, true)}
                          style={{ padding: "5px 10px" }}
                        >
                          <UserX size={12} style={{ marginRight: 3 }} />
                          Disable
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "48px 16px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-mid)", fontSize: 14 }}>No matching associates found</div>
                    <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 4 }}>Verify spelling or registration email details.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal popover */}
      {editingUser && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingUser(null)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Modify Member Security</h2>
              <button className="modal-close" onClick={() => setEditingUser(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpdateUserSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Full Name <span>*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Affiliated Corporate Client <span>*</span></label>
                  <select
                    className="form-select"
                    value={editEntityId}
                    onChange={e => setEditEntityId(e.target.value)}
                  >
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Portal Membership Status <span>*</span></label>
                  <select
                    className="form-select"
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value as any)}
                  >
                    <option value="pending">Pending Approval Review</option>
                    <option value="active">Active Entry Allowed</option>
                    <option value="disabled">Locked / Access Restricted</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingUser(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold" disabled={saving}>
                  {saving ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Loader2 size={13} className="spin" />
                      Saving changes...
                    </span>
                  ) : "Update Profile Meta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
