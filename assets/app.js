function initCustomDropdowns() {
    const dropdowns = document.querySelectorAll('.custom-dropdown');
    const overlay = document.getElementById('dropdownOverlay');

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.custom-dropdown-toggle');
        const menu = dropdown.querySelector('.custom-dropdown-menu');
        const hiddenSelect = dropdown.nextElementSibling;

        toggle.addEventListener('click', function (e) {
            e.stopPropagation();

            document.querySelectorAll('.custom-dropdown-menu.show').forEach(otherMenu => {
                if (otherMenu !== menu) {
                    otherMenu.classList.remove('show');
                    otherMenu.parentElement.querySelector('.custom-dropdown-toggle').classList.remove('open');
                }
            });

            const isOpening = !menu.classList.contains('show');
            menu.classList.toggle('show');
            toggle.classList.toggle('open');
            toggle.setAttribute('aria-expanded', isOpening);

            if (window.innerWidth <= 640) {
                if (isOpening) {
                    overlay.classList.add('show');
                } else {
                    overlay.classList.remove('show');
                }
            }
        });

        menu.querySelectorAll('.custom-dropdown-item').forEach(item => {
            item.addEventListener('click', function () {
                menu.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');

                toggle.textContent = this.textContent;

                hiddenSelect.value = this.getAttribute('data-value');

                menu.classList.remove('show');
                toggle.classList.remove('open');
                overlay.classList.remove('show');

                hiddenSelect.dispatchEvent(new Event('change'));

                // Update ARIA
                toggle.setAttribute('aria-expanded', 'false');
                menu.querySelectorAll('.custom-dropdown-item').forEach(i => i.setAttribute('aria-selected', 'false'));
                this.setAttribute('aria-selected', 'true');
            });
        });

        // Keyboard navigation support
        toggle.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.custom-dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
                menu.parentElement.querySelector('.custom-dropdown-toggle').classList.remove('open');
                overlay.classList.remove('show');
            });
        }
    });

    overlay.addEventListener('click', function () {
        document.querySelectorAll('.custom-dropdown-menu.show').forEach(menu => {
            menu.classList.remove('show');
            menu.parentElement.querySelector('.custom-dropdown-toggle').classList.remove('open');
        });
        overlay.classList.remove('show');
    });
}

function normalizeInput(str) {
    return str.replace(',', '.');
}

function validateTime(timeStr, allowHours = true) {
    const parts = timeStr.split(':');
    if (!allowHours && parts.length !== 2) return false;
    if (allowHours && (parts.length !== 2 && parts.length !== 3)) return false;

    try {
        if (parts.length === 2) {
            const [mm, ss] = parts.map(Number);
            return !isNaN(mm) && !isNaN(ss) && ss < 60 && mm >= 0 && ss >= 0;
        } else {
            const [hh, mm, ss] = parts.map(Number);
            return !isNaN(hh) && !isNaN(mm) && !isNaN(ss) && ss < 60 && mm < 60 && hh >= 0 && mm >= 0 && ss >= 0;
        }
    } catch {
        return false;
    }
}

function timeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
}

function secondsToPace(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function secondsToTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (seconds >= 3600) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

function calculateThresholdPace(time10k) {
    return timeToSeconds(time10k) / 10;
}

function calculateZones(thresholdPace) {
    const zoneDefinitions = [
        ["Z1 – Recovery", 1.40, 1.25, "Recovery and active rest"],
        ["Z2 – Slow Bottom", 1.25, 1.12, "Aerobic endurance"],
        ["Z3 – Medium Cross-Country", 1.12, 1.02, "Aerobic capacity"],
        ["Z4 – Threshold", 1.02, 0.95, "Lactate tolerance, race pace"],
        ["Z5 – VO2 Max", 0.95, 0.88, "Speed development"],
        ["Z6 – Anaerobic", 0.88, 0.80, "Power and endurance"],
        ["Z7 – Sprint", 0.80, 0.70, "Maximum speed"]
    ];

    return zoneDefinitions.map(([name, upper, lower, desc]) => ({
        name,
        lower: secondsToPace(thresholdPace * upper),
        upper: secondsToPace(thresholdPace * lower),
        description: desc
    }));
}

function estimateRacePace(thresholdPace, distance) {
    let multiplier;
    if (distance <= 5) multiplier = 0.92;
    else if (distance <= 10) multiplier = 0.97;
    else if (distance <= 21.0975) multiplier = 1.03;
    else multiplier = 1.08;

    const pace = secondsToPace(thresholdPace * multiplier);
    const totalSeconds = thresholdPace * multiplier * distance;
    return { pace, totalSeconds };
}

function calculateSplits(paceSeconds, totalDistance) {
    const splits = [];
    const fullKm = Math.floor(totalDistance);

    for (let i = 1; i <= fullKm; i++) {
        splits.push({
            km: i,
            time: secondsToTime(paceSeconds * i)
        });
    }

    if (totalDistance > fullKm) {
        splits.push({
            km: parseFloat(totalDistance.toFixed(2)),
            time: secondsToTime(paceSeconds * totalDistance)
        });
    }

    return splits;
}

const presetDistances = {
    "5": "5K",
    "10": "10K",
    "21.0975": "Half Marathon",
    "42.195": "Marathon"
};

let currentResults = null;

function hideAllErrors() {
    document.querySelectorAll('.error-text').forEach(e => e.style.display = 'none');
}

function resetResultsDisplay() {
    const resultsDiv = document.getElementById('results');
    const zoneResults = document.getElementById('zoneResults');
    const paceTimeResults = document.getElementById('paceTimeResults');
    const converterResults = document.getElementById('converterResults');
    resultsDiv.style.display = 'none';
    zoneResults.classList.add('hidden');
    paceTimeResults.classList.add('hidden');
    converterResults.classList.add('hidden');
}

function updateDistanceInput(mode) {
    if (mode === 'pace') {
        const preset = document.getElementById('distancePresetPace').value;
        const input = document.getElementById('distancePace');
        if (preset !== 'custom') {
            input.value = preset;
        }
    } else if (mode === 'time') {
        const preset = document.getElementById('distancePresetTime').value;
        const input = document.getElementById('distanceTime');
        if (preset !== 'custom') {
            input.value = preset;
        }
    }
}

function calculate() {
    const mode = document.getElementById('calcMode').value;
    const successMsg = document.getElementById('successMsg');
    const resultsDiv = document.getElementById('results');
    const zoneResults = document.getElementById('zoneResults');
    const paceTimeResults = document.getElementById('paceTimeResults');
    const converterResults = document.getElementById('converterResults');
    const copyBtn = document.getElementById('copyBtn');

    successMsg.style.display = 'none';
    hideAllErrors();
    resetResultsDisplay();
    copyBtn.disabled = true;

    if (mode === 'zone') {
        calculateZone(resultsDiv, zoneResults, copyBtn);
    } else if (mode === 'pace') {
        calculatePace(resultsDiv, paceTimeResults, copyBtn);
    } else if (mode === 'time') {
        calculateTime(resultsDiv, paceTimeResults, copyBtn);
    } else if (mode === 'distance') {
        calculateDistance(resultsDiv, paceTimeResults, copyBtn);
    } else if (mode === 'converter') {
        calculateConverter(resultsDiv, converterResults, copyBtn);
    }
}


// Renamed function arguments and variables for better readability

function calculateZone(resultsDiv, zoneResults, copyBtn) {
    // Renamed function arguments and variables for better readability
    const timeInput = normalizeInput(document.getElementById('time10k').value.trim());
    const errorDiv = document.getElementById('errorZone');

    if (!validateTime(timeInput)) {
        errorDiv.style.display = 'block';
        return;
    }

    const thresholdPace = calculateThresholdPace(timeInput);
    const zones = calculateZones(thresholdPace);
    const racePredictions = [
        [5, "5K"],
        [10, "10K"],
        [21.0975, "Half Marathon"],
        [42.195, "Marathon"]
    ].map(([distanceInKm, raceName]) => ({
        name: raceName,
        ...estimateRacePace(thresholdPace, distanceInKm)
    }));

    currentResults = { mode: 'zone', timeInput, thresholdPace, zones, races: racePredictions };

    document.getElementById('refTime').textContent = timeInput;
    document.getElementById('refPace').textContent = secondsToPace(thresholdPace) + '/km';

    const zonesHtml = zones.map(zone => `
        <div class="zone-card">
            <div class="zone-header">
                <div class="zone-name">${zone.name}</div>
                <div class="zone-pace">${zone.lower}/km – ${zone.upper}/km</div>
            </div>
            <div class="zone-desc">${zone.description}</div>
        </div>
    `).join('');
    document.getElementById('zones').innerHTML = zonesHtml;

    const racesHtml = racePredictions.map(racePrediction => {
        const totalTime = secondsToTime(racePrediction.totalSeconds);
        return `
            <div class="zone-card race-card">
                <div class="race-name">${racePrediction.name}</div>
                <div class="race-details">
                    <div class="race-pace">${racePrediction.pace}/km</div>
                    <div class="race-time">${totalTime}</div>
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('races').innerHTML = racesHtml;

    resultsDiv.style.display = 'block';
    zoneResults.classList.remove('hidden');
    copyBtn.disabled = false;
}

function calculatePace(resultsDiv, paceTimeResults, copyBtn) {
    const distanceString = normalizeInput(document.getElementById('distancePace').value.trim());
    const timeString = normalizeInput(document.getElementById('timePace').value.trim());
    const errorDiv = document.getElementById('errorPace');
    const distanceValue = parseFloat(distanceString);

    if (isNaN(distanceValue) || distanceValue <= 0 || !validateTime(timeString)) {
        errorDiv.style.display = 'block';
        return;
    }

    const totalSeconds = timeToSeconds(timeString);
    const paceSeconds = totalSeconds / distanceValue;
    const paceString = secondsToPace(paceSeconds);

    const splits = calculateSplits(paceSeconds, distanceValue);
    currentResults = { mode: 'pace', distance: distanceValue, distanceLabel: presetDistances[distanceString] || `${distanceValue} km`, time: timeString, pace: paceString, splits };

    renderPaceTimeResults(paceTimeResults, [
        { label: 'Distance', value: presetDistances[distanceString] || `${distanceValue} km` },
        { label: 'Time', value: timeString },
        { label: 'Pace', value: `${paceString}/km` }
    ], splits);

    resultsDiv.style.display = 'block';
    paceTimeResults.classList.remove('hidden');
    copyBtn.disabled = false;
}

function calculateTime(resultsDiv, paceTimeResults, copyBtn) {
    const distanceString = normalizeInput(document.getElementById('distanceTime').value.trim());
    const paceString = normalizeInput(document.getElementById('paceTime').value.trim());
    const errorDiv = document.getElementById('errorTime');
    const distanceValue = parseFloat(distanceString);

    if (isNaN(distanceValue) || distanceValue <= 0 || !validateTime(paceString, false)) {
        errorDiv.style.display = 'block';
        return;
    }

    const paceSeconds = timeToSeconds(paceString);
    const totalSeconds = paceSeconds * distanceValue;
    const totalTime = secondsToTime(totalSeconds);

    const splits = calculateSplits(paceSeconds, distanceValue);
    currentResults = { mode: 'time', distance: distanceValue, distanceLabel: presetDistances[distanceString] || `${distanceValue} km`, pace: paceString, totalTime, splits };

    renderPaceTimeResults(paceTimeResults, [
        { label: 'Distance', value: presetDistances[distanceString] || `${distanceValue} km` },
        { label: 'Pace', value: `${paceString}/km` },
        { label: 'Total Time', value: totalTime }
    ], splits);

    resultsDiv.style.display = 'block';
    paceTimeResults.classList.remove('hidden');
    copyBtn.disabled = false;
}

function calculateDistance(resultsDiv, paceTimeResults, copyBtn) {
    const timeString = normalizeInput(document.getElementById('timeDistance').value.trim());
    const paceString = normalizeInput(document.getElementById('paceDistance').value.trim());
    const errorDiv = document.getElementById('errorDistance');

    if (!validateTime(timeString) || !validateTime(paceString, false)) {
        errorDiv.style.display = 'block';
        return;
    }

    const totalSeconds = timeToSeconds(timeString);
    const paceSeconds = timeToSeconds(paceString);
    const distanceValue = totalSeconds / paceSeconds;
    const distanceLabel = distanceValue.toFixed(2) + ' km';

    const splits = calculateSplits(paceSeconds, distanceValue);
    currentResults = { mode: 'distance', time: timeString, pace: paceString, distance: distanceValue, distanceLabel, splits };

    renderPaceTimeResults(paceTimeResults, [
        { label: 'Total Time', value: timeString },
        { label: 'Pace', value: `${paceString}/km` },
        { label: 'Distance', value: distanceLabel }
    ], splits);

    resultsDiv.style.display = 'block';
    paceTimeResults.classList.remove('hidden');
    copyBtn.disabled = false;
}

function calculateConverter(resultsDiv, converterResults, copyBtn) {
    const conversionType = document.getElementById('convType').value;
    const inputString = normalizeInput(document.getElementById('convValue').value.trim());
    const activeToggle = document.querySelector('.toggle-btn.active');
    const unit = activeToggle ? activeToggle.getAttribute('data-value') : 'km';
    const errorDiv = document.getElementById('errorConverter');

    if (conversionType === 'distance') {
        const numericValue = parseFloat(inputString);
        if (isNaN(numericValue) || numericValue < 0) {
            errorDiv.style.display = 'block';
            return;
        }

        let kilometers, miles;
        if (unit === 'km') {
            kilometers = numericValue;
            miles = numericValue * 0.621371;
        } else {
            miles = numericValue;
            kilometers = numericValue * 1.60934;
        }

        const resultLabel = unit === 'km' ? `${miles.toFixed(2)} miles` : `${kilometers.toFixed(2)} km`;
        const inputLabel = unit === 'km' ? `${numericValue} km` : `${numericValue} miles`;

        currentResults = { mode: 'converter', type: 'distance', inputLabel, resultLabel };

        converterResults.innerHTML = `
            <div class="result-grid">
                <div class="result-card">
                    <div class="result-item">
                        <div class="metric-label">Input (${unit === 'km' ? 'Km' : 'Miles'})</div>
                        <div class="metric-value">${numericValue}</div>
                    </div>
                    <div class="result-item">
                        <div class="metric-label">Converted (${unit === 'km' ? 'Miles' : 'Km'})</div>
                        <div class="metric-value">${unit === 'km' ? miles.toFixed(2) : kilometers.toFixed(2)}</div>
                    </div>
                </div>
            </div>
        `;
    } else {
        if (!validateTime(inputString, false)) {
            errorDiv.style.display = 'block';
            return;
        }

        const inputSeconds = timeToSeconds(inputString);
        let resultSeconds;

        if (unit === 'km') {
            resultSeconds = inputSeconds * 1.60934;
        } else {
            resultSeconds = inputSeconds * 0.621371;
        }

        const resultPace = secondsToPace(resultSeconds);
        const inputLabel = `${inputString} /${unit}`;
        const resultLabel = `${resultPace} /${unit === 'km' ? 'mi' : 'km'}`;

        currentResults = { mode: 'converter', type: 'pace', inputLabel, resultLabel };

        converterResults.innerHTML = `
            <div class="result-grid">
                <div class="result-card">
                    <div class="result-item">
                        <div class="metric-label">Input Pace (/${unit === 'km' ? 'km' : 'mi'})</div>
                        <div class="metric-value">${inputString}</div>
                    </div>
                    <div class="result-item">
                        <div class="metric-label">Converted Pace (/${unit === 'km' ? 'mi' : 'km'})</div>
                        <div class="metric-value">${resultPace}</div>
                    </div>
                </div>
            </div>
        `;
    }

    resultsDiv.style.display = 'block';
    converterResults.classList.remove('hidden');
    copyBtn.disabled = false;
}

function renderPaceTimeResults(container, metrics, splits) {
    const splitsHtml = `
        <div class="splits-section">
            <div class="section-title">Splits</div>
            <div class="splits-table">
                <div class="split-row header">
                    <div class="split-col">Km</div>
                    <div class="split-col">Time</div>
                </div>
                ${splits.map(split => `
                    <div class="split-row">
                        <div class="split-col">${split.km}</div>
                        <div class="split-col">${split.time}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    const metricsHtml = metrics.map(metric => `
        <div class="result-item">
            <div class="metric-label">${metric.label}</div>
            <div class="metric-value">${metric.value}</div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="result-grid">
            <div class="result-card">
                ${metricsHtml}
            </div>
            ${splitsHtml}
        </div>
    `;
}


function reset() {
    document.getElementById('time10k').value = '';
    document.getElementById('distancePresetPace').value = 'custom';
    document.getElementById('distancePace').value = '';
    document.getElementById('timePace').value = '';
    document.getElementById('distancePresetTime').value = 'custom';
    document.getElementById('distanceTime').value = '';
    document.getElementById('paceTime').value = '';
    document.getElementById('timeDistance').value = '';
    document.getElementById('paceDistance').value = '';
    document.getElementById('convValue').value = '';
    hideAllErrors();
    document.getElementById('successMsg').style.display = 'none';
    resetResultsDisplay();
    document.getElementById('copyBtn').disabled = true;
    currentResults = null;
    updateDistanceInput(document.getElementById('calcMode').value);
}

function copyResults() {
    if (!currentResults) return;

    let text = '';
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
            const totalTime = secondsToTime(r.totalSeconds);
            text += `${r.name}: ${r.pace}/km (${totalTime})\n`;
        });
    } else if (currentResults.mode === 'pace') {
        const { distance, distanceLabel, time, pace, splits } = currentResults;
        text = `Maratona - PACE CALCULATOR\n\n`;
        text += `Distance: ${distance}\n`;
        text += `Time: ${time}\n`;
        text += `Pace: ${pace}/km\n`;
        if (splits) {
            text += `\nSPLITS\n`;
            splits.forEach(s => {
                text += `Km ${s.km}: ${s.time}\n`;
            });
        }
    } else if (currentResults.mode === 'time') {
        const { distanceLabel, pace, totalTime, splits } = currentResults;
        text = `Maratona - TIME CALCULATOR\n\n`;
        text += `Distance: ${distanceLabel}\n`;
        text += `Pace: ${pace}/km\n`;
        text += `Total Time: ${totalTime}\n`;
        if (splits) {
            text += `\nSPLITS\n`;
            splits.forEach(s => {
                text += `Km ${s.km}: ${s.time}\n`;
            });
        }
    } else if (currentResults.mode === 'distance') {
        const { time, pace, distanceLabel, splits } = currentResults;
        text = `Maratona - DISTANCE CALCULATOR\n\n`;
        text += `Total Time: ${time}\n`;
        text += `Pace: ${pace}/km\n`;
        text += `Distance: ${distanceLabel}\n`;
        if (splits) {
            text += `\nSPLITS\n`;
            splits.forEach(s => {
                text += `Km ${s.km}: ${s.time}\n`;
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

document.getElementById('calcMode').addEventListener('change', function () {
    const mode = this.value;
    document.getElementById('zoneInputs').classList.add('hidden');
    document.getElementById('paceInputs').classList.add('hidden');
    document.getElementById('timeInputs').classList.add('hidden');
    document.getElementById('distanceInputs').classList.add('hidden');
    document.getElementById('converterInputs').classList.add('hidden');

    if (mode === 'zone') {
        document.getElementById('zoneInputs').classList.remove('hidden');
    } else if (mode === 'pace') {
        document.getElementById('paceInputs').classList.remove('hidden');
    } else if (mode === 'time') {
        document.getElementById('timeInputs').classList.remove('hidden');
    } else if (mode === 'distance') {
        document.getElementById('distanceInputs').classList.remove('hidden');
    } else if (mode === 'converter') {
        document.getElementById('converterInputs').classList.remove('hidden');
        updateConverterLabel();
    }
    reset();
});

function updateConverterLabel() {
    const type = document.getElementById('convType').value;
    const label = document.querySelector('label[for="convValue"]');
    if (type === 'distance') {
        label.textContent = 'Distance';
    } else {
        label.textContent = 'Pace (MM:SS)';
    }
}

document.getElementById('convType').addEventListener('change', updateConverterLabel);

document.getElementById('distancePresetPace').addEventListener('change', function () {
    updateDistanceInput('pace');
});

document.getElementById('distancePresetTime').addEventListener('change', function () {
    updateDistanceInput('time');
});

document.addEventListener('DOMContentLoaded', function () {
    initCustomDropdowns();
    updateDistanceInput(document.getElementById('calcMode').value);
});

document.getElementById('time10k').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') calculate();
});
document.getElementById('distancePace').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') calculate();
});
document.getElementById('timePace').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') calculate();
});
document.getElementById('distanceTime').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') calculate();
});
document.getElementById('paceTime').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') calculate();
});
document.getElementById('timeDistance').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') calculate();
});
document.getElementById('paceDistance').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') calculate();
});
document.getElementById('convValue').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') calculate();
});

// Toggle Button Logic
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        // Remove active class from siblings
        this.parentElement.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        this.classList.add('active');
    });
});
