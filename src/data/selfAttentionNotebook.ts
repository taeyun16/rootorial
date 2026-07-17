export const selfAttentionForwardTraceCode = `import numpy as np

tokens = ["the", "cat", "sat", "<pad>"]
X = np.array([
    [1.0, 0.0, 2.0, 0.0],
    [0.0, 1.0, 1.0, 0.0],
    [1.0, 1.0, 0.0, 1.0],
    [0.0, 0.0, 1.0, 1.0],
])
W_Q = np.eye(4)
W_K = np.array([
    [1.0, 0.0, 0.0, 0.0],
    [0.0, 1.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 1.0],
    [0.0, 0.0, 1.0, 0.0],
])
W_V = np.array([
    [0.0, 0.0, 1.0, 0.0],
    [0.0, 0.0, 0.0, 1.0],
    [1.0, 0.0, 0.0, 0.0],
    [0.0, 1.0, 0.0, 0.0],
])

HEADS = 2
T, D_MODEL = X.shape
D_HEAD = D_MODEL // HEADS

def split_heads(matrix):
    return matrix.reshape(T, HEADS, D_HEAD).transpose(1, 0, 2)

def masked_row_softmax(scores, allowed):
    masked = np.where(allowed, scores, -np.inf)
    maximum = np.max(masked, axis=-1, keepdims=True)
    safe_maximum = np.where(np.isfinite(maximum), maximum, 0.0)
    exponentials = np.where(allowed, np.exp(scores - safe_maximum), 0.0)
    totals = exponentials.sum(axis=-1, keepdims=True)
    return np.divide(
        exponentials,
        totals,
        out=np.zeros_like(exponentials),
        where=totals > 0,
    ), masked

Q = X @ W_Q
K = X @ W_K
V = X @ W_V
Q_heads = split_heads(Q)
K_heads = split_heads(K)
V_heads = split_heads(V)

raw_scores = Q_heads @ K_heads.transpose(0, 2, 1)
scaled_scores = raw_scores / np.sqrt(D_HEAD)
causal = np.tril(np.ones((T, T), dtype=bool))
key_visible = np.array([True, True, True, False])
query_active = np.array([True, True, True, False])
allowed = (
    causal[None, :, :]
    & key_visible[None, None, :]
    & query_active[None, :, None]
)
weights, masked_scores = masked_row_softmax(scaled_scores, allowed)
head_contexts = weights @ V_heads
concatenated = head_contexts.transpose(1, 0, 2).reshape(T, D_MODEL)

sat = tokens.index("sat")
head_1 = 1  # zero-based: the second of two heads
print("Q.shape=", Q.shape, "K.shape=", K.shape, "V.shape=", V.shape)
print("heads.shape=", Q_heads.shape)
print("raw_sat=", raw_scores[head_1, sat])
print("scaled_sat=", np.round(scaled_scores[head_1, sat], 6))
print("masked_sat=", np.round(masked_scores[head_1, sat], 6))
print("weights_sat=", np.round(weights[head_1, sat], 6))
print("context_head_1_sat=", np.round(head_contexts[head_1, sat], 6))
print("concat_sat=", np.round(concatenated[sat], 6))
print("active_row_sums_head_1=", np.round(weights[head_1, :3].sum(axis=1), 6))
print("inactive_padding_query=", weights[head_1, 3])

np.testing.assert_allclose(raw_scores[head_1, sat], [2.0, 1.0, 0.0, 1.0])
np.testing.assert_allclose(
    weights[head_1, sat],
    [0.575975, 0.283995, 0.140029, 0.0],
    atol=1e-6,
)
np.testing.assert_allclose(
    head_contexts[head_1, sat],
    [0.716005, 0.424025],
    atol=1e-6,
)
np.testing.assert_allclose(
    concatenated[sat],
    [0.744765, 0.503490, 0.716005, 0.424025],
    atol=1e-6,
)
np.testing.assert_allclose(weights[:, :3].sum(axis=-1), np.ones((2, 3)))
np.testing.assert_allclose(weights[:, :, 3], np.zeros((2, 4)))
np.testing.assert_allclose(weights[:, 3, :], np.zeros((2, 4)))
print("PASS: projections, head split, causal attention, and concat agree")
`;

export const selfAttentionMaskRepairCode = `import numpy as np

# This cell rebuilds its own fixture; it does not depend on another cell.
X = np.array([
    [1.0, 0.0, 2.0, 0.0],
    [0.0, 1.0, 1.0, 0.0],
    [1.0, 1.0, 0.0, 1.0],
    [0.0, 0.0, 1.0, 1.0],
])
W_Q = np.eye(4)
W_K = np.array([
    [1.0, 0.0, 0.0, 0.0],
    [0.0, 1.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 1.0],
    [0.0, 0.0, 1.0, 0.0],
])

T = X.shape[0]
D_HEAD = 2
Q_head_1 = (X @ W_Q)[:, 2:]
K_head_1 = (X @ W_K)[:, 2:]
scaled_scores = (Q_head_1 @ K_head_1.T) / np.sqrt(D_HEAD)

causal = np.tril(np.ones((T, T), dtype=bool))
key_visible = np.array([True, True, True, False])
query_active = np.array([True, True, True, False])
allowed = causal & key_visible[None, :] & query_active[:, None]

def row_softmax(scores):
    shifted = scores - np.max(scores, axis=1, keepdims=True)
    exponentials = np.exp(shifted)
    return exponentials / exponentials.sum(axis=1, keepdims=True)

def masked_row_softmax(scores, visibility):
    masked = np.where(visibility, scores, -np.inf)
    maximum = np.max(masked, axis=1, keepdims=True)
    safe_maximum = np.where(np.isfinite(maximum), maximum, 0.0)
    exponentials = np.where(
        visibility,
        np.exp(scores - safe_maximum),
        0.0,
    )
    totals = exponentials.sum(axis=1, keepdims=True)
    return np.divide(
        exponentials,
        totals,
        out=np.zeros_like(exponentials),
        where=totals > 0,
    )

# REPAIR: masking must happen before softmax can renormalize allowed keys.
mask_before_softmax = False

if mask_before_softmax:
    weights = masked_row_softmax(scaled_scores, allowed)
    mode = "mask-before-softmax"
else:
    weights = np.where(allowed, row_softmax(scaled_scores), 0.0)
    mode = "softmax-then-zero"

active_row_sums = weights[:3].sum(axis=1)
future_positions = np.triu(np.ones((T, T), dtype=bool), k=1)
future_mass = weights[future_positions].sum()
padding_key_mass = weights[:3, 3].sum()
inactive_query_mass = weights[3].sum()

print("mode=", mode)
print("active_row_sums=", np.round(active_row_sums, 6))
print(f"future_mass={future_mass:.6f}")
print(f"padding_key_mass={padding_key_mass:.6f}")
print(f"inactive_query_mass={inactive_query_mass:.6f}")

if not mask_before_softmax:
    np.testing.assert_allclose(
        active_row_sums,
        [0.097785, 0.330238, 0.778819],
        atol=1e-6,
    )

np.testing.assert_allclose(
    active_row_sums,
    np.ones(3),
    err_msg="Allowed keys must be renormalized to one",
)
assert np.isclose(future_mass, 0.0)
assert np.isclose(padding_key_mass, 0.0)
assert np.isclose(inactive_query_mass, 0.0)
print("PASS: mask-before-softmax preserves unit active rows and zero blocked mass")
`;
