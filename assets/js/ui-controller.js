import { presetDistances } from './utils.js';

export const UIState = {
    isCalculated: false,
    currentResults: null
};

export function initCustomDropdowns() {
    const dropdowns = document.querySelectorAll('.custom-dropdown');
    const overlay = document.getElementById('dropdownOverlay');

    if (!dropdowns.length) return;

    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.custom-dropdown-toggle');
        const menu = dropdown.querySelector('.custom-dropdown-menu');
        const hiddenSelect = dropdown.nextElementSibling;

        toggle.addEventListener('click', function (e) {
            e.stopPropagation();

            document.querySelectorAll('.custom-dropdown-menu.show').forEach(otherMenu => {
                if (otherMenu !== menu) {
                    otherMenu.classList.remove('show');
                    if (otherMenu.parentElement) {
                        otherMenu.parentElement.querySelector('.custom-dropdown-toggle').classList.remove('open');
                    }
                }
            });

            const isOpening = !menu.classList.contains('show');
            menu.classList.toggle('show');
            toggle.classList.toggle('open');
            toggle.setAttribute('aria-expanded', isOpening);

            if (isOpening) {
                toggle.focus(); // Force focus capture when opening via mouse
            }

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
        let focusedItemIndex = -1;
        const items = Array.from(menu.querySelectorAll('.custom-dropdown-item'));

        // Reset and set initial focus when opening
        toggle.addEventListener('click', function () {
            if (menu.classList.contains('show')) {
                focusedItemIndex = items.findIndex(item => item.classList.contains('selected'));
                if (focusedItemIndex === -1 && items.length > 0) focusedItemIndex = 0;

                items.forEach((item, index) => {
                    item.classList.toggle('focused', index === focusedItemIndex);
                    if (index === focusedItemIndex) {
                        setTimeout(() => item.scrollIntoView({ block: 'nearest' }), 10);
                    }
                });
            } else {
                items.forEach(item => item.classList.remove('focused'));
                focusedItemIndex = -1;
            }
        });

        toggle.addEventListener('keydown', function (e) {
            const isOpen = menu.classList.contains('show');

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation(); // Prevent global shortcuts (like calculate) from receiving this and blurring the input
                if (isOpen && focusedItemIndex >= 0) {
                    items[focusedItemIndex].click();
                    toggle.focus(); // Return focus to toggle
                } else {
                    this.click();
                }
            } else if (e.key === 'Escape') {
                if (isOpen) {
                    e.preventDefault();
                    e.stopPropagation();
                    menu.classList.remove('show');
                    toggle.classList.remove('open');
                    if (overlay) overlay.classList.remove('show');
                    toggle.setAttribute('aria-expanded', 'false');
                    items.forEach(item => item.classList.remove('focused'));
                    toggle.focus();
                }
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Tab') {
                e.stopPropagation();
                if (isOpen) {
                    e.preventDefault(); // Prevent page scrolling or tabbing away to background elements

                    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
                        focusedItemIndex = (focusedItemIndex + 1) % items.length;
                    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
                        focusedItemIndex = (focusedItemIndex - 1 + items.length) % items.length;
                    }

                    items.forEach((item, index) => {
                        if (index === focusedItemIndex) {
                            item.classList.add('focused');
                            item.scrollIntoView({ block: 'nearest' });
                        } else {
                            item.classList.remove('focused');
                        }
                    });
                } else if (e.key === 'ArrowDown') {
                    // Open dropdown if closed
                    e.preventDefault();
                    this.click();
                }
            }
        });
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.custom-dropdown')) {
            document.querySelectorAll('.custom-dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
                if (menu.parentElement) {
                    menu.parentElement.querySelector('.custom-dropdown-toggle').classList.remove('open');
                }
                overlay.classList.remove('show');
            });
        }
    });

    if (overlay) {
        overlay.addEventListener('click', function () {
            document.querySelectorAll('.custom-dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
                if (menu.parentElement) {
                    menu.parentElement.querySelector('.custom-dropdown-toggle').classList.remove('open');
                }
            });
            overlay.classList.remove('show');
        });
    }
}

export function hideAllErrors() {
    document.querySelectorAll('.error-text').forEach(e => e.style.display = 'none');
}

export function resetResultsDisplay() {
    const resultsDiv = document.getElementById('results');
    const zoneResults = document.getElementById('zoneResults');
    const paceTimeResults = document.getElementById('paceTimeResults');
    const converterResults = document.getElementById('converterResults');

    if (resultsDiv) resultsDiv.style.display = 'none';
    if (zoneResults) zoneResults.classList.add('hidden');
    if (paceTimeResults) paceTimeResults.classList.add('hidden');
    if (converterResults) converterResults.classList.add('hidden');
}

export function updateDistanceInput(mode) {
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

export function updateConverterLabel() {
    const type = document.getElementById('convType').value;
    const label = document.querySelector('label[for="convValue"]');
    if (type === 'distance') {
        label.textContent = 'Distance';
    } else {
        label.textContent = 'Pace (MM:SS)';
    }
}

export function setLoadingState(isLoading, btnId) {
    const calcBtn = document.getElementById(btnId);
    if (!calcBtn) return;

    if (isLoading) {
        calcBtn.dataset.originalText = calcBtn.textContent;
        calcBtn.innerHTML = '<span class="spinner"></span>';
        calcBtn.disabled = true;
    } else {
        calcBtn.textContent = calcBtn.dataset.originalText || 'Calculate';
        calcBtn.disabled = false;
    }
}

export async function triggerSlideTransition(appLayout) {
    if (!appLayout.classList.contains('state-results')) {
        appLayout.classList.add('state-results');
        await new Promise(r => setTimeout(r, 600));
    }
}

export async function clearOldResults(appLayout) {
    if (appLayout.classList.contains('results-ready')) {
        appLayout.classList.remove('results-ready');
        await new Promise(r => setTimeout(r, 400));
    }
}

export function showResultsGrid(appLayout) {
    // Force DOM layout recalculation so display: block propagates before opacity fades in
    void appLayout.offsetWidth;

    appLayout.classList.add('results-ready');
    UIState.isCalculated = true;

    document.getElementById('copyBtn').disabled = false;
    document.getElementById('resetBtn').disabled = false;
}

export function renderPaceTimeResults(container, metrics, splits) {
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

    const iconMap = {
        'Distance': '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z"/></svg>',
        'Pace': '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a8.994 8.994 0 007.03-14.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>',
        'Time': '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>',
        'Speed': '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M22 13h-4v9H6v-9H2L12 2z"/></svg>',
        'Total Time': '<svg class="icon-svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>'
    };

    const metricsHtml = metrics.map(metric => {
        const valueNum = typeof metric.value === 'object' ? metric.value.num : metric.value;
        const valueUnit = typeof metric.value === 'object' ? metric.value.unit : '';
        const subValNum = metric.subValue && typeof metric.subValue === 'object' ? metric.subValue.num : metric.subValue;
        const subValUnit = metric.subValue && typeof metric.subValue === 'object' ? metric.subValue.unit : '';
        const icon = iconMap[metric.label] || '';

        return `
        <div class="result-item">
            <div class="metric-label">
                ${icon}
                ${metric.label}
            </div>
            <div class="metric-value">
                <span class="metric-num">${valueNum}</span><span class="metric-unit">${valueUnit}</span>
                ${metric.subValue ? `<span class="metric-sub-value"><span class="metric-num">${subValNum}</span><span class="metric-unit">${subValUnit}</span></span>` : ''}
            </div>
        </div>
    `}).join('');

    container.innerHTML = `
        <div class="result-grid">
            <div class="result-card">
                ${metricsHtml}
            </div>
            ${splitsHtml}
        </div>
    `;

    document.getElementById('results').style.display = 'block';
    container.classList.remove('hidden');
}

export function resetUI() {
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
    document.getElementById('resetBtn').disabled = true;
    document.getElementById('calculateBtn').disabled = false;

    UIState.currentResults = null;
    UIState.isCalculated = false;

    updateDistanceInput(document.getElementById('calcMode').value);

    const appLayout = document.querySelector('.app-layout');
    if (appLayout) {
        appLayout.classList.remove('state-results', 'results-ready');
    }
}

export function switchCalcMode(mode) {
    // Toggle Calculator Bodies
    document.getElementById('zoneInputs').classList.add('hidden');
    document.getElementById('paceInputs').classList.add('hidden');
    document.getElementById('timeInputs').classList.add('hidden');
    document.getElementById('distanceInputs').classList.add('hidden');
    document.getElementById('converterInputs').classList.add('hidden');

    // Toggle Header Hints
    document.querySelectorAll('.input-hint').forEach(hint => hint.classList.add('hidden'));

    if (mode === 'zone') {
        document.getElementById('zoneInputs').classList.remove('hidden');
        document.getElementById('hintZone').classList.remove('hidden');
    } else if (mode === 'pace') {
        document.getElementById('paceInputs').classList.remove('hidden');
        document.getElementById('hintPace').classList.remove('hidden');
    } else if (mode === 'time') {
        document.getElementById('timeInputs').classList.remove('hidden');
        document.getElementById('hintTime').classList.remove('hidden');
    } else if (mode === 'distance') {
        document.getElementById('distanceInputs').classList.remove('hidden');
        document.getElementById('hintDistance').classList.remove('hidden');
    } else if (mode === 'converter') {
        document.getElementById('converterInputs').classList.remove('hidden');
        document.getElementById('hintConverter').classList.remove('hidden');
        updateConverterLabel();
    }
    resetUI();
}
