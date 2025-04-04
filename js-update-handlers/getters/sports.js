import fs from "fs";
import axios from "axios";

class ESPNDataFetcher {
  constructor() {
    this.baseUrl = "https://site.api.espn.com/apis/site/v2/sports";
    this.leagues = {
      nfl: { name: "Football", abbrev: "nfl" },
      nba: { name: "Basketball", abbrev: "nba" },
      mlb: { name: "Baseball", abbrev: "mlb" },
      nhl: { name: "Hockey", abbrev: "nhl" },
    };
    this.allData = {};
  }

  async fetchData(url) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching data from ${url}: ${error.response?.status}`,
      );
      return null;
    }
  }

  async fetchTeams(league) {
    const url = `${this.baseUrl}/${this.leagues[league].name.toLowerCase()}/${league}/teams`;
    return await this.fetchData(url);
  }

  async fetchRoster(league, teamId) {
    const url = `${this.baseUrl}/${this.leagues[league].name.toLowerCase()}/${league}/teams/${teamId}/roster`;
    return await this.fetchData(url);
  }

  async fetchRecentGames(league, teamId, limit = 5) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90);

    const startStr = startDate.toISOString().split("T")[0].replace(/-/g, "");
    const endStr = endDate.toISOString().split("T")[0].replace(/-/g, "");

    const url = `${this.baseUrl}/${this.leagues[league].name.toLowerCase()}/${league}/teams/${teamId}/schedule?dates=${startStr}-${endStr}`;
    const gamesData = await this.fetchData(url);

    if (!gamesData || !gamesData.events) return [];

    const completedGames = gamesData.events
      .filter((game) => game?.status?.type?.completed)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);

    return completedGames.map((game) => ({
      id: game.id || "",
      date: game.date || "",
      name: game.name || "",
      shortName: game.shortName || "",
      venue: game.competitions?.[0]?.venue?.fullName || "",
      scores:
        game.competitions?.[0]?.competitors?.map((comp) => ({
          team: comp.team?.displayName || "",
          score: comp.score || "",
          winner: comp.winner || false,
        })) || [],
    }));
  }

  async collectAllData() {
    for (const league of Object.keys(this.leagues)) {
      console.log(`Fetching ${league.toUpperCase()} data...`);
      this.allData[league] = { teams: [] };

      const teamsData = await this.fetchTeams(league);
      if (!teamsData?.sports?.[0]?.leagues?.[0]?.teams) continue;

      for (const team of teamsData.sports[0].leagues[0].teams) {
        const teamInfo = team.team;
        const teamId = teamInfo.id;

        console.log(`  Processing ${teamInfo.displayName}...`);

        const teamData = {
          id: teamId,
          name: teamInfo.displayName,
          abbreviation: teamInfo.abbreviation || "",
          nickname: teamInfo.nickname || "",
          location: teamInfo.location || "",
          logo: teamInfo.logos?.[0]?.href || "",
          colors: teamInfo.colors || [],
          record: teamInfo.record?.items?.[0]?.summary || "",
          links: teamInfo.links || [],
        };

        const rosterData = await this.fetchRoster(league, teamId);
        if (rosterData?.athletes) {
          teamData.roster = rosterData.athletes.flatMap((athlete) =>
            athlete?.items?.map((player) => ({
              id: player.id || "",
              fullName: player.fullName || "",
              jersey: player.jersey || "",
              position: player.position?.abbreviation || "",
              headshot: player.headshot?.href || "",
              height: player.height || "",
              weight: player.weight || "",
              age: player.age || "",
              experience: player.experience?.years || 0,
            })),
          );
        }

        teamData.recent_games = await this.fetchRecentGames(league, teamId);

        this.allData[league].teams.push(teamData);

        await new Promise((resolve) => setTimeout(resolve, 200)); // Delay to prevent rate limits
      }

      console.log(`Completed ${league.toUpperCase()} data collection`);
    }
  }

  saveToJson(filename = "espn_sports_data.json") {
    fs.writeFileSync(filename, JSON.stringify(this.allData, null, 2), "utf-8");
    console.log(`Data saved to ${filename}`);
  }
}

export async function GetSportsData() {
  const fetcher = new ESPNDataFetcher();
  const startTime = Date.now();

  await fetcher.collectAllData();
  console.log(
    "Sports data collection completed in",
    Date.now() - startTime,
    "ms",
  );

  return {
    data: fetcher.allData,
    updated: new Date().toISOString(),
  };
}
