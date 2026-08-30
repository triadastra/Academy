# 8.3 Neural Networks and Deep Learning

A **neural network** is a type of machine learning modelled after the human brain, using **interconnected nodes** to learn through trial and error.

## Structure

**Nodes** are the basic processing units. They form **layers**, each processing a different level of detail in the data.

| Layer | Role |
|---|---|
| **Input layer** | Receives raw data |
| **Hidden layers** | Process data through transformations |
| **Output layer** | Produces the final prediction |

Each node processes a specific aspect within its layer, with **dense connections to all nodes in the next layer**.

**Deep learning** means neural networks with **many** layers.

## Example 1: a college acceptance model

- **Inputs:** grades and class activities.
- **First layer** focuses on grades — English and maths results.
- **Second layer** focuses on activities — clubs and sports.

The layered structure is what lets the model combine evidence of different kinds: neither layer alone decides the outcome.

## Example 2: a temperature conversion model

A deliberately simple case — a **linear** conversion from °C to °F with one input and one output.

$$\text{Output} = \text{Weight} \times \text{Input} + \text{Bias}$$

Training starts with incorrect weights and refines them:

$$F = 5.67 \times C + 12.5 \quad \text{(initial, wrong)}$$
$$F = 1.828 \times C + 28.54 \quad \text{(refined)}$$

The true relationship is $F = 1.8C + 32$, so the refined weights are close but not exact — which is what learning from data looks like.

**Complexity warning:** using more nodes — fitting a cubic, say — can **overcomplicate a simple linear problem**. A more powerful model is not automatically a better one; it can fit noise instead of signal.

## Model fitting parameters

| Parameter | Effect |
|---|---|
| **Number of nodes** | Increases model complexity |
| **Number of layers** | Enables deeper feature extraction |
| **Training epochs** | Multiple passes to refine accuracy |

**Epochs** update weights and biases using **backpropagation** — the algorithm that pushes the error backward through the network to work out how much each weight contributed. **More epochs improve accuracy but risk overfitting**: the model begins memorising the training data rather than learning the pattern, and performs worse on data it has not seen.

## Convolutional neural networks (CNNs)

CNNs are **feed-forward neural networks that learn feature engineering via filter (kernel) optimisation** — the network discovers which filters are useful rather than being told.

**Layers:**

- **Convolution layer** — applies kernels to extract features.
- **Subsampling/pooling layer** — reduces spatial dimensions, e.g. max-pooling.
- **Fully connected layer** — connects the features for classification.

**Feature maps** are the outputs of convolution layers, representing the learned features.

## The convolution operation

A **convolution** is a mathematical operation combining two functions — the input data and a **kernel** — to generate an output.

A kernel (a small matrix, for instance $3 \times 3$) **slides over the input data**, performing element-wise multiplication and summation at each position to produce a new feature matrix.

## CNNs in computer vision

**Image representation:** digital photos are pixel arrays with RGB values from 0 to 255. A handwritten digit "8" can be represented as a binary pixel array of 0s and 1s.

**What kernels do:**

- **Blurring** — the kernel replaces each pixel with the **mean of its neighbours**.
- **Edge detection** — the kernel detects **gradient changes**, such as vertical edges.

These two examples are the whole intuition. A kernel is a small pattern-detector, and stacking convolution layers lets later layers detect patterns *of* patterns — edges, then shapes, then objects.

**Cat classification pipeline:**

$$\text{Input} \rightarrow [\text{Conv} \rightarrow \text{ReLU} \rightarrow \text{MaxPool}] \rightarrow [\text{Conv} \rightarrow \text{ReLU} \rightarrow \text{MaxPool}] \rightarrow \text{Fully Connected} \rightarrow \text{Output}$$

Each repeated block extracts features at a coarser scale than the last, and the fully connected layer at the end turns the final features into a decision.
