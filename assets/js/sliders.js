/**
 * sliders.js — Flip-Card & Interactive Slider Logic
 *
 * Formula: Distance (km) = Time (minutes) / Pace (min/km)
 *
 * Slider representations:
 *   #sliderDistance → value in km  (0.1 – 100, step 0.1)
 *   #sliderTime     → value in minutes (1 – 1440, step 1)
 *   #sliderPace     → value in seconds/km (120 – 900, step 1)  [i.e., 2:00–15:00 /km]
 */

import { secondsToPace, secondsToTime } from './utils.js';
import { calculatePaceMetrics } from './calculators.js';
import { renderPaceTimeResults, showResultsGrid, clearOldResults, triggerSlideTransition, UIState } from './ui-controller.js';
import { presetDistances } from './utils.js';

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

/** Convert a total number of minutes to HH:MM:SS string */
function minutesToTimeString(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = Math.floor(totalMinutes % 60);
    const s = 0;
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format seconds into MM:SS pace string */
function secondsToPaceStr(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Parse HH:MM:SS or MM:SS time string into total minutes (float) */
function timeStringToMinutes(str) {
    if (!str || typeof str !== 'string') return null;
    const parts = str.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    
    // HH:MM:SS -> H*60 + M + S/60
    if (parts.length === 3) return parts[0] * 60 + parts[1] + (parts[2] || 0) / 60;
    // MM:SS -> M + S/60
    if (parts.length === 2) return parts[0] + (parts[1] || 0) / 60;
    // Just M
    if (parts.length === 1) return parts[0];
    return null;
}

/** Parse MM:SS pace string into seconds (float) */
function paceStringToSeconds(str) {
    if (!str) return null;
    const parts = str.split(':').map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return null;
    return parts[0] * 60 + parts[1];
}

/** Clamp a value between min and max */
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

/** Update the CSS fill gradient of a range input */
function updateSliderFill(input) {
    if (!input) return;
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const val = parseFloat(input.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    input.style.backgroundSize = `${pct}% 100%`;
}

// ──────────────────────────────────────────────────────────
// DOM refs
// ──────────────────────────────────────────────────────────

const flipper      = () => document.getElementById('sidebarFlipper');
const btnFlipBack  = () => document.getElementById('btnFlipToBack');
const btnFlipFront = () => document.getElementById('btnFlipToFront');

const sliderDist   = () => document.getElementById('sliderDistance');
const sliderTime   = () => document.getElementById('sliderTime');
const sliderPace   = () => document.getElementById('sliderPace');

const valDist      = () => document.getElementById('valDistance');
const valTime      = () => document.getElementById('valTime');
const valPace      = () => document.getElementById('valPace');

// ──────────────────────────────────────────────────────────
// State helpers
// ──────────────────────────────────────────────────────────

/**
 * Read slider values and update the output labels. Returns the
 * current {distKm, timeMins, paceSecs} so callers can react to changes.
 */
function readSliders() {
    return {
        distKm:    parseFloat(sliderDist().value),
        timeMins:  parseFloat(sliderTime().value),
        paceSecs:  parseFloat(sliderPace().value),
    };
}

function updateOutputLabels({ distKm, timeMins, paceSecs }) {
    valDist().textContent = `${distKm.toFixed(1)} km`;
    valTime().textContent = minutesToTimeString(timeMins);
    valPace().textContent = `${secondsToPaceStr(paceSecs)} /km`;
}

// ──────────────────────────────────────────────────────────
// Sync: text inputs → sliders (called when flipping to back)
// ──────────────────────────────────────────────────────────

export function syncFrontToSliders() {
    const mode = document.getElementById('calcMode')?.value;
    if (!mode) return;

    // Use current calculation context values if available first
    let distKm = 10, timeMins = 50, paceSecs = 300;

    // Read values from text inputs based on active mode
    if (mode === 'pace') {
        const d = parseFloat(document.getElementById('distancePace')?.value);
        const t = timeStringToMinutes(document.getElementById('timePace')?.value);
        if (!isNaN(d) && d > 0 && t > 0) {
            distKm = d;
            timeMins = t;
            paceSecs = (t * 60) / d;
        }
    } else if (mode === 'time') {
        const d = parseFloat(document.getElementById('distanceTime')?.value);
        const p = paceStringToSeconds(document.getElementById('paceTime')?.value);
        if (!isNaN(d) && d > 0 && p > 0) {
            distKm = d;
            paceSecs = p;
            timeMins = (d * p) / 60;
        }
    } else if (mode === 'distance') {
        const t = timeStringToMinutes(document.getElementById('timeDistance')?.value);
        const p = paceStringToSeconds(document.getElementById('paceDistance')?.value);
        if (t > 0 && p > 0) {
            timeMins = t;
            paceSecs = p;
            distKm = (t * 60) / p;
        }
    }

    // Clamp to slider ranges: Distance (0.1-100km), Time (1-600m), Pace (120-900s)
    distKm   = clamp(distKm,   0.1, 100);
    timeMins = clamp(timeMins, 1,   1440); // 1 to 24h as per slider max
    paceSecs = clamp(paceSecs, 120, 900);

    const sD = sliderDist(), sT = sliderTime(), sP = sliderPace();
    if (sD) sD.value = distKm.toFixed(1);
    if (sT) sT.value = Math.round(timeMins);
    if (sP) sP.value = Math.round(paceSecs);

    [sD, sT, sP].forEach(updateSliderFill);
    updateOutputLabels({ distKm, timeMins, paceSecs });
}

// ──────────────────────────────────────────────────────────
// Sync: sliders → text inputs (called when flipping back to front)
// ──────────────────────────────────────────────────────────

export function syncSlidersToFront() {
    const { distKm, timeMins, paceSecs } = readSliders();
    const paceStr = secondsToPaceStr(paceSecs);
    const timeStr = minutesToTimeString(timeMins);

    // Write into all three modes' inputs so switching modes works naturally
    document.getElementById('distancePace').value = distKm.toFixed(2);
    document.getElementById('timePace').value      = timeStr;

    document.getElementById('distanceTime').value = distKm.toFixed(2);
    document.getElementById('paceTime').value      = paceStr;

    document.getElementById('timeDistance').value  = timeStr;
    document.getElementById('paceDistance').value  = paceStr;
}

// ──────────────────────────────────────────────────────────
// Real-time slider calculation
// ──────────────────────────────────────────────────────────

/** Which slider was last touched — used to decide which value is "fixed" */
let lastTouched = 'pace'; // 'distance' | 'time' | 'pace'
let isSliderInteracted = false;

/**
 * Recompute the "third" variable and update slider + output.
 * Rules:
 *   slide Distance → time fixed, recompute pace
 *   slide Time     → distance fixed, recompute pace
 *   slide Pace     → distance fixed, recompute time
 */
function recomputeSliders(changed) {
    lastTouched = changed;
    isSliderInteracted = true;

    let { distKm, timeMins, paceSecs } = readSliders();

    if (changed === 'distance' || changed === 'time') {
        // Recompute pace  (sec/km) = (timeMins * 60) / distKm
        if (distKm > 0) {
            paceSecs = (timeMins * 60) / distKm;
            paceSecs = clamp(Math.round(paceSecs), 120, 900);
            sliderPace().value = paceSecs;
        }
    } else if (changed === 'pace') {
        // Recompute time  (mins) = distKm * paceSecs / 60
        timeMins = (distKm * paceSecs) / 60;
        timeMins = clamp(Math.round(timeMins), 1, 1440);
        sliderTime().value = timeMins;
    }

    // Refresh fill for all three
    [sliderDist(), sliderTime(), sliderPace()].forEach(updateSliderFill);

    // Update visible labels
    updateOutputLabels({
        distKm:   parseFloat(sliderDist().value),
        timeMins: parseFloat(sliderTime().value),
        paceSecs: parseFloat(sliderPace().value),
    });

    // Removed runSliderCalculation() call from here — 
    // user wants to manually click 'Calculate' to see results.
}

// Trigger live calculation
async function runSliderCalculation() {
    // This is still needed for when internal slider logic wants a preview,
    // but the actual manual calculation is now gated by the button click
    // as per user request.
    const distKm   = parseFloat(sliderDist().value);
    const timeMins = parseFloat(sliderTime().value);
    const timeStr  = minutesToTimeString(timeMins);

    if (!distKm || distKm <= 0) return;

    const appLayout = document.querySelector('.app-layout');

    try {
        const payload = calculatePaceMetrics(distKm, timeStr);

        UIState.currentResults = {
            mode: 'pace',
            distance: distKm,
            distanceLabel: presetDistances[String(distKm)] || `${distKm} km`,
            distanceMiles: payload.distanceMiles,
            paceMinMile: payload.paceMinMile,
            time: timeStr,
            pace: payload.paceString,
            speedKmH: payload.speedKmH,
            speedMS: payload.speedMS,
            speedMpH: payload.speedMpH,
            splits: payload.splits,
        };

        renderPaceTimeResults(document.getElementById('paceTimeResults'), [
            { label: 'Distance', value: { num: distKm.toFixed(2), unit: ' km' }, subValue: { num: payload.distanceMiles, unit: ' mi' } },
            { label: 'Time',     value: { num: timeStr, unit: '' } },
            { label: 'Pace',     value: { num: payload.paceString, unit: '/km' }, subValue: { num: payload.paceMinMile, unit: '/mi' } },
            { label: 'Speed',    value: { num: payload.speedKmH, unit: ' km/h' }, subValue: [{ num: payload.speedMS, unit: ' m/s' }, { num: payload.speedMpH, unit: ' mph' }] },
        ], payload.splits);

        // Expand results panel if not already shown
        if (!appLayout.classList.contains('state-results')) {
            await triggerSlideTransition(appLayout);
        }

        // Make results visible
        document.getElementById('results').style.display = 'block';
        document.getElementById('paceTimeResults').classList.remove('hidden');

        showResultsGrid(appLayout);

        // Enable copy/reset buttons
        document.getElementById('copyBtn').disabled  = false;
        document.getElementById('resetBtn').disabled = false;

    } catch (err) {
        console.warn('[Slider calc error]', err);
    }
}

// ──────────────────────────────────────────────────────────
// Flip toggle
// ──────────────────────────────────────────────────────────

export const isFlipped = () => flipper()?.classList.contains('flipped');

export function flipToBack() {
    if (isFlipped()) return;
    isSliderInteracted = false; // Reset interaction flag when entering sliders
    syncFrontToSliders();
    flipper().classList.add('flipped');
    // If already calculated, run slider calc immediately for live preview
    if (UIState.isCalculated || UIState.currentResults) {
        runSliderCalculation();
    }
}

export function flipToFront() {
    if (!isFlipped()) return;
    
    // Only sync back if the user actually modified something on the sliders side
    if (isSliderInteracted) {
        syncSlidersToFront();
    }
    
    flipper().classList.remove('flipped');
    isSliderInteracted = false;
}

// ──────────────────────────────────────────────────────────
// Show/hide the flip button based on calculator mode
// ──────────────────────────────────────────────────────────

export function updateFlipButtonVisibility(mode) {
    const btn = btnFlipBack();
    if (!btn) return;

    const SLIDER_MODES = ['pace', 'time', 'distance'];
    if (SLIDER_MODES.includes(mode)) {
        btn.classList.remove('hidden');
    } else {
        btn.classList.add('hidden');
        // Auto-flip back if currently on back for a mode that doesn't support sliders
        flipToFront();
    }
}

// ──────────────────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────────────────

export function initSliders() {
    // Set initial fill on load
    [sliderDist(), sliderTime(), sliderPace()].forEach(updateSliderFill);

    // Initial output labels
    updateOutputLabels(readSliders());

    // Slider input listeners
    sliderDist().addEventListener('input', () => recomputeSliders('distance'));
    sliderTime().addEventListener('input', () => recomputeSliders('time'));
    sliderPace().addEventListener('input', () => recomputeSliders('pace'));

    // Flip buttons
    btnFlipBack().addEventListener('click', flipToBack);
    btnFlipFront().addEventListener('click', flipToFront);
}
