export const transformerBlockStageLedgerCode = `import numpy as np

np.set_printoptions(precision=6, suppress=True)
EPSILON = 1e-5

def layer_norm_rows(matrix):
    mean = matrix.mean(axis=1, keepdims=True)
    variance = ((matrix - mean) ** 2).mean(axis=1, keepdims=True)
    normalized = (matrix - mean) / np.sqrt(variance + EPSILON)
    return normalized, mean[:, 0], variance[:, 0]

# Four token rows. Row 0 is the hand-worked ledger shown in the chapter.
x0_fixture = np.array([
    [1.0, 1.0, 2.0, 1.0],
    [1.0, 2.0, 1.0, 1.0],
    [2.0, 1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0, 2.0],
])
positions = np.arange(4)[:, None]
frequencies = 10000 ** (np.arange(0, 4, 2) / 4)
angles = positions / frequencies
P = np.zeros((4, 4))
P[:, 0::2] = np.sin(angles)
P[:, 1::2] = np.cos(angles)
E = x0_fixture - P
x0 = E + P

norm1, mean1, variance1 = layer_norm_rows(x0)

# A transparent attention-branch fixture: every row uses the same feature map.
attention_output = norm1[:, [2, 0, 1, 3]]
x1 = x0 + attention_output

norm2, _, _ = layer_norm_rows(x1)
W1 = np.eye(4)
hidden = np.maximum(norm2 @ W1, 0.0)
W2 = np.array([
    [0.45193200356212454, -0.19761685932652193, 0.16238513668269558, -0.24537271571380417],
    [0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0],
])
ffn_output = hidden @ W2
y = x1 + ffn_output

print("token0.E=", E[0])
print("token0.P=", P[0])
print("token0.x0=", x0[0])
print("token0.mean=", round(mean1[0], 6))
print("token0.variance=", round(variance1[0], 6))
print("token0.LN(x0)=", norm1[0])
print("token0.x1=", x1[0])
print("token0.FFN=", ffn_output[0])
print("token0.y=", y[0])
print("stage_shapes=", [stage.shape for stage in [E, P, x0, norm1, x1, ffn_output, y]])

np.testing.assert_allclose(E[0], [1.0, 0.0, 2.0, 0.0], atol=1e-6)
np.testing.assert_allclose(P[0], [0.0, 1.0, 0.0, 1.0], atol=1e-6)
np.testing.assert_allclose(x0[0], [1.0, 1.0, 2.0, 1.0], atol=1e-6)
np.testing.assert_allclose(np.round(norm1[0], 6), [-0.577335, -0.577335, 1.732005, -0.577335])
np.testing.assert_allclose(np.round(x1[0], 6), [2.732005, 0.422665, 1.422665, 0.422665])
np.testing.assert_allclose(np.round(ffn_output[0], 6), [0.706470, -0.308919, 0.253844, -0.383572])
np.testing.assert_allclose(np.round(y[0], 6), [3.438475, 0.113746, 1.676509, 0.039093])
assert all(stage.shape == (4, 4) for stage in [E, P, x0, norm1, x1, ffn_output, y])
print("PASS: feature-axis LayerNorm and both residual stages preserve [4, 4]")
print("PROVES: the stated fixture follows the chapter's pre-norm stage contract")
print("DOES NOT PROVE: this tiny fixed branch is a trained production Transformer")
`;

export const transformerBlockResidualRepairCode = `import numpy as np

np.set_printoptions(precision=6, suppress=True)
EPSILON = 1e-5

def layer_norm_rows(matrix):
    mean = matrix.mean(axis=1, keepdims=True)
    variance = ((matrix - mean) ** 2).mean(axis=1, keepdims=True)
    return (matrix - mean) / np.sqrt(variance + EPSILON)

x0 = np.array([
    [1.0, 1.0, 2.0, 1.0],
    [1.0, 2.0, 1.0, 1.0],
    [2.0, 1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0, 2.0],
])
attention_output = layer_norm_rows(x0)[:, [2, 0, 1, 3]]
x1 = x0 + attention_output
F = np.array([
    [0.706470, -0.308919, 0.253844, -0.383572],
    [0.210000, -0.120000, 0.080000, -0.050000],
    [-0.160000, 0.240000, -0.090000, 0.110000],
    [0.050000, -0.070000, 0.180000, -0.140000],
])

# REPAIR: the second residual must add the state produced by the first residual.
y = x0 + F
expected = x1 + F
max_skip_error = np.max(np.abs(y - expected))

print("x0.shape=", x0.shape)
print("x1.shape=", x1.shape)
print("F.shape=", F.shape)
print("y.shape=", y.shape)
print("token0.y=", y[0])
print("token0.expected=", expected[0])
print("max_skip_error=", round(float(max_skip_error), 6))

assert y.shape == (4, 4)
np.testing.assert_allclose(
    y,
    expected,
    atol=1e-6,
    err_msg="Second residual must use x1, not x0",
)
print("PASS: y = x1 + F preserves the first residual update")
`;
