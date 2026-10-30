import numpy as np
from typing import Dict, List, Tuple


class EmbeddingLayer:
    """Embedding layer for user/item representations"""
    def __init__(self, num_embeddings, embedding_dim):
        self.weight = np.random.normal(0, 0.01, (num_embeddings, embedding_dim))
        self.ids = None
    
    def forward(self, ids):
        self.ids = ids
        return self.weight[ids]
    
    def backward(self, grad_out):
        grad_W = np.zeros_like(self.weight)
        np.add.at(grad_W, self.ids, grad_out)
        self.weight_grad = grad_W
        return None
    
"""
NeuralCF connects all of that together
Sequential dictates the number of hidden layers 
DenseLayers count the number of neurons
ReLU, AdamOptimizer they make the individual neurons
"""

class DenseLayer:
    """Dense layer for fully connected neural networks"""
    def __init__(self, input_dim: int, output_dim: int) -> None:
        self.weight = np.random.normal(0, 0.01, (input_dim, output_dim))
        self.bias = np.zeros(output_dim)
        self.x = None

    def forward(self, x: np.ndarray) -> np.ndarray:
        self.x = x
        return x @ self.weight + self.bias

    def backward(self, grad_y: np.ndarray) -> np.ndarray:
        self.weight_grad = self.x.T @ grad_y
        self.bias_grad = grad_y.sum(0)
        grad_x = grad_y @ self.weight.T
        return grad_x
    


class ReLU:
    def __init__(self) -> None:
        self.z = None
    def forward(self, z: np.ndarray) -> np.ndarray:
        self.z = z
        return np.maximum(0, z)
    
    def backward(self, grad_h: np.ndarray) -> np.ndarray:
        return grad_h * (self.z > 0)


class Sequential:
    def __init__(self, *layers) -> None:
        self.layers = layers
    def forward(self, x: np.ndarray) -> np.ndarray:
        for layer in self.layers:
            x = layer.forward(x)
        return x
    
    def backward(self, grad_y: np.ndarray) -> np.ndarray:
        for layer in reversed(self.layers):
            grad_y = layer.backward(grad_y)
        return grad_y


class AdamOptimizer:
    def __init__(self, params: Dict, lr: float = 1e-3, beta1: float = 0.9, beta2: float = 0.999, eps: float = 1e-8):
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        
        # Initialize momentum and variance for each parameter
        self.m = {}
        self.v = {}
        for name, param in params.items():
            self.m[name] = np.zeros_like(param)
            self.v[name] = np.zeros_like(param)
    
    def step(self, params: Dict, grads: Dict):
        self.t += 1
        for name in params.keys():
            if name in grads and grads[name] is not None:
                # Update momentum and variance
                self.m[name] = self.beta1 * self.m[name] + (1 - self.beta1) * grads[name]
                self.v[name] = self.beta2 * self.v[name] + (1 - self.beta2) * (grads[name] ** 2)
                
                # Bias correction
                m_hat = self.m[name] / (1 - self.beta1 ** self.t)
                v_hat = self.v[name] / (1 - self.beta2 ** self.t)

                params[name] -= self.lr * m_hat / (np.sqrt(v_hat) + self.eps)

    
class NeuralCFModel:
    "Neural Collaborative Filtering Model for Movie Recommendations"
    def __init__(self, n_users: int, n_items: int, embedding_dim: int = 64, hidden_dim: int = 128):
        self.n_users = n_users
        self.n_items = n_items
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim
        
        # Initialize layers
        self.user_embedding = EmbeddingLayer(n_users, embedding_dim)
        self.item_embedding = EmbeddingLayer(n_items, embedding_dim)
        # With Sequential - automatic chaining
        self.network = Sequential(
            DenseLayer(2 * embedding_dim, hidden_dim),
            ReLU(),
            DenseLayer(hidden_dim, 1)
        )
        # self.output_layer = DenseLayer(hidden_dim, 1)  # 128 -> 1
        self.global_bias = 0.0  # Will be set to training mean
        
        # Cache for backward pass
        self.user_ids = None
        self.item_ids = None
    
    def forward(self, user_ids: np.ndarray, item_ids: np.ndarray) -> np.ndarray:
        # Cache for backward pass
        self.user_ids = user_ids
        self.item_ids = item_ids
        user_embeddings = self.user_embedding.forward(user_ids)
        item_embeddings = self.item_embedding.forward(item_ids)
        combined_embeddings = np.concatenate([user_embeddings, item_embeddings], axis=1)
        output = self.network.forward(combined_embeddings)
        predictions = output.squeeze() + self.global_bias
        return predictions
    
    def backward(self, grad_output: np.ndarray) -> Dict:
        grad_output = grad_output.reshape(-1, 1)
        grad_concat = self.network.backward(grad_output)
        grad_user_emb = grad_concat[:, :self.embedding_dim]
        grad_item_emb = grad_concat[:, self.embedding_dim:]
        grad_user_emb = self.user_embedding.backward(grad_user_emb)
        grad_item_emb = self.item_embedding.backward(grad_item_emb)
        grads = {
            'user_embedding': self.user_embedding.weight_grad,
            'item_embedding': self.item_embedding.weight_grad,
            'dense1_weight': self.network.layers[0].weight_grad,
            'dense1_bias': self.network.layers[0].bias_grad,
            'dense2_weight': self.network.layers[2].weight_grad,
            'dense2_bias': self.network.layers[2].bias_grad
        }
        return grads
    
    def get_params(self) -> Dict:
        """Get all parameters for optimizer"""
        return {
            'user_embedding': self.user_embedding.weight,
            'item_embedding': self.item_embedding.weight,
            'dense1_weight': self.network.layers[0].weight,
            'dense1_bias': self.network.layers[0].bias,
            'dense2_weight': self.network.layers[2].weight,
            'dense2_bias': self.network.layers[2].bias
        }
    
    def set_params(self, params: Dict):
        """Set all parameters from optimizer"""
        self.user_embedding.weight = params['user_embedding']
        self.item_embedding.weight = params['item_embedding']
        self.network.layers[0].weight = params['dense1_weight']
        self.network.layers[0].bias = params['dense1_bias']
        self.network.layers[2].weight = params['dense2_weight']
        self.network.layers[2].bias = params['dense2_bias']


def mse_loss(predictions: np.ndarray, targets: np.ndarray) -> Tuple[float, np.ndarray]:
    """Mean Squared Error loss"""
    loss = np.mean((predictions - targets) ** 2)
    grad = 2 * (predictions - targets) / len(predictions)
    return loss, grad


def create_batches(user_ids: List, item_ids: List, ratings: List, batch_size: int) -> List[Tuple]:
    """Create mini-batches for training"""
    n_samples = len(ratings)
    indices = np.random.permutation(n_samples)
    
    batches = []
    for i in range(0, n_samples, batch_size):
        batch_indices = indices[i:i + batch_size]
        batch_users = np.array([user_ids[j] for j in batch_indices])
        batch_items = np.array([item_ids[j] for j in batch_indices])
        batch_ratings = np.array([ratings[j] for j in batch_indices])
        batches.append((batch_users, batch_items, batch_ratings))
    
    return batches


def train(model, train_data, test_data, epochs=30, batch_size=4096, learning_rate=1e-3):
    global_bias = train_data[2].mean()
    Adam = AdamOptimizer(model.get_params(), learning_rate)
    model.global_bias = global_bias

    for epoch in range(epochs):
        batches = create_batches(train_data[0], train_data[1], train_data[2], batch_size)
        for batch_users, batch_items, batch_ratings in batches:
            predictions = model.forward(batch_users, batch_items)
            loss, grad = mse_loss(predictions, batch_ratings)
            grads = model.backward(grad)
            params = model.get_params()
            Adam.step(params, grads)
            model.set_params(params)
            
        # Validation
        val_predictions = model.forward(test_data[0], test_data[1])
        val_rmse = np.sqrt(np.mean((val_predictions - test_data[2]) ** 2))
        print(f"Epoch {epoch+1}, Train Loss: {loss:.4f}, Test RMSE: {val_rmse:.4f}")


def test_model(model, test_data):
    predictions = model.forward(test_data[0], test_data[1])
    rmse = np.sqrt(np.mean((predictions - test_data[2]) ** 2))
    return rmse


# Load data and train
from utils.simple_data_loader import SimpleMovieLensLoader

loader = SimpleMovieLensLoader()
data = loader.load_official_split(split_id=1)
matrices = loader.create_matrices(data['train_df'], data['test_df'])

# Create model
model = NeuralCFModel(matrices['n_users'], matrices['n_movies'])

# Convert to lists and train
train_users, train_items, train_ratings = [], [], []
for user_id in range(matrices['n_users']):
    for movie_id in range(matrices['n_movies']):
        if matrices['train_matrix'][user_id, movie_id] > 0:
            train_users.append(user_id)
            train_items.append(movie_id)
            train_ratings.append(matrices['train_matrix'][user_id, movie_id])

test_users, test_items, test_ratings = [], [], []
for user_id in range(matrices['n_users']):
    for movie_id in range(matrices['n_movies']):
        if matrices['test_matrix'][user_id, movie_id] > 0:
            test_users.append(user_id)
            test_items.append(movie_id)
            test_ratings.append(matrices['test_matrix'][user_id, movie_id])

train_data = (np.array(train_users), np.array(train_items), np.array(train_ratings))
test_data = (np.array(test_users), np.array(test_items), np.array(test_ratings))

# Run training!
train(model, train_data, test_data)



