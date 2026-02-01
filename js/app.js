// AstroPalm - Main Application Entry Point

import { CONFIG } from './config.js';
import { state, setSupabase, setStripe } from './state.js';
import { $, SIGNS, cap, openModal, closeModal, showToast } from './utils.js';
import { routeTo, updatePremiumUI, updateAuthUI, updateProfileUI } from './ui.js';
import { checkAuth, signIn, signUp, signOut, saveProfile, loadProfile, setAuthCallbacks } from './auth.js';
import { openCamera, switchCamera, capturePhoto, retakePhoto, usePhoto, closeCameraModal } from './camera.js';
import { showPaymentModal } from './payments.js';
import { analyzePalm, handlePalmFileUpload, drawOverlayDemo } from './palm.js';
import { getHoroscope } from './horoscope.js';
import { checkCompatibility } from './compatibility.js';

// Initialize Supabase
function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    const client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    setSupabase(client);
    return true;
  }
  console.warn('Supabase not loaded - running in demo mode');
  return false;
}

// Initialize Stripe
function initStripe() {
  if (typeof window.Stripe !== 'undefined') {
    const client = window.Stripe(CONFIG.STRIPE_PUBLISHABLE_KEY);
    setStripe(client);
    return true;
  }
  console.warn('Stripe not loaded - running in demo mode');
  return false;
}

// Initialize sign selects for compatibility
function initSignSelects() {
  const a = $("compatA"), b = $("compatB");
  for (const sign of SIGNS) {
    const o1 = document.createElement("option");
    o1.value = sign;
    o1.textContent = cap(sign);
    const o2 = document.createElement("option");
    o2.value = sign;
    o2.textContent = cap(sign);
    a.appendChild(o1);
    b.appendChild(o2);
  }
  b.value = "libra";
}

// Bind all event listeners
function bindEvents() {
  // Navigation
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => routeTo(btn.dataset.route));
  });

  // Auth button
  $('btnAuth').addEventListener('click', () => {
    if (state.user) {
      routeTo('profile');
    } else {
      openModal('authModal');
    }
  });

  // Auth modal
  $('closeAuthModal').addEventListener('click', () => closeModal('authModal'));
  $('authModal').querySelector('.modalBackdrop').addEventListener('click', () => closeModal('authModal'));

  // Auth tabs
  document.querySelectorAll('.authTab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.authTab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $('signInForm').classList.toggle('hidden', tab.dataset.auth !== 'signin');
      $('signUpForm').classList.toggle('hidden', tab.dataset.auth !== 'signup');
    });
  });

  // Sign in form
  $('signInForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('signInError').classList.add('hidden');
    await signIn($('signInEmail').value, $('signInPassword').value);
  });

  // Sign up form
  $('signUpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('signUpError').classList.add('hidden');
    await signUp(
      $('signUpEmail').value,
      $('signUpPassword').value,
      $('signUpName').value,
      $('signUpSign').value
    );
  });

  $('continueAsGuest').addEventListener('click', () => closeModal('authModal'));
  $('btnProfileSignIn').addEventListener('click', () => openModal('authModal'));
  $('btnSignOut').addEventListener('click', signOut);
  $('btnSaveProfile').addEventListener('click', saveProfile);

  // Premium buttons
  $('btnPremium').addEventListener('click', () => {
    if (!state.premium) {
      showPaymentModal('subscription');
    }
  });
  $('btnUpgrade').addEventListener('click', () => showPaymentModal('subscription'));
  $('btnUnlockPalm').addEventListener('click', () => showPaymentModal('palm'));
  $('btnUnlockHoro').addEventListener('click', () => showPaymentModal('horoscope'));
  $('btnUnlockCompat').addEventListener('click', () => showPaymentModal('compat'));

  // Payment modal
  $('closePaymentModal').addEventListener('click', () => closeModal('paymentModal'));
  $('paymentModal').querySelector('.modalBackdrop').addEventListener('click', () => closeModal('paymentModal'));

  // Camera
  $('btnOpenCamera').addEventListener('click', openCamera);
  $('closeCameraModal').addEventListener('click', closeCameraModal);
  $('switchCamera').addEventListener('click', switchCamera);
  $('captureBtn').addEventListener('click', capturePhoto);
  $('retakePhoto').addEventListener('click', retakePhoto);
  $('usePhoto').addEventListener('click', usePhoto);

  // Palm input (file upload)
  $('palmInput').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    handlePalmFileUpload(file);
  });

  $('btnAnalyzePalm').addEventListener('click', analyzePalm);

  // Horoscope
  $('btnGetHoroscope').addEventListener('click', getHoroscope);

  // Compatibility
  $('btnCompat').addEventListener('click', checkCompatibility);

  // Resize handler for palm overlay
  window.addEventListener('resize', () => {
    const img = $('palmPreview');
    if (img && img.src && !img.classList.contains('hidden')) {
      drawOverlayDemo(img);
    }
  });
}

// Main boot function
async function boot() {
  initSupabase();
  initStripe();
  initSignSelects();
  bindEvents();

  // Wire up auth callbacks for UI updates
  setAuthCallbacks(updateAuthUI, updateProfileUI);

  await checkAuth();
  updatePremiumUI();
  routeTo('palm');

  // Check for payment success/cancel in URL
  const params = new URLSearchParams(window.location.search);
  if (params.get('payment') === 'success') {
    showToast('Payment successful! Refreshing...', 'success');
    await loadProfile();
    updatePremiumUI();
    window.history.replaceState({}, '', window.location.pathname);
  } else if (params.get('payment') === 'cancelled') {
    showToast('Payment cancelled', 'info');
    window.history.replaceState({}, '', window.location.pathname);
  }
}

// Start the application
boot();
