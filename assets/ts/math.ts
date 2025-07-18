interface Vec3 { x: number, y: number, z: number }
interface Vec2 { x: number, y: number }

const DefaultCubeVertices: Vec3[] = [
	{ x: -1, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }, { x: 1, y: 1, z: -1 }, { x: -1, y: 1, z: -1 },
	{ x: -1, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }
];

const DefaultCubeEdges: [number, number][] = [
	[0, 1], [1, 2], [2, 3], [3, 0],
	[4, 5], [5, 6], [6, 7], [7, 4],
	[0, 4], [1, 5], [2, 6], [3, 7]
];

/**
 * 生成一个透视投影矩阵。
 *
 * @param fovY 垂直视场角（以弧度为单位）。
 * @param aspectRatio 视口的宽高比（宽度 / 高度）。
 * @param near 最近的裁剪面距离。
 * @param far 最远的裁剪面距离。
 * @returns 16 元素的 Float32Array，表示 4x4 透视投影矩阵。
 */
function CreatePerspectiveProjectionMatrix(
	fovY: number,
	aspectRatio: number,
	near: number,
	far: number
): Float32Array {
	const matrix = new Float32Array(16);

	const f = 1.0 / Math.tan(fovY / 2);
	const rangeInv = 1.0 / (near - far);

	// 第一列
	matrix[0] = f / aspectRatio;
	matrix[1] = 0;
	matrix[2] = 0;
	matrix[3] = 0;

	// 第二列
	matrix[4] = 0;
	matrix[5] = f;
	matrix[6] = 0;
	matrix[7] = 0;

	// 第三列
	matrix[8] = 0;
	matrix[9] = 0;
	matrix[10] = (near + far) * rangeInv;
	matrix[11] = -1; // 这一项通常是 -1 或 1，取决于惯例（OpenGL 或 DirectX）

	// 第四列
	matrix[12] = 0;
	matrix[13] = 0;
	matrix[14] = near * far * rangeInv * 2; // 注意这里是 2 * near * far
	matrix[15] = 0;

	return matrix;
}

/**
 * 将一个 Vec3 点转换为齐次坐标的 Vec4。
 * @param v 要转换的 Vec3。
 * @returns 齐次坐标的 Float32Array (x, y, z, 1)。
 */
function Vec3ToHomogeneous(v: Vec3): Float32Array {
	return new Float32Array([v.x, v.y, v.z, 1.0]);
}

/**
 * 将一个齐次坐标的 Vec4 转换为 Vec3。
 * 执行透视除法。
 * @param v 齐次坐标的 Float32Array (x, y, z, w)。
 * @returns 转换后的 Vec3。
 */
function HomogeneousToVec3(v: Float32Array): Vec3 {
	const w = v[3];
	if (w === 0) {
		// 避免除以零，通常这意味着它是一个方向向量或在无限远处
		// 或者在裁剪空间中被裁剪了
		console.warn("Attempted to convert homogeneous point with w=0 to Vec3.");
		return { x: v[0], y: v[1], z: v[2] }; // 或者抛出错误，取决于具体需求
	}
	return { x: v[0] / w, y: v[1] / w, z: v[2] / w };
}

/**
 * 将 4x4 矩阵应用于 4x1 齐次向量。
 * @param matrix 4x4 矩阵 (Float32Array, 16 元素，列优先)。
 * @param vector 4x1 齐次向量 (Float32Array, 4 元素)。
 * @returns 转换后的 4x1 齐次向量 (Float32Array)。
 */
function MultiplyMatrix4ByVector4(
	matrix: Float32Array,
	vector: Float32Array
): Float32Array {
	const result = new Float32Array(4);

	// 矩阵乘法
	// result.x = m0*v0 + m4*v1 + m8*v2 + m12*v3
	// result.y = m1*v0 + m5*v1 + m9*v2 + m13*v3
	// result.z = m2*v0 + m6*v1 + m10*v2 + m14*v3
	// result.w = m3*v0 + m7*v1 + m11*v2 + m15*v3

	result[0] =
		matrix[0] * vector[0] +
		matrix[4] * vector[1] +
		matrix[8] * vector[2] +
		matrix[12] * vector[3];
	result[1] =
		matrix[1] * vector[0] +
		matrix[5] * vector[1] +
		matrix[9] * vector[2] +
		matrix[13] * vector[3];
	result[2] =
		matrix[2] * vector[0] +
		matrix[6] * vector[1] +
		matrix[10] * vector[2] +
		matrix[14] * vector[3];
	result[3] =
		matrix[3] * vector[0] +
		matrix[7] * vector[1] +
		matrix[11] * vector[2] +
		matrix[15] * vector[3];

	return result;
}

/**
 * 应用透视投影矩阵到给定的 Vec3 点。
 * @param point 要投影的 Vec3 点。
 * @param projectionMatrix 透视投影矩阵。
 * @returns 投影到标准化设备坐标 (NDC) 空间后的 Vec3 点。
 * NDC 坐标的 x 和 y 通常在 [-1, 1] 范围内，z 也在 [-1, 1] 范围内。
 */
function ProjectPoint(point: Vec3, projectionMatrix: Float32Array): Vec3 {
	// 1. 将 Vec3 转换为齐次坐标 (Vec4)
	const homogeneousPoint = Vec3ToHomogeneous(point);

	// 2. 将投影矩阵应用于齐次坐标
	const transformedHomogeneousPoint = MultiplyMatrix4ByVector4(
		projectionMatrix,
		homogeneousPoint
	);

	// 3. 执行透视除法，将齐次坐标转换回 Vec3 (NDC 空间)
	const projectedVec3 = HomogeneousToVec3(transformedHomogeneousPoint);

	return projectedVec3;
}

function DegToRad(deg: number) {
	return deg * Math.PI / 180;
}

function MultiplyMatrixAndPoint(m: number[][], p: Vec3): Vec3 {
	const x = m[0][0] * p.x + m[0][1] * p.y + m[0][2] * p.z;
	const y = m[1][0] * p.x + m[1][1] * p.y + m[1][2] * p.z;
	const z = m[2][0] * p.x + m[2][1] * p.y + m[2][2] * p.z;
	return { x, y, z };
}

function GetRotationMatrix(yaw: number, pitch: number, roll: number): number[][] {
	const cy = Math.cos(DegToRad(yaw));
	const sy = Math.sin(DegToRad(yaw));
	const cp = Math.cos(DegToRad(pitch));
	const sp = Math.sin(DegToRad(pitch));
	const cr = Math.cos(DegToRad(roll));
	const sr = Math.sin(DegToRad(roll));

	return [
		[cy * cr + sy * sp * sr, sr * cp, -sy * cr + cy * sp * sr],
		[-cy * sr + sy * sp * cr, cr * cp, sr * sy + cy * sp * cr],
		[sy * cp, -sp, cy * cp]
	];
}