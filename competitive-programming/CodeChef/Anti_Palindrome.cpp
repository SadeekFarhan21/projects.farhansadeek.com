#include <bits/stdc++.h>
using namespace std;

void solve(){
    int n; cin >> n;
    vector <char> v(n);
    map <char, int> m;
    for(int i = 0; i < n; i++){
        cin >> v[i];
        m[v[i]]++;
    }
    // semi palindrome check
    bool palindrome = true;
    if(v.size() % 2 == 0){
        for(auto x : m){
            if(x.second % 2 != 0){
                palindrome = false;
            }
        }
    }
    else {
        int count = 0;
        for(auto x : m){
            if(x.second % 2 == 1){
                count++;
            }
        }
        if(count > 1){
            palindrome = false;
        }
    }

    if(!palindrome){
        cout << "0";
    }
    else {
        int answer = 0;
        if(v.size() % 2 == 0){
            answer = 1;
        }
        else {
            set <char> s(v.begin(), v.end());
            if(s.size() >= 2){
                answer = 1;
            }
            else {
                answer = 2;
            }
        }
        cout << answer;
    }
    cout << "\n";
}

int main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}