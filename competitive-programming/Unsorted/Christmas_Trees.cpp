#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double
vector<int> answer;

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(0);
    cout.tie(0);
    int n, m;
    cin >> n >> m;
    vector<int> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }
    vector<int> answer;
    map<int, int> distance;
    int count = -1LL * n;
    queue<int> q;
    for (int i = 0; i < n; i++) {
        q.push(v[i]);
        distance[v[i]] = 0;
    }
    while (count < m + 2) {
        int size = q.size();
        for (int i = 0; i < size; i++) {
            int element = q.front();
            q.pop();
            answer.push_back(element);
            count += 1;
            if (distance.find(element) != distance.end()) {
                int left = element + 1;
                int right = element - 1;
                int d = distance[element] + 1;
                if (distance.find(left) == distance.end()) {
                    q.push(left);
                    distance[left] = d;
                }
                if (distance.find(right) == distance.end()) {
                    q.push(right);
                    distance[right] = d;
                }
            }
        }
    }
    int total = 0;
    for (int i = n; i < n + m; i++) {
        total += distance[answer[i]];
    }
    cout << total << "\n";
    for (int i = n; i < n + m; i++) {
        cout << answer[i] << " ";
    }
    cout << "\n";
}