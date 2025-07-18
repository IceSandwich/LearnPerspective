const cubeCanvas = document.getElementById('cube') as HTMLCanvasElement;
const drawCanvas = document.getElementById('draw') as HTMLCanvasElement;
const cubeCtx = cubeCanvas.getContext('2d')!;
const drawCtx = drawCanvas.getContext('2d')!;

const yawSlider = document.getElementById('yaw') as HTMLInputElement;
const pitchSlider = document.getElementById('pitch') as HTMLInputElement;
const rollSlider = document.getElementById('roll') as HTMLInputElement;
const clearButton = document.getElementById('clear')!;
const undoButton = document.getElementById('undo')!;
const redoButton = document.getElementById('redo')!;
const perspectiveSlider = document.getElementById('perspectiveSlider') as HTMLInputElement;
const zSlider = document.getElementById('zSlider') as HTMLInputElement;

yawSlider.value = pitchSlider.value = rollSlider.value = "0";

interface StrokePoint { x: number, y: number }
interface Stroke {
	points: StrokePoint[];
	color: string;
	width: number;
}

const strokes: Stroke[] = [];
const undoneStrokes: Stroke[] = [];
let currentStroke: Stroke | null = null;

// --- 示例用法 ---
// 定义参数
const fieldOfView = (45 * Math.PI) / 180; // 45 度转换为弧度
const nearClippingPlane = 0.1;
const farClippingPlane = 100.0;

// 生成透视投影矩阵
let perspectiveMatrix = CreatePerspectiveProjectionMatrix(
	fieldOfView,
	800 / 600,
	nearClippingPlane,
	farClippingPlane
);

function resizeCanvas() {
	const width = window.innerWidth;
	const height = window.innerHeight - document.getElementById('toolbar')!.offsetHeight;

	cubeCanvas.width = drawCanvas.width = width;
	cubeCanvas.height = drawCanvas.height = height;
	const aspectRatio = cubeCanvas.width / cubeCanvas.height;
	perspectiveMatrix = CreatePerspectiveProjectionMatrix(
		fieldOfView,
		1,
		nearClippingPlane,
		farClippingPlane
	);
	redrawCube();
	redrawStrokes();
}








// let perspectiveStrength = parseFloat(perspectiveSlider.value);
// perspectiveSlider.addEventListener('input', () => {
// 	perspectiveStrength = parseFloat(perspectiveSlider.value);
// 	redrawCube();
// });
// zSlider.addEventListener('input', redrawCube);









function project(v: Vec3): Vec2 {
	const scale = 100;
	// return {
	// 	x: v.x * scale + cubeCanvas.width / 2,
	// 	y: -v.y * scale + cubeCanvas.height / 2
	// };
	// return {
	// 	x: v.x * perspective * scale + cubeCanvas.width / 2,
	// 	y: -v.y * perspective * scale + cubeCanvas.height / 2,
	// }

	let point = ProjectPoint(v, perspectiveMatrix);
	return {
		x: point.x * scale + cubeCanvas.width / 2,
		y: point.y * scale + cubeCanvas.height / 2
	}
}

function redrawCube() {
	cubeCtx.clearRect(0, 0, cubeCanvas.width, cubeCanvas.height);
	const yaw = +yawSlider.value;
	const pitch = +pitchSlider.value;
	const roll = +rollSlider.value;
	const R = GetRotationMatrix(yaw, pitch, roll);
	const rotated = DefaultCubeVertices.map(v => MultiplyMatrixAndPoint(R, v));
	const projected = rotated.map(project);
	cubeCtx.beginPath();
	for (const [a, b] of DefaultCubeEdges) {
		cubeCtx.moveTo(projected[a].x, projected[a].y);
		cubeCtx.lineTo(projected[b].x, projected[b].y);
	}
	cubeCtx.strokeStyle = 'black';
	cubeCtx.stroke();
}

function redrawStrokes() {
	drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
	for (const stroke of strokes) {
		drawCtx.strokeStyle = stroke.color;
		drawCtx.lineWidth = stroke.width;
		drawCtx.beginPath();
		stroke.points.forEach((pt, i) => {
			const x = pt.x * drawCanvas.width;
			const y = pt.y * drawCanvas.height;
			if (i === 0) drawCtx.moveTo(x, y);
			else drawCtx.lineTo(x, y);
		});
		drawCtx.stroke();
	}
}

drawCanvas.addEventListener('pointerdown', e => {
	currentStroke = {
		points: [],
		color: 'red',
		width: 2
	};
	undoneStrokes.length = 0;
	const rect = drawCanvas.getBoundingClientRect();
	const x = (e.clientX - rect.left) / drawCanvas.width;
	const y = (e.clientY - rect.top) / drawCanvas.height;
	currentStroke.points.push({ x, y });
});

drawCanvas.addEventListener('pointermove', e => {
	if (!currentStroke) return;
	const rect = drawCanvas.getBoundingClientRect();
	const x = (e.clientX - rect.left) / drawCanvas.width;
	const y = (e.clientY - rect.top) / drawCanvas.height;
	currentStroke.points.push({ x, y });
	redrawStrokes();
	// 临时绘制当前笔触
	drawCtx.strokeStyle = currentStroke.color;
	drawCtx.lineWidth = currentStroke.width;
	drawCtx.beginPath();
	currentStroke.points.forEach((pt, i) => {
		const px = pt.x * drawCanvas.width;
		const py = pt.y * drawCanvas.height;
		if (i === 0) drawCtx.moveTo(px, py);
		else drawCtx.lineTo(px, py);
	});
	drawCtx.stroke();
});

drawCanvas.addEventListener('pointerup', () => {
	if (currentStroke) {
		strokes.push(currentStroke);
		currentStroke = null;
	}
});

clearButton.addEventListener('click', () => {
	strokes.length = 0;
	undoneStrokes.length = 0;
	redrawStrokes();
});

undoButton.addEventListener('click', () => {
	if (strokes.length > 0) {
		const stroke = strokes.pop()!;
		undoneStrokes.push(stroke);
		redrawStrokes();
	}
});

redoButton.addEventListener('click', () => {
	if (undoneStrokes.length > 0) {
		const stroke = undoneStrokes.pop()!;
		strokes.push(stroke);
		redrawStrokes();
	}
});

window.addEventListener('resize', resizeCanvas);
yawSlider.oninput = pitchSlider.oninput = rollSlider.oninput = redrawCube;

resizeCanvas();