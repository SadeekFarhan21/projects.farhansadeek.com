#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main()
{
    int t;
    cin >> t; // Number of test cases

    for (int i = 0; i < t; ++i)
    {
        int n, k;
        cin >> n >> k; // Number of quests and maximum quests Monocarp can complete

        vector<int> a(n), b(n);
        for (int j = 0; j < n; ++j)
        {
            cin >> a[j]; // Experience points for first completion
        }

        for (int j = 0; j < n; ++j)
        {
            cin >> b[j]; // Experience points for subsequent completions
        }

        // Create a vector of pairs to store quests and their experience points
        vector<pair<int, int>> quests;
        for (int j = 0; j < n; ++j)
        {
            quests.push_back({a[j], b[j]});
        }

        // Sort quests based on experience points for the first completion
        sort(quests.begin(), quests.end(), [](const pair<int, int> &x, const pair<int, int> &y)
             { return x.first < y.first; });

        int total_experience = 0;

        // Add experience points for the first completion for the first k quests
        for (int j = 0; j < k; ++j)
        {
            total_experience += quests[j].first;
        }

        // Add experience points for subsequent completions for quests beyond the first k
        for (int j = k; j < n; ++j)
        {
            total_experience += quests[j].second;
        }

        cout << total_experience << endl;
    }

    return 0;
}
