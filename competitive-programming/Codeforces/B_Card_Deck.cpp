#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double
void solve() {
    stack<int> q;
    int n;
    cin >> n;
    for (int i = 0; i < n; i++) {
        int a;
        cin >> a;
        q.push(a);
    }

    int max = n;
    stack<int> temp;
    vector<int> answer;
    while (!q.empty()) {
        int top_element = q.top(); // take the first element
        q.pop();

        // top element is the max element
        if (max == top_element) {
            answer.push_back(max); // max element goes into the vector
            max--;
            // empty the temporary stack
            while (!temp.empty()) {
                answer.push_back(temp.top());
                temp.pop();
            }
        }
        // if top is not max then it will be
        else {
            temp.push(top_element);
        }
    }
    while (!temp.empty()) {
        answer.push_back(temp.top());
        temp.pop();
    }
    for (int i = 0; i < answer.size(); i++) {
        cout << answer[i] << " ";
    }
    cout << '\n';
}
int32_t main() {
    int t;
    cin >> t;
    for (int i = 0; i < t; i++) {
        solve();
    }
    return 0;
}