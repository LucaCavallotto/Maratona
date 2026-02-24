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
    const totalSeconds = thresholdPace * multiplier * distance;
    return { pace, totalSeconds };
}

export function calculateSplits(paceSeconds, totalDistance) {
    const splits = [];
    const fullKm = Math.floor(totalDistance);

    for (let i = 1; i <= fullKm; i++) {
        splits.push({
            km: `<span class="metric-num">${i}</span>`,
            time: `<span class="metric-num">${secondsToTime(paceSeconds * i)}</span>`
        });
    }

    if (totalDistance > fullKm) {
        splits.push({
            km: `<span class="metric-num">${parseFloat(totalDistance.toFixed(2))}</span>`,
            time: `<span class="metric-num">${secondsToTime(paceSeconds * totalDistance)}</span>`
        });
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

    return { paceSeconds, paceString, speedKmH, speedMS, splits };
}

export function calculateTimeMetrics(distanceValue, paceString) {
    const paceSeconds = timeToSeconds(paceString);
    const totalSeconds = paceSeconds * distanceValue;
    const totalTime = secondsToTime(totalSeconds);
    const splits = calculateSplits(paceSeconds, distanceValue);
    const speedKmH = (3600 / paceSeconds).toFixed(2);
    const speedMS = (1000 / paceSeconds).toFixed(2);

    return { totalSeconds, totalTime, speedKmH, speedMS, splits };
}

export function calculateDistanceMetrics(timeString, paceString) {
    const totalSeconds = timeToSeconds(timeString);
    const paceSeconds = timeToSeconds(paceString);
    const distanceValue = totalSeconds / paceSeconds;
    const distanceLabel = distanceValue.toFixed(2) + ' km';
    const splits = calculateSplits(paceSeconds, distanceValue);
    const speedKmH = (3600 / paceSeconds).toFixed(2);
    const speedMS = (1000 / paceSeconds).toFixed(2);

    return { distanceValue, distanceLabel, speedKmH, speedMS, splits };
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
