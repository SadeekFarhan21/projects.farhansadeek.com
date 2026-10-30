#include <bits/stdc++.h>
using namespace std;
#define ll long long
int length = 1;
int sequence(int a){
    if(a == 1){
        return length;
    }
    if(a % 2 != 0){
        a *= 3;
        a += 1;
        length++;
    }
    else {
        a /= 2;
        length++;
    }
    return sequence(a);
}

int main(){
    ll a; cin >> a;
    cout << sequence(a) << "\n";
}