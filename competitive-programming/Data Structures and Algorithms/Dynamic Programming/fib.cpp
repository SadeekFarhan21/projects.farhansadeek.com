#include <bits/stdc++.h>
using namespace std;

vector <int> v(1000, -1);

#include <bits/stdc++.h>
using namespace std;

vector <int> v(1000, -1);

long long fibo(int n){
    if(n == 0){
        return 0;
    }
    else if(n == 1){
        return 1;
    }
    if(v[n] == -1){
        v[n] = fibo(n - 1) + fibo(n - 2);
    }
    return v[n];
}

int main(){
    for(int i = 0; i < 100; i++){
        printf("%d === %ll\n", i, fibo(i));
    }
    return 0;
}
