#include <bits/stdc++.h>
using namespace std;

int main(){
    set <int> s;

    // Insert
    s.insert(3);
    s.insert(4);
    s.insert(5);
    
    // Counting values
    cout << s.count(3) << "\n";
    cout << s.count(4) << "\n";
    cout << s.count(5) << "\n";

    // Size and Iterations
    cout << s.size() << "\n";
    
    // 1st Iteration
    set <int> ::iterator it = s.begin();
    for(it = s.begin(); it != s.end(); it++){
        cout << *it << "\n";
    }

    // 2nd Iteration using auto
    for(auto x : s){
        cout << x << "\n";
    }
}