import { useEffect, useState } from "react";
import "./App.css";

const MIN_DATE = "2026-08-01";
const MAX_DATE = getLocalDate();

const LEAGUES = [
  { id: "PL", name: "Premier League" },
  { id: "PD", name: "La Liga" },
  { id: "BL1", name: "Bundesliga" },
  { id: "SA", name: "Serie A" },
  { id: "FL1", name: "Ligue 1" },
  { id: "CL", name: "Champions League" }
];

function getLocalDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function App() {
  const [date, setDate] = useState(getLocalDate());
  const [fixtures, setFixtures] = useState([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [error, setError] = useState("");
  const [league, setLeague] = useState("PL");
  const [standings, setStandings] = useState([]);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [standingsError, setStandingsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFixtures() {
      setLoadingFixtures(true);
      setError("");
      setFixtures([]);

      try {
        const params = new URLSearchParams({ date, league });
        const res = await fetch(`/api/fixtures?${params}`);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || `Match request failed (${res.status})`
          );
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
          throw new Error("Unexpected match response from server");
        }

        if (!cancelled) {
          setFixtures(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Could not load matches");
        }
      } finally {
        if (!cancelled) {
          setLoadingFixtures(false);
        }
      }
    }

    loadFixtures();

    return () => {
      cancelled = true;
    };
  }, [date, league]);

  useEffect(() => {
    let cancelled = false;

    async function loadStandings() {
      setLoadingStandings(true);
      setStandingsError("");
      setStandings([]);

      try {
        const params = new URLSearchParams({ league });

        const res = await fetch(`/api/standings?${params}`);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));

          throw new Error(
            body.error || `Standings request failed (${res.status})`
          );
        }

        const data = await res.json();

        if (!Array.isArray(data.standings)) {
          throw new Error("Unexpected standings response from server");
        }

        if (!cancelled) {
          setStandings(data.standings);
        }

      } catch (err) {
        if (!cancelled) {
          setStandingsError(
            err.message || "Could not load standings"
          );
        }

      } finally {
        if (!cancelled) {
          setLoadingStandings(false);
        }
      }
    }

    loadStandings();

    return () => {
      cancelled = true;
    };
  }, [league]);

  function changeDate(days) {
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + days);

    const year = next.getFullYear();
    const month = String(next.getMonth() + 1).padStart(2, "0");
    const day = String(next.getDate()).padStart(2, "0");
    const nextDate = `${year}-${month}-${day}`;

    if (nextDate >= MIN_DATE && nextDate <= MAX_DATE) {
      setDate(nextDate);
    }
  }

  const formattedDate = new Date(`${date}T12:00:00`)
    .toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  function formatTime(utcDate) {
    if (!utcDate) return "Time unavailable";

    return new Date(utcDate).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatus(match) {
    switch (match.status) {
      case "IN_PLAY":
        return "Live";
      case "PAUSED":
        return "Half-Time";
      case "FINISHED":
        return "Full-Time";
      case "SCHEDULED":
      case "TIMED":
        return "Scheduled";
      case "POSTPONED":
        return "Postponed";
      case "CANCELLED":
        return "Cancelled";
      case "SUSPENDED":
        return "Suspended";
      case "AWARDED":
        return "Awarded";
      default:
        return match.status || "Status unavailable";
    }
  }

  const leagueName =
    LEAGUES.find((item) => item.id === league)?.name || "Football";

  const leagueLogo =
    "./src/assets/"+(LEAGUES.find((item) => item.id === league)?.name || "Football")+".png";

  return (
    <main className="dashboard">

      <header className="main-bar">
        <div class="main-bar-content">
          <h1>CLUB</h1>
          <img src="./src/assets/icon.png"></img>
          <h1>CHAMPS</h1>
        </div>
      </header>

      <nav className="league-navbar" aria-label="Football leagues">
        {LEAGUES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`league-tab ${
              league === item.id ? "active" : ""
            }`}
            onClick={() => setLeague(item.id)}
            aria-pressed={league === item.id}
          >
            {item.name}
          </button>
        ))}
      </nav>

      <h2>
        ⠀
      </h2>

      <section className="panel">

        <div className="date-section">
          <h2>
            <img src={leagueLogo} alt="" style={{verticalAlign: "middle"}} />
          </h2>

          <div className="date-navigation">
            <button
              onClick={() => changeDate(-1)}
              disabled={date <= MIN_DATE}
            >
              ⮜
            </button>

            <input
              type="date"
              min={MIN_DATE}
              max={MAX_DATE}
              value={date}
              onChange={(e) => {
                if (
                  e.target.value &&
                  e.target.value >= MIN_DATE &&
                  e.target.value <= MAX_DATE
                ) {
                  setDate(e.target.value);
                }
              }}
              aria-label="Select fixture date"
            />

            <button
              onClick={() => changeDate(1)}
              disabled={date >= MAX_DATE}
            >
              ⮞
            </button>
          </div>

          <p className="selected-date">{formattedDate}</p>
        </div>

        <div className="dashboard-columns">

          <div className="fixtures-column">

            <div className="fixtures-heading">
              <h2> {leagueName} Matches</h2>

              {!loadingFixtures && !error && (
                <span className="fixture-count">
                  {fixtures.length} Matches
                </span>
              )}
            </div>

            {loadingFixtures && <p>Loading...</p>}

            {error && <p className="error">{error}</p>}

            {!loadingFixtures && !error && fixtures.length === 0 && (
              <p>No {leagueName} match fixtures found for this date.</p>
            )}

            {!loadingFixtures && !error && fixtures.length > 0 && (
              <div className="fixtures-list">
                {fixtures.map((match) => {
                  const homeScore = match.score?.fullTime?.home;
                  const awayScore = match.score?.fullTime?.away;

                  const hasScore =
                    homeScore != null && awayScore != null;

                  return (
                    <article className="fixture-card" key={match.id}>

                      <div className="fixture-meta">
                        <span>{formatTime(match.utcDate)}</span>

                        <span className={`match-status ${
                          ["IN_PLAY", "PAUSED"].includes(match.status)
                            ? "live"
                            : ""
                        }`}>
                          {getStatus(match)}
                        </span>
                      </div>

                      <div className="fixture-teams">

                        <div className="fixture-team">
                          {match.homeTeam?.crest ? (
                            <img src={match.homeTeam.crest} alt="" />
                          ) : (
                            <div className="crest-placeholder">
                              {match.homeTeam?.name?.charAt(0) || "H"}
                            </div>
                          )}

                          <span>
                            {match.homeTeam?.name || "Home team"}
                          </span>
                        </div>

                        <div className="fixture-score">
                          {hasScore
                            ? `${homeScore} - ${awayScore}`
                            : "vs"}
                        </div>

                        <div className="fixture-team away-team">
                          <span>
                            {match.awayTeam?.name || "Away team"}
                          </span>

                          {match.awayTeam?.crest ? (
                            <img src={match.awayTeam.crest} alt="" />
                          ) : (
                            <div className="crest-placeholder">
                              {match.awayTeam?.name?.charAt(0) || "A"}
                            </div>
                          )}
                        </div>

                      </div>

                      <div className="fixture-footer">
                        {match.competition?.name || leagueName}
                        {match.matchday != null
                          ? ` · Matchday ${match.matchday}`
                          : ""}
                      </div>

                    </article>
                  );
                })}
              </div>
            )}

          </div>

          <div className="standings-column">

            <div className="standings-heading">
              <h2>{leagueName} Standings</h2>

              {!loadingStandings && !standingsError && (
                <span className="fixture-count">
                  {standings.length} Teams
                </span>
              )}
            </div>

            {loadingStandings && <p>Loading...</p>}

            {standingsError && (
              <p className="error">{standingsError}</p>
            )}

            {!loadingStandings &&
              !standingsError &&
              standings.length === 0 && (
                <p>No standings available for this league.</p>
              )}

            {!loadingStandings &&
              !standingsError &&
              standings.length > 0 && (

                <div className="standings-table-wrapper">
                  <table className="standings-table">

                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th className="team-column">Team</th>
                        <th>MP</th>
                        <th>W</th>
                        <th>D</th>
                        <th>L</th>
                        <th>GF</th>
                        <th>GA</th>
                        <th>GD</th>
                        <th>PTS</th>
                      </tr>
                    </thead>

                    <tbody>
                      {standings.map((team) => (
                        <tr key={team.team.id}>
                          <td>{team.position}</td>

                          <td className="team-column">
                            <div className="standings-team">
                              {team.team.crest ? (
                                <img src={team.team.crest} alt="" />
                              ) : (
                                <div className="crest-placeholder">
                                  {team.team.name?.charAt(0) || "?"}
                                </div>
                              )}

                              <span>
                                {team.team.shortName || team.team.name}
                              </span>
                            </div>
                          </td>

                          <td>{team.playedGames}</td>
                          <td>{team.won}</td>
                          <td>{team.draw}</td>
                          <td>{team.lost}</td>
                          <td>{team.goalsFor}</td>
                          <td>{team.goalsAgainst}</td>

                          <td className={
                            team.goalDifference > 0
                              ? "positive-gd"
                              : team.goalDifference < 0
                              ? "negative-gd"
                              : ""
                          }>
                            {team.goalDifference > 0
                              ? `+${team.goalDifference}`
                              : team.goalDifference}
                          </td>

                          <td className="points-column">
                            {team.points}
                          </td>
                        </tr>
                      ))}
                    </tbody>

                  </table>
                </div>
              )}

          </div>

        </div>

      </section>
      
      <footer className="footer-bar">
        <div className="footer-content">
          <p>DATA PROVIDED BY football-data.org</p>
        </div>
      </footer>

    </main>
  );
}

export default App;