#include "bits/stdc++.h"
using namespace std;
#define int long long
#define double long double

int32_t main() {
    int n;
    cin >> n;
    vector<string> answer;
    for (int i = 0; i < n; i++) {
        string s;
        cin >> s;
        if (s == "pwd") {
            for (int i = 0; i < answer.size(); i++)
                cout << "/" << answer[i];
        }
        cout << "\n";
    }
    else {
        // this is the change directory one
    }
}