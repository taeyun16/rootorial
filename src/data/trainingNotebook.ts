export const trainingSoftmaxAxisRepairCode = `import numpy as np

logits = np.array([
    [3.0, 1.0, 0.0],
    [0.0, 2.0, 1.0],
])
labels = np.array([0, 1])
changed_logits = logits.copy()
changed_logits[1] = np.array([-100.0, 40.0, 5.0])

# REPAIR: classes are columns, so normalize across axis 1.
class_axis = 0

def stable_softmax(values, axis):
    shifted = values - np.max(values, axis=axis, keepdims=True)
    exponentials = np.exp(shifted)
    return exponentials / np.sum(exponentials, axis=axis, keepdims=True)

probabilities = stable_softmax(logits, class_axis)
changed_probabilities = stable_softmax(changed_logits, class_axis)
row_sums = np.sum(probabilities, axis=1)
first_row_shift = np.max(np.abs(
    probabilities[0] - changed_probabilities[0]
))
mean_ce = -np.mean(np.log(
    probabilities[np.arange(len(labels)), labels]
))

print(f"class_axis={class_axis}")
print("row_sums=", np.round(row_sums, 6))
print(f"max_first_row_shift={first_row_shift:.6f}")
print(f"mean_ce={mean_ce:.6f}")

assert np.allclose(row_sums, np.ones(2)), (
    "Each sample row must distribute exactly one unit of probability"
)
assert first_row_shift < 1e-12, (
    "Changing sample 2 must not change sample 1 probabilities"
)
assert np.isclose(mean_ce, 0.288725992, atol=1e-6)
print("PASS: class-axis softmax keeps rows normalized and independent")
`;

export const trainingSoftmaxAxisRepairCodeEn = trainingSoftmaxAxisRepairCode;

export const trainingAdamEpochCode = `import numpy as np

X = np.array([
    [2.0, 0.0],
    [1.5, 0.5],
    [0.0, 2.0],
    [0.5, 1.5],
    [-1.5, -1.5],
    [-2.0, -1.0],
    [1.0, 1.0],
])
y = np.array([0, 0, 1, 1, 2, 2, 1])
batches = [np.array([0, 1]), np.array([2, 3]),
           np.array([4, 5]), np.array([6])]

W = np.array([
    [0.8, 0.0, -0.8],
    [0.0, 0.8, -0.8],
])
bias = np.zeros(3)
m_W = np.zeros_like(W)
v_W = np.zeros_like(W)
m_bias = np.zeros_like(bias)
v_bias = np.zeros_like(bias)
step = 0

learning_rate = 0.15
beta_1 = 0.9
beta_2 = 0.999
epsilon = 1e-8

def stable_softmax(logits):
    shifted = logits - np.max(logits, axis=1, keepdims=True)
    exponentials = np.exp(shifted)
    return exponentials / np.sum(exponentials, axis=1, keepdims=True)

def mean_cross_entropy(features, labels):
    logits = features @ W + bias
    probabilities = stable_softmax(logits)
    return -np.mean(np.log(
        probabilities[np.arange(len(labels)), labels]
    ))

initial_full_loss = mean_cross_entropy(X, y)
print(f"initial_full_loss={initial_full_loss:.6f}")

for batch_indices in batches:
    step += 1
    batch_X = X[batch_indices]
    batch_y = y[batch_indices]

    # A fresh array is the batch gradient buffer; Adam memory stays outside.
    probabilities = stable_softmax(batch_X @ W + bias)
    grad_logits = probabilities.copy()
    grad_logits[np.arange(len(batch_y)), batch_y] -= 1
    grad_logits /= len(batch_y)
    grad_W = batch_X.T @ grad_logits
    grad_bias = np.sum(grad_logits, axis=0)

    m_W = beta_1 * m_W + (1 - beta_1) * grad_W
    v_W = beta_2 * v_W + (1 - beta_2) * grad_W ** 2
    m_bias = beta_1 * m_bias + (1 - beta_1) * grad_bias
    v_bias = beta_2 * v_bias + (1 - beta_2) * grad_bias ** 2

    corrected_m_W = m_W / (1 - beta_1 ** step)
    corrected_v_W = v_W / (1 - beta_2 ** step)
    corrected_m_bias = m_bias / (1 - beta_1 ** step)
    corrected_v_bias = v_bias / (1 - beta_2 ** step)

    W -= learning_rate * corrected_m_W / (
        np.sqrt(corrected_v_W) + epsilon
    )
    bias -= learning_rate * corrected_m_bias / (
        np.sqrt(corrected_v_bias) + epsilon
    )

    print(
        f"step={step}",
        f"batch={batch_indices.tolist()}",
        f"rows={len(batch_indices)}",
        f"full_loss={mean_cross_entropy(X, y):.6f}",
    )

final_full_loss = mean_cross_entropy(X, y)
print(f"final_full_loss={final_full_loss:.6f}")
print(f"adam_step={step}", f"tail_batch={batches[-1].tolist()}")

assert step == 4
assert batches[-1].tolist() == [6]
assert np.isclose(final_full_loss, 0.225353, atol=1e-6)
assert final_full_loss < initial_full_loss
print("PASS: fresh batch gradients and persistent Adam state complete one epoch")
`;

export const trainingAdamEpochCodeEn = trainingAdamEpochCode;
