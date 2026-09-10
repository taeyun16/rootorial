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

export const vectorMagnitudeCodeEn = vectorMagnitudeCode.replace("크기 ||v||:", "magnitude ||v||:");
