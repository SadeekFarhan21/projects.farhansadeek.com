#!/usr/bin/env python3
"""
Simplified MovieLens Data Loader
Uses the official pre-split training/testing files
"""

import pandas as pd
import numpy as np
import pickle
import os
from typing import Dict, Any


class SimpleMovieLensLoader:
    """Simplified data loader using official MovieLens splits"""
    
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.raw_dir = os.path.join(data_dir, "raw")
        self.processed_dir = os.path.join(data_dir, "processed")
        
        # Create processed directory if it doesn't exist
        os.makedirs(self.processed_dir, exist_ok=True)
        
    def load_official_split(self, split_id: int = 1) -> Dict[str, Any]:
        """
        Load official MovieLens split (u1, u2, u3, u4, u5)
        
        Args:
            split_id: Which split to use (1-5 for 5-fold CV)
        """
        print(f"Loading official MovieLens split u{split_id}...")
        
        # Load train and test data
        train_file = os.path.join(self.raw_dir, f"u{split_id}.base")
        test_file = os.path.join(self.raw_dir, f"u{split_id}.test")
        
        train_df = pd.read_csv(train_file, sep='\t', header=None, 
                              names=['userId', 'movieId', 'rating', 'timestamp'])
        test_df = pd.read_csv(test_file, sep='\t', header=None, 
                             names=['userId', 'movieId', 'rating', 'timestamp'])
        
        # Load movie information
        movies_file = os.path.join(self.raw_dir, "u.item")
        movies_df = pd.read_csv(movies_file, sep='|', header=None, encoding='latin-1',
                               names=['movieId', 'title', 'release_date', 'video_release', 
                                      'IMDb_URL'] + [f'genre{i}' for i in range(1, 20)])
        
        print(f"Loaded {len(train_df)} training ratings")
        print(f"Loaded {len(test_df)} test ratings")
        print(f"Loaded {len(movies_df)} movies")
        
        return {
            'train_df': train_df,
            'test_df': test_df,
            'movies_df': movies_df
        }
    
    def create_matrices(self, train_df: pd.DataFrame, test_df: pd.DataFrame) -> Dict[str, Any]:
        """Convert DataFrames to matrices for neural network input"""
        print("Converting to matrices...")
        
        # Get all unique users and movies
        all_users = sorted(set(train_df['userId'].unique()) | set(test_df['userId'].unique()))
        all_movies = sorted(set(train_df['movieId'].unique()) | set(test_df['movieId'].unique()))
        
        # Create mappings (IDs are already sequential, so this is simple)
        user_mapping = {user_id: idx for idx, user_id in enumerate(all_users)}
        movie_mapping = {movie_id: idx for idx, movie_id in enumerate(all_movies)}
        
        n_users = len(user_mapping)
        n_movies = len(movie_mapping)
        
        print(f"Matrix dimensions: {n_users} users × {n_movies} movies")
        
        # Create train matrix
        train_matrix = np.zeros((n_users, n_movies))
        for _, row in train_df.iterrows():
            user_idx = user_mapping[row['userId']]
            movie_idx = movie_mapping[row['movieId']]
            train_matrix[user_idx, movie_idx] = row['rating']
        
        # Create test matrix
        test_matrix = np.zeros((n_users, n_movies))
        for _, row in test_df.iterrows():
            user_idx = user_mapping[row['userId']]
            movie_idx = movie_mapping[row['movieId']]
            test_matrix[user_idx, movie_idx] = row['rating']
        
        print(f"Train matrix sparsity: {1 - np.count_nonzero(train_matrix) / train_matrix.size:.2%}")
        print(f"Test matrix sparsity: {1 - np.count_nonzero(test_matrix) / test_matrix.size:.2%}")
        
        return {
            'train_matrix': train_matrix,
            'test_matrix': test_matrix,
            'user_mapping': user_mapping,
            'movie_mapping': movie_mapping,
            'n_users': n_users,
            'n_movies': n_movies
        }
    
    def normalize_data(self, train_matrix: np.ndarray) -> tuple:
        """Normalize training data by subtracting user means"""
        print("Normalizing training data...")
        
        # Calculate user means from training data only
        user_means = np.zeros(train_matrix.shape[0])
        for i in range(train_matrix.shape[0]):
            user_ratings = train_matrix[i, :]
            if np.any(user_ratings > 0):
                user_means[i] = np.mean(user_ratings[user_ratings > 0])
        
        # Normalize training data
        train_normalized = train_matrix.copy()
        for i in range(train_matrix.shape[0]):
            if user_means[i] > 0:
                mask = train_matrix[i, :] > 0
                train_normalized[i, mask] -= user_means[i]
        
        return train_normalized, user_means
    
    def save_processed_data(self, data: Dict[str, Any], split_id: int = 1) -> None:
        """Save processed data to disk"""
        filename = f"processed_data_u{split_id}.pkl"
        filepath = os.path.join(self.processed_dir, filename)
        
        with open(filepath, 'wb') as f:
            pickle.dump(data, f)
        
        print(f"Saved processed data to {filepath}")
    
    def load_processed_data(self, split_id: int = 1) -> Dict[str, Any]:
        """Load processed data from disk"""
        filename = f"processed_data_u{split_id}.pkl"
        filepath = os.path.join(self.processed_dir, filename)
        
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Processed data file not found: {filepath}")
        
        with open(filepath, 'rb') as f:
            data = pickle.load(f)
        
        return data
    
    def process_data(self, split_id: int = 1, normalize: bool = True) -> Dict[str, Any]:
        """
        Complete simplified data processing pipeline
        
        Args:
            split_id: Which official split to use (1-5)
            normalize: Whether to normalize the data
        """
        # Check if processed data already exists
        filename = f"processed_data_u{split_id}.pkl"
        processed_file = os.path.join(self.processed_dir, filename)
        
        if os.path.exists(processed_file):
            print(f"Loading existing processed data for split u{split_id}...")
            return self.load_processed_data(split_id)
        
        # Load official split
        raw_data = self.load_official_split(split_id)
        
        # Convert to matrices
        matrix_data = self.create_matrices(raw_data['train_df'], raw_data['test_df'])
        
        # Normalize if requested
        if normalize:
            train_normalized, user_means = self.normalize_data(matrix_data['train_matrix'])
            matrix_data['train_matrix'] = train_normalized
            matrix_data['user_means'] = user_means
        else:
            matrix_data['user_means'] = np.zeros(matrix_data['n_users'])
        
        # Add movie data
        matrix_data['movies_df'] = raw_data['movies_df']
        
        # Save processed data
        self.save_processed_data(matrix_data, split_id)
        
        return matrix_data


def get_movie_info(movie_id: int, movies_df: pd.DataFrame) -> Dict[str, Any]:
    """Get movie information by movie ID"""
    movie_row = movies_df[movies_df['movieId'] == movie_id]
    if len(movie_row) == 0:
        return None
    
    # Get genres for this movie
    genre_cols = [f'genre{i}' for j in range(1, 20)]
    movie_genres = []
    for genre_col in genre_cols:
        if movie_row.iloc[0][genre_col] == 1:
            genre_names = ['unknown', 'action', 'adventure', 'animation', 'children', 
                         'comedy', 'crime', 'documentary', 'drama', 'fantasy', 
                         'film_noir', 'horror', 'musical', 'mystery', 'romance', 
                         'sci_fi', 'thriller', 'war', 'western']
            genre_idx = int(genre_col.replace('genre', '')) - 1
            if genre_idx < len(genre_names):
                movie_genres.append(genre_names[genre_idx])
    
    return {
        'movieId': int(movie_row.iloc[0]['movieId']),
        'title': movie_row.iloc[0]['title'],
        'genres': ', '.join(movie_genres) if movie_genres else 'unknown'
    } 