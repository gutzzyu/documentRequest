import { useState } from "react";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { 
  Building2, 
  Users, 
  Code, 
  Plus, 
  X, 
  Loader2, 
  Edit2,
  Trash2,
  Search
} from "lucide-react";
import { db } from "../firebase";
import { EntityCompany, UserProfile } from "../types";

interface ClientManagementProps {
  entities: EntityCompany[];
  users: UserProfile[];
  onRefresh: () => void;
}

export function ClientManagement({
  entities,
  users,
  onRefresh
}: ClientManagementProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<EntityCompany | null>(null);
  const [deleteConfirmComp, setDeleteConfirmComp] = useState<EntityCompany | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);

  const getActiveUsersCount = (entityId: string) => {
    return users.filter(u => u.entityId === entityId && u.status === "active").length;
  };

  const filteredEntities = entities.filter(e => {
    if (e.id === "ent_seed_marker") return false;
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return e.name.toLowerCase().includes(term) || e.id.toLowerCase().includes(term);
  });

  const handleCreateCompany = async (e: any) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setSaving(true);
    try {
      const parsedId = "ent_" + companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
      
      const newEntity: EntityCompany = {
        id: parsedId,
        name: companyName.trim(),
        status: "active"
      };

      // Set document inside Firestore
      await setDoc(doc(db, "entities", parsedId), newEntity);

      setCompanyName("");
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert("Error adding company: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCompanySubmit = async (e: any) => {
    e.preventDefault();
    if (!editingCompany || !companyName.trim()) return;
    setSaving(true);
    try {
      const docRef = doc(db, "entities", editingCompany.id);
      await updateDoc(docRef, { name: companyName.trim() });

      setCompanyName("");
      setEditingCompany(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      alert("Error renaming company: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCompany = (comp: EntityCompany) => {
    setDeleteConfirmComp(comp);
  };

  return (
    <div className="page" id="client-management-panel">
      <div className="card shadow-sm">
        <div className="card-title flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <span className="text-navy font-serif text-lg font-bold">STLAF Client Entities & Registrar</span>
            <span className="text-xs text-charcoal-light font-sans font-normal max-w-2xl leading-relaxed">
              Manage registered affiliate companies and corporate client organizations, inspect approved user access metrics, and configure official partner access credentials.
            </span>
          </div>
          <button className="btn btn-gold shadow-sm font-sans" onClick={() => { setCompanyName(""); setShowAddModal(true); }}>
            <Plus size={14} className="mr-1 inline" />
            New Corporate Client
          </button>
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: 18, display: "flex", gap: 12 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-light)", display: "flex", alignItems: "center" }}>
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search affiliate name or database ID..."
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

        {/* Clients list */}
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 16 }}>Affiliate Corporate Legal Name</th>
                <th>Database ID Reference</th>
                <th>Authorized Delegation</th>
                <th>Corporate Status</th>
                <th style={{ textAlign: "right", paddingRight: 16 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntities.map((comp) => (
                <tr key={comp.id}>
                  <td style={{ paddingLeft: 16 }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center border shrink-0 ${
                        comp.status === "active" ? "bg-gold/10 text-gold border-gold/20" : "bg-cream-dark text-charcoal-muted border-cream-dark/80"
                      }`}>
                        <Building2 size={15} />
                      </div>
                      <span className="text-sm font-semibold text-navy font-sans">{comp.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Code size={12} className="text-charcoal-muted" />
                      <span className="font-mono text-[11px] text-charcoal-muted font-medium">{comp.id}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-xs font-semibold text-navy font-sans">
                      <Users size={13} className="text-charcoal-muted" />
                      <span>{getActiveUsersCount(comp.id)} Active Profiles</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${comp.status === "active" ? "badge-released" : "badge-urgent"}`}>
                      {comp.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", paddingRight: 16 }}>
                    <div className="flex gap-2 justify-end">
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setEditingCompany(comp); setCompanyName(comp.name); }}
                      >
                        <Edit2 size={11} className="mr-1 inline" />
                        Rename
                      </button>

                      <button 
                        className="btn btn-danger btn-sm min-w-[120px]"
                        onClick={() => handleDeleteCompany(comp)}
                      >
                        <Trash2 size={11} className="mr-1 inline" />
                        Delete Client
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEntities.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "48px 16px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-mid)", fontSize: 14 }}>No matching affiliate organizations found</div>
                    <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 4 }}>Adjust your search keyword or create a new client.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>Register Corporate Client</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateCompany}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Client Company Name <span>*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Sunny and Scramble Corporation"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    required
                    autoFocus
                  />
                  <p style={{ fontSize: 11, color: "var(--text-light)", marginTop: 6, lineHeight: 1.4 }}>
                    New filings can only be uploaded by users belonging to registered corporate affiliations.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold" disabled={saving}>
                  {saving ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Loader2 size={13} className="spin" />
                      Creating file...
                    </span>
                  ) : "Register Entity Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {editingCompany && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditingCompany(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h2>Rename Affiliate Company</h2>
              <button className="modal-close" onClick={() => setEditingCompany(null)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditCompanySubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Official Registered Name <span>*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setEditingCompany(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold" disabled={saving}>
                  {saving ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Loader2 size={13} className="spin" />
                      Saving changes...
                    </span>
                  ) : "Update Corporate Name"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Client Confirmation Modal */}
      {deleteConfirmComp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirmComp(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header" style={{ borderBottomColor: "rgba(220, 53, 69, 0.1)" }}>
              <h2 className="text-navy flex items-center gap-2" style={{ fontSize: 16 }}>
                <Trash2 size={16} style={{ color: "var(--formal-red)", marginRight: 4 }} />
                Confirm Deletion
              </h2>
              <button className="modal-close" onClick={() => setDeleteConfirmComp(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 13.5, color: "var(--text-main)", fontWeight: 500, marginBottom: 8 }}>
                Are you sure you want to permanently delete corporate client:
              </p>
              <div style={{ padding: "10px 14px", background: "var(--cream)", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 12 }}>
                <strong style={{ color: "var(--navy)", fontSize: 13.5 }}>{deleteConfirmComp.name}</strong>
                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-light)", marginTop: 4 }}>ID: {deleteConfirmComp.id}</div>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--text-light)", lineHeight: 1.4 }}>
                This action is irreversible and dissolves client access registrations. All current filing workflows for this corporate partner will lack standard reference links.
              </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteConfirmComp(null)}>
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-gold" 
                style={{ backgroundColor: "var(--formal-red)", borderColor: "var(--formal-red)", color: "white" }}
                onClick={async () => {
                  try {
                    const docRef = doc(db, "entities", deleteConfirmComp.id);
                    await deleteDoc(docRef);
                    setDeleteConfirmComp(null);
                    onRefresh();
                  } catch (err: any) {
                    console.error(err);
                    setErrorMessage("Error deleting company: " + err.message);
                  }
                }}
              >
                Permanently Delete Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Error Toast */}
      {errorMessage && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "var(--formal-red)",
          color: "white",
          padding: "12px 18px",
          borderRadius: 6,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 9999,
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 12
        }}>
          <span>{errorMessage}</span>
          <button style={{ color: "white", opacity: 0.8, fontSize: 16, background: "none", border: "none", cursor: "pointer" }} onClick={() => setErrorMessage("")}>×</button>
        </div>
      )}
    </div>
  );
}
