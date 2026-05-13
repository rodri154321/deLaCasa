import { supabase } from './supabaseClient';

const AUTH_KEY = 'bakery_authenticated';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface AuthResult {
  success: boolean;
  error?: string;
}

export async function validatePassword(password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.rpc('validate_app_password', {
      input_password: password.trim()
    });

    if (error) {
      console.error('Password validation error:', error);
      return { success: false, error: 'Error de validación' };
    }

    if (data === true) {
      // Set authentication in localStorage with timestamp
      const sessionData = {
        authenticated: true,
        timestamp: Date.now()
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
      return { success: true };
    } else {
      return { success: false, error: 'Contraseña incorrecta' };
    }
  } catch (error) {
    console.error('Auth validation failed:', error);
    return { success: false, error: 'Error de conexión' };
  }
}

export function isAuthenticated(): boolean {
  try {
    const sessionData = localStorage.getItem(AUTH_KEY);
    if (!sessionData) return false;

    const session = JSON.parse(sessionData);
    if (!session.authenticated) return false;

    // Check if session has expired
    const now = Date.now();
    const sessionAge = now - session.timestamp;
    if (sessionAge > SESSION_DURATION) {
      logout();
      return false;
    }

    return true;
  } catch (error) {
    console.error('Session check failed:', error);
    return false;
  }
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function refreshSession(): void {
  if (isAuthenticated()) {
    const sessionData = {
      authenticated: true,
      timestamp: Date.now()
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
  }
}