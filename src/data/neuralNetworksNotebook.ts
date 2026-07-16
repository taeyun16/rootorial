export const neuralNetworksLinearBoundaryCode = `import numpy as np

X = np.array([
    [0.0, 0.0],
    [0.0, 1.0],
    [1.0, 0.0],
    [1.0, 1.0],
])
y = np.array([0, 1, 1, 0])

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def classify(weights, bias):
    probabilities = sigmoid(X @ weights + bias)
    predictions = (probabilities >= 0.5).astype(int)
    return probabilities, predictions

# A representative affine boundary gets three XOR rows right.
probabilities, predictions = classify(np.array([6.0, 6.0]), -3.0)
correct = int(np.sum(predictions == y))

print("X.shape=", X.shape)
print("probabilities=", np.round(probabilities, 4))
print("predictions=", predictions.tolist())
print(f"single_affine_correct={correct}/4")

# Search a bounded integer-valued grid and compare it with the geometric argument.
best_correct = 0
best_parameters = None
for w1 in range(-3, 4):
    for w2 in range(-3, 4):
        for bias in range(-4, 5):
            _, candidate = classify(np.array([w1, w2]), bias)
            candidate_correct = int(np.sum(candidate == y))
            if candidate_correct > best_correct:
                best_correct = candidate_correct
                best_parameters = (w1, w2, bias)

print(f"grid_search_best={best_correct}/4", "at", best_parameters)
assert correct == 3
assert best_correct == 3
print("PASS: bounded search matches the geometric XOR limit")
`;

export const neuralNetworksLinearBoundaryCodeEn = neuralNetworksLinearBoundaryCode;

export const neuralNetworksHiddenRepairCode = `import numpy as np

X = np.array([
    [0.0, 0.0],
    [0.0, 1.0],
    [1.0, 0.0],
    [1.0, 1.0],
])
y = np.array([0, 1, 1, 0])

def sigmoid(z):
    return 1 / (1 + np.exp(-z))

W1 = np.array([
    [8.0, -8.0],
    [8.0, -8.0],
])
b1 = np.array([-4.0, 12.0])       # OR and NAND detectors
W2 = np.array([[8.0], [8.0]])
b2 = -12.0

hidden_logits = X @ W1 + b1

# REPAIR: this skips the hidden activation and collapses two affine maps.
hidden = hidden_logits

logits = (hidden @ W2).reshape(-1) + b2
probabilities = sigmoid(logits)
predictions = (probabilities >= 0.5).astype(int)
safe = np.clip(probabilities, 1e-7, 1 - 1e-7)
mean_bce = -np.mean(y * np.log(safe) + (1 - y) * np.log(1 - safe))
correct = int(np.sum(predictions == y))

print("X.shape=", X.shape)
print("hidden.shape=", hidden.shape)
print("logits.shape=", logits.shape)
print("probabilities=", np.round(probabilities, 4))
print("predictions=", predictions.tolist())
print(f"correct={correct}/4", f"mean_bce={mean_bce:.6f}")

assert correct == 4, "Repair the hidden activation so XOR reaches 4/4"
assert mean_bce < 0.1, "The repaired network should be confident, not barely correct"
print("PASS: hidden activation restores XOR with low BCE")
`;

export const neuralNetworksHiddenRepairCodeEn = neuralNetworksHiddenRepairCode;
