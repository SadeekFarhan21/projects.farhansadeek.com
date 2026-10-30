#include <bits/stdc++.h>
using namespace std;
#define int long long

double roundToFourDecimals(double value) {
    return floor(value * 10000 + 0.5) / 10000;
}

int32_t main()
{
    freopen("homework.in", "r", stdin);
    freopen("homework.out", "w", stdout);
    
    int n;
    cin >> n;
    vector<int> scores(n);
    
    for (int i = 0; i < n; i++)
    {
        cin >> scores[i];
    }
    
    // Create a prefix sum array
    vector<int> prefix_sum(n + 1);
    for (int i = 1; i <= n; i++)
    {
        prefix_sum[i] = prefix_sum[i - 1] + scores[i - 1];
    }

    double max_avg = -1;
    vector<int> result; // to store values of K that yield the max average

    for (int k = 1; k <= n - 2; k++)
    {
        // Remaining scores after Bessie eats the first K questions
        int remaining_count = n - k;
        int remaining_sum = prefix_sum[n] - prefix_sum[k]; // sum of remaining scores
        
        // We need to find the minimum score among remaining scores
        vector<int> remaining(scores.begin() + k, scores.end());
        int min_score = *min_element(remaining.begin(), remaining.end());

        // Calculate average excluding the minimum score
        double avg = (remaining_sum - min_score) / (remaining_count - 1); // Remove the smallest score
        
        avg = roundToFourDecimals(avg);

        // Update max_avg and result
        if (avg > max_avg)
        {
            max_avg = avg;
            result.clear();
            result.push_back(k);
        }
        else if (avg == max_avg)
        {
            result.push_back(k);
        }
    }
    
    // Output all values of K that yield the maximum average
    for (int k : result)
    {
        cout << k << "\n";
    }
    
    return 0;
}
