import fs from "fs";

const BASE_URL = "https://data-api.binance.vision/api/v3/klines";
const SYMBOL = "BTCUSDT";

async function getRealtimePattern(interval, limit) {
    const url = `${BASE_URL}?symbol=${SYMBOL}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Lỗi API Binance: ${await res.text()}`);

    const data = await res.json();
    return data.map(candle => {
        const open = parseFloat(candle[1]);
        const close = parseFloat(candle[4]);
        return open < close ? "up" : open > close ? "down" : "flat";
    });
}

function analyzePatternInHistory(patternArray, csvFilePath) {
    if (!fs.existsSync(csvFilePath)) return { totalMatches: 0, matches: [] };

    const lines = fs.readFileSync(csvFilePath, "utf8").trim().split("\n");
    const data = lines.slice(1).map(line => {
        const [, , , , direction] = line.split(",");
        return { direction };
    });

    const patternLen = patternArray.length;
    let total = 0, up = 0, down = 0, flat = 0;

    for (let i = 0; i <= data.length - patternLen - 1; i++) {
        let isMatch = true;
        for (let j = 0; j < patternLen; j++) {
            if (data[i + j].direction !== patternArray[j]) {
                isMatch = false;
                break;
            }
        }

        if (isMatch) {
            const nextCandle = data[i + patternLen];
            total++;
            if (nextCandle.direction === "up") up++;
            else if (nextCandle.direction === "down") down++;
            else flat++;
        }
    }

    return {
        pattern: patternArray.join(" "),
        length: patternLen,
        totalMatches: total,
        stats: total > 0 ? {
            upPercent: ((up / total) * 100).toFixed(2),
            downPercent: ((down / total) * 100).toFixed(2),
            flatPercent: ((flat / total) * 100).toFixed(2),
            countUp: up,
            countDown: down,
            countFlat: flat
        } : null
    };
}

export async function getPatternHistory(interval, csvFilePath) {
    const MAX_API_LIMIT = 1000;
    const fullPattern = await getRealtimePattern(interval, MAX_API_LIMIT);
    const history = [];

    for (let len = 1; len <= fullPattern.length; len++) {
        const currentPattern = fullPattern.slice(-len);
        const result = analyzePatternInHistory(currentPattern, csvFilePath);

        if (result.totalMatches === 0) {
            break;
        }

        history.push(result);
    }

    return history;
}