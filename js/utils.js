// AstroPalm - Utility Functions

export function $(id) {
  return document.getElementById(id);
}

export function formatNow() {
  return new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function showToast(message, type = 'info') {
  const container = $('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

export function showLoading(text = 'Loading...') {
  $('loadingText').textContent = text;
  $('loadingOverlay').classList.remove('hidden');
}

export function hideLoading() {
  $('loadingOverlay').classList.add('hidden');
}

export function openModal(modalId) {
  $(modalId).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

export function closeModal(modalId) {
  $(modalId).classList.add('hidden');
  document.body.style.overflow = '';
}

// Base64 decode helper for image uploads
export function decodeBase64(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
