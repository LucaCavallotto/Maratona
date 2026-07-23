import { timeToSeconds, secondsToPace, secondsToTime } from './utils.js';

export function calculateThresholdPace(time10k) {
    return timeToSeconds(time10k) / 10;
}

export function calculateZones(thresholdPace) {
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
        lowerMiles: secondsToPace((thresholdPace * upper) * 1.60934),
        upperMiles: secondsToPace((thresholdPace * lower) * 1.60934),
        description: desc
    }));
}

export function estimateRacePace(thresholdPace, distance) {
    let multiplier;
    if (distance <= 5) multiplier = 0.92;
    else if (distance <= 10) multiplier = 0.97;
    else if (distance <= 21.0975) multiplier = 1.03;
    else multiplier = 1.08;

    const pace = secondsToPace(thresholdPace * multiplier);
    const paceMiles = secondsToPace(thresholdPace * multiplier * 1.60934);
    const totalSeconds = thresholdPace * multiplier * distance;
    return { pace, paceMiles, totalSeconds };
}

export function calculateSplits(paceSeconds, totalDistance) {
    const splits = [];
    const fullKm = Math.floor(totalDistance);

    for (let i = 1; i <= fullKm; i++) {
        splits.push({
            km: `<span class="metric-num">${i}</span>`,
            pace: `<span class="metric-num">${secondsToPace(paceSeconds)}</span>`,
            time: `<span class="metric-num">${secondsToTime(paceSeconds * i)}</span>`
        });
    }

    if (totalDistance > fullKm) {
        splits.push({
            km: `<span class="metric-num">${parseFloat(totalDistance.toFixed(2))}</span>`,
            pace: `<span class="metric-num">${secondsToPace(paceSeconds)}</span>`,
            time: `<span class="metric-num">${secondsToTime(paceSeconds * totalDistance)}</span>`
        });
    }

    return splits;
}

/**
 * Calculates race pace splits based on an advanced pacing strategy.
 * 
 * @param {number} paceSeconds - Average pace in seconds per kilometer.
 * @param {number} totalDistance - Total distance in kilometers.
 * @param {Object} [strategy] - Pacing strategy parameters.
 * @param {'none'|'half'|'progressive'} [strategy.mode='none'] - Pacing strategy mode.
 * @param {number} [strategy.effortRatio=50] - Effort ratio % for 1st half of race (45-55).
 * @param {number} [strategy.paceDelta=0] - Pace decrement per km in seconds (0-5).
 * @returns {Array<{km: string, pace: string, time: string}>} Array of split objects for UI rendering.
 */
export function calculateStrategySplits(paceSeconds, totalDistance, strategy = { mode: 'none' }) {
    if (!strategy || strategy.mode === 'none') {
        return calculateSplits(paceSeconds, totalDistance);
    }

    const fullKm = Math.floor(totalDistance);
    const splits = [];

    if (strategy.mode === 'half') {
        const effortRatio = strategy.effortRatio !== undefined ? strategy.effortRatio : 50;
        const totalSeconds = paceSeconds * totalDistance;
        const dist1 = totalDistance / 2;

        const time1 = totalSeconds * (effortRatio / 100);
        const time2 = totalSeconds * (1 - effortRatio / 100);

        const pace1 = time1 / dist1;
        const pace2 = time2 / dist1;

        const getElapsedTimeAt = (d) => {
            if (d <= dist1) {
                return d * pace1;
            } else {
                return time1 + (d - dist1) * pace2;
            }
        };

        const getSegmentPace = (dStart, dEnd) => {
            const timeSpan = getElapsedTimeAt(dEnd) - getElapsedTimeAt(dStart);
            return timeSpan / (dEnd - dStart);
        };

        for (let i = 1; i <= fullKm; i++) {
            const segPace = getSegmentPace(i - 1, i);
            splits.push({
                km: `<span class="metric-num">${i}</span>`,
                pace: `<span class="metric-num">${secondsToPace(segPace)}</span>`,
                time: `<span class="metric-num">${secondsToTime(getElapsedTimeAt(i))}</span>`
            });
        }

        if (totalDistance > fullKm) {
            const segPace = getSegmentPace(fullKm, totalDistance);
            splits.push({
                km: `<span class="metric-num">${parseFloat(totalDistance.toFixed(2))}</span>`,
                pace: `<span class="metric-num">${secondsToPace(segPace)}</span>`,
                time: `<span class="metric-num">${secondsToTime(getElapsedTimeAt(totalDistance))}</span>`
            });
        }
    } else if (strategy.mode === 'progressive') {
        const delta = strategy.paceDelta !== undefined ? strategy.paceDelta : 0;
        const N = fullKm;
        const f = totalDistance - fullKm;

        const K = (N * (N - 1)) / 2 + f * N;
        const P1 = paceSeconds + (delta * K) / totalDistance;

        const getSegmentPace = (segIndex) => {
            return Math.max(1, P1 - (segIndex - 1) * delta);
        };

        let cumulativeTime = 0;
        for (let i = 1; i <= fullKm; i++) {
            const segPace = getSegmentPace(i);
            cumulativeTime += segPace;
            splits.push({
                km: `<span class="metric-num">${i}</span>`,
                pace: `<span class="metric-num">${secondsToPace(segPace)}</span>`,
                time: `<span class="metric-num">${secondsToTime(cumulativeTime)}</span>`
            });
        }

        if (f > 0) {
            const segPace = getSegmentPace(fullKm + 1);
            cumulativeTime += f * segPace;
            splits.push({
                km: `<span class="metric-num">${parseFloat(totalDistance.toFixed(2))}</span>`,
                pace: `<span class="metric-num">${secondsToPace(segPace)}</span>`,
                time: `<span class="metric-num">${secondsToTime(cumulativeTime)}</span>`
            });
        }
    }

    return splits;
}



// Extracted Calculation Blocks for clean payload generation
export function calculatePaceMetrics(distanceValue, timeString) {
    const totalSeconds = timeToSeconds(timeString);
    const paceSeconds = totalSeconds / distanceValue;
    const paceString = secondsToPace(paceSeconds);
    const splits = calculateSplits(paceSeconds, distanceValue);
    const speedKmH = (3600 / paceSeconds).toFixed(2);
    const speedMS = (1000 / paceSeconds).toFixed(2);
    const speedMpH = (speedKmH * 0.621371).toFixed(2);
    const distanceMiles = (distanceValue * 0.621371).toFixed(2);
    const paceMinMile = secondsToPace(paceSeconds * 1.60934);

    return { paceSeconds, paceString, speedKmH, speedMS, speedMpH, splits, distanceMiles, paceMinMile };
}

export function calculateTimeMetrics(distanceValue, paceString) {
    const paceSeconds = timeToSeconds(paceString);
    const totalSeconds = paceSeconds * distanceValue;
    const totalTime = secondsToTime(totalSeconds);
    const splits = calculateSplits(paceSeconds, distanceValue);
    const speedKmH = (3600 / paceSeconds).toFixed(2);
    const speedMS = (1000 / paceSeconds).toFixed(2);
    const speedMpH = (speedKmH * 0.621371).toFixed(2);
    const distanceMiles = (distanceValue * 0.621371).toFixed(2);
    const paceMinMile = secondsToPace(paceSeconds * 1.60934);

    return { totalSeconds, totalTime, speedKmH, speedMS, speedMpH, splits, distanceMiles, paceMinMile };
}

export function calculateDistanceMetrics(timeString, paceString) {
    const totalSeconds = timeToSeconds(timeString);
    const paceSeconds = timeToSeconds(paceString);
    const distanceValue = totalSeconds / paceSeconds;
    const distanceLabel = distanceValue.toFixed(2) + ' km';
    const splits = calculateSplits(paceSeconds, distanceValue);
    const speedKmH = (3600 / paceSeconds).toFixed(2);
    const speedMS = (1000 / paceSeconds).toFixed(2);
    const speedMpH = (speedKmH * 0.621371).toFixed(2);
    const distanceMiles = (distanceValue * 0.621371).toFixed(2);
    const paceMinMile = secondsToPace(paceSeconds * 1.60934);

    return { distanceValue, distanceLabel, speedKmH, speedMS, speedMpH, splits, distanceMiles, paceMinMile };
}

export function calculateConverterMetrics(numericValue, type, unit) {
    if (type === 'distance') {
        let kilometers, miles;
        if (unit === 'km') {
            kilometers = numericValue;
            miles = numericValue * 0.621371;
        } else {
            miles = numericValue;
            kilometers = numericValue * 1.60934;
        }
        return {
            kilometers: kilometers.toFixed(2),
            miles: miles.toFixed(2)
        };
    } else {
        const inputSeconds = timeToSeconds(numericValue);
        let resultSeconds;
        if (unit === 'km') {
            resultSeconds = inputSeconds * 1.60934;
        } else {
            resultSeconds = inputSeconds * 0.621371;
        }
        return { resultPace: secondsToPace(resultSeconds) };
    }
}
