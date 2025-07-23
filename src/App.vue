<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import Canvas from './components/canvas/Canvas.vue';
import { LayerDraw } from './components/canvas/LayerDraw';
import { IsStraightLine, type Stroke } from './components/canvas/Utils';
import { Layer3DCube } from './components/canvas/Layer3DCube';

const canvas = useTemplateRef("canvas");
let isShowDrawer = ref(false);

const layer3D = new Layer3DCube();
layer3D.SetDragging(true);
const layerDraw = new LayerDraw();
layerDraw.SetStrokePostProcessor(function (stroke: Stroke) {
	if (IsStraightLine(stroke.points)) {
		layerDraw.AppendStroke({
			points: [...stroke.points],
			color: stroke.color,
			width: stroke.width,
		});

		layerDraw.AppendStroke({
			points: [
				stroke.points[0],
				stroke.points[stroke.points.length - 1],
			],
			color: "red",
			width: stroke.width,
		});
		return null;
	}
	return stroke;
});

function onKeyUp(e: KeyboardEvent) {
	if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
		layerDraw.Redo();
		canvas.value?.Redraw();
		return;
	}
	if (e.ctrlKey && e.key.toLowerCase() === 'z') {
		layerDraw.Undo();
		canvas.value?.Redraw();
		return;
	}
	if (e.key.toLowerCase() === 'delete') {
		layerDraw.Clear();
		canvas.value?.Redraw();
		return;
	}
}

onMounted(() => {
	window.addEventListener('keyup', onKeyUp);

	if (canvas.value) {
		canvas.value.AddLayer(layer3D);
		canvas.value.AddLayer(layerDraw);
	}
})

onUnmounted(() => {
	window.removeEventListener('keyup', onKeyUp);
});

</script>

<template>
	<v-app>
		<v-app-bar elevation="8" color="primary" density="compact">
			<template v-slot:prepend>
				<v-app-bar-nav-icon variant="text" @click.stop="isShowDrawer = !isShowDrawer"></v-app-bar-nav-icon>
			</template>
			<v-app-bar-title>
				<div style="display: flex; align-items: center;">
					<span>3D Drawing</span>
					<v-slider></v-slider>
				</div>
			</v-app-bar-title>
			<template v-slot:append>
				<v-btn icon="mdi-dots-vertical"></v-btn>
			</template>
		</v-app-bar>

		<v-navigation-drawer v-model="isShowDrawer">
			<!-- <v-list
				:items="[
					{ title: 'Foo', value: 'foo', props: { prependIcon: 'mdi-home'}, },
				]"
			></v-list> -->

			<v-list>
				<v-list-subheader>Games</v-list-subheader>

				<v-list-item key=0 value="foo" color="primary">
					<template v-slot:prepend>
						<v-icon icon="mdi-home"></v-icon>
					</template>

					<v-list-item-title v-text="'Foo'"></v-list-item-title>
				</v-list-item>
			</v-list>
		</v-navigation-drawer>

		<v-main>
			<div class="canvas-container">
				<Canvas ref="canvas"></Canvas>
			</div>
		</v-main>
	</v-app>
</template>

<style lang="css" scoped>
.canvas-container {
	width: 100%;
	height: 100%;
}
</style>