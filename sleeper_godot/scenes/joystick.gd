extends Control
## Virtual joystick — bottom-left thumb control, mirrors the web build's.

var vector := Vector2.ZERO
var _active := false
var _center := Vector2.ZERO
const RADIUS := 56.0

func _ready() -> void:
	custom_minimum_size = Vector2(RADIUS * 2.0 + 24.0, RADIUS * 2.0 + 24.0)
	mouse_filter = Control.MOUSE_FILTER_STOP

func _gui_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:
			_active = true
			_center = event.position
		else:
			_active = false
			vector = Vector2.ZERO
		queue_redraw()
	elif event is InputEventScreenDrag and _active:
		var off: Vector2 = event.position - _center
		if off.length() > RADIUS:
			off = off.normalized() * RADIUS
		vector = off / RADIUS
		queue_redraw()
	elif event is InputEventMouseButton:
		if event.pressed:
			_active = true
			_center = event.position
		else:
			_active = false
			vector = Vector2.ZERO
		queue_redraw()
	elif event is InputEventMouseMotion and _active:
		var off: Vector2 = event.position - _center
		if off.length() > RADIUS:
			off = off.normalized() * RADIUS
		vector = off / RADIUS
		queue_redraw()

func _draw() -> void:
	var mid := size / 2.0
	draw_circle(mid, RADIUS, Color(1, 1, 1, 0.07))
	draw_arc(mid, RADIUS, 0.0, TAU, 48, Color(1, 1, 1, 0.25), 2.0)
	draw_circle(mid + vector * RADIUS * 0.6, 22.0, Color(1, 1, 1, 0.35))
