#include <iostream>
#include <string>
#include <map>
#include <algorithm>
#include <vector>
using namespace std;
#define int long long

void solve(){
    string s1; cin >> s1;
    string s2 = "";
    map<int, pair<int, int>> count;
    int one = 0, zero = 0;
    for(int i = 0; i < s1.size(); i++){
        s2.push_back((s1[i] - '0') ^ 1 + '0');
    }
    int ones = std::count(s1.begin(), s1.end(), '1');
    int zeros = std::count(s1.begin(), s1.end(), '0');

    for(int i = 0; i < s2.size(); i++){
        if(s2[i] == '1'){
            one++;
            count[i] = {zero, one};
        }
        else {
            zero++;
            count[i] = {zero, one};
        }
    }
    int length = 0;
    for(auto x : count){
        if(x.second.first <= zeros && x.second.second <= ones) {
            length++;
        }
    }
    cout << s1.length() - length << "\n";
}

int32_t main(){
    int t; cin >> t;
    for(int i = 0; i < t; i++){
        solve();
    }
}
