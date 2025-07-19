//#region Data Types

class Vec2 {
	x: number;
	y: number;
	constructor(x: number = 0, y: number = 0) {
		this.x = x;
		this.y = y;
	}
}

class Vec3 {
	x: number;
	y: number;
	z: number;

	constructor(x: number = 0, y: number = 0, z: number = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	// 将 Vec3 转为 Vec4 齐次坐标（w=1）
	public ToHomogeneous(): Vec4 {
		return new Vec4(this.x, this.y, this.z, 1);
	}
}

class Vec4 {
	x: number;
	y: number;
	z: number;
	w: number;

	constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.w = w;
	}

	// 从 Vec4 齐次坐标还原 Vec3（将 w ≠ 1 情况归一化）
	public ToVec3(): Vec3 {
		if (this.w === 0) throw new Error("Cannot convert from homogeneous coordinates with w = 0");
		return new Vec3(this.x / this.w, this.y / this.w, this.z / this.w);
	}
}

class Matrix3 {
	// 按行主序存储 3x3 矩阵
	m_elements: number[];

	constructor(elements?: number[]) {
		this.m_elements = elements ?? [
			1, 0, 0,
			0, 1, 0,
			0, 0, 1,
		];
	}

	public MultiplyByVec3(vec: Vec3): Vec3 {
		const e = this.m_elements;
		const x = e[0] * vec.x + e[1] * vec.y + e[2] * vec.z;
		const y = e[3] * vec.x + e[4] * vec.y + e[5] * vec.z;
		const z = e[6] * vec.x + e[7] * vec.y + e[8] * vec.z;

		return new Vec3(x, y, z);
	}
}

class Matrix4 {
	// 按行主序存储 4x4 矩阵
	m_elements: number[];

	constructor(elements?: number[]) {
		this.m_elements = elements ?? [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1,
		];
	}

	MultiplyByVec4(vec: Vec4): Vec4 {
		const e = this.m_elements;
		const x = e[0] * vec.x + e[1] * vec.y + e[2] * vec.z + e[3] * vec.w;
		const y = e[4] * vec.x + e[5] * vec.y + e[6] * vec.z + e[7] * vec.w;
		const z = e[8] * vec.x + e[9] * vec.y + e[10] * vec.z + e[11] * vec.w;
		const w = e[12] * vec.x + e[13] * vec.y + e[14] * vec.z + e[15] * vec.w;

		return new Vec4(x, y, z, w);
	}

	/**
	 * 应用透视投影矩阵到给定的 Vec3 点。
	 * @param vec 要投影的 Vec3 点。
	 * @returns 投影到标准化设备坐标 (NDC) 空间后的 Vec3 点。
	 * NDC 坐标的 x 和 y 通常在 [-1, 1] 范围内，z 也在 [-1, 1] 范围内。
	 */
	ProjectVec3(vec: Vec3): Vec3 {
		// 1. 将 Vec3 转换为齐次坐标 (Vec4)
		const homogeneousPoint = vec.ToHomogeneous();

		// 2. 将投影矩阵应用于齐次坐标
		const transformedHomogeneousPoint = this.MultiplyByVec4(homogeneousPoint);

		// 3. 执行透视除法，将齐次坐标转换回 Vec3 (NDC 空间)
		const projectedVec3 = transformedHomogeneousPoint.ToVec3();

		return projectedVec3;
	}
}

//#endregion

//#region Primitives

const DefaultCubeVertices: Vec3[] = [
	new Vec3(-1, -1, -1),
	new Vec3(1, -1, -1),
	new Vec3(1, 1, -1),
	new Vec3(-1, 1, -1),
	new Vec3(-1, -1, 1),
	new Vec3(1, -1, 1),
	new Vec3(1, 1, 1),
	new Vec3(-1, 1, 1),
];

const DefaultCubeEdges: [number, number][] = [
	[0, 1], [1, 2], [2, 3], [3, 0],
	[4, 5], [5, 6], [6, 7], [7, 4],
	[0, 4], [1, 5], [2, 6], [3, 7]
];

//#endregion


/**
 * 生成一个透视投影矩阵。
 * @param fovY 垂直视场角（以弧度为单位）。
 * @param aspectRatio 视口的宽高比（宽度 / 高度）。
 * @param near 最近的裁剪面距离。
 * @param far 最远的裁剪面距离。
 * @returns 4x4 透视投影矩阵。
 */
function CreatePerspectiveProjectionMatrix(
	fovY: number,
	aspectRatio: number,
	near: number,
	far: number
): Matrix4 {
	const ret = new Matrix4();

	const f = 1.0 / Math.tan(fovY / 2);
	const rangeInv = 1.0 / (near - far);

	// 第一列
	ret.m_elements[0] = f / aspectRatio;
	ret.m_elements[1] = 0;
	ret.m_elements[2] = 0;
	ret.m_elements[3] = 0;

	// 第二列
	ret.m_elements[4] = 0;
	ret.m_elements[5] = f;
	ret.m_elements[6] = 0;
	ret.m_elements[7] = 0;

	// 第三列
	ret.m_elements[8] = 0;
	ret.m_elements[9] = 0;
	ret.m_elements[10] = (near + far) * rangeInv;
	ret.m_elements[11] = -1; // 这一项通常是 -1 或 1，取决于惯例（OpenGL 或 DirectX）

	// 第四列
	ret.m_elements[12] = 0;
	ret.m_elements[13] = 0;
	ret.m_elements[14] = near * far * rangeInv * 2; // 注意这里是 2 * near * far
	ret.m_elements[15] = 0;

	return ret;
}

/**
 * 角度到弧度
 * @param deg 角度
 * @returns 弧度
 */
function DegToRad(deg: number) {
	return deg * Math.PI / 180;
}

/**
 * 根据欧拉角（Yaw-Pitch-Roll）计算3×3旋转矩阵。
 * @param yaw Yaw（航向角，弧度）绕 Z 轴旋转
 * @param pitch Pitch（俯仰角，弧度）绕 Y 轴旋转
 * @param roll Roll（翻滚角，弧度）绕 X 轴旋转
 * @returns 3x3旋转矩阵
 */
function CalcRotationMatrix(yaw: number, pitch: number, roll: number): Matrix3 {
	const cy = Math.cos(yaw);
	const sy = Math.sin(yaw);
	const cp = Math.cos(pitch);
	const sp = Math.sin(pitch);
	const cr = Math.cos(roll);
	const sr = Math.sin(roll);

	return new Matrix3([
		cy * cr + sy * sp * sr,
		sr * cp,
		-sy * cr + cy * sp * sr,
		-cy * sr + sy * sp * cr,
		cr * cp,
		sr * sy + cy * sp * cr,
		sy * cp,
		-sp,
		cy * cp,
	]);
}