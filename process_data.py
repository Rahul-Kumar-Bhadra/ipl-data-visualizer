import csv
import json
import os
from collections import defaultdict

cwd = r"c:\Users\RAHUL KUMAR BHADRA\Desktop\projects\ipl data visualizer"
matches_csv = os.path.join(cwd, "matches.csv")
deliveries_csv = os.path.join(cwd, "deliveries.csv")

data = {
    "total_matches": 0,
    "total_runs": 0,
    "total_wickets": 0,
    "matches_won_by_team": {},
    "toss_decision_wins": {"bat": 0, "field": 0},
    "schedule": [], # List of some matches for schedule view
    "players": {}
}

print("Parsing matches...")
matches_data = {}
with open(matches_csv, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        match_id = row.get("id")
        data["total_matches"] += 1
        winner = row.get("winner")
        team1 = row.get("team1")
        team2 = row.get("team2")
        city = row.get("city")
        date = row.get("date")
        
        matches_data[match_id] = {
            "date": date,
            "team1": team1,
            "team2": team2,
            "winner": winner
        }
        
        # Save last 15 matches for the schedule view mock
        if data["total_matches"] <= 15:
             data["schedule"].append({
                 "date": date,
                 "match": f"{team1} vs {team2}",
                 "venue": city,
                 "result": f"{winner} won" if winner and winner != "NA" else "No Result"
             })

        if winner and winner != "NA":
            data["matches_won_by_team"][winner] = data["matches_won_by_team"].get(winner, 0) + 1
        
        toss_decision = row.get("toss_decision")
        toss_winner = row.get("toss_winner")
        if toss_winner == winner:
            if toss_decision in data["toss_decision_wins"]:
                data["toss_decision_wins"][toss_decision] += 1

# Dictionary to hold match-by-match performances: {player: {match_id: {"runs": 0, "wickets": 0, "balls": 0}}}
player_matches = defaultdict(lambda: defaultdict(lambda: {"runs": 0, "wickets": 0, "balls": 0, "runs_conceded": 0, "balls_bowled": 0}))
player_dismissals = defaultdict(int)

print("Parsing deliveries...")
with open(deliveries_csv, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        match_id = row.get("match_id", row.get("id"))
        runs = int(row.get("total_runs", 0))
        is_wicket = int(row.get("is_wicket", 0))
        batter = row.get("batter", row.get("batsman"))
        bowler = row.get("bowler")
        batsman_runs = int(row.get("batsman_runs", 0))
        dismissal_kind = row.get("dismissal_kind")
        extras = int(row.get("extra_runs", 0))
        
        data["total_runs"] += runs
        
        # Batting stats
        if batter:
            # extra runs like wides do not count as ball faced for batter
            is_wide = "wide" in row.get("extras_type", row.get("extra_type", "")).lower()
            if not is_wide:
                player_matches[batter][match_id]["balls"] += 1
            player_matches[batter][match_id]["runs"] += batsman_runs
            
            if is_wicket and dismissal_kind not in ['run out', 'retired hurt', 'obstructing the field', 'NA', '']:
                # The batter is out
                player_dismissals[row.get("player_dismissed", batter)] += 1
                
        # Bowling stats
        if bowler:
            player_matches[bowler][match_id]["runs_conceded"] += runs
            # illegal deliveries (wides, no balls) usually don't count as valid balls, but we approximate for economy
            if not row.get("extra_type", "") in ["wides", "noballs"]:
               player_matches[bowler][match_id]["balls_bowled"] += 1
                
            if is_wicket and dismissal_kind not in ['run out', 'retired hurt', 'obstructing the field', 'NA', '']:
                player_matches[bowler][match_id]["wickets"] += 1
                data["total_wickets"] += 1

print("Calculating aggregated player stats...")
for player, m_data in player_matches.items():
    total_runs = sum(m["runs"] for m in m_data.values())
    total_balls = sum(m["balls"] for m in m_data.values())
    total_wickets = sum(m["wickets"] for m in m_data.values())
    total_runs_conceded = sum(m["runs_conceded"] for m in m_data.values())
    total_balls_bowled = sum(m["balls_bowled"] for m in m_data.values())
    
    centuries = sum(1 for m in m_data.values() if m["runs"] >= 100)
    fifties = sum(1 for m in m_data.values() if 50 <= m["runs"] < 100)
    highest_score = max((m["runs"] for m in m_data.values()), default=0)
    
    dismissals = player_dismissals.get(player, 0)
    
    avg = total_runs / dismissals if dismissals > 0 else total_runs if total_runs > 0 else 0
    sr = (total_runs / total_balls) * 100 if total_balls > 0 else 0
    
    eco = (total_runs_conceded / (total_balls_bowled / 6)) if total_balls_bowled > 0 else 0
    
    data["players"][player] = {
        "runs": total_runs,
        "balls": total_balls,
        "wickets": total_wickets,
        "avg": round(avg, 2),
        "sr": round(sr, 2),
        "eco": round(eco, 2),
        "centuries": centuries,
        "fifties": fifties,
        "highest": highest_score,
        "matches": len(m_data)
    }

# Top 10 for dashboard
data["top_run_scorers"] = dict(sorted({k: v["runs"] for k, v in data["players"].items()}.items(), key=lambda item: item[1], reverse=True)[:10])
data["top_wicket_takers"] = dict(sorted({k: v["wickets"] for k, v in data["players"].items()}.items(), key=lambda item: item[1], reverse=True)[:10])
data["matches_won_by_team"] = dict(sorted(data["matches_won_by_team"].items(), key=lambda item: item[1], reverse=True))

output_file = os.path.join(cwd, "data.json")
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2)

print(f"Data successfully exported to {output_file}")
