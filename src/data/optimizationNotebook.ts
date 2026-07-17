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

export const optimizationGradientRepairCode = `import numpy as np

x = np.array([-1.0, 0.0, 1.0])
y = np.array([-1.0, 1.0, 3.0])
X = np.column_stack([np.ones_like(x), x])
W = np.array([-2.0, -1.0])

def mse(weights):
    residual = X @ weights - y
    return np.mean(residual ** 2)

epsilon = 1e-6
numerical_gradient = np.array([
    (
        mse(W + epsilon * np.eye(len(W))[index])
        - mse(W - epsilon * np.eye(len(W))[index])
    ) / (2 * epsilon)
    for index in range(len(W))
])

residual = X @ W - y

# REPAIR: this is an unscaled residual sum, not the MSE gradient.
gradient = X.T @ residual

print("residual=", residual.tolist())
print("analytic_gradient=", np.round(gradient, 6).tolist())
print("finite_difference=", np.round(numerical_gradient, 6).tolist())

assert np.allclose(gradient, numerical_gradient, atol=1e-6), (
    "MSE gradient must include the derivative of the square and the batch mean"
)
print("PASS: analytic MSE gradient matches the finite-difference probe")
`;

export const optimizationGradientRepairCodeEn = optimizationGradientRepairCode;
