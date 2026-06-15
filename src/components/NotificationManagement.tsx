import React, { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc 
} from "firebase/firestore";
import { db } from "../firebase";
import { NotificationItem, UserProfile } from "../types";
import { 
  Bell, 
  Search, 
  Trash2, 
  CheckCircle, 
  Clock, 
  User, 
  Layers, 
  ShieldAlert,
  Loader2
} from "lucide-react";

interface NotificationManagementProps {
  users: UserProfile[];
}

export function NotificationManagement({ users }: NotificationManagementProps) {
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRecipient, setFilterRecipient] = useState<"all" | "admin" | "users">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync all system notifications chronologically
  useEffect(() => {
    const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: NotificationItem[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as NotificationItem);
      });
      setAllNotifications(list);
      setLoading(false);
    }, (err) => {
      console.error("Failed to sync system notifications:", err);
      setLoading(false);
    });
    return unsub;
  }, []);

  const getUserName = (uid: string) => {
    if (uid === "admin") return "🛡️ System Manager (Admin)";
    return users.find(u => u.uid === uid)?.name || `User (${uid})`;
  };

  const getUserEmail = (uid: string) => {
    if (uid === "admin") return "Central Office Panel";
    return users.find(u => u.uid === uid)?.email || "N/A";
  };

  const handleDeleteNotification = async (notifId: string) => {
    setDeletingId(notifId);
    try {
      await deleteDoc(doc(db, "notifications", notifId));
    } catch (err: any) {
      console.error("Failed to delete notification log:", err);
      alert("Error: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAsRead = async (notifId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), { read: !currentStatus });
    } catch (err: any) {
      console.error("Failed to toggle read status:", err);
    }
  };

  const filteredNotifs = allNotifications.filter(n => {
    // 1. Recipient Filter
    if (filterRecipient === "admin" && n.userId !== "admin") return false;
    if (filterRecipient === "users" && n.userId === "admin") return false;

    // 2. Search Query
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      const userName = getUserName(n.userId).toLowerCase();
      const userEmail = getUserEmail(n.userId).toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(term);
      const matchMessage = n.message.toLowerCase().includes(term);
      const matchName = userName.includes(term);
      const matchEmail = userEmail.includes(term);
      if (!matchTitle && !matchMessage && !matchName && !matchEmail) return false;
    }

    return true;
  });

  return (
    <div className="page" id="notification-management-page">
      <div className="panel" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 className="text-navy" style={{ margin: 0, fontSize: 16 }}>Registered Dispatch Logs</h3>
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-light)" }}>
              History of real-time communication events, status alerts, and legal comments issued.
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }} className="ml-auto">
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-mid)" }}>Recipient Type:</span>
            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button 
                className={`px-3 py-1 text-xs rounded-md font-medium cursor-pointer transition-all ${filterRecipient === "all" ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-navy"}`}
                onClick={() => setFilterRecipient("all")}
              >
                All Recipients
              </button>
              <button 
                className={`px-3 py-1 text-xs rounded-md font-medium cursor-pointer transition-all ${filterRecipient === "admin" ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-navy"}`}
                onClick={() => setFilterRecipient("admin")}
              >
                Admins ONLY
              </button>
              <button 
                className={`px-3 py-1 text-xs rounded-md font-medium cursor-pointer transition-all ${filterRecipient === "users" ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-navy"}`}
                onClick={() => setFilterRecipient("users")}
              >
                Users ONLY
              </button>
            </div>
          </div>
        </div>

        {/* Search bar inputs */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-light)", display: "flex", alignItems: "center" }}>
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search by title, message body, user name, or email..."
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

        {/* Database Grid Logs */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <Loader2 className="animate-spin text-gold mx-auto" size={32} />
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--text-light)" }}>Fetching global push event records...</p>
          </div>
        ) : filteredNotifs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 16 }}>Delivery Status</th>
                  <th>Intended Recipient</th>
                  <th>Title & Alert Details</th>
                  <th>Dispatched At</th>
                  <th style={{ textAlign: "right", paddingRight: 16 }}>Clear Log</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifs.map((notif) => {
                  const isRead = notif.read;
                  return (
                    <tr key={notif.id} style={{ opacity: isRead ? 0.75 : 1 }}>
                      <td style={{ paddingLeft: 16, width: 140 }}>
                        <button 
                          onClick={() => handleMarkAsRead(notif.id, isRead)}
                          className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
                          title="Click to toggle read state"
                        >
                          <span className={`inline-flex rounded-full h-2 w-2 ${isRead ? "bg-green-500" : "bg-gold animate-pulse"}`}></span>
                          <span style={{ fontSize: 11.5, fontWeight: isRead ? 400 : 600, color: isRead ? "var(--text-light)" : "var(--navy)" }}>
                            {isRead ? "Acknowledged" : "Delivered / Unread"}
                          </span>
                        </button>
                      </td>
                      <td style={{ maxWidth: 190 }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--navy)" }} className="truncate">
                            {getUserName(notif.userId)}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-light)" }} className="truncate">
                            {getUserEmail(notif.userId)}
                          </span>
                        </div>
                      </td>
                      <td style={{ minWidth: 260 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <strong style={{ fontSize: 13, color: "var(--navy)", fontWeight: 600 }}>
                            {notif.title}
                          </strong>
                          <p style={{ fontSize: 12.5, color: "var(--text-mid)", margin: 0, lineHeight: 1.4 }}>
                            {notif.message}
                          </p>
                        </div>
                      </td>
                      <td style={{ width: 150 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-light)" }}>
                          <Clock size={12} />
                          <span>{new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleDateString() === new Date().toLocaleDateString() ? new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: 16, width: 100 }}>
                        <button 
                          className="btn btn-ghost hover:text-red-500" 
                          onClick={() => handleDeleteNotification(notif.id)}
                          disabled={deletingId === notif.id}
                          style={{ padding: 6 }}
                        >
                          {deletingId === notif.id ? (
                            <Loader2 className="animate-spin text-red-500" size={14} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "64px 16px", border: "1px dashed var(--border)", borderRadius: 6, background: "var(--cream)" }}>
            <Layers className="text-gray-300 mx-auto" size={32} style={{ marginBottom: 12 }} />
            <div style={{ fontWeight: 600, color: "var(--text-mid)", fontSize: 14 }}>No communication logs matching current parameters</div>
            <p style={{ fontSize: 12, color: "var(--text-light)", marginTop: 4 }}>Refine your searching query or select a different recipient group filter category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
