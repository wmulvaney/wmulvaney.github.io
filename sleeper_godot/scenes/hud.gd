extends CanvasLayer
## HUD — status chips, toasts, the bottom panel for each building, joystick.

const BG := Color(0.055, 0.08, 0.15)
const CARD := Color(0.08, 0.11, 0.2)
const TEXT := Color(0.92, 0.94, 0.97)
const DIM := Color(0.62, 0.67, 0.76)

var chips_label: Label
var energy_label: Label
var toast_label: Label
var panel: PanelContainer
var panel_body: VBoxContainer
var joystick: Control
var _toast_tween: Tween

func _ready() -> void:
	_build_chips()
	_build_toast()
	_build_panel()
	joystick = preload("res://scenes/joystick.gd").new()
	joystick.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	joystick.position = Vector2(18, -180)
	add_child(joystick)
	Game.state_changed.connect(_refresh)
	Game.toast.connect(_on_toast)
	_refresh()

func _process(_delta: float) -> void:
	if energy_label:
		energy_label.text = "⚡ %.1f / 10" % Game.energy()

func joystick_vector() -> Vector2:
	return joystick.vector if joystick else Vector2.ZERO

func panel_open() -> bool:
	return panel.visible

# ---------------- construction ----------------

func _style(c: Color, radius: int = 14) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = c
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = 14.0
	sb.content_margin_right = 14.0
	sb.content_margin_top = 10.0
	sb.content_margin_bottom = 10.0
	return sb

func _chip(text: String) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", 15)
	l.add_theme_color_override("font_color", TEXT)
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", _style(Color(BG.r, BG.g, BG.b, 0.88)))
	p.add_child(l)
	return l

func _build_chips() -> void:
	var row := HBoxContainer.new()
	row.set_anchors_preset(Control.PRESET_TOP_WIDE)
	row.position = Vector2(12, 14)
	row.add_theme_constant_override("separation", 8)
	add_child(row)
	chips_label = _chip("")
	row.add_child(chips_label.get_parent())
	energy_label = _chip("")
	row.add_child(energy_label.get_parent())

func _build_toast() -> void:
	var wrap := PanelContainer.new()
	wrap.set_anchors_preset(Control.PRESET_CENTER_TOP)
	wrap.position = Vector2(-140, 76)
	wrap.custom_minimum_size = Vector2(280, 0)
	wrap.add_theme_stylebox_override("panel", _style(CARD))
	toast_label = Label.new()
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	toast_label.add_theme_font_size_override("font_size", 15)
	toast_label.add_theme_color_override("font_color", TEXT)
	wrap.add_child(toast_label)
	wrap.visible = false
	add_child(wrap)

func _on_toast(msg: String, _good: bool) -> void:
	var wrap := toast_label.get_parent() as Control
	toast_label.text = msg
	wrap.visible = true
	wrap.modulate.a = 1.0
	if _toast_tween:
		_toast_tween.kill()
	_toast_tween = create_tween()
	_toast_tween.tween_interval(2.2)
	_toast_tween.tween_property(wrap, "modulate:a", 0.0, 0.5)
	_toast_tween.tween_callback(func() -> void: wrap.visible = false)

func _build_panel() -> void:
	panel = PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	panel.offset_top = -420.0
	panel.offset_left = 10.0
	panel.offset_right = -10.0
	panel.offset_bottom = -10.0
	panel.add_theme_stylebox_override("panel", _style(BG, 20))
	panel.visible = false
	add_child(panel)

	var scroll := ScrollContainer.new()
	panel.add_child(scroll)
	panel_body = VBoxContainer.new()
	panel_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel_body.add_theme_constant_override("separation", 10)
	scroll.add_child(panel_body)

func _clear_panel() -> void:
	for c in panel_body.get_children():
		c.queue_free()

func _title(text: String) -> void:
	var row := HBoxContainer.new()
	panel_body.add_child(row)
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", 22)
	l.add_theme_color_override("font_color", TEXT)
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(l)
	var x := Button.new()
	x.text = "✕"
	x.add_theme_font_size_override("font_size", 18)
	x.pressed.connect(close_panel)
	row.add_child(x)

func _note(text: String) -> Label:
	var l := Label.new()
	l.text = text
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_font_size_override("font_size", 15)
	l.add_theme_color_override("font_color", DIM)
	panel_body.add_child(l)
	return l

func _action(text: String, on_press: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.add_theme_font_size_override("font_size", 17)
	b.add_theme_stylebox_override("normal", _style(CARD, 12))
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.pressed.connect(on_press)
	panel_body.add_child(b)
	return b

# ---------------- panels ----------------

func open_panel(id: String) -> void:
	_clear_panel()
	panel.visible = true
	match id:
		"house":
			_panel_house()
		"gym":
			_panel_drills("gym", "Gym", "Physical work. Costs energy — gains scale with recovery.")
		"park":
			_panel_park()
		"school":
			_panel_drills("school", "School", "Between classes there's always film to watch.")
		"shop":
			_title("🛍️ Shop")
			_note("Gear and services arrive in the next build of the native port.")

func close_panel() -> void:
	panel.visible = false

func _panel_house() -> void:
	var S: Dictionary = Game.S
	_title("🏠 Home")
	if S["today"]["slept"]:
		_note("Slept %d last night · recovery %.0f · %s" % [
			int(S["today"]["sleep_score"]), float(S["today"]["recovery"]),
			SleepModel.describe_score(int(S["today"]["sleep_score"]))])
		_note("Come back tonight — tomorrow starts in bed.")
	else:
		_note("A new day is waiting on the other side of a night's sleep.")
	_action("🛏️  Sleep — start the next day", func() -> void:
		var r: Dictionary = Game.sleep_night()
		_clear_panel()
		_title("🌅 Morning Report")
		_note("Sleep score %d — %s" % [int(r["score"]), SleepModel.describe_score(int(r["score"]))])
		_note("Recovery %.0f · Energy %.0f/10 (refills all day, faster after good sleep)" % [float(r["recovery"]), float(r["energy"])])
		_action("Let's go", close_panel)
	)

func _panel_drills(spot: String, title_text: String, blurb: String) -> void:
	_title(title_text)
	_note(blurb)
	for drill in GameData.DRILLS:
		if String(drill["spot"]) != spot:
			continue
		var attr: String = Game.drill_attr(drill)
		var d: Dictionary = drill
		_action("%s  %s  ·  %s  ·  ⚡%d" % [String(d["ico"]), String(d["name"]), attr.capitalize(), int(d["energy"])], func() -> void:
			var r: Dictionary = Game.train(d)
			if r.has("error"):
				_on_toast(String(r["error"]), false)
			else:
				_on_toast("+%.1f %s" % [float(r["gain"]), String(r["attr"]).capitalize()], true)
		)

func _panel_park() -> void:
	var sport: Dictionary = GameData.SPORTS[Game.active_sport()]
	_title("%s %s Park" % [String(sport["ico"]), String(sport["name"])])
	_note("Runs cost energy. Recovery decides how much you get out of them.")
	_action("🏃  Pickup run · ⚡2", func() -> void:
		var r: Dictionary = Game.play_pickup()
		if r.has("error"):
			_on_toast(String(r["error"]), false)
		else:
			_on_toast("Won %d–%d · +%.1f %s" % [int(r["you"]), int(r["them"]), float(r["gain"]), String(r["skill"]).capitalize()], true)
	)
	_action("🏟️  League game · ⚡4", func() -> void:
		var r: Dictionary = Game.play_league_game()
		if r.has("error"):
			_on_toast(String(r["error"]), false)
		else:
			var head := "W" if bool(r["win"]) else "L"
			_on_toast("%s %d–%d" % [head, int(r["you"]), int(r["them"])], bool(r["win"]))
	)
	for drill in GameData.DRILLS:
		if String(drill["spot"]) != "park":
			continue
		var d: Dictionary = drill
		var attr: String = Game.drill_attr(d)
		_action("%s  %s  ·  %s  ·  ⚡%d" % [String(d["ico"]), String(d["name"]), attr.capitalize(), int(d["energy"])], func() -> void:
			var r: Dictionary = Game.train(d)
			if r.has("error"):
				_on_toast(String(r["error"]), false)
			else:
				_on_toast("+%.1f %s" % [float(r["gain"]), String(r["attr"]).capitalize()], true)
		)

# ---------------- refresh ----------------

func _refresh() -> void:
	var S: Dictionary = Game.S
	var era: Dictionary = GameData.ERA_INFO[S["era"]]
	var season: Dictionary = S["season"]
	chips_label.text = "%s %s · Age %d · Day %d · %d–%d" % [
		String(era["ico"]), String(era["name"]), int(S["age"]), int(S["year_day"]),
		int(season["wins"]), int(season["losses"])]
