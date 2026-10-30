#!/usr/bin/env python3
"""
Movie Recommendation System - Simplified Version
Uses official MovieLens pre-split files
"""

import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils.simple_data_loader import SimpleMovieLensLoader


def main():
    """Load data using simplified pipeline"""
    print("Movie Recommendation System - Simplified Version")
    print("=" * 50)
    
    # Load and process the data using official splits
    print("\nLoading MovieLens dataset using official split...")
    loader = SimpleMovieLensLoader()
    
    try:
        # Process the data (using split 1 by default)
        data = loader.process_data(split_id=1, normalize=True)
        print("\nData loaded successfully!")
        print(f"Train matrix shape: {data['train_matrix'].shape}")
        print(f"Test matrix shape: {data['test_matrix'].shape}")
        print(f"Number of users: {data['n_users']}")
        print(f"Number of movies: {data['n_movies']}")
        print(f"Train ratings: {data['train_matrix'].size - (data['train_matrix'] == 0).sum()}")
        print(f"Test ratings: {data['test_matrix'].size - (data['test_matrix'] == 0).sum()}")
        
        # Show some example movies
        print("\nExample movies:")
        movies_df = data['movies_df']
        for i, (_, movie) in enumerate(movies_df.head(5).iterrows()):
            # Get genres for this movie
            genre_cols = [f'genre{j}' for j in range(1, 20)]
            movie_genres = []
            for genre_col in genre_cols:
                if movie[genre_col] == 1:
                    genre_names = ['unknown', 'action', 'adventure', 'animation', 'children', 
                                 'comedy', 'crime', 'documentary', 'drama', 'fantasy', 
                                 'film_noir', 'horror', 'musical', 'mystery', 'romance', 
                                 'sci_fi', 'thriller', 'war', 'western']
                    genre_idx = int(genre_col.replace('genre', '')) - 1
                    if genre_idx < len(genre_names):
                        movie_genres.append(genre_names[genre_idx])
            
            genres_str = ', '.join(movie_genres) if movie_genres else 'unknown'
            print(f"  {i+1}. {movie['title']} ({genres_str})")
        
        print("\n✅ Ready to start building your models!")
        print("📊 Using official MovieLens split u1 (80%/20% split)")
        print("🔧 Data is normalized and ready for neural networks")
        
    except Exception as e:
        print(f"\nError loading data: {e}")
        print("Make sure the MovieLens dataset is in data/raw/ directory")


if __name__ == "__main__":
    main()