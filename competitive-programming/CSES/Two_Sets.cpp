#include <bits/stdc++.h>
using namespace std;
#define ll long long

int main(){
    int n; cin >> n;
    ll total_sum = (1ll * n * (n + 1)) / 2;
    if(total_sum % 2 != 0){
        cout << "NO" << "\n";
    }    
    else {
        cout << "YES" << "\n";
        vector <int> set_1, set_2;
        vector <int> vis(n + 1);
        ll set1_sum = 0;
        ll max_element = n;
        while(set1_sum < total_sum / 2){
            ll remaining_sum = total_sum / 2 - set1_sum;
            if(remaining_sum > max_element){
                set_1.push_back(max_element);
                vis[max_element] = 1;
                set1_sum += max_element;
                max_element--;
            }
            else {
                set_1.push_back(remaining_sum);
                set1_sum += remaining_sum;
                vis[remaining_sum] = 1;
            }
        }

        for(int i = 1; i <= n; i++){
            if(!vis[i]){
                set_2.push_back(i);
            }
        }
        cout << set_1.size() << "\n";
        for(auto x : set_1){
            cout << x << " ";
        }
        cout << "\n";
        cout << set_2.size() << "\n";
        for(auto x : set_2){
            cout << x << " ";
        }
        cout << "\n";
    }
}