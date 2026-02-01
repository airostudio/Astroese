// AstroPalm - Palm Reading Module

import { state, supabase } from './state.js';
import { $, showToast, showLoading, hideLoading, decodeBase64 } from './utils.js';
import { loadSavedReadings } from './auth.js';

export function drawOverlayDemo(imgEl) {
  const canvas = $("palmOverlay");
  const rect = imgEl.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width));
  canvas.height = Math.max(1, Math.floor(rect.height));
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const w = canvas.width, h = canvas.height;

  ctx.globalAlpha = 0.9;
  ctx.lineWidth = Math.max(2, Math.floor(Math.min(w, h) * 0.01));
  ctx.strokeStyle = "rgba(139,92,246,0.85)";

  const lines = [
    [[w*0.18, h*0.35], [w*0.45, h*0.28], [w*0.76, h*0.34]],
    [[w*0.22, h*0.48], [w*0.50, h*0.52], [w*0.82, h*0.56]],
    [[w*0.35, h*0.30], [w*0.26, h*0.55], [w*0.38, h*0.82]],
  ];

  for (const pts of lines) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]);
    ctx.stroke();
  }

  ctx.font = `${Math.max(12, Math.floor(Math.min(w, h) * 0.045))}px system-ui`;
  ctx.fillStyle = "rgba(242,244,255,0.9)";
  ctx.fillText("Heart", w*0.70, h*0.30);
  ctx.fillText("Head", w*0.74, h*0.58);
  ctx.fillText("Life", w*0.22, h*0.80);

  ctx.globalAlpha = 1;
}

function analyzePalmDemo() {
  const traits = [
    "steady energy", "quick intuition", "resilient mindset", "creative problem-solving",
    "strong boundaries", "empathetic presence", "adaptable spirit", "focused ambition"
  ];
  const challenges = [
    "overthinking", "taking on too much", "people-pleasing", "impatience with slow progress",
    "being too self-critical", "avoiding rest", "mixed signals in relationships"
  ];
  const guidance = [
    "Pick one priority and finish it before starting another.",
    "Say yes slower — your time is valuable.",
    "Balance logic with intuition when decisions feel stuck.",
    "A small daily routine will compound fast this month.",
    "Communicate clearly: what you want, what you won't do, and why."
  ];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const lineScores = {
    heart: Math.floor(55 + Math.random() * 40),
    head: Math.floor(55 + Math.random() * 40),
    life: Math.floor(55 + Math.random() * 40)
  };

  const base = `Palm Reading (Entertainment)
• Heart line: ${lineScores.heart}/100 — emotional style leans toward ${pick(["warm", "guarded", "direct", "idealistic"])}.
• Head line: ${lineScores.head}/100 — mental approach feels ${pick(["analytical", "vision-driven", "practical", "curious"])}.
• Life line: ${lineScores.life}/100 — overall drive looks ${pick(["steady", "bursty", "consistent", "restless"])}.

Strong signal: ${pick(traits)}
Watch-out: ${pick(challenges)}
Guidance: ${pick(guidance)}
`;

  if (!state.premium) {
    return base + "\n(Unlock Premium for deeper detail + 'year-ahead' themes.)";
  }

  const premiumAdd = `
Premium Deep-Dive
• Relationship vibe: ${pick(["loyal but selective", "intense and sincere", "playful and open", "calm and committed"])}
• Career tendency: ${pick(["independent builder", "team catalyst", "strategic planner", "creative finisher"])}
• Next 30 days: ${pick([
    "A new opportunity appears through a casual conversation.",
    "Clearing clutter (digital or physical) boosts focus dramatically.",
    "A relationship improves when you state needs plainly.",
    "Momentum rises after you protect your sleep and routines."
  ])}
Lucky cue: ${pick(["moonlight walks", "fresh starts on Mondays", "journaling", "water/sea time", "a short solo trip"])}
`;

  return base + premiumAdd;
}

export async function analyzePalm() {
  if (!state.palm.dataUrl) {
    showToast('Please capture or upload a palm photo first', 'error');
    return;
  }

  showLoading('Analyzing your palm...');

  // Simulate analysis delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const result = analyzePalmDemo();
  $('palmResult').classList.remove('muted');
  $('palmResult').textContent = result;

  // Save to database
  await savePalmReading(result);

  hideLoading();
  showToast('Palm reading complete!', 'success');
}

async function savePalmReading(result) {
  if (!supabase || !state.user) {
    // Local save for demo
    state.savedReadings.unshift({
      type: 'Palm',
      result_json: { result },
      created_at: new Date().toISOString()
    });
    return;
  }

  try {
    // Upload image to Supabase Storage
    let imageUrl = null;
    if (state.palm.dataUrl) {
      const fileName = `${state.user.id}/${Date.now()}.jpg`;
      const base64Data = state.palm.dataUrl.split(',')[1];
      const { data, error } = await supabase.storage
        .from('palm-images')
        .upload(fileName, decodeBase64(base64Data), {
          contentType: 'image/jpeg'
        });
      if (!error) {
        imageUrl = data.path;
      }
    }

    // Save reading
    await supabase.from('palm_scans').insert({
      user_id: state.user.id,
      image_url: imageUrl,
      result_json: { result },
      is_premium_reading: state.premium
    });

    await loadSavedReadings();
  } catch (err) {
    console.error('Save palm reading error:', err);
  }
}

export function handlePalmFileUpload(file) {
  if (!file) return;

  state.palm.file = file;
  const reader = new FileReader();
  reader.onload = () => {
    state.palm.dataUrl = String(reader.result);
    $('palmPreview').src = state.palm.dataUrl;
    $('palmPreview').classList.remove('hidden');
    $('previewPlaceholder').classList.add('hidden');
    $('btnAnalyzePalm').classList.remove('hidden');
    setTimeout(() => drawOverlayDemo($('palmPreview')), 50);
  };
  reader.readAsDataURL(file);
}
