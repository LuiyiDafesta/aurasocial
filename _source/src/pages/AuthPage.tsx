import React, { useState } from 'react';
import { signInWithEmailPassword } from '../services/authService';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Sparkles, Lock, Mail, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '../hooks/useToast';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Por favor ingresá tu email y contraseña.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await signInWithEmailPassword(email, password);
      toast('Sesión iniciada correctamente', { type: 'success' });
    } catch (err: any) {
      console.error('Error en login:', err);
      setErrorMessage(err.message || 'Credenciales inválidas. Verificá tus datos.');
      toast('Error al iniciar sesión', { type: 'error', description: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-aura-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-80 h-80 bg-rose-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-[2px] rounded-2xl shadow-xl shadow-rose-950/40 inline-flex items-center justify-center mb-4">
            <div className="w-full h-full bg-dark-950 rounded-[14px] flex items-center justify-center text-aura-400">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Aura Social</h1>
          <p className="text-sm text-slate-400 mt-1">
            Plataforma de Gobernanza y Aprobación de Contenidos
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-dark-900/90 border border-dark-800 backdrop-blur-2xl rounded-2xl p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Iniciar Sesión</h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingresá con tus credenciales autorizadas de Supabase
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="current-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Ingresar al Panel
            </Button>
          </form>

          {/* Timezone and security badge */}
          <div className="pt-2 border-t border-dark-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              America/Argentina/Buenos_Aires
            </span>
            <span className="text-emerald-400 font-medium">RLS Protegido</span>
          </div>
        </div>
      </div>
    </div>
  );
}
