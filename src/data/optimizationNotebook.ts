export const optimizationNumpyCode = `import numpy as np

x = np.array([-1.0, 0.0, 1.0])
y = np.array([-1.0, 1.0, 3.0])
X = np.column_stack([np.ones_like(x), x])

W = np.array([-2.0, -1.0])  # [bias, slope]
learning_rate = 0.30

for step in range(7):
    residual = X @ W - y
    loss = np.mean(residual ** 2)
    gradient = (2 / len(y)) * X.T @ residual
    print(
        f"step={step:02d}",
        f"W={np.round(W, 4)}",
        f"loss={loss:.6f}",
        f"grad={np.round(gradient, 4)}",
    )
    W = W - learning_rate * gradient
`;

export const optimizationNumpyCodeEn = optimizationNumpyCode;
