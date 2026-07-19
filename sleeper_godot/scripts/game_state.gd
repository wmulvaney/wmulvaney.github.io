extends Node
## Autoloaded as `Game`. Owns the athlete's state, the day loop, training,
## games, and saving. Ported from the web build's engine.js.

signal state_changed
signal toast(msg: String, good: bool)

const SAVE_PATH := "user://sleeper_save.json"

var S: Dictionary = {}
var rng := RandomNumberGenerator.new()

func _ready() -> void:
	rng.randomize()
	if not load_game():
		new_game("You", ["basketball", "soccer", "track"])

# ---------------- lifecycle ----------------

func new_game(pname: String, youth_sports: Array) -> void:
	var attrs := {}
	for k in GameData.PHYS_KEYS:
		attrs[k] = 18.0 + rng.randf_range(0.0, 6.0)
	for sport_id in GameData.SPORTS:
		for skill in GameData.SPORTS[sport_id]["skills"]:
			attrs[skill] = 10.0 + rng.randf_range(0.0, 5.0)
	S = {
		"name": pname,
		"age": 8,
		"day": 1,
		"year_day": 1,
		"era": "youth",
		"youth_sports": youth_sports,
		"main_sport": "",
		"position": "",
		"attrs": attrs,
		"morale": 70.0,
		"fatigue": 20.0,
		"habit": 0.0,
		"rp": 30,
		"today": {
			"slept": false,
			"sleep_score": 75,
			"recovery": 70.0,
			"energy_at": Time.get_unix_time_from_system(),
			"energy": 6.0,
			"regen": SleepModel.regen_per_minute(75),
		},
		"season": {"games": 0, "wins": 0, "losses": 0},
		"career": {"games": 0, "wins": 0, "seasons": []},
		"history": [],
		"import_queue": [],
		"sync": {"url": "", "token": "", "last_date": ""},
		"retired": false,
	}
	save_game()
	state_changed.emit()

func save_game() -> void:
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(S))

func load_game() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var f := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if f == null:
		return false
	var parsed = JSON.parse_string(f.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY or not parsed.has("attrs"):
		return false
	S = parsed
	return true

# ---------------- energy (sleep-only economy) ----------------

func sync_energy() -> void:
	var now := Time.get_unix_time_from_system()
	var t: Dictionary = S["today"]
	var minutes: float = maxf(0.0, (now - float(t["energy_at"])) / 60.0)
	t["energy"] = minf(SleepModel.ENERGY_CAP, float(t["energy"]) + minutes * float(t["regen"]))
	t["energy_at"] = now

func energy() -> float:
	sync_energy()
	return float(S["today"]["energy"])

func spend_energy(amount: float) -> bool:
	sync_energy()
	if float(S["today"]["energy"]) < amount:
		return false
	S["today"]["energy"] = float(S["today"]["energy"]) - amount
	return true

# ---------------- sleep / new day ----------------

func sleep_night() -> Dictionary:
	var night: Dictionary
	var q: Array = S["import_queue"]
	if q.size() > 0:
		night = q.pop_front()
	else:
		night = SleepModel.simulate_night(float(S["habit"]), 0.0, rng)
	var score := SleepModel.score_night(night, int(S["age"]))
	var t: Dictionary = S["today"]
	t["slept"] = true
	t["sleep_score"] = score
	t["recovery"] = clampf(score * 0.7 + (100.0 - float(S["fatigue"])) * 0.3, 5.0, 100.0)
	t["energy"] = SleepModel.energy_from_sleep(score)
	t["energy_at"] = Time.get_unix_time_from_system()
	t["regen"] = SleepModel.regen_per_minute(score)
	S["fatigue"] = maxf(0.0, float(S["fatigue"]) - score / 6.0)
	S["habit"] = clampf(float(S["habit"]) + (1.0 if score >= 75 else -0.5), -20.0, 20.0)
	_advance_day()
	save_game()
	state_changed.emit()
	return {"score": score, "night": night, "recovery": t["recovery"], "energy": t["energy"]}

func _advance_day() -> void:
	S["day"] = int(S["day"]) + 1
	S["year_day"] = int(S["year_day"]) + 1
	var year_len: int = GameData.YEAR_DAYS[S["era"]]
	if int(S["year_day"]) > year_len:
		S["year_day"] = 1
		S["age"] = int(S["age"]) + 1
		_end_of_season()
		var new_era: String = GameData.era_of_age(int(S["age"]))
		if new_era != S["era"]:
			S["era"] = new_era
			if new_era == "hs" and String(S["main_sport"]) == "":
				S["main_sport"] = _best_youth_sport()
				toast.emit("Committed to %s!" % GameData.SPORTS[S["main_sport"]]["name"], true)
			if new_era == "college" and String(S["position"]) == "":
				S["position"] = _best_position()

func _end_of_season() -> void:
	var season: Dictionary = S["season"]
	if int(season["games"]) > 0:
		S["career"]["seasons"].append(season.duplicate())
		S["career"]["games"] = int(S["career"]["games"]) + int(season["games"])
		S["career"]["wins"] = int(S["career"]["wins"]) + int(season["wins"])
	S["season"] = {"games": 0, "wins": 0, "losses": 0}

func _best_youth_sport() -> String:
	var best := "basketball"
	var best_v := -1.0
	for sid in S["youth_sports"]:
		if not GameData.SPORTS.has(sid):
			continue
		var v := 0.0
		for skill in GameData.SPORTS[sid]["skills"]:
			v += float(S["attrs"].get(skill, 0.0))
		if v > best_v:
			best_v = v
			best = sid
	return best

func _best_position() -> String:
	var sport: Dictionary = GameData.SPORTS[S["main_sport"]]
	var best := ""
	var best_v := -1.0
	for pid in sport["positions"]:
		var v := _weighted_rating(sport["positions"][pid]["weights"])
		if v > best_v:
			best_v = v
			best = pid
	return best

# ---------------- training ----------------

func drill_attr(drill: Dictionary) -> String:
	var attr := String(drill["attr"])
	if attr.begins_with("@skill"):
		var sport_id := active_sport()
		var skills: Array = GameData.SPORTS[sport_id]["skills"].keys()
		var idx := int(attr.substr(6))
		return skills[idx % skills.size()]
	return attr

func train(drill: Dictionary) -> Dictionary:
	if not S["today"]["slept"]:
		return {"error": "Sleep first — every day starts in bed."}
	if not spend_energy(float(drill["energy"])):
		return {"error": "Out of energy — it refills through the day, faster after good sleep."}
	var attr := drill_attr(drill)
	var mult := SleepModel.recovery_mult(float(S["today"]["recovery"]))
	var youth_bonus := 1.0
	if S["era"] == "youth":
		for sid in S["youth_sports"]:
			var grow: Dictionary = GameData.YOUTH_SPORTS.get(sid, {}).get("grow", {})
			youth_bonus *= float(grow.get(attr, 1.0))
	var age_curve: float = clampf(1.6 - float(S["age"]) / 30.0, 0.55, 1.6)
	var gain: float = float(drill["base"]) * mult * youth_bonus * age_curve * rng.randf_range(0.8, 1.2)
	S["attrs"][attr] = minf(99.0, float(S["attrs"].get(attr, 10.0)) + gain)
	S["fatigue"] = minf(100.0, float(S["fatigue"]) + float(drill["energy"]) * 2.5)
	save_game()
	state_changed.emit()
	return {"attr": attr, "gain": gain}

# ---------------- games ----------------

func active_sport() -> String:
	if String(S["main_sport"]) != "":
		return S["main_sport"]
	for sid in S["youth_sports"]:
		if GameData.SPORTS.has(sid):
			return sid
	return "basketball"

func _weighted_rating(weights: Dictionary) -> float:
	var total := 0.0
	var wsum := 0.0
	for k in weights:
		total += float(S["attrs"].get(k, 10.0)) * float(weights[k])
		wsum += float(weights[k])
	return total / maxf(wsum, 0.001) if wsum > 0.0 else 40.0

func overall() -> float:
	var sport: Dictionary = GameData.SPORTS[active_sport()]
	var v := 0.0
	var n := 0
	for skill in sport["skills"]:
		v += float(S["attrs"].get(skill, 10.0))
		n += 1
	for k in GameData.PHYS_KEYS:
		v += float(S["attrs"].get(k, 10.0)) * 0.5
		n += 1
	return v / maxf(float(n), 1.0) * 1.35

func play_pickup() -> Dictionary:
	if not S["today"]["slept"]:
		return {"error": "Sleep first — every day starts in bed."}
	if not spend_energy(2.0):
		return {"error": "Out of energy for a run."}
	var mult := SleepModel.recovery_mult(float(S["today"]["recovery"]))
	var sport_id := active_sport()
	var skills: Array = GameData.SPORTS[sport_id]["skills"].keys()
	var skill: String = skills[rng.randi() % skills.size()]
	var gain := 0.9 * mult * rng.randf_range(0.8, 1.3)
	S["attrs"][skill] = minf(99.0, float(S["attrs"].get(skill, 10.0)) + gain)
	S["morale"] = clampf(float(S["morale"]) + 3.0, 0.0, 100.0)
	S["fatigue"] = minf(100.0, float(S["fatigue"]) + 4.0)
	var you := roundi(overall() / 8.0 + rng.randf_range(0.0, 4.0))
	var them := roundi(overall() / 9.0 + rng.randf_range(0.0, 5.0))
	save_game()
	state_changed.emit()
	return {"skill": skill, "gain": gain, "you": maxi(you, them + 1) if rng.randf() < 0.55 else you, "them": them}

func play_league_game() -> Dictionary:
	if not S["today"]["slept"]:
		return {"error": "Sleep first — game day starts with rest."}
	if not spend_energy(4.0):
		return {"error": "Not enough energy for a full game (need 4)."}
	var rating := overall()
	if String(S["position"]) != "":
		var sport: Dictionary = GameData.SPORTS[S["main_sport"]]
		rating = rating * 0.6 + _weighted_rating(sport["positions"][S["position"]]["weights"]) * 0.55
	var recovery := float(S["today"]["recovery"])
	var perf := rating * (0.75 + recovery / 280.0) * (1.0 - float(S["fatigue"]) / 450.0)
	perf *= rng.randf_range(0.82, 1.18)
	var opp_base := {"youth": 20.0, "hs": 38.0, "college": 53.0, "pro": 64.0}[S["era"]]
	var opp: float = opp_base + float(S["age"]) * 0.8 + rng.randf_range(-6.0, 8.0)
	var win := perf > opp
	var you_score := roundi(perf / 2.2 + rng.randf_range(0.0, 6.0))
	var them_score := roundi(opp / 2.2 + rng.randf_range(0.0, 6.0))
	if win and you_score <= them_score:
		you_score = them_score + 1 + rng.randi() % 3
	if not win and them_score <= you_score:
		them_score = you_score + 1 + rng.randi() % 3
	var season: Dictionary = S["season"]
	season["games"] = int(season["games"]) + 1
	if win:
		season["wins"] = int(season["wins"]) + 1
	else:
		season["losses"] = int(season["losses"]) + 1
	S["morale"] = clampf(float(S["morale"]) + (4.0 if win else -2.0), 0.0, 100.0)
	S["fatigue"] = minf(100.0, float(S["fatigue"]) + 9.0)
	save_game()
	state_changed.emit()
	return {"win": win, "you": you_score, "them": them_score, "perf": perf}

# ---------------- device sync (native HTTPS, no webview) ----------------

func queue_nights(nights: Array) -> int:
	var added := 0
	var last := String(S["sync"]["last_date"])
	for n in nights:
		if typeof(n) != TYPE_DICTIONARY or not n.has("date"):
			continue
		if last != "" and String(n["date"]) <= last:
			continue
		S["import_queue"].append(n)
		S["sync"]["last_date"] = n["date"]
		added += 1
	if added > 0:
		save_game()
		state_changed.emit()
	return added
