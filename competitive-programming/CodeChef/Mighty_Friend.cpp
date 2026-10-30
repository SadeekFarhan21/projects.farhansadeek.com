#include <bits/stdc++.h>
using namespace std;

void swap_largest_smallest(std::vector<int>& vec) {
    if(vec.empty()) {
        return;
    }

    auto min_it = std::min_element(vec.begin(), vec.end());
    auto max_it = std::max_element(vec.begin(), vec.end());
    swap(*min_it, *max_it);
}

int main(){
    
}