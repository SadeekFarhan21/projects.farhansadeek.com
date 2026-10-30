import numpy as np

## Forward, Back Propagation, Loss, Gradients, Training Loops (for epochs), and Evaluation

class NeuralNetwork:
    ## This is the constructor
    def __init__(self) -> None:
        pass
    
    def forward(self, X: np.ndarray) -> np.ndarray:
        pass

    def backward(self, X: np.ndarray, y: np.ndarray, output: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        pass

    def compute_loss(self, y: np.ndarray, output: np.ndarray) -> float:
        pass

    def compute_gradients(self, X: np.ndarray, y: np.ndarray, output: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        pass

    def train(self, X: np.ndarray, y: np.ndarray, epochs: int) -> None:
        pass

    def evaluate(self, X: np.ndarray, y: np.ndarray) -> float:
        pass