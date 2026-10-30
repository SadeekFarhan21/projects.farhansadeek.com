#include <bits/stdc++.h>
using namespace std;

#define int long long

int32_t main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<tuple<int, int, int>> customers;
    for (int i = 1; i <= n; i++) {
        int a, b;
        cin >> a >> b;
        customers.push_back({a, b, i});
    }
    sort(customers.begin(), customers.end());
    priority_queue<pair<int, int>, vector<pair<int, int>>, greater<pair<int, int>>> pq;
    vector<int> answer(n + 1);
    int rooms = 0;
    for (auto [arrival, departure, idx] : customers) {
        if (!pq.empty() && pq.top().first < arrival) {
            auto [old_departure, room] = pq.top();
            pq.pop();
            answer[idx] = room;
            pq.push({departure, room});
        } else {
            rooms++;
            answer[idx] = rooms;
            pq.push({departure, rooms});
        }
    }
    cout << rooms << '\n';
    for (int i = 1; i <= n; i++) {
        cout << answer[i] << ' ';
    }
    return 0;
}