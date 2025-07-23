import type { Vec2 } from "./Math";

export interface ILayer {
	OnMouseDown(e: PointerEvent): void;

	/**
	 * 返回布尔表示是否需要重绘，返回true则进行重绘
	 */
	OnMouseMove(e: PointerEvent): boolean;

	OnMouseUp(e: PointerEvent): void;

	OnDraw(e: CanvasRenderingContext2D): void;

	OnResize(width: number, height: number): void;

	OnWheel(e: WheelEvent): void;

	OnContextMenu(e: MouseEvent): void;

	SetCanvasElement(elem: HTMLCanvasElement): void;
}

export abstract class LayerBase implements ILayer {
	protected m_canvas: HTMLCanvasElement | null = null;
	OnMouseDown(e: PointerEvent) { }
	OnMouseMove(e: PointerEvent) { return false; }
	OnMouseUp(e: PointerEvent) { }
	OnDraw(e: CanvasRenderingContext2D) { }
	OnResize(width: number, height: number) { }
	OnContextMenu(e: MouseEvent) { }
	OnWheel(e: WheelEvent): void { }
	SetCanvasElement(elem: HTMLCanvasElement) {
		this.m_canvas = elem;
	}
}

export interface Stroke {
	points: Vec2[];
	color: string;
	width: number;
}

export function IsStraightLine(points: Vec2[], tolerance = 0.06) {
	const p1 = points[0];
	const p2 = points[points.length - 1];

	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const length = Math.sqrt(dx * dx + dy * dy);

	for (let i = 1; i < points.length - 1; i++) {
		const p0 = points[i];

		// 计算点到直线的距离（公式）
		const distance = Math.abs(dy * p0.x - dx * p0.y + p2.x * p1.y - p2.y * p1.x) / length;
		if (distance > tolerance) {
			return false;
		}
	}
	return true;
}