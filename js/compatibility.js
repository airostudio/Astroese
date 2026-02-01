// AstroPalm - Compatibility Module

import { state, supabase } from './state.js';
import { $, showToast, cap } from './utils.js';
import { loadSavedReadings } from './auth.js';

function compatDemo(a, b, mode) {
  const seed = (a + "|" + b + "|" + mode).split("")
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);

  const score = 45 + (seed % 56);
  const strengths = [
    "shared humor", "emotional balance", "mutual ambition", "easy communication",
    "strong loyalty", "creative chemistry", "growth mindset", "grounded teamwork"
  ];
  const frictions = [
    "different pacing", "stubborn moments", "misread signals", "avoidance of conflict",
    "control vs freedom", "mixed priorities", "overthinking small stuff"
  ];
  const pickFromSeed = (arr, n) => arr[(seed + n * 97) % arr.length];

  const title = `${cap(a)} + ${cap(b)} (${cap(mode)})`;
  const text = `${title}
Score: ${score}/100

What works: ${pickFromSeed(strengths, 1)} and ${pickFromSeed(strengths, 2)}.
Watch for: ${pickFromSeed(frictions, 1)}.
Best move: Pick one shared goal this week and keep it measurable.
`;

  const premium = `Premium expanded report
• Communication style: One prefers direct clarity; the other prefers gentle pacing — agree on a "check-in" rhythm.
• Conflict tip: Name the feeling first, then the request.
• Growth potential: High if you respect differences and avoid scorekeeping.
`;

  return { title, score, text, premium };
}

export async function checkCompatibility() {
  const a = $('compatA').value;
  const b = $('compatB').value;
  const mode = $('compatMode').value;

  const { title, score, text, premium } = compatDemo(a, b, mode);

  $('compatBar').style.width = `${score}%`;
  $('compatScore').classList.remove('muted');
  $('compatScore').textContent = `${score}%`;

  $('compatText').classList.remove('muted');
  const fullText = state.premium ? (text + "\n" + premium) : text;
  $('compatText').textContent = fullText;

  // Save to database
  await saveCompatReport(a, b, mode, score, fullText);
  showToast('Compatibility checked!', 'success');
}

async function saveCompatReport(signA, signB, mode, score, text) {
  if (!supabase || !state.user) {
    state.savedReadings.unshift({
      type: 'Compatibility',
      sign_a: signA,
      sign_b: signB,
      mode,
      score,
      result_json: { text },
      created_at: new Date().toISOString()
    });
    return;
  }

  try {
    await supabase.from('compat_reports').insert({
      user_id: state.user.id,
      sign_a: signA,
      sign_b: signB,
      mode,
      score,
      result_json: { text }
    });
    await loadSavedReadings();
  } catch (err) {
    console.error('Save compat error:', err);
  }
}
