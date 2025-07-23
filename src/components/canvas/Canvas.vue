<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue';
import type { ILayer } from './Utils';

const canvas = useTemplateRef('canvas');
let layers: ILayer[] = [];
let clearColor: string | null = "white";

function Redraw() {
	const ctx = canvas.value?.getContext('2d');
	if (!ctx || !canvas.value) return;
	if (clearColor) {
		ctx.beginPath();
		ctx.rect(0, 0, canvas.value.width, canvas.value.height);
		ctx.fillStyle = clearColor;
		ctx.fill();
	} else {
		ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
	}

	layers.forEach((layer) => layer.OnDraw(ctx));
}
function onMouseDown(e: PointerEvent): void {
	layers.forEach((l) => l.OnMouseDown(e));
}
function onMouseMove(e: PointerEvent): void {
	let needRedraw = false;
	layers.forEach((l) => needRedraw = needRedraw || l.OnMouseMove(e));
	if (needRedraw) Redraw();
}
function onMouseUp(e: PointerEvent): void {
	layers.forEach((l) => l.OnMouseUp(e));
	Redraw();
}
function onWheel(e: WheelEvent): void {
	layers.forEach((l) => l.OnWheel(e));
	Redraw();
}
function onContextMenu(e: MouseEvent) {
	layers.forEach((l) => l.OnContextMenu(e));
}

function Resize(width: number, height: number) {
	if (canvas.value) {
		canvas.value.height = height;
		canvas.value.width = width;
		layers.forEach((layer) => layer.OnResize(width, height));
		Redraw();
	}
}

function AddLayer(layer: ILayer) {
	if (canvas.value) {
		layers.push(layer);
		layer.SetCanvasElement(canvas.value);
		return true;
	}
	return false;
}

let resizeObserver: ResizeObserver | null = null;
let parentNode: HTMLElement | null = null;
function onResizeObserver() {
	if (parentNode) {
		const width = parentNode.clientWidth;
		const height = parentNode.clientHeight;
		Resize(width, height);
	}
}

function SetClearColor(color: string | null) {
	clearColor = color;
}

onMounted(() => {
	if (canvas.value) {
		canvas.value.addEventListener('pointerdown', onMouseDown);
		canvas.value.addEventListener('pointermove', onMouseMove);
		canvas.value.addEventListener('pointerup', onMouseUp);
		canvas.value.addEventListener('contextmenu', onContextMenu);
		canvas.value.addEventListener('wheel', onWheel);

		if (canvas.value.parentElement) {
			parentNode = canvas.value.parentElement;
			resizeObserver = new ResizeObserver(onResizeObserver);
			resizeObserver.observe(parentNode);
		}
	}
});
onUnmounted(() => {
	if (canvas.value) {
		canvas.value.removeEventListener('pointerdown', onMouseDown);
		canvas.value.removeEventListener('pointermove', onMouseMove);
		canvas.value.removeEventListener('pointerup', onMouseUp);
		canvas.value.removeEventListener('contextmenu', onContextMenu);
		canvas.value.removeEventListener('wheel', onWheel);
	}

	if (resizeObserver) {
		resizeObserver.disconnect();
	}
});

defineExpose({
	Resize,
	AddLayer,
	Redraw,
	SetClearColor,
})
</script>

<template>
	<canvas ref="canvas"></canvas>
</template>

<style lang="css" scoped>
canvas {
	position: absolute;
}
</style>