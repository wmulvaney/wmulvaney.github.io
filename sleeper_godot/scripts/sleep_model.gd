class_name SleepModel
## Sleep scoring + energy economy. Ported from the web build's sleep.js —
## same weights, so a night scores identically in both builds.

const ENERGY_CAP := 10.0

## duration 35%, efficiency 20%, deep 15%, REM 15%, consistency 15%
static func score_night(n: Dictionary, age: int) -> int:
	var dur_ideal := 9.5 if age < 14 else (9.0 if age < 18 else 8.0)
	var hours: float = n.get("hours", 7.5)
	var dur_score: float = clampf(1.0 - absf(hours - dur_ideal) / dur_ideal * 2.2, 0.0, 1.0)
	var eff: float = clampf((n.get("efficiency", 0.88) - 0.6) / 0.38, 0.0, 1.0)
	var deep: float = clampf(n.get("deep_pct", 0.15) / 0.22, 0.0, 1.0)
	var rem: float = clampf(n.get("rem_pct", 0.18) / 0.25, 0.0, 1.0)
	var cons: float = clampf(n.get("consistency", 0.75), 0.0, 1.0)
	var score := dur_score * 35.0 + eff * 20.0 + deep * 15.0 + rem * 15.0 + cons * 15.0
	return clampi(roundi(score), 5, 100)

static func describe_score(score: int) -> String:
	if score >= 90:
		return "Elite recovery — the engine is humming."
	if score >= 75:
		return "Well rested. Big day available."
	if score >= 60:
		return "Decent night. Pace yourself."
	if score >= 45:
		return "Rough sleep — recovery took a hit."
	return "Running on fumes. Careful today."

## A believable simulated night for players without a connected device.
static func simulate_night(habit: float, mod: float, rng: RandomNumberGenerator) -> Dictionary:
	var base := 7.2 + habit / 40.0 + mod + rng.randf_range(-1.3, 1.4)
	return {
		"hours": clampf(base, 4.2, 10.2),
		"efficiency": clampf(0.86 + habit / 400.0 + rng.randf_range(-0.08, 0.07), 0.6, 0.99),
		"deep_pct": clampf(0.16 + rng.randf_range(-0.05, 0.06), 0.05, 0.3),
		"rem_pct": clampf(0.19 + rng.randf_range(-0.05, 0.06), 0.06, 0.32),
		"consistency": clampf(0.75 + habit / 200.0 + rng.randf_range(-0.1, 0.1), 0.3, 1.0),
	}

static func energy_from_sleep(score: int) -> float:
	return float(clampi(roundi(score / 10.0), 2, int(ENERGY_CAP)))

## Energy refills through the day — faster after better sleep.
static func regen_per_minute(score: int) -> float:
	return 0.08 + (score / 100.0) * 0.42

static func recovery_mult(recovery: float) -> float:
	return clampf(0.4 + (recovery / 100.0) * 1.1, 0.4, 1.5)
