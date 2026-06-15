// src/hooks/useAuth.ts
// Auth session hook backed by a tiny module-level store, so every consumer
// (root layout guard, login screen, profile) shares the same reactive state.

import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi, TOKEN_KEY, RegisterRequest } from '../services/api';

export interface AuthUser {
  userId?: number;
  name: string;
  email: string;
  gender?: 'MALE' | 'FEMALE';
  isDriver?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}

// ── module-level shared store ────────────────────────────────────────────────
let state: AuthState = { user: null, token: null, isLoading: true };
const listeners = new Set<() => void>();
let didCheck = false;

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

async function checkAuth() {
  try {
    let token = await SecureStore.getItemAsync(TOKEN_KEY);
    // Discard the throwaway token left by the Session-1 dev shortcut.
    if (token === 'dev-token') {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      token = null;
    }
    setState({ token: token ?? null, isLoading: false });
  } catch {
    setState({ token: null, isLoading: false });
  }
}

async function login(email: string, password: string) {
  const res = await authApi.login({ email, password });
  const data = res.data;
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  setState({
    token: data.token,
    user: {
      userId: data.userId,
      name: data.name,
      email: data.email,
      gender: data.gender,
      isDriver: data.isDriver,
    },
  });
  return data;
}

async function register(data: RegisterRequest) {
  const res = await authApi.register(data);
  const auth = res.data;
  await SecureStore.setItemAsync(TOKEN_KEY, auth.token);
  setState({
    token: auth.token,
    user: {
      userId: auth.userId,
      name: auth.name,
      email: auth.email,
      gender: auth.gender,
      isDriver: auth.isDriver,
    },
  });
  return auth;
}

async function logout() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  setState({ token: null, user: null });
}

// Seeds the backend demo dataset. Does NOT sign in — the user logs in
// manually with one of the generated demo accounts (see res.users / res.demoGuide).
async function seedDemo() {
  const res = await authApi.seedDemo();
  return res.data;
}

export default function useAuth() {
  const [, force] = useState(0);

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    // Run the initial SecureStore read exactly once for the whole app.
    if (!didCheck) {
      didCheck = true;
      checkAuth();
    }
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    user: state.user,
    token: state.token,
    isLoading: state.isLoading,
    login,
    register,
    logout,
    seedDemo,
    checkAuth,
  };
}
