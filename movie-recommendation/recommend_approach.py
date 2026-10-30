#!/usr/bin/env python3
"""
Objective Recommendation Approach Selector
Analyzes data metrics and recommends approaches based on evidence
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.simple_data_loader import SimpleMovieLensLoader
import numpy as np
import pandas as pd

def calculate_data_metrics(data):
    """Calculate objective metrics from the data"""
    
    train_matrix = data['train_matrix']
    test_matrix = data['test_matrix']
    movies_df = data['movies_df']
    
    # Basic dimensions
    n_users, n_movies = train_matrix.shape
    
    # Sparsity
    train_nonzero = np.count_nonzero(train_matrix)
    train_total = train_matrix.size
    sparsity = 1 - train_nonzero/train_total
    
    # Rating distribution
    train_ratings = train_matrix[train_matrix > 0]
    rating_std = train_ratings.std() if len(train_ratings) > 0 else 0
    rating_range = train_ratings.max() - train_ratings.min() if len(train_ratings) > 0 else 0
    
    # User activity
    user_rating_counts = np.sum(train_matrix > 0, axis=1)
    avg_ratings_per_user = user_rating_counts.mean()
    users_with_few_ratings = np.sum(user_rating_counts < 10)
    user_cold_start_ratio = users_with_few_ratings / n_users
    
    # Movie activity
    movie_rating_counts = np.sum(train_matrix > 0, axis=0)
    avg_ratings_per_movie = movie_rating_counts.mean()
    movies_with_few_ratings = np.sum(movie_rating_counts < 10)
    movie_cold_start_ratio = movies_with_few_ratings / n_movies
    
    # Feature availability
    genre_columns = [col for col in movies_df.columns if col.startswith('genre')]
    n_genres = len(genre_columns)
    has_content_features = n_genres > 0
    
    # Data quality
    missing_values = np.isnan(train_matrix).sum()
    infinite_values = np.isinf(train_matrix).sum()
    data_quality_score = 1.0 if (missing_values == 0 and infinite_values == 0) else 0.5
    
    return {
        'n_users': n_users,
        'n_movies': n_movies,
        'sparsity': sparsity,
        'rating_std': rating_std,
        'rating_range': rating_range,
        'avg_ratings_per_user': avg_ratings_per_user,
        'avg_ratings_per_movie': avg_ratings_per_movie,
        'user_cold_start_ratio': user_cold_start_ratio,
        'movie_cold_start_ratio': movie_cold_start_ratio,
        'has_content_features': has_content_features,
        'n_genres': n_genres,
        'data_quality_score': data_quality_score,
        'total_ratings': train_nonzero
    }

def evaluate_approach_suitability(metrics):
    """Evaluate how suitable each approach is based on objective criteria"""
    
    scores = {}
    
    # 1. Matrix Factorization (SVD) suitability
    svd_score = 0
    
    # Good for sparse data
    if metrics['sparsity'] > 0.9:
        svd_score += 2
    elif metrics['sparsity'] > 0.8:
        svd_score += 1
    
    # Good for moderate user/movie counts
    if 100 <= metrics['n_users'] <= 10000 and 100 <= metrics['n_movies'] <= 10000:
        svd_score += 1
    
    # Bad for cold start
    if metrics['user_cold_start_ratio'] > 0.3:
        svd_score -= 1
    if metrics['movie_cold_start_ratio'] > 0.3:
        svd_score -= 1
    
    # Good for linear patterns
    if metrics['rating_std'] < 1.0:
        svd_score += 1
    
    scores['matrix_factorization'] = max(0, svd_score)
    
    # 2. Neural Collaborative Filtering suitability
    ncf_score = 0
    
    # Good for sparse data
    if metrics['sparsity'] > 0.9:
        ncf_score += 2
    elif metrics['sparsity'] > 0.8:
        ncf_score += 1
    
    # Good for complex patterns
    if metrics['rating_std'] > 0.5:
        ncf_score += 1
    
    # Good for moderate to large datasets
    if metrics['total_ratings'] > 10000:
        ncf_score += 1
    
    # Can handle cold start better with features
    if metrics['has_content_features']:
        ncf_score += 1
    
    # Bad for very small datasets
    if metrics['total_ratings'] < 1000:
        ncf_score -= 1
    
    scores['neural_collaborative_filtering'] = max(0, ncf_score)
    
    # 3. Content-Based Filtering suitability
    content_score = 0
    
    # Requires content features
    if metrics['has_content_features']:
        content_score += 2
    else:
        content_score = 0  # Can't do content-based without features
        scores['content_based'] = 0
        return scores
    
    # Good for cold start
    if metrics['user_cold_start_ratio'] > 0.2:
        content_score += 1
    if metrics['movie_cold_start_ratio'] > 0.2:
        content_score += 1
    
    # Good for diverse content
    if metrics['n_genres'] > 10:
        content_score += 1
    
    # Less dependent on sparsity
    if metrics['sparsity'] > 0.95:
        content_score += 1
    
    scores['content_based'] = max(0, content_score)
    
    # 4. Hybrid Approach suitability
    hybrid_score = 0
    
    # Combines benefits of multiple approaches
    hybrid_score += min(scores.get('matrix_factorization', 0), 2)
    hybrid_score += min(scores.get('neural_collaborative_filtering', 0), 2)
    hybrid_score += min(scores.get('content_based', 0), 2)
    
    # Bonus for complex datasets
    if metrics['sparsity'] > 0.9 and metrics['has_content_features']:
        hybrid_score += 1
    
    scores['hybrid'] = max(0, hybrid_score)
    
    return scores

def recommend_approaches(metrics, scores):
    """Generate objective recommendations based on scores"""
    
    print("=" * 60)
    print("OBJECTIVE APPROACH RECOMMENDATIONS")
    print("=" * 60)
    
    print(f"\nDATA CHARACTERISTICS:")
    print(f"   Users: {metrics['n_users']:,}")
    print(f"   Movies: {metrics['n_movies']:,}")
    print(f"   Sparsity: {metrics['sparsity']:.1%}")
    print(f"   Total ratings: {metrics['total_ratings']:,}")
    print(f"   Cold start users: {metrics['user_cold_start_ratio']:.1%}")
    print(f"   Cold start movies: {metrics['movie_cold_start_ratio']:.1%}")
    print(f"   Content features: {'Yes' if metrics['has_content_features'] else 'No'}")
    
    print(f"\nAPPROACH SUITABILITY SCORES (0-5):")
    for approach, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        print(f"   {approach.replace('_', ' ').title()}: {score}/5")
    
    print(f"\nRECOMMENDATIONS:")
    
    # Find best approaches
    best_score = max(scores.values())
    best_approaches = [k for k, v in scores.items() if v == best_score]
    
    if len(best_approaches) == 1:
        best = best_approaches[0]
        print(f"   PRIMARY: {best.replace('_', ' ').title()}")
        print(f"   Reason: Highest suitability score ({best_score}/5)")
        
        # Secondary recommendation
        remaining = [(k, v) for k, v in scores.items() if k != best]
        if remaining:
            secondary = max(remaining, key=lambda x: x[1])
            if secondary[1] >= best_score - 1:  # Within 1 point
                print(f"   SECONDARY: {secondary[0].replace('_', ' ').title()}")
                print(f"   Reason: Close suitability score ({secondary[1]}/5)")
    else:
        print(f"   MULTIPLE OPTIONS: {', '.join([a.replace('_', ' ').title() for a in best_approaches])}")
        print(f"   Reason: Tied suitability scores ({best_score}/5)")
    
    # Specific reasoning
    print(f"\nDETAILED REASONING:")
    
    if metrics['sparsity'] > 0.9:
        print(f"   • High sparsity ({metrics['sparsity']:.1%}) favors collaborative filtering approaches")
    
    if metrics['user_cold_start_ratio'] > 0.2:
        print(f"   • Many users with few ratings ({metrics['user_cold_start_ratio']:.1%}) suggests cold start challenges")
    
    if metrics['has_content_features']:
        print(f"   • Content features available ({metrics['n_genres']} genres) enables content-based approaches")
    
    if metrics['total_ratings'] < 5000:
        print(f"   • Limited training data ({metrics['total_ratings']:,} ratings) may favor simpler approaches")
    
    if metrics['rating_std'] > 1.0:
        print(f"   • High rating variance ({metrics['rating_std']:.2f}) suggests complex patterns")
    
    return best_approaches

def main():
    """Main analysis function"""
    
    print("Loading and analyzing data...")
    
    # Load data
    loader = SimpleMovieLensLoader()
    data = loader.process_data(split_id=1, normalize=True)
    
    # Calculate metrics
    metrics = calculate_data_metrics(data)
    
    # Evaluate approaches
    scores = evaluate_approach_suitability(metrics)
    
    # Generate recommendations
    best_approaches = recommend_approaches(metrics, scores)
    
    print(f"\n" + "=" * 60)
    print("ANALYSIS COMPLETE")
    print("=" * 60)
    
    return {
        'metrics': metrics,
        'scores': scores,
        'recommendations': best_approaches
    }

if __name__ == "__main__":
    main() 