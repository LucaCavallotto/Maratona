import { normalizeInput, validateTime, secondsToTime, secondsToPace, presetDistances } from './utils.js';
import {
    calculateThresholdPace,
    calculateZones,
    estimateRacePace,
    calculatePaceMetrics,
    calculateTimeMetrics,
    calculateDistanceMetrics,
    calculateConverterMetrics
} from './calculators.js';
import {
    initCustomDropdowns,
    hideAllErrors,
    updateDistanceInput,
    updateConverterLabel,
    setLoadingState,
    triggerSlideTransition,
    clearOldResults,
    showResultsGrid,
    renderPaceTimeResults,
    resetUI,
    switchCalcMode,
    UIState,
    resetResultsDisplay
} from './ui-controller.js';

// Validation Decoupler
function validateInputsForMode(mode) {
    if (mode === 'zone') {
        const timeInput = normalizeInput(document.getElementById('time10k').value.trim());
        if (!validateTime(timeInput)) {
            document.getElementById('errorZone').style.display = 'block';
            return false;
        }
    } else if (mode === 'pace') {
        const distanceValue = parseFloat(normalizeInput(document.getElementById('distancePace').value.trim()));
        const timeString = normalizeInput(document.getElementById('timePace').value.trim());
        if (isNaN(distanceValue) || distanceValue <= 0 || !validateTime(timeString)) {
            document.getElementById('errorPace').style.display = 'block';
            return false;
        }
    } else if (mode === 'time') {
        const distanceValue = parseFloat(normalizeInput(document.getElementById('distanceTime').value.trim()));
        const paceString = normalizeInput(document.getElementById('paceTime').value.trim());
        if (isNaN(distanceValue) || distanceValue <= 0 || !validateTime(paceString, false)) {
            document.getElementById('errorTime').style.display = 'block';
            return false;
        }
    } else if (mode === 'distance') {
        const timeString = normalizeInput(document.getElementById('timeDistance').value.trim());
        const paceString = normalizeInput(document.getElementById('paceDistance').value.trim());
        if (!validateTime(timeString) || !validateTime(paceString, false)) {
            document.getElementById('errorDistance').style.display = 'block';
            return false;
        }
    } else if (mode === 'converter') {
        const conversionType = document.getElementById('convType').value;
        const inputString = normalizeInput(document.getElementById('convValue').value.trim());
        if (conversionType === 'distance') {
            const numericValue = parseFloat(inputString);
            if (isNaN(numericValue) || numericValue < 0) {
                document.getElementById('errorConverter').style.display = 'block';
                return false;
            }
        } else {
            if (!validateTime(inputString, false)) {
                document.getElementById('errorConverter').style.display = 'block';
                return false;
            }
        }
    }
    return true;
}

// Orchestrator Handle
async function handleCalculate(e) {
    if (e) e.preventDefault();
    const mode = document.getElementById('calcMode').value;
    const appLayout = document.querySelector('.app-layout');

    hideAllErrors();

    if (!validateInputsForMode(mode)) {
        return;
    }

    document.getElementById('successMsg').style.display = 'none';
    document.getElementById('copyBtn').disabled = true;
    document.getElementById('resetBtn').disabled = true;

    // Trigger Spinner
    setLoadingState(true, 'calculateBtn');

    // UI Animations Staggering
    await clearOldResults(appLayout);
    resetResultsDisplay();
    await triggerSlideTransition(appLayout);

    // Context Execution via Calculation Layer
    if (mode === 'zone') {
        const timeInput = normalizeInput(document.getElementById('time10k').value.trim());
        const thresholdPace = calculateThresholdPace(timeInput);
        const zones = calculateZones(thresholdPace);
        const races = [
            [5, "5K"],
            [10, "10K"],
            [21.0975, "Half Marathon"],
            [42.195, "Marathon"]
        ].map(([distanceInKm, raceName]) => ({
            name: raceName,
            ...estimateRacePace(thresholdPace, distanceInKm)
        }));

        UIState.currentResults = { mode: 'zone', timeInput, thresholdPace, zones, races };

        // Output to specific unique UI elements (Zones isn't natively built on the 2x2 generalized renderer)
        document.getElementById('refTime').innerHTML = `<span class="metric-num">${timeInput}</span>`;
        document.getElementById('refPace').innerHTML = `<span class="metric-num">${secondsToPace(thresholdPace)}</span><span class="metric-unit">/km</span>`;

        document.getElementById('zones').innerHTML = zones.map(zone => `
            <div class="zone-card">
                <div class="zone-header">
                    <div class="zone-name">${zone.name}</div>
                    <div class="zone-pace"><span class="metric-num">${zone.lower}</span><span class="metric-unit">/km – </span><span class="metric-num">${zone.upper}</span><span class="metric-unit">/km</span></div>
                </div>
                <div class="zone-desc">${zone.description}</div>
            </div>
        `).join('');

        document.getElementById('races').innerHTML = races.map(racePrediction => {
            return `
                <div class="zone-card race-card">
                    <div class="race-name">${racePrediction.name}</div>
                    <div class="race-details">
                        <div class="race-pace"><span class="metric-num">${racePrediction.pace}</span><span class="metric-unit">/km</span></div>
                        <div class="race-time"><span class="metric-num">${secondsToTime(racePrediction.totalSeconds)}</span></div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('results').style.display = 'block';
        document.getElementById('zoneResults').classList.remove('hidden');

    } else if (mode === 'pace') {
        const distanceString = normalizeInput(document.getElementById('distancePace').value.trim());
        const timeString = normalizeInput(document.getElementById('timePace').value.trim());
        const distanceValue = parseFloat(distanceString);

        const payload = calculatePaceMetrics(distanceValue, timeString);
        UIState.currentResults = { mode: 'pace', distance: distanceValue, distanceLabel: presetDistances[distanceString] || `${distanceValue} km`, time: timeString, pace: payload.paceString, speedKmH: payload.speedKmH, speedMS: payload.speedMS, splits: payload.splits };

        renderPaceTimeResults(document.getElementById('paceTimeResults'), [
            { label: 'Distance', value: { num: distanceValue, unit: ' km' } },
            { label: 'Time', value: { num: timeString, unit: '' } },
            { label: 'Pace', value: { num: payload.paceString, unit: '/km' } },
            { label: 'Speed', value: { num: payload.speedKmH, unit: ' km/h' }, subValue: { num: payload.speedMS, unit: ' m/s' } }
        ], payload.splits);

    } else if (mode === 'time') {
        const distanceString = normalizeInput(document.getElementById('distanceTime').value.trim());
        const paceString = normalizeInput(document.getElementById('paceTime').value.trim());
        const distanceValue = parseFloat(distanceString);

        const payload = calculateTimeMetrics(distanceValue, paceString);
        UIState.currentResults = { mode: 'time', distance: distanceValue, distanceLabel: presetDistances[distanceString] || `${distanceValue} km`, pace: paceString, totalTime: payload.totalTime, speedKmH: payload.speedKmH, speedMS: payload.speedMS, splits: payload.splits };

        renderPaceTimeResults(document.getElementById('paceTimeResults'), [
            { label: 'Distance', value: { num: distanceValue, unit: ' km' } },
            { label: 'Pace', value: { num: paceString, unit: '/km' } },
            { label: 'Total Time', value: { num: payload.totalTime, unit: '' } },
            { label: 'Speed', value: { num: payload.speedKmH, unit: ' km/h' }, subValue: { num: payload.speedMS, unit: ' m/s' } }
        ], payload.splits);

    } else if (mode === 'distance') {
        const timeString = normalizeInput(document.getElementById('timeDistance').value.trim());
        const paceString = normalizeInput(document.getElementById('paceDistance').value.trim());

        const payload = calculateDistanceMetrics(timeString, paceString);
        UIState.currentResults = { mode: 'distance', time: timeString, pace: paceString, distance: payload.distanceValue, distanceLabel: payload.distanceLabel, speedKmH: payload.speedKmH, speedMS: payload.speedMS, splits: payload.splits };

        renderPaceTimeResults(document.getElementById('paceTimeResults'), [
            { label: 'Total Time', value: { num: timeString, unit: '' } },
            { label: 'Pace', value: { num: paceString, unit: '/km' } },
            { label: 'Distance', value: { num: payload.distanceValue.toFixed(2), unit: ' km' } },
            { label: 'Speed', value: { num: payload.speedKmH, unit: ' km/h' }, subValue: { num: payload.speedMS, unit: ' m/s' } }
        ], payload.splits);

    } else if (mode === 'converter') {
        const conversionType = document.getElementById('convType').value;
        const inputString = normalizeInput(document.getElementById('convValue').value.trim());
        const activeToggle = document.querySelector('.toggle-btn.active');
        const unit = activeToggle ? activeToggle.getAttribute('data-value') : 'km';
        const numericValue = parseFloat(inputString);

        const converterResultsDiv = document.getElementById('converterResults');
        const payload = calculateConverterMetrics(conversionType === 'distance' ? numericValue : inputString, conversionType, unit);

        if (conversionType === 'distance') {
            const resultLabel = unit === 'km' ? `${payload.miles} miles` : `${payload.kilometers} km`;
            const inputLabel = unit === 'km' ? `${numericValue} km` : `${numericValue} miles`;
            UIState.currentResults = { mode: 'converter', type: 'distance', inputLabel, resultLabel };

            converterResultsDiv.innerHTML = `
                <div class="result-grid">
                    <div class="result-card">
                        <div class="result-item">
                            <div class="metric-label">
                                <svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z"/></svg>
                                Input (${unit === 'km' ? 'Km' : 'Miles'})
                            </div>
                            <div class="metric-value"><span class="metric-num">${numericValue}</span></div>
                        </div>
                        <div class="result-item">
                            <div class="metric-label">
                                 <svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z"/></svg>
                                Converted (${unit === 'km' ? 'Miles' : 'Km'})
                            </div>
                            <div class="metric-value"><span class="metric-num">${unit === 'km' ? payload.miles : payload.kilometers}</span></div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const inputLabel = `${inputString} /${unit}`;
            const resultLabel = `${payload.resultPace} /${unit === 'km' ? 'mi' : 'km'}`;
            UIState.currentResults = { mode: 'converter', type: 'pace', inputLabel, resultLabel };

            converterResultsDiv.innerHTML = `
                <div class="result-grid">
                    <div class="result-card">
                        <div class="result-item">
                            <div class="metric-label">
                                <svg class="icon-svg" viewBox="0 0 24 24"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a8.994 8.994 0 007.03-14.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
                                Input Pace (/${unit === 'km' ? 'km' : 'mi'})
                            </div>
                            <div class="metric-value"><span class="metric-num">${inputString}</span></div>
                        </div>
                        <div class="result-item">
                            <div class="metric-label">
                                <svg class="icon-svg" viewBox="0 0 24 24"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a8.994 8.994 0 007.03-14.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
                                Converted Pace (/${unit === 'km' ? 'mi' : 'km'})
                            </div>
                            <div class="metric-value"><span class="metric-num">${payload.resultPace}</span></div>
                        </div>
                    </div>
                </div>
            `;
        }
        document.getElementById('results').style.display = 'block';
        converterResultsDiv.classList.remove('hidden');
    }

    // Trigger Fade-In Response
    setLoadingState(false, 'calculateBtn');
    showResultsGrid(appLayout);
}

function handleReset(e) {
    if (e) e.preventDefault();
    resetUI();
}

function handleCopy(e) {
    if (e) e.preventDefault();
    if (!UIState.currentResults) return;

    let text = '';
    const currentResults = UIState.currentResults;
    if (currentResults.mode === 'zone') {
        const { timeInput, thresholdPace, zones, races } = currentResults;
        const currentDate = new Date().toLocaleDateString();
        text = `Maratona - ZONE CALCULATOR - ${currentDate}\n\n`;
        text += `10K Time: ${timeInput}\n`;
        text += `Threshold Pace: ${secondsToPace(thresholdPace)}/km\n\n`;
        text += `TRAINING ZONES\n`;
        zones.forEach(z => {
            text += `${z.name}: ${z.lower} – ${z.upper} — ${z.description}\n`;
        });
        text += `\nRACE PREDICTIONS\n`;
        races.forEach(r => {
            text += `${r.name}: ${r.pace}/km (${r.totalSeconds})\n`;
        });
    } else if (currentResults.mode === 'pace') {
        const { distance, distanceLabel, time, pace, splits, speedKmH, speedMS } = currentResults;
        text = `Maratona - PACE CALCULATOR\n\n`;
        text += `Distance: ${distance}\n`;
        text += `Time: ${time}\n`;
        text += `Pace: ${pace}/km\n`;
        text += `Speed: ${speedKmH} km/h (${speedMS} m/s)\n`;
        if (splits) {
            text += `\nSPLITS\n`;
            splits.forEach(s => {
                // Strip HTML from splits representation
                const strippedKm = s.km.toString().replace(/<[^>]*>?/gm, '');
                const strippedTime = s.time.toString().replace(/<[^>]*>?/gm, '');
                text += `Km ${strippedKm}: ${strippedTime}\n`;
            });
        }
    } else if (currentResults.mode === 'time') {
        const { distanceLabel, pace, totalTime, splits, speedKmH, speedMS } = currentResults;
        text = `Maratona - TIME CALCULATOR\n\n`;
        text += `Distance: ${distanceLabel}\n`;
        text += `Pace: ${pace}/km\n`;
        text += `Total Time: ${totalTime}\n`;
        text += `Speed: ${speedKmH} km/h (${speedMS} m/s)\n`;
        if (splits) {
            text += `\nSPLITS\n`;
            splits.forEach(s => {
                const strippedKm = s.km.toString().replace(/<[^>]*>?/gm, '');
                const strippedTime = s.time.toString().replace(/<[^>]*>?/gm, '');
                text += `Km ${strippedKm}: ${strippedTime}\n`;
            });
        }
    } else if (currentResults.mode === 'distance') {
        const { time, pace, distanceLabel, splits, speedKmH, speedMS } = currentResults;
        text = `Maratona - DISTANCE CALCULATOR\n\n`;
        text += `Total Time: ${time}\n`;
        text += `Pace: ${pace}/km\n`;
        text += `Distance: ${distanceLabel}\n`;
        text += `Speed: ${speedKmH} km/h (${speedMS} m/s)\n`;
        if (splits) {
            text += `\nSPLITS\n`;
            splits.forEach(s => {
                const strippedKm = s.km.toString().replace(/<[^>]*>?/gm, '');
                const strippedTime = s.time.toString().replace(/<[^>]*>?/gm, '');
                text += `Km ${strippedKm}: ${strippedTime}\n`;
            });
        }
    } else if (currentResults.mode === 'converter') {
        const { type, inputLabel, resultLabel } = currentResults;
        text = `Maratona - CONVERTER\n\n`;
        text += `${type === 'distance' ? 'Distance' : 'Pace'} Conversion\n`;
        text += `${inputLabel} = ${resultLabel}\n`;
    }

    navigator.clipboard.writeText(text).then(() => {
        const successMsg = document.getElementById('successMsg');
        successMsg.style.display = 'block';
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 2500);
    }).catch(err => {
        alert('Failed to copy to clipboard');
    });
}

// ----------------------------------------------------------------------------
// Core Interactions Bootstrapper
// ----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initCustomDropdowns();
    updateDistanceInput(document.getElementById('calcMode').value);

    // Event Attachment Architecture
    const calcBtn = document.getElementById('calculateBtn');
    if (calcBtn) calcBtn.addEventListener('click', handleCalculate);

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) resetBtn.addEventListener('click', handleReset);

    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) copyBtn.addEventListener('click', handleCopy);

    // Dropdown Form Triggers
    document.getElementById('calcMode').addEventListener('change', function () {
        switchCalcMode(this.value);
    });

    document.getElementById('convType').addEventListener('change', updateConverterLabel);

    document.getElementById('distancePresetPace').addEventListener('change', () => updateDistanceInput('pace'));
    document.getElementById('distancePresetTime').addEventListener('change', () => updateDistanceInput('time'));

    // Toggle Button Logic (Unit Converter)
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            this.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Enter Key Bindings for Form Inputs
    const enterInputs = ['time10k', 'distancePace', 'timePace', 'distanceTime', 'paceTime', 'timeDistance', 'paceDistance', 'convValue'];
    enterInputs.forEach(inputId => {
        const inputEl = document.getElementById(inputId);
        if (inputEl) {
            inputEl.addEventListener('keypress', function (e) {
                if (e.key === 'Enter') handleCalculate(e);
            });
        }
    });
});
