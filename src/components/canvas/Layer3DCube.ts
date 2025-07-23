import { CalcRotationMatrix, DefaultCubeEdges, DefaultCubeVertices, DegToRad, Vec2, Vec3 } from "./Math";
import { LayerBase } from "./Utils";

const k_cubeScale = 100;

export class Layer3DCube extends LayerBase {
	private m_yaw: number = 0;
	private m_pitch: number = 0;
	private m_roll: number = 0;
	private m_scale: number = 1.0;
	private m_projected: Vec2[] = [];

	private m_fov: number = 90;
	private project(vec: Vec3, scale: number | null = null) {
		const distance = 300 / Math.tan(DegToRad(this.m_fov * 0.5));
		const kScale = (scale ?? (this.m_scale ** 1.3)) * distance / (distance + vec.z);
		return new Vec2(
			this.m_canvas!.width / 2 + vec.x * kScale,
			this.m_canvas!.height / 2 - vec.y * kScale,
		);
	}

	private drawCenterDot(e: CanvasRenderingContext2D) {
		const projected = this.project(new Vec3());
		e.beginPath();
		e.ellipse(projected.x, projected.y, 10, 10, 0, DegToRad(0), DegToRad(360));
		e.strokeStyle = 'rgba(33, 33, 200, 0.8)';
		e.lineWidth = 1;
		e.stroke();
	}

	private m_gridOffset = new Vec2();
	private draw16Grid(e: CanvasRenderingContext2D) {
		const planeZ = -Math.sqrt(3);
		const planeVertices = [
			new Vec3(-1, -1, planeZ),
			new Vec3(1, 1, planeZ),
		];
		const projectedPlane = planeVertices.map(v => v.Multiply(k_cubeScale)).map(v => this.project(v));

		let topleftCorner = new Vec2(9999999, 9999999);
		let rightBottomCorner = new Vec2();
		projectedPlane.forEach(vec => {
			topleftCorner.x = Math.min(topleftCorner.x, vec.x);
			topleftCorner.y = Math.min(topleftCorner.y, vec.y);
			rightBottomCorner.x = Math.max(rightBottomCorner.x, vec.x);
			rightBottomCorner.y = Math.max(rightBottomCorner.y, vec.y);
		});

		topleftCorner = topleftCorner.Add(this.m_gridOffset);
		rightBottomCorner = rightBottomCorner.Add(this.m_gridOffset);

		e.beginPath();
		e.moveTo(topleftCorner.x, topleftCorner.y);
		e.lineTo(rightBottomCorner.x, topleftCorner.y);
		e.lineTo(rightBottomCorner.x, rightBottomCorner.y);
		e.lineTo(topleftCorner.x, rightBottomCorner.y);
		e.lineTo(topleftCorner.x, topleftCorner.y);

		const gridCount = 4;
		const splitY = (rightBottomCorner.y - topleftCorner.y) / gridCount;
		const splitX = (rightBottomCorner.x - topleftCorner.x) / gridCount;
		for (var i = 0; i < gridCount; i++) {
			var y = topleftCorner.y + splitY * i;
			e.moveTo(topleftCorner.x, y);
			e.lineTo(rightBottomCorner.x, y);
		}
		for (var i = 0; i < gridCount; i++) {
			var x = topleftCorner.x + splitX * i;
			e.moveTo(x, topleftCorner.y);
			e.lineTo(x, rightBottomCorner.y);
		}
		e.strokeStyle = 'rgba(33, 200, 33, 0.5)';
		e.lineWidth = 1;
		e.stroke();
	}

	private drawCube(e: CanvasRenderingContext2D): void {
		if (this.m_projected.length === 0) {
			return;
		}
		
		e.beginPath();
		for (const [a, b] of DefaultCubeEdges) {
			e.moveTo(this.m_projected[a].x, this.m_projected[a].y);
			e.lineTo(this.m_projected[b].x, this.m_projected[b].y);
		}
		e.strokeStyle = 'black';
		e.lineWidth = 1;
		e.stroke();
	}

	OnDraw(e: CanvasRenderingContext2D): void {
		this.drawCenterDot(e);
		this.draw16Grid(e);
		this.drawCube(e);
	}

	private update() {
		if (!this.m_canvas) return;
		
		const rorationMatrix = CalcRotationMatrix(this.m_yaw, this.m_pitch, this.m_roll);
		const rotated = DefaultCubeVertices.map(v => v.Multiply(k_cubeScale)).map(v => rorationMatrix.MultiplyByVec3(v));
		this.m_projected = rotated.map(v => this.project(v));
	}

	OnWheel(e: WheelEvent): void {
		const delta = -e.deltaY / 800;
		const scale = this.m_scale + delta;
		if (scale < 0.1) return;
		this.m_scale = scale;
		this.update();
	}

	SetCanvasElement(elem: HTMLCanvasElement): void {
		super.SetCanvasElement(elem);
		this.update();
	}

	OnResize(width: number, height: number): void {
		super.OnResize(width, height);
		this.update();
	}

	private m_enableDragging = false;
	private m_isDragging = false;
	private m_dragLastValue = new Vec2(); // yaw, pitch
	private m_dragStart = new Vec2();
	OnMouseDown(e: PointerEvent): void {
		if (this.m_enableDragging && e.button === 2) {
			e.preventDefault();
			this.m_isDragging = true;
			this.m_dragStart = new Vec2(e.clientX, e.clientY);
			this.m_dragLastValue = new Vec2(this.m_yaw, this.m_pitch);
		}
	}

	OnMouseMove(e: PointerEvent): boolean {
		if (!this.m_isDragging) return false;
		e.preventDefault();
		const delta = new Vec2(e.clientX - this.m_dragStart.x, e.clientY - this.m_dragStart.y);
		const sensitivity = 0.01;
		this.m_yaw = this.m_dragLastValue.x + delta.x * sensitivity;
		this.m_pitch = this.m_dragLastValue.y + delta.y * sensitivity;
		this.update();
		return true;
	}

	OnMouseUp(e: PointerEvent): void {
		if (!this.m_isDragging) return;
		this.m_isDragging = false;
	}

	private m_disableContextMenu = false;
	OnContextMenu(e: MouseEvent): void {
		if (this.m_disableContextMenu) {
			e.preventDefault();
		}
	}

	SetYaw(yaw: number) {
		this.m_yaw = yaw;
	}

	SetPitch(pitch: number) {
		this.m_pitch = pitch;
	}

	SetRoll(roll: number) {
		this.m_roll = roll;
	}

	SetScale(scale: number): void {
		this.m_scale = scale;
	}

	SetFov(fov: number): void {
		this.m_fov = fov;
	}

	SetDragging(enable: boolean) {
		this.m_enableDragging = enable;
		this.m_disableContextMenu = enable;
	}

	SetGridOffset(vec: Vec2) {
		this.m_gridOffset = vec;
	}

	GetGridOffset(): Vec2 {
		return this.m_gridOffset;
	}
}