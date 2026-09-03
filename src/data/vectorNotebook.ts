export const vectorMagnitudeCode = `import numpy as np
import matplotlib.pyplot as plt

v = np.array([3.0, 2.0])

print("shape:", v.shape)
print("dtype:", v.dtype)
print("크기 ||v||:", round(np.linalg.norm(v), 3))

fig, ax = plt.subplots(figsize=(6, 4))
ax.quiver(0, 0, v[0], v[1], angles="xy", scale_units="xy", scale=1,
          color="#365548", width=0.012)
ax.scatter([0, v[0]], [0, v[1]], color=["#252420", "#8f4f3c"], zorder=3)
ax.set(xlim=(-1, 4), ylim=(-1, 3), xlabel="x", ylabel="y",
       title="벡터는 크기 + 방향")
ax.set_aspect("equal")
ax.grid(alpha=0.22)
plt.show()`;

export const vectorOrientationCode = `import numpy as np

as_array = np.array([1, 2, 3])          # 방향이 없는 rank-1 배열
row = np.array([[1, 2, 3]])             # 1행 3열
column = np.array([[1], [2], [3]])      # 3행 1열

for name, value in [("array", as_array), ("row", row), ("column", column)]:
    print(f"{name:>6}: shape={value.shape}, rank={value.ndim}")

print("\n1차원 배열의 전치:", as_array.T.shape, "(바뀌지 않음)")
print("행벡터의 전치:     ", row.T.shape)
print("열벡터의 전치:     ", column.T.shape)
print("열 + 행 broadcast:\n", column + row)`;

export const tensorShapeCode = `import numpy as np

token = np.array([0.8, -0.3, 1.1, 0.2])
sequence = np.stack([
    token,
    [0.1, 0.7, -0.4, 0.9],
    [-0.5, 0.2, 0.6, 1.0],
])
batch = np.stack([sequence, sequence * 0.5])

print("token    [d_model]                =", token.shape)
print("sequence [tokens, d_model]        =", sequence.shape)
print("batch    [batch, tokens, d_model] =", batch.shape)
print("rank:", batch.ndim, "elements:", batch.size)`;

export const broadcastingHeatmapCode = `import numpy as np
import matplotlib.pyplot as plt

tokens = np.array([
    [0.8, -0.3, 1.1, 0.2],
    [0.1, 0.7, -0.4, 0.9],
    [-0.5, 0.2, 0.6, 1.0],
])
batch = np.stack([tokens, tokens * 0.5])       # [2, 3, 4]
positions = np.array([
    [0.0, 0.1, 0.0, 0.1],
    [0.1, 0.0, 0.1, 0.0],
    [0.2, 0.1, 0.0, 0.1],
])                                              # [3, 4]
encoded = batch + positions                    # broadcast over batch

print("before:", batch.shape, "positions:", positions.shape)
print("after: ", encoded.shape)
print("같은 위치 행렬이 적용되었나:", np.allclose(encoded[0] - batch[0], positions))

fig, axes = plt.subplots(1, 2, figsize=(8, 3), constrained_layout=True)
for ax, values, title in zip(
    axes,
    [batch[0], encoded[0]],
    ["token embeddings 토큰 임베딩", "+ positional values 위치 값"],
):
    image = ax.imshow(values, cmap="RdYlGn", vmin=-1.2, vmax=1.2, aspect="auto")
    ax.set(title=title, xlabel="d_model", ylabel="token")
fig.colorbar(image, ax=axes, shrink=0.8)
plt.show()`;

export const cosineCurveCode = `import numpy as np
import matplotlib.pyplot as plt

degrees = np.linspace(0, 180, 181)
cosine = np.cos(np.deg2rad(degrees))

for angle in [0, 45, 90, 135, 180]:
    print(f"{angle:>3}° -> cosine {np.cos(np.deg2rad(angle)): .3f}")

fig, ax = plt.subplots(figsize=(7, 3.6))
ax.plot(degrees, cosine, color="#465d6a", linewidth=2.5)
ax.axhline(0, color="#625f58", linewidth=1)
ax.axvline(90, color="#8f4f3c", linestyle="--", label="orthogonal")
ax.fill_between(degrees, cosine, 0, where=cosine >= 0, color="#365548", alpha=0.12)
ax.fill_between(degrees, cosine, 0, where=cosine < 0, color="#8f4f3c", alpha=0.12)
ax.set(xlim=(0, 180), ylim=(-1.08, 1.08), xlabel="angle (degrees)",
       ylabel="cosine similarity", title="방향이 유사도 점수로")
ax.legend()
ax.grid(alpha=0.18)
plt.show()`;

export const projectionCode = `import numpy as np
import matplotlib.pyplot as plt

v = np.array([3.0, 2.0])
w = np.array([-1.0, 3.0])
parallel = np.dot(w, v) / np.dot(v, v) * v
perpendicular = w - parallel

print("parallel component:", np.round(parallel, 3))
print("perpendicular component:", np.round(perpendicular, 3))
print("reconstruction:", np.round(parallel + perpendicular, 3))
print("orthogonality check:", round(float(np.dot(v, perpendicular)), 6))

fig, ax = plt.subplots(figsize=(6, 5))
vectors = [v, w, parallel]
colors = ["#365548", "#465d6a", "#8f4f3c"]
labels = ["v", "w", "projection of w on v"]
for vector, color, label in zip(vectors, colors, labels):
    ax.quiver(0, 0, vector[0], vector[1], angles="xy", scale_units="xy",
              scale=1, color=color, width=0.009, label=label)
ax.plot([parallel[0], w[0]], [parallel[1], w[1]], "--", color="#625f58")
ax.set(xlim=(-2, 4), ylim=(-1, 4), xlabel="x", ylabel="y",
       title="w = parallel 평행 + perpendicular 수직")
ax.set_aspect("equal")
ax.grid(alpha=0.2)
ax.legend(loc="upper left")
plt.show()`;

export const attentionPreviewCode = `import numpy as np
import matplotlib.pyplot as plt

X = np.array([
    [1.0, 0.2, 0.1, 0.0],
    [0.9, 0.1, 0.2, 0.1],
    [0.0, 0.2, 0.8, 1.0],
])
d_model = X.shape[-1]
scores = X @ X.T / np.sqrt(d_model)
weights = np.exp(scores - scores.max(axis=-1, keepdims=True))
weights = weights / weights.sum(axis=-1, keepdims=True)
context = weights @ X

print("similarity scores shape:", scores.shape)
print("attention row sums:", np.round(weights.sum(axis=-1), 6))
print(np.round(weights, 3))
print("context vectors shape:", context.shape)
print("token 1 context:", np.round(context[0], 3))

fig, ax = plt.subplots(figsize=(5, 4))
image = ax.imshow(weights, cmap="YlGn", vmin=0, vmax=1)
ax.set(title="Self-attention 미리보기", xlabel="key token", ylabel="query token")
ax.set_xticks(range(3), labels=["token 1", "token 2", "token 3"])
ax.set_yticks(range(3), labels=["token 1", "token 2", "token 3"])
for row in range(3):
    for column in range(3):
        ax.text(column, row, f"{weights[row, column]:.2f}", ha="center", va="center")
fig.colorbar(image, ax=ax, shrink=0.8)
plt.show()`;

export const vectorMagnitudeCodeEn = vectorMagnitudeCode.replace("크기 ||v||:", "magnitude ||v||:");

export const vectorOrientationCodeEn = vectorOrientationCode
  .replace("# 방향이 없는 rank-1 배열", "# rank-1 array with no row/column orientation")
  .replace("# 1행 3열", "# 1 row, 3 columns")
  .replace("# 3행 1열", "# 3 rows, 1 column")
  .replace("1차원 배열의 전치:", "transpose of rank-1 array:")
  .replace("(바뀌지 않음)", "(unchanged)")
  .replace("행벡터의 전치:", "transpose of row vector:")
  .replace("열벡터의 전치:", "transpose of column vector:")
  .replace("열 + 행 broadcast:", "column + row broadcast:");

export const broadcastingHeatmapCodeEn = broadcastingHeatmapCode.replace(
  "같은 위치 행렬이 적용되었나:",
  "same positional matrix applied:",
);
