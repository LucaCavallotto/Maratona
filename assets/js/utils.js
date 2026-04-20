export const presetDistances = {
    '5': '5K',
    '10': '10K',
    '21.0975': 'Half Marathon',
    '42.195': 'Marathon'
};

export function normalizeInput(str) {
    return str.replace(',', '.');
}

export function validateTime(timeStr, allowHours = true) {
    if (!timeStr || typeof timeStr !== 'string') return false;

    // Ensure the string only contains digits and colons
    if (!/^[\d:]+$/.test(timeStr)) return false;

    const parts = timeStr.split(':');
    if (!allowHours && parts.length !== 2) return false;
    if (allowHours && (parts.length !== 2 && parts.length !== 3)) return false;

    // Every part must have at least 1 digit.
    for (let i = 0; i < parts.length; i++) {
        if (parts[i].length === 0) return false;
    }

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

export function timeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
}

export function secondsToPace(seconds) {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function secondsToTime(seconds) {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (seconds >= 3600) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}

export function formatTimeComponent(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return timeStr;

    // Only process if it contains colons and digits
    if (!/^[\d:]+$/.test(timeStr)) return timeStr;

    const parts = timeStr.split(':');
    // We only format if it has 2 or 3 parts (MM:SS or HH:MM:SS)
    if (parts.length < 2 || parts.length > 3) return timeStr;

    const formattedParts = parts.map(part => {
        // Pad single digits with leading zero
        if (part.length === 1 && /^\d$/.test(part)) {
            return `0${part}`;
        }
        return part;
    });

    return formattedParts.join(':');
}
