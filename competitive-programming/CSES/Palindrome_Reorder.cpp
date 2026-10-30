#include <bits/stdc++.h>
using namespace std;

int main(){
    string s; cin >> s;
    map <char, int> m;
    for(char c : s){
        m[c]++;
    }
    int odd = 0;
    char middle = ' '; // Add declaration for 'middle' variable
    string first_half = "";
    for(auto c : m){
        if(c.second % 2 != 0){
            odd++;
            middle = c.first; // Assign the character to 'middle' instead of 'c'
        }
    }
    if(m.size() == 1){
        cout << s << "\n";
        return 0;
    }

    if(odd >= 2){
        cout << "NO SOLUTION" << "\n";
        return 0;
    }

    for(auto c : m){
        for(int i = 0; i < c.second / 2; i++){
            first_half.push_back(c.first);
        }
    }
    string second_half = first_half;
    reverse(second_half.begin(), second_half.end());
    string answer = first_half + middle + second_half;
    if(middle == ' '){
        answer = first_half + second_half;
    }
    // cout << middle << "\n";
    cout << answer << "\n";
    return 0;
}