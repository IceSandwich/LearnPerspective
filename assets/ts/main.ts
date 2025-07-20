interface ILayer {
	Init(): void;
	OnResize(width: number, height: number): void;
	GetHTMLElement(): HTMLElement;
}

abstract class LayerCanvasBase implements ILayer {
	protected m_canvas: HTMLCanvasElement
	protected m_context: CanvasRenderingContext2D | null = null;
	constructor() {
		this.m_canvas = document.createElement("canvas");
	}

	Init(): void {
		this.m_context = this.m_canvas.getContext("2d");
	}

	GetHTMLElement(): HTMLElement {
		return this.m_canvas;
	}

	OnResize(width: number, height: number): void {
		this.m_canvas.width = width;
		this.m_canvas.height = height;
	}
}

class Canvas3D extends LayerCanvasBase {
	m_perspectiveMatrix: Matrix4 = new Matrix4();

	m_yaw: number = 0;
	m_pitch: number = 0;
	m_roll: number = 0;
	m_scale: number = 1;
	m_gridScale: number = 1;
	m_gridOffset: Vec2 = new Vec2();

	constructor() {
		super();

		this.initPerspectiveMatrix();
	}

	initPerspectiveMatrix() {
		// 定义参数
		const fieldOfView = (45 * Math.PI) / 180; // 45 度转换为弧度
		const nearClippingPlane = 0.1;
		const farClippingPlane = 100.0;
		const aspectRatio = 1.0;

		// 生成透视投影矩阵
		this.m_perspectiveMatrix = CreatePerspectiveProjectionMatrix(
			fieldOfView,
			aspectRatio,
			nearClippingPlane,
			farClippingPlane
		);
	}

	project(vec: Vec3, scale: number): Vec2 {
		const kScale = 300 * scale / (vec.z + 6); // 简单透视
		return new Vec2(
			this.m_canvas.width / 2 + vec.x * kScale,
			this.m_canvas.height / 2 - vec.y * kScale
		);
	}

	drawCenterDot() {
		if (!this.m_context) {
			return;
		}

		const projected = this.project(new Vec3(), this.m_scale);
		this.m_context.beginPath();
		this.m_context.ellipse(projected.x, projected.y, 10, 10, 0, DegToRad(0), DegToRad(360));
		this.m_context.closePath();
		this.m_context.strokeStyle = 'rgba(33, 33, 200, 0.8)';
		this.m_context.stroke();
	}

	draw16Grid() {
		if (!this.m_context) {
			return;
		}

		const planeZ = -Math.sqrt(3);
		const planeVertices = [
			new Vec3(-1, -1, planeZ),
			// new Vec3(-1, 1, planeZ),
			new Vec3(1, 1, planeZ),
			// new Vec3(1, -1, planeZ),
		];
		const projectedPlane = planeVertices.map(v => this.project(v, this.m_gridScale * this.m_scale));

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

		this.m_context.beginPath();
		this.m_context.moveTo(topleftCorner.x, topleftCorner.y);
		this.m_context.lineTo(rightBottomCorner.x, topleftCorner.y);
		this.m_context.lineTo(rightBottomCorner.x, rightBottomCorner.y);
		this.m_context.lineTo(topleftCorner.x, rightBottomCorner.y);
		this.m_context.lineTo(topleftCorner.x, topleftCorner.y);

		const gridCount = 4;
		const splitY = (rightBottomCorner.y - topleftCorner.y) / gridCount;
		const splitX = (rightBottomCorner.x - topleftCorner.x) / gridCount;
		for (var i = 0; i < gridCount; i++) {
			var y = topleftCorner.y + splitY * i;
			this.m_context.moveTo(topleftCorner.x, y);
			this.m_context.lineTo(rightBottomCorner.x, y);
		}
		for (var i = 0; i < gridCount; i++) {
			var x = topleftCorner.x + splitX * i;
			this.m_context.moveTo(x, topleftCorner.y);
			this.m_context.lineTo(x, rightBottomCorner.y);
		}
		this.m_context.closePath();
		this.m_context.strokeStyle = 'rgba(33, 200, 33, 0.5)';
		this.m_context.stroke();
	}

	Redraw() {
		if (!this.m_context) {
			console.warn("Context not initialized");
			return;
		}
		this.m_context.clearRect(0, 0, this.m_canvas.width, this.m_canvas.height);

		this.drawCenterDot();
		this.draw16Grid();

		const rorationMatrix = CalcRotationMatrix(this.m_yaw, this.m_pitch, this.m_roll);
		const rorated = DefaultCubeVertices.map(v => rorationMatrix.MultiplyByVec3(v));
		const projected = rorated.map(v => this.project(v, this.m_scale));

		this.m_context.beginPath();
		for (const [a, b] of DefaultCubeEdges) {
			this.m_context.moveTo(projected[a].x, projected[a].y);
			this.m_context.lineTo(projected[b].x, projected[b].y);
		}
		this.m_context.closePath();
		this.m_context.strokeStyle = 'black';
		this.m_context.stroke();

	}

	OnResize(width: number, height: number): void {
		super.OnResize(width, height);
		this.initPerspectiveMatrix();
		this.Redraw();
	}

	SetYaw(yaw: number) {
		this.m_yaw = yaw;
		this.Redraw();
	}

	SetPitch(pitch: number) {
		this.m_pitch = pitch;
		this.Redraw();
	}

	SetRoll(roll: number) {
		this.m_roll = roll;
		this.Redraw();
	}

	SetScale(scale: number) {
		this.m_scale = scale;
		this.Redraw();
	}

	SetGridScale(scale: number) {
		this.m_gridScale = scale;
		this.Redraw();
	}

	SetGridOffsetX(val: number) {
		this.m_gridOffset.x = val;
		this.Redraw();
	}

	SetGridOffsetY(val: number) {
		this.m_gridOffset.y = val;
		this.Redraw();
	}
}

interface StrokePoint { x: number, y: number }
interface Stroke {
	points: StrokePoint[];
	color: string;
	width: number;
}
class CanvasDraw extends LayerCanvasBase {
	m_strokes: Stroke[] = [];
	m_undoneStrokes: Stroke[] = [];
	m_currentStroke: Stroke | null = null;

	constructor() {
		super();
	}

	Init(): void {
		super.Init();

		this.m_canvas.addEventListener('pointerdown', e => this.onMouseDown(e));
		this.m_canvas.addEventListener('pointermove', e => this.onMouseMove(e));
		this.m_canvas.addEventListener('pointerup', e => this.onMouseUp(e));
	}

	onMouseDown(e: PointerEvent): void {
		this.m_currentStroke = {
			points: [],
			color: 'red',
			width: 2
		};
		this.m_undoneStrokes.length = 0;
		const rect = this.m_canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) / this.m_canvas.width;
		const y = (e.clientY - rect.top) / this.m_canvas.height;
		this.m_currentStroke.points.push({ x, y });
	}

	redrawStrokes() {
		if (!this.m_context) return;
		this.m_context.clearRect(0, 0, this.m_canvas.width, this.m_canvas.height);
		for (const stroke of this.m_strokes) {
			this.m_context.strokeStyle = stroke.color;
			this.m_context.lineWidth = stroke.width;
			this.m_context.beginPath();
			stroke.points.forEach((pt, i) => {
				const x = pt.x * this.m_canvas.width;
				const y = pt.y * this.m_canvas.height;
				if (i === 0) this.m_context!.moveTo(x, y);
				else this.m_context!.lineTo(x, y);
			});
			this.m_context.stroke();
		}
	}

	onMouseMove(e: PointerEvent): void {
		if (!this.m_currentStroke) return;
		if (!this.m_context) return;

		const rect = this.m_canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) / this.m_canvas.width;
		const y = (e.clientY - rect.top) / this.m_canvas.height;
		this.m_currentStroke.points.push({ x, y });
		this.redrawStrokes();
		// 临时绘制当前笔触

		this.m_context.strokeStyle = this.m_currentStroke.color;
		this.m_context.lineWidth = this.m_currentStroke.width;
		this.m_context.beginPath();
		this.m_currentStroke.points.forEach((pt, i) => {
			const px = pt.x * this.m_canvas.width;
			const py = pt.y * this.m_canvas.height;
			if (i === 0) this.m_context!.moveTo(px, py);
			else this.m_context!.lineTo(px, py);
		});
		this.m_context.stroke();
	}

	onMouseUp(e: PointerEvent): void {
		if (this.m_currentStroke) {
			this.m_strokes.push(this.m_currentStroke);
			this.m_currentStroke = null;
		}
	}

	OnResize(width: number, height: number): void {
		super.OnResize(width, height);
	}

	Undo() {
		if (this.m_strokes.length > 0) {
			const stroke = this.m_strokes.pop()!;
			this.m_undoneStrokes.push(stroke);
			this.redrawStrokes();
		}
	}
	Redo() {
		if (this.m_undoneStrokes.length > 0) {
			const stroke = this.m_undoneStrokes.pop()!;
			this.m_strokes.push(stroke);
			this.redrawStrokes();
		}
	}

	Clear() {
		this.m_strokes.length = 0;
		this.m_undoneStrokes.length = 0;
		this.redrawStrokes();
	}
}

class Application {
	m_container: HTMLDivElement;
	m_toolbar: HTMLDivElement;
	m_layers: ILayer[];

	constructor() {
		this.m_container = document.getElementById("canvas-container") as HTMLDivElement;
		this.m_toolbar = document.getElementById('toolbar') as HTMLDivElement;

		this.m_layers = [];
	}

	InitGrid(angles: number[], func: (e: MouseEvent) => void) {
		const table = document.getElementById('quicktable');
		if (!table) return;
		let cells: HTMLElement[][] = [];

		const butEnter = function (e: MouseEvent) {
			const row = parseInt((e.target as HTMLButtonElement).getAttribute('data-pitch-index')!);
			const col = parseInt((e.target as HTMLButtonElement).getAttribute('data-yaw-index')!);

			// 高亮整行
			cells[row].forEach(cell => {
				cell.classList.add('highlight-row');
			});

			// 高亮整列
			cells.forEach(rowCells => {
				rowCells[col].classList.add('highlight-col');
			});
		};

		const butLeave = function (e: MouseEvent) {
			const row = parseInt((e.target as HTMLButtonElement).getAttribute('data-pitch-index')!);
			const col = parseInt((e.target as HTMLButtonElement).getAttribute('data-yaw-index')!);

			// 移除行高亮
			cells[row].forEach(cell => {
				cell.classList.remove('highlight-row');
			});

			// 移除列高亮
			cells.forEach(rowCells => {
				rowCells[col].classList.remove('highlight-col');
			});
		}

		// 生成表头
		const headerRow = document.createElement('tr');
		headerRow.appendChild(document.createElement('th')); // 左上角空单元格
		angles.forEach(yaw => {
			const th = document.createElement('th');
			th.textContent = yaw.toString();
			headerRow.appendChild(th);
		});
		table.appendChild(headerRow);

		// 生成表格内容（每行表示一个 pitch）
		angles.forEach((pitch, pitchIndex) => {
			const row = document.createElement('tr');

			// 行首：pitch 值
			const pitchCell = document.createElement('th');
			pitchCell.textContent = pitch.toString();
			row.appendChild(pitchCell);

			// 每列：按钮
			angles.forEach((yaw, yawIndex) => {
				const cell = document.createElement('td');
				const button = document.createElement('button');
				button.textContent = '#';
				button.setAttribute('data-yaw', yaw.toString());
				button.setAttribute('data-pitch', pitch.toString());
				button.setAttribute('data-pitch-index', pitchIndex.toString());
				button.setAttribute('data-yaw-index', yawIndex.toString());

				// 存储按钮对应的单元格信息
				if (!cells[pitchIndex]) cells[pitchIndex] = [];
				cells[pitchIndex][yawIndex] = cell;

				// 添加点击事件
				button.addEventListener('click', func);
				button.addEventListener('mouseenter', butEnter);
				button.addEventListener('mouseleave', butLeave);

				cell.appendChild(button);
				row.appendChild(cell);
			});

			table.appendChild(row);
		});
	}

	Init() {
		this.registerEvents();
		this.OnResize();
	}

	registerEvents() {
		window.addEventListener("resize", (e) => {
			this.OnResize();
		});
	}

	AddLayer(layer: ILayer) {
		this.m_layers.push(layer);
		this.m_container.appendChild(layer.GetHTMLElement());
		layer.Init();
	}

	OnResize() {
		const width = window.innerWidth;
		const height = window.innerHeight - this.m_toolbar?.offsetHeight;

		this.m_layers.forEach(layer => {
			layer.OnResize(width, height);
		});
	}
}

const app = new Application();

const layer3D = new Canvas3D();
app.AddLayer(layer3D);
document.getElementById('yaw')?.addEventListener("input", (e) => layer3D.SetYaw(DegToRad(parseFloat((e.target as HTMLInputElement).value))));
document.getElementById('pitch')?.addEventListener("input", (e) => layer3D.SetPitch(DegToRad(parseFloat((e.target as HTMLInputElement).value))));
document.getElementById('roll')?.addEventListener("input", (e) => layer3D.SetRoll(DegToRad(parseFloat((e.target as HTMLInputElement).value))));
document.getElementById('zSlider')?.addEventListener("input", (e) => layer3D.SetScale(parseFloat((e.target as HTMLInputElement).value)));
document.getElementById('gridScale')?.addEventListener("input", (e) => layer3D.SetGridScale(parseFloat((e.target as HTMLInputElement).value)));
document.getElementById('gridOffsetX')?.addEventListener("input", (e) => layer3D.SetGridOffsetX(parseFloat((e.target as HTMLInputElement).value)));
document.getElementById('gridOffsetY')?.addEventListener("input", (e) => layer3D.SetGridOffsetY(parseFloat((e.target as HTMLInputElement).value)));

const layerDraw = new CanvasDraw();
app.AddLayer(layerDraw);
document.getElementById('clear')?.addEventListener("click", (e) => layerDraw.Clear());
document.getElementById('redo')?.addEventListener("click", (e) => layerDraw.Redo());
document.getElementById('undo')?.addEventListener("click", (e) => layerDraw.Undo());

app.Init();

document.getElementById("quick")?.addEventListener("click", (e) => {
	const menu = document.getElementById('menu');
	const overlay = document.getElementById('overlay');
	if (!menu || !overlay) return;

	const isVisible = menu.style.display === 'block';
	menu.style.display = isVisible ? 'none' : 'block';
	overlay.style.display = isVisible ? 'none' : 'block';
});

document.getElementById("overlay")?.addEventListener("click", (e) => {
	const menu = document.getElementById('menu');
	const overlay = document.getElementById('overlay');
	if (!menu || !overlay) return;

	menu.style.display = 'none';
	overlay.style.display = 'none';
});

app.InitGrid([-67.5, -45, -22.5, 0, 22.5, 45, 67.5], (e: MouseEvent) => {
	const yaw = (e.target as HTMLButtonElement).getAttribute('data-yaw');
	const pitch = (e.target as HTMLButtonElement).getAttribute('data-pitch');
	if (yaw == null || pitch == null) return;

	layer3D.SetYaw(DegToRad(parseFloat(yaw)));
	layer3D.SetPitch(DegToRad(parseFloat(pitch)));
	layer3D.SetRoll(0);

	// won't trigger `input` event
	(document.getElementById('yaw') as HTMLInputElement).value = yaw.toString();
	(document.getElementById('pitch') as HTMLInputElement).value = pitch.toString();
	(document.getElementById('roll') as HTMLInputElement).value = "0";

	document.getElementById("overlay")?.click();
});