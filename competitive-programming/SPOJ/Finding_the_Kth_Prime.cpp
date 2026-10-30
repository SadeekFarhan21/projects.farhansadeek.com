#include <bits/stdc++.h>
using namespace std;
const int size = 1000000007; 
bool prime[size];

void SieveOfEratosthenes(){ 
    memset(prime, true, sizeof(prime));
    for (int p = 2; p * p <= size; p++) { 
        if (prime[p] == true) { 
            for (int i = p * p; i <= size; i += p){
                prime[i] = false;
            }
        } 
    }
} 
int main(){
    int t; cin >> t;
    
}