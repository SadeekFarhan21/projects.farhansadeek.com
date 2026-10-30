#include <bits/stdc++.h>
using namespace std;

int main() {

    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    

    freopen("speeding.in", "r", stdin);
	freopen("speeding.out", "w", stdout);
    
    
    int n, m;
    cin >> n >> m;
    vector<int> limit, speed;

    for(int i = 0; i < n; i++){
        int l; cin >> l;
        int s; cin >> s;
        for(int j = 0; j < l; j++){
            limit.push_back(s);
        }
    }

    for(int i = 0; i < m; i++){
        int l; cin >> l;
        int s; cin >> s;
        for(int j = 0; j < l; j++){
            speed.push_back(s);
        }
    }

    int answer = 0;

    for(int i = 0; i < 100; i++){
        answer = max(answer, speed[i] - limit[i]);    
    }
    cout << answer << "\n";
    return 0;
}
