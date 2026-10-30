#include <bits/stdc++.h>
using namespace std;

void solve() {
    string s; cin >> s;
    int n = s.size();
    stack<char> st;
    st.push('(');

    for (int i = 0; i < n; i++) {
        if (s[i] == '(' || s[i] == '+' || s[i] == '-' || s[i] == '*' || s[i] == '/' || s[i] == '^') {
            st.push(s[i]);
        } else if (s[i] == ')') {
            if (st.top() == '(')
                st.pop();
            else {
                while (st.top() != '(') {
                    cout << st.top();
                    st.pop();
                }
                st.pop();
            }
        } else
            cout << s[i];
    }

    while (!st.empty() && st.top() != '(') {
        cout << st.top();
        st.pop();
    }

    cout << endl;
}

int main() {
    int t;
    cin >> t;

    for(int i = 0; i < t; i++) {
        solve();
    }

    return 0;
}
