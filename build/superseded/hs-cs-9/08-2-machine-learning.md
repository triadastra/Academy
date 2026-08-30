# 8.2 Machine Learning

## The three types

| Type | Learning method | Example application |
|---|---|---|
| **Supervised** | Uses **labelled** data (input–output pairs) | Spam detection, image classification |
| **Unsupervised** | Finds patterns in **unlabelled** data | Customer segmentation, anomaly detection |
| **Reinforcement** | Learns via **rewards and penalties** | Game AI, robotics |

**Supervised learning** is trained by providing input–output pairs. Two sub-types:

- **Classification** — predicts **discrete categories**: spam versus not spam.
- **Regression** — predicts **continuous variables**: house prices.

**Unsupervised learning** learns from the input data itself, identifying patterns and structures **without explicit labels or outcomes**. It clusters data or reduces dimensionality — grouping customers by behaviour, for instance.

**Reinforcement learning** learns to perform a task by **trial and error**, with an agent interacting with an environment. AlphaGo learning through self-play games is the standard example.

The practical question when choosing is simply: **do you have labels?** If yes, supervised. If no and you want structure, unsupervised. If the task is a sequence of decisions with a delayed reward, reinforcement.

## Distance metrics

Many algorithms need to **measure the similarity between data points**, and the choice of metric changes the answer.

**Euclidean distance** — straight-line distance in $n$-dimensional space, for $p = (p_1, \ldots, p_n)$ and $q = (q_1, \ldots, q_n)$:

$$d(p,q) = \sqrt{\sum_{i=1}^{n}(p_i - q_i)^2}$$

**Manhattan distance** — measures the **absolute value** of the differences, as if travelling along a city grid:

$$d(p,q) = \sum_{i=1}^{n}|p_i - q_i|$$

**Minkowski distance** — the generalised form of both:

$$d(p,q) = \left(\sum_{i=1}^{n}|p_i - q_i|^r\right)^{1/r}$$

With $r = 1$ this is Manhattan and with $r = 2$ it is Euclidean — the two are special cases of one formula.

**Hamming distance** — identifies **the points where the vectors do not match**, counting positions that differ. Used for categorical data and strings, where subtraction is meaningless.

## K-nearest neighbours (KNN)

A supervised algorithm:

1. **Select K nearest neighbours** — identify the K training samples closest to the new sample, by one of the metrics above.
2. **Find the k nearest neighbours to determine which category the point belongs to** — usually by majority vote among them.

KNN does no training at all: it stores the data and defers all the work to prediction time. The cost is that every prediction scans the whole dataset.

## K-means clustering

An **unsupervised** clustering algorithm that aims to **partition a dataset into K clusters**:

1. **Initialisation** — randomly select K data points as the initial cluster **centroids**.
2. **Assignment** — assign each data point to the cluster whose centroid is **closest**.
3. **Update** — recalculate the centroid of each cluster as the **mean of all data points assigned to it**.
4. **Repeat steps 2 and 3** until the cluster centroids no longer change significantly.

Because step 1 is random, different runs can converge to different clusterings — which is why K-means is usually run several times and the best result kept.

Note the naming collision: the **K** in KNN is a number of *neighbours* and the algorithm is supervised; the **K** in K-means is a number of *clusters* and the algorithm is unsupervised. They are unrelated.

## Principal component analysis (PCA)

PCA transforms original data into a **new set of orthogonal axes**, called **principal components**, through a **linear transformation**. It is used for dimensionality reduction: the first few components capture most of the variation, so the rest can often be discarded with little loss.

## Machine learning versus deep learning

**Machine learning** typically uses an input layer, one or two hidden layers, and an output layer. It **needs more feature engineering by human experts** to help with feature extraction, and it generally uses supervised learning, requiring **structured or labelled data**.

**Deep learning** uses neural networks with **many** layers to learn from **huge amounts of data**. These neural networks are programmatic structures modelled after the decision-making processes of the human brain, containing layers of interconnected nodes that **extract features from data** and make predictions.

The essential difference is who finds the features. In classical machine learning a human decides what to measure; in deep learning the network learns the representation itself, which is why it needs so much more data.
