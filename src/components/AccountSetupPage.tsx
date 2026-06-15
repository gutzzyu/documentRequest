import { useState, useEffect, FormEvent } from "react";
import { User } from "firebase/auth";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_ENTITIES, UserProfile, EntityCompany } from "../types";
import { UserCheck, ShieldCheck, HelpCircle, Loader2 } from "lucide-react";

interface AccountSetupPageProps {
  fbUser: User;
  onSetupComplete: (profile: UserProfile) => void;
  onLogout: () => void;
}

export function AccountSetupPage({ fbUser, onSetupComplete, onLogout }: AccountSetupPageProps) {
  const [fullName, setFullName] = useState(fbUser.displayName || "");
  const [entities, setEntities] = useState<EntityCompany[]>(DEFAULT_ENTITIES);
  const [selectedEntityId, setSelectedEntityId] = useState(DEFAULT_ENTITIES[0].id);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const email = fbUser.email || "";
  const isAdminEmail = email.toLowerCase() === "andrewmanuel310@gmail.com" || email.toLowerCase() === "andrewmanuel3105@gmail.com";
  const assignedRole = isAdminEmail ? "admin" : "user";
  const assignedStatus = isAdminEmail ? "active" : "pending";

  // Fetch entities from Firestore and display active ones
  useEffect(() => {
    async function loadEntities() {
      try {
        const querySnapshot = await getDocs(collection(db, "entities"));
        const list: EntityCompany[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          list.push({ id: doc.id, name: data.name, status: data.status || "active" } as EntityCompany);
        });

        const filteredList = list.filter(e => e.id !== "ent_seed_marker");

        if (filteredList.length === 0) {
          // If empty, auto-seed defaults in database
          await setDoc(doc(db, "entities", "ent_seed_marker"), {
            id: "ent_seed_marker",
            name: "System Seeding Marker",
            status: "disabled"
          });
          for (const ent of DEFAULT_ENTITIES) {
            await setDoc(doc(db, "entities", ent.id), ent);
          }
          const activeOnly = DEFAULT_ENTITIES.filter(e => e.status === "active");
          if (activeOnly.length > 0) {
            setEntities(activeOnly);
            setSelectedEntityId(activeOnly[0].id);
          }
        } else {
          const activeOnly = filteredList.filter(e => e.status === "active");
          if (activeOnly.length > 0) {
            setEntities(activeOnly);
            setSelectedEntityId(activeOnly[0].id);
          }
        }
      } catch (err) {
        console.warn("Could not query DB entities, using defaults:", err);
      }
    }
    loadEntities();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMsg("Please enter a valid full name (minimum 2 characters).");
      return;
    }

    if (!selectedEntityId) {
      setErrorMsg("Please choose your corporate affiliation.");
      return;
    }

    setSaving(true);
    try {
      const selectedEnt = entities.find(e => e.id === selectedEntityId) || entities[0];
      
      const newProfile: UserProfile = {
        uid: fbUser.uid,
        email: email,
        name: fullName.trim(),
        entityId: selectedEnt.id,
        role: assignedRole,
        status: assignedStatus
      };

      // Write User Profile in Firestore
      await setDoc(doc(db, "users", fbUser.uid), newProfile);

      // Create a pending registration notification for Admin
      if (assignedStatus === "pending") {
        const notifId = `NOTIF-REG-${Date.now()}`;
        await setDoc(doc(db, "notifications", notifId), {
          id: notifId,
          userId: "admin", // Targeted path for all administration notification panel
          title: "New User Registration Pending",
          message: `${fullName.trim()} has registered from ${selectedEnt.name} and is awaiting approval.`,
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      onSetupComplete(newProfile);
    } catch (err: any) {
      console.error("Failed to save user profile: ", err);
      setErrorMsg(err.message || "Failed to finalize account setup. Please try contact your system admin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-navy px-4 py-12 relative overflow-hidden">
      {/* Subtle modern corporate ambient background layout */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.06)_0%,_transparent_75%)]" />

      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-cream-dark p-8 md:p-10 transition-all duration-300">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="inline-flex bg-gold/10 p-4 rounded-full mb-4 text-gold border border-gold/20">
            <UserCheck size={32} strokeWidth={1.5} />
          </div>
          <h1 className="font-serif text-2xl text-navy font-bold tracking-tight">
            Account Verification
          </h1>
          <p className="text-xs tracking-[0.15em] uppercase text-gold font-bold mt-2 font-sans">
            STLAF Request Intake Setup
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {errorMsg && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-3.5 rounded-r text-xs font-semibold leading-relaxed">
              ⚠️ {errorMsg}
            </div>
          )}

          <div>
            <label className="form-label mb-1.5 block">Google Account Connected</label>
            <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-lg border border-cream-dark">
              {fbUser.photoURL ? (
                <img src={fbUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center text-xs font-bold shrink-0 border border-navy">
                  {(email || "E").charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm text-charcoal font-semibold truncate leading-tight">{email}</div>
                <div className="text-[10px] text-charcoal-muted mt-0.5 font-sans">Verified Session SSO</div>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Legal Name <span>*</span></label>
            <input 
              className="form-input" 
              placeholder="e.g. Maria Clara Santos" 
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Affiliated Group Company <span>*</span></label>
            <select 
              className="form-select" 
              value={selectedEntityId} 
              onChange={e => setSelectedEntityId(e.target.value)}
            >
              {entities.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-charcoal-muted leading-relaxed mt-2">
              Choose your primary organization to authorize document filings and board resolution requests.
            </p>
          </div>

          <div className={`p-4 rounded-lg border leading-relaxed text-xs ${
            isAdminEmail ? "bg-blue-50/50 border-blue-200 text-blue-800" : "bg-amber-50/40 border-amber-200/50 text-amber-800"
          }`}>
            {isAdminEmail ? (
              <div>
                <strong className="text-navy flex items-center gap-1.5 font-semibold text-[13px]">
                  <ShieldCheck size={14} className="text-gold" />
                  System Administrator Recognized
                </strong>
                <p className="mt-1 text-charcoal-light">
                  Your Google credentials belong in our admin list. You will instantly gain full system manager rights.
                </p>
              </div>
            ) : (
              <div>
                <strong className="text-navy flex items-center gap-1.5 font-semibold text-[13px]">
                  <HelpCircle size={14} className="text-amber-600" />
                  Pending Security Approval
                </strong>
                <p className="mt-1 text-charcoal-light">
                  Your membership requires standard administrative sign-off before accessing document archives.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button 
              type="button" 
              className="btn btn-ghost flex-1 justify-center py-3 font-sans" 
              onClick={onLogout}
            >
              Exit Setup
            </button>
            <button 
              type="submit" 
              className="btn btn-gold flex-[1.6] justify-center py-3 font-sans"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-white" />
                  Storing profile...
                </span>
              ) : "Finalize Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
