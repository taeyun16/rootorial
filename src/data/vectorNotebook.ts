export const vectorMagnitudeCode = `import numpy as np
import matplotlib.pyplot as plt

v = np.array([3.0, 2.0])

print("shape:", v.shape)
print("dtype:", v.dtype)
print("크기 ||v||:", round(np.linalg.norm(v), 3))

fig, ax = plt.subplots(figsize=(6, 4))
ax.quiver(0, 0, v[0], v[1], angles="xy", scale_units="xy", scale=1,
          color="#1d4f45", width=0.012)
ax.scatter([0, v[0]], [0, v[1]], color=["#18201d", "#d97757"], zorder=3)
ax.set(xlim=(-1, 4), ylim=(-1, 3), xlabel="x", ylabel="y",
       title="A vector is magnitude + direction")
ax.set_aspect("equal")
ax.grid(alpha=0.22)
plt.show()`;

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
print("rank:", batch.ndim, "dimensions:", batch.size)`;

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
    ["token embeddings", "+ positional values"],
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
ax.plot(degrees, cosine, color="#5b5bd6", linewidth=2.5)
ax.axhline(0, color="#66706a", linewidth=1)
ax.axvline(90, color="#d97757", linestyle="--", label="orthogonal")
ax.fill_between(degrees, cosine, 0, where=cosine >= 0, color="#1d4f45", alpha=0.12)
ax.fill_between(degrees, cosine, 0, where=cosine < 0, color="#d97757", alpha=0.12)
ax.set(xlim=(0, 180), ylim=(-1.08, 1.08), xlabel="angle (degrees)",
       ylabel="cosine similarity", title="Direction becomes a similarity score")
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
colors = ["#1d4f45", "#5b5bd6", "#d97757"]
labels = ["v", "w", "projection of w on v"]
for vector, color, label in zip(vectors, colors, labels):
    ax.quiver(0, 0, vector[0], vector[1], angles="xy", scale_units="xy",
              scale=1, color=color, width=0.009, label=label)
ax.plot([parallel[0], w[0]], [parallel[1], w[1]], "--", color="#66706a")
ax.set(xlim=(-2, 4), ylim=(-1, 4), xlabel="x", ylabel="y",
       title="w = parallel + perpendicular")
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

print("similarity scores shape:", scores.shape)
print("attention row sums:", np.round(weights.sum(axis=-1), 6))
print(np.round(weights, 3))

fig, ax = plt.subplots(figsize=(5, 4))
image = ax.imshow(weights, cmap="YlGn", vmin=0, vmax=1)
ax.set(title="Self-attention preview", xlabel="key token", ylabel="query token")
ax.set_xticks(range(3), labels=["token 1", "token 2", "token 3"])
ax.set_yticks(range(3), labels=["token 1", "token 2", "token 3"])
for row in range(3):
    for column in range(3):
        ax.text(column, row, f"{weights[row, column]:.2f}", ha="center", va="center")
fig.colorbar(image, ax=ax, shrink=0.8)
plt.show()`;
