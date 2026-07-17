export const sequencesBatchedUnrollCode = `import numpy as np

inputs = np.array([
    [[1.0], [0.0], [-1.0]],
    [[-1.0], [0.0], [1.0]],
])
recurrent_gain = 0.5

hidden = np.zeros((inputs.shape[0], 1))
trace_steps = []

for timestep in range(inputs.shape[1]):
    current_input = inputs[:, timestep, :]
    hidden = np.tanh(current_input + recurrent_gain * hidden)
    trace_steps.append(hidden.copy())

trace = np.stack(trace_steps, axis=1)
final_hidden = trace[:, -1, :]
same_multiset = np.array_equal(
    np.sort(inputs[0, :, 0]),
    np.sort(inputs[1, :, 0]),
)

print("inputs.shape=", inputs.shape)
print("trace.shape=", trace.shape)
print("final_hidden.shape=", final_hidden.shape)
print("forward_trace=", np.round(trace[0, :, 0], 6).tolist())
print("reverse_trace=", np.round(trace[1, :, 0], 6).tolist())
print("same_multiset=", same_multiset)
print("final_hidden=", np.round(final_hidden[:, 0], 6).tolist())

np.testing.assert_allclose(
    trace[0, :, 0],
    [0.761594, 0.363399, -0.674144],
    atol=1e-6,
)
np.testing.assert_allclose(
    trace[1, :, 0],
    [-0.761594, -0.363399, 0.674144],
    atol=1e-6,
)
assert same_multiset
assert not np.isclose(final_hidden[0, 0], final_hidden[1, 0])
print("PASS: equal token multisets can produce different final states")
`;

export const sequencesTemporalGradientRepairCode = `import numpy as np

sequence = np.array([1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
recurrent_gain = 0.5

def unroll(values):
    hidden = 0.0
    trace = []
    for value in values:
        hidden = np.tanh(value + recurrent_gain * hidden)
        trace.append(hidden)
    return np.array(trace)

hidden = unroll(sequence)

# The input-to-first-hidden derivative has no recurrent gain.
analytic_gradient = 1 - hidden[0] ** 2

for current_hidden in hidden[1:]:
    # REPAIR: each following hidden state is reached through a recurrent edge.
    analytic_gradient *= 1 - current_hidden ** 2

epsilon = 1e-6
plus = sequence.copy()
minus = sequence.copy()
plus[0] += epsilon
minus[0] -= epsilon
numerical_gradient = (unroll(plus)[-1] - unroll(minus)[-1]) / (2 * epsilon)

print("hidden_trace=", np.round(hidden, 6).tolist())
print("timesteps=", len(sequence))
print("recurrent_edges_after_first_input=", len(sequence) - 1)
print(f"analytic_gradient={analytic_gradient:.6f}")
print(f"finite_difference={numerical_gradient:.6f}")

np.testing.assert_allclose(
    analytic_gradient,
    numerical_gradient,
    atol=1e-8,
    err_msg="Every one of the T-1 recurrent edges must contribute recurrent_gain",
)
print("PASS: analytic early-input gradient matches finite differences")
`;
