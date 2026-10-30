#include <bits/stdc++.h>
using namespace std;

int main(){
    string s; getline(cin, s);
    sort(s.begin(), s.end());
    vector <string> v;
    int answer = 0;
    do {
        v.push_back(s);
        answer += 1;
    } while(next_permutation(s.begin(), s.end()));
    cout << answer << "\n";
    for(int i = 0; i < v.size(); i++){
        cout << v[i] << "\n";
    }
    return 0;
}