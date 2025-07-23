import { Vec2 } from "./Math";
import { LayerBase, type Stroke } from "./utils";

export class LayerDraw extends LayerBase {
	private m_strokes: Stroke[] = [];
	private m_undoneStrokes: Stroke[] = [];
	private m_currentStroke: Stroke | null = null;
	private m_strokePostProcessor: ((stroke: Stroke) => Stroke | null) | null = null;
	private m_isAllowDrawing: boolean = true;
	
	OnMouseDown(e: PointerEvent): void {
		if (!this.m_canvas) {
			console.warn("No canvas set to LayerDraw.");
			return;
		}

		if (!this.m_isAllowDrawing || e.button !== 0) return;

		this.m_currentStroke = {
			points: [],
			color: 'lightblue',
			width: 2
		};
		this.m_undoneStrokes.length = 0;
		const rect = this.m_canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) - (this.m_canvas.width / 2);
		const y = (e.clientY - rect.top) - (this.m_canvas.height / 2);
		this.m_currentStroke.points.push(new Vec2(x, y));
	}

	OnMouseMove(e: PointerEvent) {
		if (!this.m_currentStroke) return false;
		if (!this.m_canvas) return false;

		const rect = this.m_canvas.getBoundingClientRect();
		const x = (e.clientX - rect.left) - (this.m_canvas.width / 2);
		const y = (e.clientY - rect.top) - (this.m_canvas.height / 2);
		this.m_currentStroke.points.push(new Vec2(x, y));
		return true;
	}

	OnMouseUp(e: PointerEvent) {
		if (this.m_currentStroke) {
			if (this.m_strokePostProcessor) {
				this.m_currentStroke = this.m_strokePostProcessor(this.m_currentStroke);
			}
			if (this.m_currentStroke) {
				this.m_strokes.push(this.m_currentStroke);
			}
			this.m_currentStroke = null;
		}
	}

	OnDraw(e: CanvasRenderingContext2D) {
		if (!this.m_canvas) return;

		for (const stroke of this.m_strokes) {
			e.strokeStyle = stroke.color;
			e.lineWidth = stroke.width;
			e.beginPath();
			stroke.points.forEach((pt, i) => {
				const x = pt.x + this.m_canvas!.width / 2;
				const y = pt.y + this.m_canvas!.height / 2;
				if (i === 0) e.moveTo(x, y);
				else e.lineTo(x, y);
			});
			e.stroke();
		}

		// 临时绘制当前笔触
		if (this.m_currentStroke) {
			e.strokeStyle = this.m_currentStroke.color;
			e.lineWidth = this.m_currentStroke.width;
			e.beginPath();
			this.m_currentStroke.points.forEach((pt, i) => {
				const px = pt.x + this.m_canvas!.width / 2;
				const py = pt.y + this.m_canvas!.height / 2;
				if (i === 0) e.moveTo(px, py);
				else e.lineTo(px, py);
			});
			e.stroke();
		}
	}

	AppendStroke(stroke: Stroke): void {
		this.m_strokes.push(stroke);
	}

	SetStrokePostProcessor(func: (stroke: Stroke) => Stroke | null): void {
		this.m_strokePostProcessor = func;
	}

	/**
	 * 执行撤回操作。需要手动调用`Redraw()`。
	 */
	Undo() {
		if (this.m_strokes.length > 0) {
			const stroke = this.m_strokes.pop()!;
			this.m_undoneStrokes.push(stroke);
		}
	}
	
	/**
	 * 执行重做操作。需要手动调用`Redraw()`。
	 */
	Redo() {
		if (this.m_undoneStrokes.length > 0) {
			const stroke = this.m_undoneStrokes.pop()!;
			this.m_strokes.push(stroke);
		}
	}

	/**
	 * 清空所有笔触。需要手动调用`Redraw()`。
	 */
	Clear() {
		this.m_strokes.length = 0;
		this.m_undoneStrokes.length = 0;
	}

	AllowDrawing(enabled: boolean): void {
		this.m_isAllowDrawing = enabled;
	}
}