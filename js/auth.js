// AstroPalm - Authentication Module

import { state, supabase } from './state.js';
import { $, showToast, showLoading, hideLoading, closeModal, cap } from './utils.js';

// UI update callbacks - set by app.js to avoid circular imports
let onAuthChange = () => {};
let onProfileUpdate = () => {};

export function setAuthCallbacks(authCallback, profileCallback) {
  onAuthChange = authCallback;
  onProfileUpdate = profileCallback;
}

export async function checkAuth() {
  if (!supabase) {
    onAuthChange(false);
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      state.user = session.user;
      await loadProfile();
      onAuthChange(true);
    } else {
      onAuthChange(false);
    }
  } catch (err) {
    console.error('Auth check error:', err);
    onAuthChange(false);
  }
}

export async function signIn(email, password) {
  if (!supabase) {
    showToast('Demo mode - sign in simulated', 'info');
    state.user = { email, id: 'demo-user' };
    state.profile = { display_name: 'Demo User', is_premium: false };
    onAuthChange(true);
    closeModal('authModal');
    return;
  }

  showLoading('Signing in...');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    state.user = data.user;
    await loadProfile();
    onAuthChange(true);
    closeModal('authModal');
    showToast('Welcome back!', 'success');
  } catch (err) {
    $('signInError').textContent = err.message;
    $('signInError').classList.remove('hidden');
  } finally {
    hideLoading();
  }
}

export async function signUp(email, password, displayName, zodiacSign) {
  if (!supabase) {
    showToast('Demo mode - sign up simulated', 'info');
    state.user = { email, id: 'demo-user' };
    state.profile = { display_name: displayName, is_premium: false, zodiac_sign: zodiacSign };
    onAuthChange(true);
    closeModal('authModal');
    return;
  }

  showLoading('Creating account...');
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, zodiac_sign: zodiacSign }
      }
    });
    if (error) throw error;

    state.user = data.user;
    await loadProfile();
    onAuthChange(true);
    closeModal('authModal');
    showToast('Account created! Welcome to AstroPalm', 'success');
  } catch (err) {
    $('signUpError').textContent = err.message;
    $('signUpError').classList.remove('hidden');
  } finally {
    hideLoading();
  }
}

export async function signOut() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  state.user = null;
  state.profile = null;
  state.premium = false;
  state.savedReadings = [];
  onAuthChange(false);
  showToast('Signed out', 'info');
}

export async function loadProfile() {
  if (!supabase || !state.user) return;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', state.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (data) {
      state.profile = data;
      state.premium = data.is_premium || false;
    }

    await loadSavedReadings();
  } catch (err) {
    console.error('Load profile error:', err);
  }
}

export async function loadSavedReadings() {
  if (!supabase || !state.user) return;

  try {
    const [palmRes, horoRes, compatRes] = await Promise.all([
      supabase.from('palm_scans').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('horoscope_readings').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('compat_reports').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(10)
    ]);

    state.savedReadings = [
      ...(palmRes.data || []).map(r => ({ type: 'Palm', ...r })),
      ...(horoRes.data || []).map(r => ({ type: 'Horoscope', ...r })),
      ...(compatRes.data || []).map(r => ({ type: 'Compatibility', ...r }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    renderSavedReadings();
  } catch (err) {
    console.error('Load readings error:', err);
  }
}

export async function saveProfile() {
  const displayName = $('displayName').value.trim() || 'Guest';
  const zodiacSign = $('profileSign').value;

  if (!supabase || !state.user) {
    state.profile = { ...state.profile, display_name: displayName, zodiac_sign: zodiacSign };
    onProfileUpdate();
    showToast('Profile saved (demo mode)', 'success');
    return;
  }

  showLoading('Saving...');
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: state.user.id,
        display_name: displayName,
        zodiac_sign: zodiacSign,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    state.profile = { ...state.profile, display_name: displayName, zodiac_sign: zodiacSign };
    onProfileUpdate();
    showToast('Profile saved!', 'success');
  } catch (err) {
    showToast('Failed to save profile', 'error');
  } finally {
    hideLoading();
  }
}

export function renderSavedReadings() {
  const saved = state.savedReadings;
  const el = $('savedReadings');
  if (!el) return;

  if (!saved.length) {
    el.classList.add('muted');
    el.textContent = 'No readings yet.';
    return;
  }

  el.classList.remove('muted');
  el.textContent = saved
    .slice(0, 10)
    .map((x, i) => {
      const date = new Date(x.created_at).toLocaleDateString();
      let title = x.type;
      if (x.type === 'Horoscope') {
        title += ` (${cap(x.zodiac_sign || '')})`;
      }
      if (x.type === 'Compatibility') {
        title += ` (${cap(x.sign_a || '')} + ${cap(x.sign_b || '')})`;
      }
      return `${i + 1}. ${title} — ${date}`;
    })
    .join("\n");
}
