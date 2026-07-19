extends Node3D
## The island world — ground, buildings, character, camera. Everything is
## built procedurally so the whole scene is reviewable as code.

const BUILDINGS := [
	{"id": "house", "label": "Home", "color": Color(0.85, 0.55, 0.38), "pos": Vector3(-7.5, 0, -2.5), "size": Vector3(3.4, 2.6, 3.0)},
	{"id": "gym", "label": "Gym", "color": Color(0.42, 0.48, 0.58), "pos": Vector3(7.5, 0, -3.0), "size": Vector3(4.2, 3.0, 3.4)},
	{"id": "park", "label": "Park", "color": Color(0.24, 0.62, 0.34), "pos": Vector3(0.0, 0, -9.0), "size": Vector3(5.0, 0.1, 4.0)},
	{"id": "school", "label": "School", "color": Color(0.72, 0.32, 0.3), "pos": Vector3(-6.5, 0, 6.5), "size": Vector3(3.8, 2.8, 3.0)},
	{"id": "shop", "label": "Shop", "color": Color(0.55, 0.42, 0.72), "pos": Vector3(6.5, 0, 6.0), "size": Vector3(3.0, 2.4, 2.6)},
]

const ENTER_R := 2.4
const SPEED := 5.2

var hud: CanvasLayer
var player: CharacterBody3D
var cam: Camera3D
var body_pivot: Node3D
var enter_armed := {}
var bob_t := 0.0

func _ready() -> void:
	_build_environment()
	_build_ground()
	_build_buildings()
	_build_player()
	_build_camera()
	hud = preload("res://scenes/hud.gd").new()
	add_child(hud)
	for b in BUILDINGS:
		enter_armed[b["id"]] = true

# ---------------- construction ----------------

func _mat(c: Color) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = c
	m.roughness = 0.95
	return m

func _box(size: Vector3, c: Color, pos: Vector3, parent: Node3D = self) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	mi.mesh = mesh
	mi.material_override = _mat(c)
	mi.position = pos
	parent.add_child(mi)
	return mi

func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.5, 0.72, 0.9)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.75, 0.8, 0.9)
	env.ambient_light_energy = 0.9
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-52.0, 32.0, 0.0)
	sun.light_energy = 1.15
	sun.shadow_enabled = true
	add_child(sun)

func _build_ground() -> void:
	var ground := MeshInstance3D.new()
	var disc := CylinderMesh.new()
	disc.top_radius = 15.0
	disc.bottom_radius = 15.5
	disc.height = 1.0
	ground.mesh = disc
	ground.material_override = _mat(Color(0.36, 0.62, 0.36))
	ground.position = Vector3(0, -0.5, 0)
	add_child(ground)

	var water := MeshInstance3D.new()
	var plane := PlaneMesh.new()
	plane.size = Vector2(90, 90)
	water.mesh = plane
	water.material_override = _mat(Color(0.16, 0.4, 0.62))
	water.position = Vector3(0, -0.6, 0)
	add_child(water)

	_box(Vector3(7.0, 0.06, 7.0), Color(0.76, 0.72, 0.62), Vector3(0, 0.03, 0))

	for i in range(14):
		var a := TAU * float(i) / 14.0 + 0.35
		var r := 11.5 + fmod(float(i) * 1.7, 2.4)
		var tree_pos := Vector3(cos(a) * r, 0, sin(a) * r)
		var near_building := false
		for b in BUILDINGS:
			if tree_pos.distance_to(b["pos"]) < 4.5:
				near_building = true
		if near_building:
			continue
		_box(Vector3(0.3, 1.0, 0.3), Color(0.42, 0.3, 0.2), tree_pos + Vector3(0, 0.5, 0))
		_box(Vector3(1.3, 1.4, 1.3), Color(0.22, 0.48, 0.26), tree_pos + Vector3(0, 1.7, 0))

func _build_buildings() -> void:
	for b in BUILDINGS:
		var group := Node3D.new()
		group.position = b["pos"]
		group.name = String(b["id"])
		add_child(group)
		var size: Vector3 = b["size"]
		if b["id"] == "park":
			_box(Vector3(size.x, 0.08, size.z), Color(0.79, 0.6, 0.42), Vector3(0, 0.06, 0), group)
			_box(Vector3(0.12, 2.6, 0.12), Color(0.8, 0.8, 0.8), Vector3(0, 1.3, -size.z / 2.0 + 0.3), group)
			_box(Vector3(1.1, 0.75, 0.06), Color(0.95, 0.95, 0.95), Vector3(0, 2.35, -size.z / 2.0 + 0.36), group)
		else:
			_box(size, b["color"], Vector3(0, size.y / 2.0, 0), group)
			var roof_color: Color = b["color"]
			_box(Vector3(size.x + 0.4, 0.35, size.z + 0.4), roof_color.darkened(0.35), Vector3(0, size.y + 0.18, 0), group)
			_box(Vector3(0.9, 1.4, 0.1), Color(0.16, 0.13, 0.1), Vector3(0, 0.7, size.z / 2.0 + 0.02), group)
		var sign := Label3D.new()
		sign.text = String(b["label"])
		sign.font_size = 96
		sign.pixel_size = 0.01
		sign.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		sign.outline_size = 24
		sign.position = Vector3(0, (0.8 if b["id"] == "park" else size.y + 1.1), 0)
		group.add_child(sign)

func _build_player() -> void:
	player = CharacterBody3D.new()
	player.position = Vector3(0, 0.1, 3.2)
	add_child(player)

	var col := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.35
	cap.height = 1.4
	col.shape = cap
	col.position = Vector3(0, 0.8, 0)
	player.add_child(col)

	body_pivot = Node3D.new()
	player.add_child(body_pivot)
	_box(Vector3(0.62, 0.78, 0.4), Color(0.89, 0.36, 0.29), Vector3(0, 0.92, 0), body_pivot)
	_box(Vector3(0.5, 0.36, 0.36), Color(0.79, 0.56, 0.35), Vector3(0, 1.52, 0), body_pivot)
	_box(Vector3(0.56, 0.16, 0.42), Color(0.16, 0.12, 0.08), Vector3(0, 1.72, 0), body_pivot)
	_box(Vector3(0.2, 0.5, 0.24), Color(0.2, 0.22, 0.3), Vector3(-0.17, 0.28, 0), body_pivot)
	_box(Vector3(0.2, 0.5, 0.24), Color(0.2, 0.22, 0.3), Vector3(0.17, 0.28, 0), body_pivot)

func _build_camera() -> void:
	cam = Camera3D.new()
	cam.position = Vector3(0, 12.5, 12.0)
	cam.fov = 55.0
	add_child(cam)
	cam.look_at(Vector3(0, 0, 0))

# ---------------- per-frame ----------------

func _physics_process(delta: float) -> void:
	var joy: Vector2 = hud.joystick_vector() if hud else Vector2.ZERO
	var keys := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
	var input := joy if joy.length() > 0.05 else keys
	if input.length() > 1.0:
		input = input.normalized()

	player.velocity = Vector3(input.x * SPEED, 0.0, input.y * SPEED)
	player.move_and_slide()

	var p := player.position
	p.x = clampf(p.x, -13.5, 13.5)
	p.z = clampf(p.z, -13.5, 13.5)
	p.y = 0.1
	player.position = p

	if input.length() > 0.05:
		bob_t += delta * 10.0
		body_pivot.position.y = absf(sin(bob_t)) * 0.09
		body_pivot.rotation.y = lerp_angle(body_pivot.rotation.y, atan2(-input.x, -input.y), delta * 10.0)
	else:
		body_pivot.position.y = lerpf(body_pivot.position.y, 0.0, delta * 8.0)

	var target := player.position
	var cam_goal := target + Vector3(0, 11.5, 10.5)
	cam.position = cam.position.lerp(cam_goal, delta * 4.0)
	cam.look_at(target + Vector3(0, 0.8, 0))

	_check_building_entry()

func _check_building_entry() -> void:
	if hud == null or hud.panel_open():
		return
	for b in BUILDINGS:
		var d: float = Vector2(player.position.x, player.position.z).distance_to(Vector2(b["pos"].x, b["pos"].z))
		if d < ENTER_R and enter_armed[b["id"]]:
			enter_armed[b["id"]] = false
			hud.open_panel(String(b["id"]))
		elif d > ENTER_R + 1.4:
			enter_armed[b["id"]] = true
