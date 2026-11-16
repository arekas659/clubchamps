import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();

const API_BASE = "https://api.football-data.org/v4";

const ALLOWED_LEAGUES = {
  PL: "Premier League",
  PD: "La Liga",
  BL1: "Bundesliga",
  SA: "Serie A",
  FL1: "Ligue 1",
  CL: "Champions League"
};

app.use(cors({ origin: "http://localhost:5173" }));

async function footballApi(path) {
  const token = process.env.FOOTBALL_DATA_API_KEY;

  if (!token) {
    throw new Error("Missing FOOTBALL_DATA_API_KEY in .env");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "X-Auth-Token": token,
    },
  });

  const body = await response.text();

  let data;

  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(
      `football-data.org returned non-JSON data ` +
      `(HTTP ${response.status}): ${body.slice(0, 300)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `football-data.org HTTP ${response.status}: ` +
      `${data.message || JSON.stringify(data).slice(0, 500)}`
    );
  }

  return data;
}

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const parsed = new Date(`${date}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

app.get("/api/fixtures", async (req, res) => {
  try {
    const date =
      req.query.date ||
      new Date().toISOString().slice(0, 10);

    const league = String(req.query.league || "PL").toUpperCase();

    if (!Object.hasOwn(ALLOWED_LEAGUES, league)) {
      return res.status(400).json({
        error: "Unsupported league code",
        allowedLeagues: ALLOWED_LEAGUES,
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({
        error: "Date must be a valid date in YYYY-MM-DD format",
      });
    }

    const nextDate = new Date(`${date}T00:00:00Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const dateTo = nextDate.toISOString().slice(0, 10);

    const params = new URLSearchParams({
      dateFrom: date,
      dateTo,
      competitions: league,
    });

    const data = await footballApi(`/matches?${params}`);

    res.json(data.matches ?? []);

  } catch (error) {
    console.error("Match data request failed:", error);

    res.status(502).json({
      error: error.message || "Could not load matches",
    });
  }
});

app.get("/api/fixtures/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "Invalid match ID",
      });
    }

    const match = await footballApi(`/matches/${id}`);

    res.json(match);
  } catch (error) {
    console.error("Match request failed:", error);

    res.status(502).json({
      error: error.message || "Could not load match details",
    });
  }
});

app.get("/api/standings", async (req, res) => {
  try {
    const league = String(req.query.league || "PL").toUpperCase();

    if (!Object.hasOwn(ALLOWED_LEAGUES, league)) {
      return res.status(400).json({
        error: "Unsupported league code",
        allowedLeagues: ALLOWED_LEAGUES,
      });
    }

    const data = await footballApi(
      `/competitions/${league}/standings`
    );

    const totalStandings = data.standings?.find(
      (standing) => standing.type === "TOTAL"
    );

    res.json({
      competition: data.competition,
      standings: totalStandings?.table ?? [],
    });

  } catch (error) {
    console.error("Standings request failed:", error);

    res.status(502).json({
      error: error.message || "Could not load standings",
    });
  }
});

app.listen(3000, () => {
  console.log("Server is running at: http://localhost:3000");
});