import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 3000;

let browser = null;

console.log("USING RAIDER.IO SERVER.JS");

async function getBrowser() {
    if (!browser) {
        console.log("Starting Chromium...");

        browser = await chromium.launch({
            headless: true
        });
    }

    return browser;
}

function getTeamNameFromUrl(url) {
    const pathname = new URL(url).pathname;

    const slug = pathname
        .split("/")
        .filter(Boolean)
        .pop();

    if (!slug) {
        return "Unknown Team";
    }

    return slug
        .split("-")
        .map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(" ");
}

app.use(express.static("public"));

app.get("/extract", async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).json({
            error: "Missing url"
        });
    }

    try {
        const target = new URL(url);

        if (
            target.hostname !== "raider.io" &&
            !target.hostname.endsWith(".raider.io")
        ) {
            return res.status(403).json({
                error: "Domain not allowed"
            });
        }

        const browser = await getBrowser();

        const page = await browser.newPage({
            viewport: {
                width: 1440,
                height: 1000
            }
        });

        console.log("Loading:", url);

        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000
        });

        // Give Raider.IO's React app time to render.
        await page.waitForTimeout(5000);

        const team = await page.evaluate(() => {
            const leaves = [
                ...document.querySelectorAll("*")
            ]
                .filter(el => el.children.length === 0)
                .map(el => el.textContent?.trim())
                .filter(Boolean);

            for (let i = 0; i <= leaves.length - 4; i++) {
                const score = leaves[i + 1];
                const season = leaves[i + 2];
                const label = leaves[i + 3];

                if (
                    /^\d[\d,]*(?:\.\d+)?$/.test(score) &&
                    /Season/i.test(season) &&
                    label === "Mythic+ Score"
                ) {
                    return {
                        score,
                        season
                    };
                }
            }

            return null;
        });

        await page.close();

        if (!team) {
            console.log("Could not find team data");

            return res.status(404).json({
                error: `Could not find team data: ${url}`
            });
        }

        console.log("Team:", team);
        team.name = getTeamNameFromUrl(url);
        res.json(team);

    } catch (error) {
        console.error("Extraction failed:", error);

        res.status(500).json({
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

server.on("close", () => {
    console.log("SERVER CLOSED");
});

server.on("error", (err) => {
    console.error("SERVER ERROR:", err);
});

setInterval(() => {
    console.log("server alive");
}, 5000);

process.on("SIGINT", async () => {
    console.log("Shutting down...");

    if (browser) {
        await browser.close();
    }

    process.exit();
});