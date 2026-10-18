import React, { useState } from 'react';
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  AlertTriangle 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CiiEnergieLogo } from './CiiEnergieLogo';
import ecoGridBgImg from '../assets/images/eco_grid_district_1784886799261.jpg';

interface LoginViewProps {
  onLogin: () => void;
  onGuest: () => void;
  onEmailLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (name: string, email: string, pass: string) => Promise<void>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLogin,
  onGuest,
  onEmailLogin,
  onRegister
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMessage("Veuillez renseigner votre identifiant et votre mot de passe.");
      return;
    }

    if (authMode === 'signup') {
      if (!fullName.trim()) {
        setErrorMessage("Veuillez saisir votre nom complet.");
        return;
      }
      if (cleanPass.length < 6) {
        setErrorMessage("Le mot de passe doit comporter au moins 6 caractères.");
        return;
      }
      if (cleanPass !== confirmPassword.trim()) {
        setErrorMessage("Les deux mots de passe ne correspondent pas.");
        return;
      }

      setIsLoading(true);
      try {
        await onRegister(fullName.trim(), cleanEmail, cleanPass);
      } catch (err: any) {
        console.error('Registration error:', err);
        if (err.code === 'auth/email-already-in-use') {
          setErrorMessage("Un compte existe déjà avec cette adresse email. Connectez-vous directement.");
        } else if (err.code === 'auth/invalid-email') {
          setErrorMessage("Format d'adresse email invalide.");
        } else if (err.code === 'auth/weak-password') {
          setErrorMessage("Mot de passe trop faible (au moins 6 caractères requis).");
        } else {
          setErrorMessage(err.message || "Erreur lors de la création du compte.");
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        await onEmailLogin(cleanEmail, cleanPass);
      } catch (err: any) {
        console.error('Login error:', err);
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          setErrorMessage("Identifiants incorrects. Vérifiez votre email et mot de passe.");
        } else if (err.code === 'auth/invalid-email') {
          setErrorMessage("Format d'adresse email invalide.");
        } else {
          setErrorMessage(err.message || "Erreur lors de la connexion.");
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFillAdminCredentials = () => {
    setEmail('contact@cii-energie.com');
    setPassword('CiiEnergie2026!');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans relative overflow-hidden bg-slate-900">
      {/* Background eco-district image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none"
        style={{ backgroundImage: `url(${ecoGridBgImg})` }}
      />
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] pointer-events-none" />

      {/* Centered Login Card */}
      <div className="w-full max-w-lg bg-white/95 rounded-[2.5rem] p-8 sm:p-10 shadow-2xl border border-white/80 flex flex-col items-center relative z-10">
        <div className="mb-4">
          <CiiEnergieLogo align="center" size="lg" />
        </div>
        <p className="text-slate-500 font-semibold mb-6 text-xs uppercase tracking-[0.12em] text-center leading-relaxed">
          L'énergie d'aujourd'hui • Le climat de demain
        </p>

        {/* Toggle Mode Tabs: Connexion vs Création de compte */}
        <div className="w-full grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl mb-6 border border-slate-200/80">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setErrorMessage(null);
            }}
            className={cn(
              "py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer",
              authMode === 'signin' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-600" />
            <span>Se connecter</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setErrorMessage(null);
            }}
            className={cn(
              "py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer",
              authMode === 'signup' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Créer un compte</span>
          </button>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="leading-tight">{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3.5 text-left">
          {authMode === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Nom complet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ex: Alexandre Mercier"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-emerald-600 focus:outline-none text-xs font-semibold text-slate-800 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Identifiant / Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@entreprise.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-emerald-600 focus:outline-none text-xs font-semibold text-slate-800 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={authMode === 'signup' ? "6 caractères minimum" : "••••••••"}
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-emerald-600 focus:outline-none text-xs font-semibold text-slate-800 transition-all placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {authMode === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmez votre mot de passe"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-emerald-600 focus:outline-none text-xs font-semibold text-slate-800 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {authMode === 'signin' && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleFillAdminCredentials}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
              >
                Identifiants administrateur
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-emerald-950 hover:bg-emerald-900 text-white py-3.5 rounded-xl font-bold text-xs transition-all active:scale-[0.98] shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : authMode === 'signup' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Créer mon compte CII ENERGIE</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Se connecter</span>
              </>
            )}
          </button>
        </form>

        {/* Separator */}
        <div className="w-full flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ou continuer avec</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Social / Guest buttons */}
        <div className="w-full space-y-2.5">
          <button 
            type="button"
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-bold text-xs transition-all active:scale-[0.98] shadow-2xs cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity="0.8" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity="0.6" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity="0.7" />
            </svg>
            <span>Connexion avec Google</span>
          </button>

          <button 
            type="button"
            onClick={onGuest}
            className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 py-3 rounded-xl font-bold text-slate-700 transition-all active:scale-[0.98] text-xs cursor-pointer"
          >
            Accès Direct Superviseur (Session Immédiate)
          </button>
        </div>

        <div className="mt-8 flex flex-col items-center gap-1.5">
          <div className="h-px w-10 bg-slate-100" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.25em]">
            CII ENERGIE • SUPERVISION GTB & ÉNERGIE
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
