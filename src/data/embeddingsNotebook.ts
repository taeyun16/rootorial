export const embeddingsLookupMaskedMeanCode = `import numpy as np

# The chapter's complete 11 x 2 embedding table.
E = np.array([
    [0.00, 0.00],
    [-0.45, -0.45],
    [0.90, 0.35],
    [0.82, 0.42],
    [-0.78, 0.22],
    [0.18, 0.88],
    [0.10, 0.75],
    [0.84, 0.32],
    [0.76, 0.38],
    [-0.12, 0.70],
    [-0.25, 0.58],
])
ids = np.array([
    [7, 8, 6],
    [2, 5, 0],
])

direct = E[ids]
one_hot = np.eye(E.shape[0])[ids]
via_one_hot = one_hot @ E

mask = (ids != 0)[..., None]
masked_mean = (direct * mask).sum(axis=1) / mask.sum(axis=1)
max_difference = np.max(np.abs(direct - via_one_hot))

print("E.shape=", E.shape)
print("ids.shape=", ids.shape)
print("one_hot.shape=", one_hot.shape)
print("lookup.shape=", direct.shape)
print("max_difference=", max_difference)
print("masked_mean.shape=", masked_mean.shape)
print("masked_mean=", np.round(masked_mean, 6))

np.testing.assert_allclose(direct, via_one_hot)
np.testing.assert_allclose(masked_mean, [[0.5666667, 0.4833333], [0.54, 0.615]])
print("PASS: direct lookup equals one-hot multiplication and PAD is excluded")
`;

export const embeddingsScatterAddRepairCode = `import numpy as np

ids = np.array([2, 2, 5])
upstream = np.array([
    [0.2, -0.1],
    [0.2, -0.1],
    [0.2, -0.1],
])
gradient = np.zeros((11, 2))

# REPAIR: advanced indexing does not accumulate repeated row IDs.
gradient[ids] += upstream

print("ids=", ids.tolist())
print("row_2_gradient=", gradient[2])
print("row_5_gradient=", gradient[5])

np.testing.assert_allclose(
    gradient[2],
    [0.4, -0.2],
    err_msg="Repeated ID 2 must receive both upstream contributions",
)
np.testing.assert_allclose(gradient[5], [0.2, -0.1])
print("PASS: scatter-add accumulates every repeated-token contribution")
`;
