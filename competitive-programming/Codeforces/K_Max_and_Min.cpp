#include <iostream>
#include <algorithm>
using namespace std;

int main(){
    long long a, b, c; cin >> a >> b >> c;
    long long arr[] = {a, b, c};
    cout << *min_element(arr, arr + 3) << " ";
    cout << *max_element(arr, arr + 3) << "\n";
}