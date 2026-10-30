#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<int> v(n);

    // friends
    for (int i = 0; i < n; i++) {
        cin >> v[i];
    }

    map<int, int> m1;
    map<int, string> m2;
    for(int i = 0; i < m; i++){
        int id, pop; string s;
        cin >> id >> pop >> s;
        m1[id] = pop;
        m2.insert({pop, s});
    }
    
    sort(m1.rbegin(), m1.rend(), greater<int>());
    sort(m2.rbegin(), m2.rend(), greater<int>());
    for(int i = 0; i < n; i++){
        cout << m2[i];
    }
    return 0;
}
