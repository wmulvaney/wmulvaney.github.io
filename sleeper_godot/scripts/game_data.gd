class_name GameData
## Static game data — sports, drills, eras. Ported from the web build's data.js.

const PHYS_KEYS := ["speed", "strength", "stamina", "agility", "vertical", "iq"]

const PHYS_NAMES := {
	"speed": "Speed", "strength": "Strength", "stamina": "Stamina",
	"agility": "Agility", "vertical": "Vertical", "iq": "Game IQ",
}

const YOUTH_SPORTS := {
	"basketball": {"name": "Basketball", "ico": "🏀", "grow": {"vertical": 1.3, "agility": 1.1}},
	"soccer": {"name": "Soccer", "ico": "⚽", "grow": {"stamina": 1.3, "speed": 1.15}},
	"football": {"name": "Football", "ico": "🏈", "grow": {"strength": 1.3, "speed": 1.1}},
	"tennis": {"name": "Tennis", "ico": "🎾", "grow": {"agility": 1.25, "iq": 1.1}},
	"swimming": {"name": "Swimming", "ico": "🏊", "grow": {"stamina": 1.35, "strength": 1.05}},
	"track": {"name": "Track", "ico": "🏃", "grow": {"speed": 1.35, "stamina": 1.1}},
}

const SPORTS := {
	"basketball": {
		"name": "Basketball", "ico": "🏀",
		"skills": {"shooting": "Shooting", "handles": "Handles", "defense": "Defense", "passing": "Passing", "finishing": "Finishing", "rebounding": "Rebounding"},
		"stat_labels": ["PTS", "AST", "REB"],
		"positions": {
			"pg": {"name": "Point Guard", "ico": "🎯", "weights": {"handles": 1.4, "passing": 1.5, "shooting": 1.1, "speed": 1.2}},
			"wing": {"name": "Wing", "ico": "🗡️", "weights": {"shooting": 1.4, "defense": 1.2, "finishing": 1.2}},
			"big": {"name": "Big", "ico": "🗼", "weights": {"rebounding": 1.5, "finishing": 1.3, "strength": 1.3}},
		},
	},
	"soccer": {
		"name": "Soccer", "ico": "⚽",
		"skills": {"finishing_s": "Finishing", "dribbling": "Dribbling", "passing_s": "Passing", "defending": "Defending", "positioning": "Positioning", "headers": "Headers"},
		"stat_labels": ["GLS", "AST", "TKL"],
		"positions": {
			"striker": {"name": "Striker", "ico": "🎯", "weights": {"finishing_s": 1.5, "positioning": 1.3, "speed": 1.2}},
			"mid": {"name": "Midfielder", "ico": "🧭", "weights": {"passing_s": 1.5, "dribbling": 1.3, "stamina": 1.3}},
			"defender": {"name": "Defender", "ico": "🛡️", "weights": {"defending": 1.5, "headers": 1.3, "strength": 1.2}},
		},
	},
	"football": {
		"name": "Football", "ico": "🏈",
		"skills": {"throwing": "Throwing", "catching": "Catching", "routes": "Routes", "blocking": "Blocking", "tackling": "Tackling", "coverage": "Coverage"},
		"stat_labels": ["YDS", "TD", "TKL"],
		"positions": {
			"qb": {"name": "Quarterback", "ico": "🎯", "weights": {"throwing": 1.6, "iq": 1.4}},
			"wr": {"name": "Receiver", "ico": "🙌", "weights": {"catching": 1.5, "routes": 1.4, "speed": 1.3}},
			"lb": {"name": "Linebacker", "ico": "🛡️", "weights": {"tackling": 1.5, "coverage": 1.2, "strength": 1.3}},
		},
	},
}

const DRILLS := [
	{"id": "sprints", "name": "Hill Sprints", "ico": "🏃", "attr": "speed", "energy": 2, "base": 1.6, "spot": "gym"},
	{"id": "lift", "name": "Strength Circuit", "ico": "🏋️", "attr": "strength", "energy": 3, "base": 1.8, "spot": "gym"},
	{"id": "conditioning", "name": "Conditioning", "ico": "🫁", "attr": "stamina", "energy": 2, "base": 1.6, "spot": "gym"},
	{"id": "ladder", "name": "Agility Ladder", "ico": "🪜", "attr": "agility", "energy": 2, "base": 1.6, "spot": "gym"},
	{"id": "plyo", "name": "Plyometrics", "ico": "🦘", "attr": "vertical", "energy": 3, "base": 1.7, "spot": "gym"},
	{"id": "film", "name": "Film Study", "ico": "🎬", "attr": "iq", "energy": 1, "base": 1.5, "spot": "school"},
	{"id": "skill_a", "name": "Skill Session A", "ico": "🎯", "attr": "@skill0", "energy": 2, "base": 1.7, "spot": "park"},
	{"id": "skill_b", "name": "Skill Session B", "ico": "🛠️", "attr": "@skill1", "energy": 2, "base": 1.7, "spot": "park"},
]

const ERAS := ["youth", "hs", "college", "pro"]

const ERA_INFO := {
	"youth": {"name": "Backyard Days", "ico": "🛝", "accent": Color(0.95, 0.62, 0.26)},
	"hs": {"name": "High School", "ico": "🎒", "accent": Color(0.29, 0.62, 0.95)},
	"college": {"name": "College", "ico": "🎓", "accent": Color(0.55, 0.42, 0.95)},
	"pro": {"name": "The League", "ico": "🏟️", "accent": Color(0.13, 0.83, 0.93)},
}

const YEAR_DAYS := {"youth": 12, "hs": 16, "college": 16, "pro": 20}

static func era_of_age(age: int) -> String:
	if age < 14:
		return "youth"
	if age < 18:
		return "hs"
	if age < 22:
		return "college"
	return "pro"
