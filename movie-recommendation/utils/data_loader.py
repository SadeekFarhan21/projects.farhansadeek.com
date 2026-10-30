import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
import pickle
import os
from typing import Tuple, Dict, Any


class MovieLensDataLoader:
    """Data loader for MovieLens dataset"""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.raw_dir = os.path.join(data_dir, "raw")
        self.processed_dir = os.path.join(data_dir, "processed")
        
        # Create processed directory if it doesn't exist
        os.makedirs(self.processed_dir, exist_ok=True)
        
        # Data containers
        self.ratings_df = None
        self.movies_df = None
        self.rating_matrix = None
        self.user_mapping = None
        self.movie_mapping = None
        
    def load_raw_data(self) -> None:
        """Load raw data files from the data directory (MovieLens 100K format)"""
        print("Loading raw data...")
        
        # Load ratings data (tab-separated)
        ratings_path = os.path.join(self.raw_dir, "u.data")
        self.ratings_df = pd.read_csv(ratings_path, sep='\t', header=None, 
                                     names=['userId', 'movieId', 'rating', 'timestamp'])
        print(f"Loaded {len(self.ratings_df)} ratings")
        
        # Load movies data (pipe-separated)
        movies_path = os.path.join(self.raw_dir, "u.item")
        self.movies_df = pd.read_csv(movies_path, sep='|', header=None, encoding='latin-1',
                                    names=['movieId', 'title', 'release_date', 'video_release', 
                                           'IMDb_URL'] + [f'genre{i}' for i in range(1, 20)])
        print(f"Loaded {len(self.movies_df)} movies")
        
        # Create user and movie mappings
        self._create_mappings()
        
    def _create_mappings(self) -> None:
        """Create user and movie ID mappings"""
        # Create user mapping
        unique_users = sorted(self.ratings_df['userId'].unique())
        self.user_mapping = {user_id: idx for idx, user_id in enumerate(unique_users)}
        
        # Create movie mapping
        unique_movies = sorted(self.ratings_df['movieId'].unique())
        self.movie_mapping = {movie_id: idx for idx, movie_id in enumerate(unique_movies)}
        
        print(f"Created mappings for {len(self.user_mapping)} users and {len(self.movie_mapping)} movies")
        
    def create_rating_matrix(self) -> np.ndarray:
        """Create user-item rating matrix"""
        print("Creating rating matrix...")
        
        n_users = len(self.user_mapping)
        n_movies = len(self.movie_mapping)
        
        # Initialize rating matrix with zeros
        rating_matrix = np.zeros((n_users, n_movies))
        
        # Fill in the ratings
        for _, row in self.ratings_df.iterrows():
            user_idx = self.user_mapping[row['userId']]
            movie_idx = self.movie_mapping[row['movieId']]
            rating_matrix[user_idx, movie_idx] = row['rating']
            
        self.rating_matrix = rating_matrix
        print(f"Created rating matrix: {rating_matrix.shape}")
        print(f"Sparsity: {1 - np.count_nonzero(rating_matrix) / rating_matrix.size:.2%}")
        
        return rating_matrix
    
    def normalize_data(self, matrix: np.ndarray) -> np.ndarray:
        """Normalize the rating matrix by subtracting user means"""
        print("Normalizing data...")
        
        # Calculate user means (only for users with ratings)
        user_means = np.zeros(matrix.shape[0])
        for i in range(matrix.shape[0]):
            user_ratings = matrix[i, :]
            if np.any(user_ratings > 0):
                user_means[i] = np.mean(user_ratings[user_ratings > 0])
        
        # Subtract user means ONLY from actual ratings (not zeros)
        normalized_matrix = matrix.copy()
        for i in range(matrix.shape[0]):
            if user_means[i] > 0:
                # Only subtract from positions that have actual ratings
                mask = matrix[i, :] > 0
                normalized_matrix[i, mask] -= user_means[i]
        
        return normalized_matrix, user_means
    
    def split_data(self, matrix: np.ndarray, test_size: float = 0.2, random_state: int = 42) -> Tuple[np.ndarray, np.ndarray]:
        """Split the rating matrix into train and test sets"""
        print("Splitting data into train/test sets...")
        
        # Get indices of non-zero ratings
        nonzero_indices = np.where(matrix > 0)
        user_indices = nonzero_indices[0]
        movie_indices = nonzero_indices[1]
        
        # Split the indices
        train_indices, test_indices = train_test_split(
            range(len(user_indices)), 
            test_size=test_size, 
            random_state=random_state
        )
        
        # Create train and test matrices
        train_matrix = np.zeros_like(matrix)
        test_matrix = np.zeros_like(matrix)
        
        # Fill train matrix
        for idx in train_indices:
            train_matrix[user_indices[idx], movie_indices[idx]] = matrix[user_indices[idx], movie_indices[idx]]
        
        # Fill test matrix
        for idx in test_indices:
            test_matrix[user_indices[idx], movie_indices[idx]] = matrix[user_indices[idx], movie_indices[idx]]
        
        print(f"Train ratings: {np.count_nonzero(train_matrix)}")
        print(f"Test ratings: {np.count_nonzero(test_matrix)}")
        
        return train_matrix, test_matrix
    
    def save_processed_data(self, train_matrix: np.ndarray, test_matrix: np.ndarray, 
                          user_means: np.ndarray, filename: str = "processed_data.pkl") -> None:
        """Save processed data to disk"""
        print("Saving processed data...")
        
        data = {
            'train_matrix': train_matrix,
            'test_matrix': test_matrix,
            'user_means': user_means,
            'user_mapping': self.user_mapping,
            'movie_mapping': self.movie_mapping,
            'movies_df': self.movies_df
        }
        
        filepath = os.path.join(self.processed_dir, filename)
        with open(filepath, 'wb') as f:
            pickle.dump(data, f)
        
        print(f"Saved processed data to {filepath}")
    
    def load_processed_data(self, filename: str = "processed_data.pkl") -> Dict[str, Any]:
        """Load processed data from disk"""
        filepath = os.path.join(self.processed_dir, filename)
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Processed data file not found: {filepath}")
        
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        
        return data
    
    def process_data(self, test_size: float = 0.2, random_state: int = 42) -> Dict[str, Any]:
        """Complete data processing pipeline"""
        # Check if processed data already exists
        processed_file = os.path.join(self.processed_dir, "processed_data.pkl")
        if os.path.exists(processed_file):
            print("Loading existing processed data...")
            return self.load_processed_data()
        
        # Load raw data
        self.load_raw_data()
        
        # Create rating matrix
        rating_matrix = self.create_rating_matrix()
        
        # Split data FIRST (before normalization)
        train_matrix, test_matrix = self.split_data(rating_matrix, test_size, random_state)
        
        # Normalize data AFTER splitting
        train_normalized, user_means = self.normalize_data(train_matrix)
        
        # Save processed data
        self.save_processed_data(train_normalized, test_matrix, user_means)
        
        return {
            'train_matrix': train_normalized,
            'test_matrix': test_matrix,
            'user_means': user_means,
            'user_mapping': self.user_mapping,
            'movie_mapping': self.movie_mapping,
            'movies_df': self.movies_df
        }


def get_movie_info(movie_id: int, movies_df: pd.DataFrame) -> Dict[str, Any]:
    """Get movie information by movie ID"""
    movie_row = movies_df[movies_df['movieId'] == movie_id]
    if len(movie_row) == 0:
        return None
    
    return {
        'movieId': int(movie_row.iloc[0]['movieId']),
        'title': movie_row.iloc[0]['title'],
        'genres': movie_row.iloc[0]['genres']
    }


def get_top_movies_by_rating(movies_df: pd.DataFrame, ratings_df: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    """Get top movies by average rating"""
    # Calculate average rating for each movie
    movie_stats = ratings_df.groupby('movieId').agg({
        'rating': ['mean', 'count']
    }).reset_index()
    
    movie_stats.columns = ['movieId', 'avg_rating', 'rating_count']
    
    # Filter movies with at least 10 ratings
    movie_stats = movie_stats[movie_stats['rating_count'] >= 10]
    
    # Sort by average rating
    top_movies = movie_stats.sort_values('avg_rating', ascending=False).head(n)
    
    # Merge with movie information
    top_movies = top_movies.merge(movies_df, on='movieId')
    
    return top_movies