import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { 
  UserProfile, 
  RequestItem, 
  NotificationItem, 
  EntityCompany,
  DEFAULT_ENTITIES
} from "./types";
import { 
  FolderKanban, 
  Users, 
  Building2, 
  Briefcase, 
  LogOut, 
  Bell, 
  FileText, 
  PlusCircle, 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Send,
  Download,
  Paperclip,
  Trash2,
  X,
  FileCheck,
  Loader2
} from "lucide-react";

// Modular Sub-components
import { LoginPage } from "./components/LoginPage";
import { AccountSetupPage } from "./components/AccountSetupPage";
import { UserDashboard } from "./components/UserDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { RequestDetailsModal } from "./components/RequestDetailsModal";
import { CreateRequestModal } from "./components/CreateRequestModal";
import { UserManagement } from "./components/UserManagement";
import { ClientManagement } from "./components/ClientManagement";
import { NotificationManagement } from "./components/NotificationManagement";

export default function App() {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Dynamic States
  const [entities, setEntities] = useState<EntityCompany[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Navigation / View States
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "clients" | "notifications">("dashboard");
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [clearingNotif, setClearingNotif] = useState(false);

  // Sync selectedRequest with the real-time background requests database updates
  useEffect(() => {
    if (selectedRequest) {
      const liveReq = requests.find(r => r.requestId === selectedRequest.requestId);
      if (liveReq) {
        if (
          liveReq.status !== selectedRequest.status ||
          liveReq.updatedAt !== selectedRequest.updatedAt ||
          JSON.stringify(liveReq.comments) !== JSON.stringify(selectedRequest.comments)
        ) {
          setSelectedRequest(liveReq);
        }
      } else {
        // If the request is permanently deleted from database, close details modal
        setSelectedRequest(null);
      }
    }
  }, [requests, selectedRequest]);

  // Success Feedback Toast message
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setFeedback({ type, msg });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  // Real-time active popup & sound notifications
  const [activeNotificationAlert, setActiveNotificationAlert] = useState<NotificationItem | null>(null);
  const playedNotificationIds = useRef<string[]>([]);

  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;
      
      // Crisp 2-tone melodic notification chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.12); // B5
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(987.77, now + 0.1); // B5
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.24); // E6
      gain2.gain.setValueAtTime(0.12, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);
    } catch (err) {
      console.warn("Chime playback was delayed/restricted by browser interaction guidelines:", err);
    }
  };

  const triggerNotificationAlert = (notif: NotificationItem) => {
    setActiveNotificationAlert(notif);
    playNotificationSound();
  };

  // Auth Status Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      if (user) {
        try {
          // Fetch corresponding document from users/{userId}
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Check if email whitelist covers immediate admin assignment without registration modal
            const email = user.email || "";
            const isAdminEmail = email.toLowerCase() === "andrewmanuel310@gmail.com" || email.toLowerCase() === "andrewmanuel3105@gmail.com";
            
            if (isAdminEmail) {
              const automaticAdmin: UserProfile = {
                uid: user.uid,
                email: email,
                name: user.displayName || "STLAF Manager",
                entityId: "ent_rplai",
                role: "admin",
                status: "active"
              };
              await setDoc(doc(db, "users", user.uid), automaticAdmin);
              setProfile(automaticAdmin);
              showToast("Administrator session auto-activated!", "success");
            } else {
              setProfile(null); // Must complete manual setup modal
            }
          }
        } catch (err) {
          console.error("Auth sync error:", err);
          showToast("Database connectivity issue on session launch", "error");
        }
      } else {
        setProfile(null);
      }
      setLoadingAuth(false);
    });
    return unsub;
  }, []);

  // Sync Entities / Clients (For all authenticated players)
  useEffect(() => {
    if (!fbUser) return;
    const unsub = onSnapshot(collection(db, "entities"), async (snapshot) => {
      const list: EntityCompany[] = [];
      let hasSeedMarker = false;
      
      snapshot.forEach(doc => {
        const ent = doc.data() as EntityCompany;
        if (ent.id === "ent_seed_marker") {
          hasSeedMarker = true;
        } else {
          list.push(ent);
        }
      });
      
      if (!hasSeedMarker) {
        try {
          await setDoc(doc(db, "entities", "ent_seed_marker"), {
            id: "ent_seed_marker",
            name: "System Seeding Marker",
            status: "disabled"
          });
          
          for (const ent of DEFAULT_ENTITIES) {
            const alreadyExists = list.some(existing => existing.id === ent.id);
            if (!alreadyExists) {
              await setDoc(doc(db, "entities", ent.id), ent);
            }
          }
        } catch (err) {
          console.error("Auto-seeding default entities failed:", err);
        }
      } else {
        setEntities(list);
      }
    }, (err) => console.error("Entities sync error:", err));

    return unsub;
  }, [fbUser]);

  // Sync requests & alerts
  useEffect(() => {
    if (!fbUser || !profile) return;

    let unsubRequests = () => {};
    let unsubNotifications = () => {};
    let unsubUsers = () => {};

    // 1. Requests Listener
    if (profile.role === "admin") {
      // Admin syncs all requests chronologically
      const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
      unsubRequests = onSnapshot(q, (snapshot) => {
        const list: RequestItem[] = [];
        snapshot.forEach(doc => {
          list.push(doc.data() as RequestItem);
        });
        setRequests(list);
      }, (err) => console.error("Requests sync error for admin:", err));

      // Admin syncs all users
      unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
        const uList: UserProfile[] = [];
        snapshot.forEach(doc => {
          uList.push(doc.data() as UserProfile);
        });
        setUsers(uList);
      }, (err) => console.error("Users list sync error:", err));

      // Admin syncs notification alerts target admin
      let isFirstAdminSync = true;
      const nQuery = query(
        collection(db, "notifications"), 
        where("userId", "==", "admin"),
        orderBy("createdAt", "desc")
      );
      unsubNotifications = onSnapshot(nQuery, (snapshot) => {
        const list: NotificationItem[] = [];
        let newUnreadNotif: NotificationItem | null = null;

        snapshot.forEach(doc => {
          const item = doc.data() as NotificationItem;
          list.push(item);

          if (!playedNotificationIds.current.includes(item.id)) {
            if (!isFirstAdminSync && !item.read) {
              newUnreadNotif = item;
            }
            playedNotificationIds.current.push(item.id);
          }
        });

        isFirstAdminSync = false;
        setNotifications(list);

        if (newUnreadNotif) {
          triggerNotificationAlert(newUnreadNotif);
        }
      }, (err) => console.error("Notification trigger sync fail for Admin:", err));

    } else if (profile.status === "active") {
      // Standard active user sync only their requests
      const q = query(
        collection(db, "requests"), 
        where("userId", "==", profile.uid),
        orderBy("createdAt", "desc")
      );
      unsubRequests = onSnapshot(q, (snapshot) => {
        const list: RequestItem[] = [];
        snapshot.forEach(doc => {
          list.push(doc.data() as RequestItem);
        });
        setRequests(list);
      }, (err) => console.error("Requests list sync error for user:", err));

      // Standard active user notifications
      let isFirstUserSync = true;
      const nQuery = query(
        collection(db, "notifications"), 
        where("userId", "==", profile.uid),
        orderBy("createdAt", "desc")
      );
      unsubNotifications = onSnapshot(nQuery, (snapshot) => {
        const list: NotificationItem[] = [];
        let newUnreadNotif: NotificationItem | null = null;

        snapshot.forEach(doc => {
          const item = doc.data() as NotificationItem;
          list.push(item);

          if (!playedNotificationIds.current.includes(item.id)) {
            if (!isFirstUserSync && !item.read) {
              newUnreadNotif = item;
            }
            playedNotificationIds.current.push(item.id);
          }
        });

        isFirstUserSync = false;
        setNotifications(list);

        if (newUnreadNotif) {
          triggerNotificationAlert(newUnreadNotif);
        }
      }, (err) => console.error("Notifications list sync error for user:", err));
    }

    return () => {
      unsubRequests();
      unsubNotifications();
      unsubUsers();
    };
  }, [fbUser, profile]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setProfile(null);
      setFbUser(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetupComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    showToast("Profile set up success!", "success");
  };

  const handleSeedMockData = async () => {
    try {
      showToast("Seeding corporate database directory with standard cases...", "info");
      
      // Seed default entities
      for (const ent of DEFAULT_ENTITIES) {
        await setDoc(doc(db, "entities", ent.id), ent);
      }

      // Seed mock requests
      const mockReqs: RequestItem[] = [
        {
          requestId: "REQ-2026-1011",
          userId: fbUser?.uid || "demo_id",
          entityId: "ent_happyhen",
          requestType: "Other corporate documents upon client request",
          priority: "urgent",
          status: "Under Review",
          description: "Submit Annual General Information Sheet filing for Happy Hen Hatchery.\n\nAll details consolidated within audit board.",
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          attachments: ["Annual_Audit_Filing_2026.pdf"],
          comments: [
            {
              authorName: "System Auditor",
              authorEmail: "audit@rplai.org",
              text: "Board minutes verified. Waiting for administrative clearance.",
              createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
            }
          ]
        },
        {
          requestId: "REQ-2026-2025",
          userId: fbUser?.uid || "demo_id",
          entityId: "ent_brasbag",
          requestType: "Board Resolution",
          priority: "sameday",
          status: "Processing",
          description: "Authorized signatory modification on Brasbag Development corporate treasury board resolution.\n\nSubject to swift bank submission requirement BDO.",
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          attachments: ["Signatory_Form_BDO_Brasbag.pdf"],
          comments: []
        },
        {
          requestId: "REQ-2026-3040",
          userId: fbUser?.uid || "demo_id",
          entityId: "ent_rizalpoultry",
          requestType: "Secretary’s Certificate",
          priority: "standard",
          status: "Completed",
          description: "Release certified true copy of SEC validation Certificate for Rizal Poultry and Livestock Corporation.",
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          attachments: ["Certified_SEC_Cert_Rizal.pdf"],
          comments: [
            {
              authorName: "STLAF Manager",
              authorEmail: "andrewmanuel310@gmail.com",
              text: "Approved and file issued safely.",
              createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
            }
          ]
        }
      ];

      for (const r of mockReqs) {
        await setDoc(doc(db, "requests", r.requestId), r);
      }

      showToast("Successfully populated demo filing cases database!", "success");
    } catch (err: any) {
      console.error(err);
      showToast("Error seeding demo: " + err.message, "error");
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setClearingNotif(true);
    try {
      const unread = notifications.filter(n => !n.read);
      for (const notif of unread) {
        await updateDoc(doc(db, "notifications", notif.id), { read: true });
      }
      showToast("Cleared alert logs", "success");
    } catch (err) {
      console.error(err);
    } finally {
      setClearingNotif(false);
    }
  };

  // --- RENDERING ROUTINES ---
  if (loadingAuth) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--navy)" }}>
        <span className="spinner" style={{ width: 44, height: 44, border: "3px solid white", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <span style={{ color: "white", fontSize: 13, letterSpacing: "0.2em", textTransform: "uppercase" }}>STLAF Portal Loading...</span>
      </div>
    );
  }

  if (!fbUser) {
    return <LoginPage onLoginStart={() => {}} onLoginFailure={(err) => showToast(err, "error")} />;
  }

  // Profile not completed setup yet
  if (!profile) {
    return <AccountSetupPage fbUser={fbUser} onSetupComplete={handleSetupComplete} onLogout={handleLogout} />;
  }

  // Pending user state
  if (profile.status === "pending") {
    // Look up user's company name if any
    const companyName = entities.find(e => e.id === profile.entityId)?.name || "your designated company";
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "linear-gradient(135deg, var(--navy) 0%, #0c182c 100%)", padding: 20 }}>
        <div style={{ background: "white", borderRadius: "16px", padding: "48px 36px", maxWidth: 520, textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
          <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>⏳</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: "var(--navy)", fontSize: "24px", marginBottom: 12 }}>
            Awaiting Verification Group
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-mid)", lineHeight: 1.6, marginBottom: 24 }}>
            Your account registration has been saved successfully representing <strong style={{ color: "var(--gold)" }}>{companyName}</strong>. 
          </p>
          <div style={{ background: "var(--cream)", border: "1px solid var(--border)", borderRadius: "4px", padding: 14, fontSize: 12.5, color: "var(--text-mid)", marginBottom: 32, textAlign: "left" }}>
            🛡️ <strong>STLAF Security Protocols:</strong> New account registrations are locked until a system admin verifies your corporate email and credentials. You will gain immediate entry once authorized.
          </div>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ width: "100%", justifyContent: "center" }}>
            Logout / Switch Accounts
          </button>
        </div>
      </div>
    );
  }

  // Disabled user state
  if (profile.status === "disabled") {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#1a0808" }}>
        <div style={{ background: "white", borderRadius: "16px", padding: "48px 36px", maxWidth: 460, textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
          <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>🚫</span>
          <h2 style={{ fontFamily: "serif", color: "#991b1b", fontSize: "24px", marginBottom: 12 }}>
            Workspace Restricted
          </h2>
          <p style={{ fontSize: "13.5px", color: "var(--text-mid)", lineHeight: 1.5, marginBottom: 32 }}>
            Your STLAF client authorization profile has been locked or disabled by an administrator. Please contact executive representatives for details.
          </p>
          <button className="btn btn-danger" onClick={handleLogout} style={{ width: "100%", justifyContent: "center", background: "#991b1b", color: "white" }}>
            Exit Workspace
          </button>
        </div>
      </div>
    );
  }

  const getEntityName = (id: string) => {
    return entities.find(e => e.id === id)?.name || id;
  };

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="app" id="workspace-main-panel">
      {/* Toast Alert Popups */}
      {feedback && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: feedback.type === "error" ? "var(--red)" : feedback.type === "info" ? "var(--navy)" : "var(--gold)",
          color: feedback.type === "error" || feedback.type === "info" ? "white" : "var(--navy)",
          padding: "12px 20px",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "13.5px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <span>{feedback.type === "error" ? "⚠️" : "✨"}</span>
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Persistent Sidebar */}
      <aside className="sidebar" id="sidebar-panel">
        <div className="sidebar-logo">
          <h1>STLAF Client Portal</h1>
          <p>Sadsad Tamesis Law & Accountancy</p>
        </div>

        {/* User Card */}
        <div className="sidebar-bottom" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", borderTop: "none" }}>
          <div className="user-chip">
            <div className="user-avatar" style={{ overflow: "hidden" }}>
              {fbUser.photoURL ? (
                <img src={fbUser.photoURL} alt="Avatar" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              ) : (
                (profile?.name || fbUser?.displayName || fbUser?.email || "U").charAt(0).toUpperCase()
              )}
            </div>
            <div className="user-info">
              <strong>{profile.name}</strong>
              <span className="truncate" style={{ display: "block", color: "rgba(255,255,255,0.35)", maxWidth: 140 }}>
                {profile.role === "admin" ? "🛡️ System Manager" : getEntityName(profile.entityId)}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Sidebar Links */}
        <nav className="nav">
          {profile.role === "admin" ? (
            <>
              <div className="nav-section">Operations</div>
              <button 
                className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                <FolderKanban className="icon" size={16} />
                <span>Requests Queue</span>
                {requests.filter(r => r.status === "Submitted").length > 0 && (
                  <span className="nav-badge">{requests.filter(r => r.status === "Submitted").length}</span>
                )}
              </button>
              <button 
                className={`nav-item ${activeTab === "users" ? "active" : ""}`}
                onClick={() => setActiveTab("users")}
              >
                <Users className="icon" size={16} />
                <span>User Profiles</span>
              </button>
              <button 
                className={`nav-item ${activeTab === "clients" ? "active" : ""}`}
                onClick={() => setActiveTab("clients")}
              >
                <Building2 className="icon" size={16} />
                <span>Affiliate Companies</span>
              </button>
              <button 
                className={`nav-item ${activeTab === "notifications" ? "active" : ""}`}
                onClick={() => setActiveTab("notifications")}
              >
                <Bell className="icon" size={16} />
                <span>Dispatch Logs</span>
              </button>
            </>
          ) : (
            <>
              <div className="nav-section">Workspace</div>
              <button 
                className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                <Briefcase className="icon" size={16} />
                <span>My Filings Log</span>
              </button>
            </>
          )}
        </nav>

        {/* Logout container footer */}
        <div className="sidebar-bottom" style={{ marginTop: "auto" }}>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ width: "100%", justifyContent: "center", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
            <LogOut size={14} style={{ marginRight: 6 }} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="main">
        {/* Top Header Controls bar */}
        <header className="topbar">
          <div className="topbar-title">
            <h2>
              {profile.role === "admin" ? (
                activeTab === "dashboard" 
                  ? "Administration Workspace Requests pipeline" 
                  : activeTab === "users" 
                    ? "User Enrollment Dashboard" 
                    : activeTab === "clients"
                      ? "Corporate Entities Configuration Manager"
                      : "Central Office Notification Log"
              ) : (
                "Personal Documents & Request Hub"
              )}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-light)" }}>
              {profile.role === "admin" 
                ? activeTab === "notifications"
                  ? "Track operational dispatches, systemic updates, and user alert read receipts"
                  : "Manage organizational services, view reports, or verify user memberships" 
                : `Active representative for: ${getEntityName(profile.entityId)}`}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
            {/* Notification Bell Icon */}
            <button 
              className="btn btn-ghost" 
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              style={{ position: "relative", padding: 8 }}
            >
              <span style={{ fontSize: 18 }}>🔔</span>
              {unreadNotifsCount > 0 && (
                <span style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  background: "var(--red)",
                  color: "white",
                  borderRadius: "50%",
                  fontSize: 10,
                  height: 16,
                  width: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold"
                }}>
                  {unreadNotifsCount}
                </span>
              )}
            </button>

            {/* Notifications Panel List Dropdown */}
            {showNotifMenu && (
              <div style={{
                position: "absolute",
                top: 44,
                right: 0,
                width: 320,
                background: "white",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                zIndex: 99,
                padding: "12px 16px",
                maxHeight: 400,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)" }}>Recent Updates</span>
                  {unreadNotifsCount > 0 && (
                    <button 
                      onClick={handleMarkAllNotificationsRead}
                      disabled={clearingNotif}
                      style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      {clearingNotif && <Loader2 size={10} className="animate-spin text-gold" />}
                      Clear All
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div key={notif.id} style={{ 
                        padding: "8px 10px", 
                        background: notif.read ? "var(--cream)" : "rgba(201,168,76,0.08)", 
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        fontSize: 12
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, color: "var(--navy)", fontSize: 11.5 }}>
                            {notif.title}
                          </span>
                          {!notif.read && (
                            <span style={{ height: 6, width: 6, borderRadius: "50%", background: "var(--red)" }}></span>
                          )}
                        </div>
                        <p style={{ color: "var(--text-mid)", lineHeight: 1.3 }}>{notif.message}</p>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", color: "var(--text-light)", padding: "24px 0", fontSize: 12.5 }}>
                      No alerts logged so far. Enjoy the day!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Body View Switching Content */}
        {profile.role === "admin" ? (
          <>
            {activeTab === "dashboard" && (
              <AdminDashboard 
                requests={requests} 
                users={users} 
                entities={entities} 
                onViewRequestClick={(r) => setSelectedRequest(r)}
                onSeedDemo={handleSeedMockData}
              />
            )}
            {activeTab === "users" && (
              <UserManagement 
                users={users} 
                entities={entities} 
                currentUser={profile} 
                onRefresh={() => {}} 
              />
            )}
            {activeTab === "clients" && (
              <ClientManagement 
                entities={entities} 
                users={users} 
                onRefresh={() => {}} 
              />
            )}
            {activeTab === "notifications" && (
              <NotificationManagement 
                users={users}
              />
            )}
          </>
        ) : (
          <UserDashboard 
            requests={requests} 
            notifications={notifications} 
            entities={entities} 
            onNewRequestClick={() => setShowCreateModal(true)} 
            onViewRequestClick={(r) => setSelectedRequest(r)}
          />
        )}
      </div>

      {/* MODALS GATEWAY */}
      {showCreateModal && (
        <CreateRequestModal 
          currentUser={profile} 
          entities={entities} 
          onClose={() => setShowCreateModal(false)}
          onRequestSubmitted={(newReq) => {
            setShowCreateModal(false);
            showToast(`Filing successfully created as ${newReq.requestId}!`, "success");
          }}
        />
      )}

      {selectedRequest && (
        <RequestDetailsModal 
          req={selectedRequest}
          users={users}
          entities={entities}
          currentUser={profile}
          onClose={() => setSelectedRequest(null)}
          onStatusUpdated={(status) => {
            // Hot update local item state if we want instant local reactivity
            setSelectedRequest(prev => prev ? { ...prev, status: status as any } : null);
            showToast(`Filing status successfully updated to ${status}!`, "success");
          }}
          onCommentAdded={() => {
            // Hot load comment refresh
            showToast("Your comment has been securely logged!", "success");
            // Since onSnapshot will trigger real-time, the comments stream will auto update inside layout
          }}
        />
      )}

      {/* Active dialog notification popup with backdrop to make sure they check notifications first */}
      {activeNotificationAlert && (
        <div className="modal-overlay" style={{ zIndex: 1000000 }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header" style={{ borderBottomColor: "rgba(201, 168, 76, 0.15)", background: "var(--navy)", color: "white", padding: "16px 20px" }}>
              <h2 style={{ fontSize: 15, color: "white", margin: 0 }} className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gold"></span>
                </span>
                <span>Real-Time Business Alert</span>
              </h2>
              <button 
                className="modal-close" 
                onClick={() => setActiveNotificationAlert(null)}
                style={{ color: "rgba(255, 255, 255, 0.6)" }}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "start" }}>
                <div style={{ background: "rgba(201, 168, 76, 0.1)", color: "var(--gold)" }} className="p-3 rounded-full flex items-center justify-center shrink-0">
                  <Bell size={24} className="animate-bounce" />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                    {activeNotificationAlert.title}
                  </h4>
                  <p style={{ fontSize: 12.5, color: "var(--text-mid)", lineHeight: 1.5, margin: 0 }}>
                    {activeNotificationAlert.message}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-light)", marginTop: 12 }}>
                    <Clock size={12} />
                    <span>Received just now ({new Date(activeNotificationAlert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer" style={{ borderTop: "1px solid var(--border)", gap: 10 }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setActiveNotificationAlert(null)}
              >
                Dismiss Alert
              </button>
              <button 
                type="button" 
                className="btn btn-gold" 
                style={{ backgroundColor: "var(--gold)", color: "white" }}
                onClick={() => {
                  setActiveNotificationAlert(null);
                  if (profile?.role === "admin") {
                    setActiveTab("notifications");
                  } else {
                    setShowNotifMenu(true);
                  }
                }}
              >
                Open Notification Box
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
