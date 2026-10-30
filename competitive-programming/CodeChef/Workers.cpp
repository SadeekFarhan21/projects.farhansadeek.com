#include <bits/stdc++.h>
using namespace std;

int main(){
    int n; cin >> n;
    vector <int> c(n);
    vector <int> t(n);
    for(int i = 0; i < n; i++){
        cin >> c[i];
    }
    for(int i = 0; i < n; i++){
        cin >> t[i];
    }
    vector <int> t1;
    vector <int> t2;
    vector <int> t3;
    for(int i = 0; i < n; i++){
        if(t[i] == 1) t1.push_back(c[i]);
        else if(t[i] == 2) t2.push_back(c[i]);
        else t3.push_back(c[i]);
    }
    sort(t1.begin(), t1.end());
    sort(t2.begin(), t2.end());
    sort(t3.begin(), t3.end());
    if(t3.size() > 0 && t2.size() > 0 && t1.size() > 0){
        cout << min(t1[0] + t2[0], t3[0]) << "\n";
    }
    else if(t3.size() > 0) cout << t3[0] << "\n";
    else cout << t1[0] + t2[0] << "\n";
    return 0;
}
