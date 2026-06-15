import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { ShieldCheck, Loader2 } from "lucide-react";

interface LoginPageProps {
  onLoginStart: () => void;
  onLoginFailure: (err: string) => void;
}

export function LoginPage({ onLoginStart, onLoginFailure }: LoginPageProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    onLoginStart();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: "select_account"
      });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      onLoginFailure(error.message || "Could not log in with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-navy px-4 py-12 relative overflow-hidden">
      {/* Subtle formal decorative background element */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(189,155,65,0.06)_0%,_transparent_75%)]" />

      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl border border-cream-dark p-8 md:p-10 transition-all duration-300">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="inline-flex bg-gold/10 p-4 rounded-full mb-4 text-gold border border-gold/20">
            <ShieldCheck size={36} strokeWidth={1.5} />
          </div>
          <h1 className="font-serif text-3xl text-navy font-bold tracking-tight">
            STLAF Client Portal
          </h1>
          <p className="text-xs tracking-[0.15em] uppercase text-gold font-bold mt-2">
            STLAF Request & Filing Hub
          </p>
        </div>
        
        <p className="text-sm text-charcoal-light leading-relaxed mb-8 px-2 text-center">
          Affiliated corporate representatives and clients can request official documents, submit regulatory filings, track compliance task workflows, and access secure organizational assets.
        </p>

        <button 
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded bg-navy text-white hover:bg-navy-mid active:scale-[0.99] transition-all font-medium border border-navy shadow-sm cursor-pointer"
          disabled={loading}
          onClick={handleGoogleLogin} 
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-gold" />
              <span>Verifying secure session...</span>
            </div>
          ) : (
            <>
              <svg 
                className="w-4 h-4 fill-gold mr-1" 
                viewBox="0 0 24 24"
              >
                <path d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l3.258-3.133C18.244 1.917 15.462 1 12.24 1 5.483 1 0 6.483 0 13.24s5.483 12.24 12.24 12.24c7.054 0 11.75-4.965 11.75-11.956 0-.804-.085-1.417-.188-1.99a22 22 0 0 0-.062-.25z" />
              </svg>
              <span className="font-sans text-sm tracking-wide">Sign In with Google</span>
            </>
          )}
        </button>

        <div className="mt-8 pt-6 border-t border-cream-dark text-center text-[11px] text-charcoal-muted leading-relaxed">
          <p className="font-semibold text-navy">Authorized STLAF client and portal members only.</p>
          <p className="mt-1">All digital handshakes, filings, and sessions are securely logged and audited.</p>
        </div>
      </div>
    </div>
  );
}
