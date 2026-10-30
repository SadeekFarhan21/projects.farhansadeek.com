#include <bits/stdc++.h>
using namespace std;

int main(){
    int limit; cin >> limit;
    vector <bool> is_prime(limit + 1, true);
    is_prime[0] = is_prime[1] = false;
    for(int i = 2; i <= limit; i++){
        if(is_prime[i]){
            for(int j = i * i; j <= limit; j += i){
                is_prime[j] = false;
            }
        }
    }
    int count = 0;
    set <int> s;
    for(int i = 1; i <= limit; i++){
        if(is_prime[i]){
            count++;
            s.insert(i);
        }
    }
    cout << count << "\n";
    for(auto a : s){
        cout << a << " ";
    }
    cout << '\n';
}