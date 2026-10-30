#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    int t;
    cin >> t;  // Number of test cases

    while (t--) {
        int n;
        cin >> n;  // Duration of winter holidays

        vector<int> skiing(n), movie(n), games(n);

        // Input friends for each activity on each day
        for (int i = 0; i < n; ++i) {
            cin >> skiing[i];
        }

        for (int i = 0; i < n; ++i) {
            cin >> movie[i];
        }

        for (int i = 0; i < n; ++i) {
            cin >> games[i];
        }

        // Initialize dynamic programming arrays
        vector<int> dp_ski(n), dp_movie(n), dp_games(n);

        // Base case: friends on the first day
        dp_ski[0] = skiing[0];
        dp_movie[0] = movie[0];
        dp_games[0] = games[0];

        // Fill in the dynamic programming arrays
        for (int i = 1; i < n; ++i) {
            dp_ski[i] = max(dp_movie[i - 1], dp_games[i - 1]) + skiing[i];
            dp_movie[i] = max(dp_ski[i - 1], dp_games[i - 1]) + movie[i];
            dp_games[i] = max(dp_ski[i - 1], dp_movie[i - 1]) + games[i];
        }
    
        // Output the maximum total friends by choosing the last day for each activity
        cout << max({dp_ski[n - 1], dp_movie[n - 1], dp_games[n - 1]}) << endl;
    }

    return 0;
}
