#include <bits/stdc++.h>
using namespace std;

void solve(string line) {
    stack<char> s;
    for (int i = 0; i < line.size(); i++) {
        if (line[i] == '(' || line[i] == ')') {
            if(line[i] == '('){
                s.push(line[i]);
            }
            else {
                if(s.empty()){
                    cout << "incorrect\n";
                    return;
                }
                else {
                    s.pop();
                }
            }
        }
    }
    if(s.size() > 0){
        cout << "incorrect\n";
        return;
    }
    cout << "correct" << "\n";
}

int32_t main() {
    string line;
    while (getline(cin, line)) {
        solve(line);
    }
    return 0;
}