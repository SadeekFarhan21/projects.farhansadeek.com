#include <bits/stdc++.h>
using namespace std;

int round(int a){
    int answer = 0;
    string s = to_string(a);
    answer = (s.size() - 1) * 9 + s[0] - '0';
    return answer;
}

int main(){
    int n; cin >> n;
    for(int i = 0; i < n; i++){
        int a; cin >> a;
        cout << round(a) << "\n";
    }
    return 0;
}