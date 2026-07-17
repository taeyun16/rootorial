export const attentionThreeQueryCode = `import numpy as np

slot_names = np.array(["subject", "place", "action"])
Q = np.array([
    [1.4, 0.1],
    [0.1, 1.4],
    [-1.0, -1.0],
])
K = np.array([
    [1.0, 0.0],
    [0.0, 1.0],
    [-0.8, -0.8],
])
V = np.array([
    [0.9, 0.2, 0.1],
    [0.1, 0.9, 0.3],
    [0.2, 0.1, 1.0],
])

def stable_softmax(rows):
    shifted = rows - np.max(rows, axis=1, keepdims=True)
    exponentials = np.exp(shifted)
    return exponentials / np.sum(exponentials, axis=1, keepdims=True)

scores = Q @ K.T
weights = stable_softmax(scores)
contexts = weights @ V
row_sums = np.sum(weights, axis=1)
top_slots = slot_names[np.argmax(weights, axis=1)]

print("Q.shape=", Q.shape)
print("K.shape=", K.shape)
print("V.shape=", V.shape)
print("scores.shape=", scores.shape)
print("weights.shape=", weights.shape)
print("contexts.shape=", contexts.shape)
print("row_sums=", np.round(row_sums, 6))
print("top_slots=", top_slots.tolist())
print("contexts=\\n", np.round(contexts, 6))

assert scores.shape == (3, 3)
assert contexts.shape == (3, 3)
np.testing.assert_allclose(row_sums, np.ones(3))
assert top_slots.tolist() == ["subject", "place", "action"]
print("PASS: each query owns one key-axis distribution and reads values")
`;

export const attentionValueReadRepairCode = `import numpy as np

Q = np.array([
    [1.4, 0.1],
    [0.1, 1.4],
    [-1.0, -1.0],
])
K = np.array([
    [1.0, 0.0],
    [0.0, 1.0],
    [-0.8, -0.8],
])
V = np.array([
    [0.9, 0.2, 0.1],
    [0.1, 0.9, 0.3],
    [0.2, 0.1, 1.0],
])
changed_V = V.copy()
changed_V[2] = np.array([0.8, 0.6, 0.4])

def stable_softmax(rows):
    shifted = rows - np.max(rows, axis=1, keepdims=True)
    exponentials = np.exp(shifted)
    return exponentials / np.sum(exponentials, axis=1, keepdims=True)

def read_context(weights, values):
    # REPAIR: weights route value content, not key addresses.
    return weights @ K

scores = Q @ K.T
weights = stable_softmax(scores)
changed_scores = Q @ K.T
changed_weights = stable_softmax(changed_scores)
context = read_context(weights, V)
changed_context = read_context(changed_weights, changed_V)

scores_stable = np.allclose(scores, changed_scores)
weights_stable = np.allclose(weights, changed_weights)
context_changed = not np.allclose(context, changed_context)

print("scores_stable=", scores_stable)
print("weights_stable=", weights_stable)
print("context_changed=", context_changed)
print("context.shape=", context.shape)
print("expected_context_shape=", (Q.shape[0], V.shape[1]))

assert scores_stable
assert weights_stable
assert context.shape == (3, 3), "Context width must come from V"
assert context_changed, "Changing only V must change the value readout"
print("PASS: V-only edits preserve routing and change the context content")
`;
