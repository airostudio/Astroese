// AstroPalm - Camera Module

import { state } from './state.js';
import { $, showToast, openModal, closeModal } from './utils.js';
import { drawOverlayDemo } from './palm.js';

export async function openCamera() {
  openModal('cameraModal');
  await startCamera();
}

export async function startCamera() {
  try {
    if (state.camera.stream) {
      state.camera.stream.getTracks().forEach(track => track.stop());
    }

    const constraints = {
      video: {
        facingMode: state.camera.facingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    state.camera.stream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = $('cameraVideo');
    video.srcObject = state.camera.stream;

    // Reset UI
    $('capturedImage').classList.add('hidden');
    $('cameraVideo').classList.remove('hidden');
    $('palmGuide').classList.remove('hidden');
    $('retakePhoto').classList.add('hidden');
    $('usePhoto').classList.add('hidden');
    $('captureBtn').classList.remove('hidden');
  } catch (err) {
    console.error('Camera error:', err);
    showToast('Could not access camera. Please check permissions.', 'error');
    closeCameraModal();
  }
}

export function stopCamera() {
  if (state.camera.stream) {
    state.camera.stream.getTracks().forEach(track => track.stop());
    state.camera.stream = null;
  }
}

export function switchCamera() {
  state.camera.facingMode = state.camera.facingMode === 'environment' ? 'user' : 'environment';
  startCamera();
}

export function capturePhoto() {
  const video = $('cameraVideo');
  const canvas = $('cameraCanvas');
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Mirror if front camera
  if (state.camera.facingMode === 'user') {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, 0, 0);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  state.palm.dataUrl = dataUrl;

  // Show captured image
  $('capturedImage').src = dataUrl;
  $('capturedImage').classList.remove('hidden');
  $('cameraVideo').classList.add('hidden');
  $('palmGuide').classList.add('hidden');

  // Update buttons
  $('captureBtn').classList.add('hidden');
  $('retakePhoto').classList.remove('hidden');
  $('usePhoto').classList.remove('hidden');
}

export function retakePhoto() {
  $('capturedImage').classList.add('hidden');
  $('cameraVideo').classList.remove('hidden');
  $('palmGuide').classList.remove('hidden');
  $('captureBtn').classList.remove('hidden');
  $('retakePhoto').classList.add('hidden');
  $('usePhoto').classList.add('hidden');
  state.palm.dataUrl = null;
}

export function usePhoto() {
  if (!state.palm.dataUrl) return;

  // Show in preview
  $('palmPreview').src = state.palm.dataUrl;
  $('palmPreview').classList.remove('hidden');
  $('previewPlaceholder').classList.add('hidden');
  $('btnAnalyzePalm').classList.remove('hidden');

  // Draw overlay
  setTimeout(() => drawOverlayDemo($('palmPreview')), 50);

  closeCameraModal();
  showToast('Palm photo captured!', 'success');
}

export function closeCameraModal() {
  stopCamera();
  closeModal('cameraModal');
}
