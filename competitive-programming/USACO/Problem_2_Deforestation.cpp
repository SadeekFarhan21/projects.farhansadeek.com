/*
Farmer John is expanding his farm! He has identified the perfect location in the Red-Black Forest, which consists of N
 trees (1≤N≤105
) on a number line, with the i
-th tree at position xi
 (−109≤xi≤109
).

Environmental protection laws restrict which trees Farmer John can cut down to make space for his farm. There are K
 restrictions (1≤K≤105
) specifying that there must always be at least ti
 trees (1≤ti≤N
) in the line segment [li,ri]
, including the endpoints (−109≤li≤ri≤109
). It is guaranteed that the Red-Black Forest initially satisfies these restrictions.

Farmer John wants to make his farm as big as possible. Please help him compute the maximum number of trees he can cut down while still satisfying all the restrictions!

INPUT FORMAT (input arrives from the terminal / stdin):
Each input consists of T
 (1≤T≤10
) independent test cases. It is guaranteed that the sums of all N
 and of all K
 within an input each do not exceed 3⋅105
.

The first line of input contains T
. Each test case is then formatted as follows:

The first line contains integers N
 and K
.
The next line contains the N
 integers x1,…,xN
.
Each of the next K
 lines contains three space-separated integers: li
, ri
 and ti
.
OUTPUT FORMAT (print output to the terminal / stdout):
For each test case, output a single line with an integer denoting the maximum number of trees Farmer John can cut down.

SAMPLE INPUT:
3
7 1
8 4 10 1 2 6 7
2 9 3
7 2
8 4 10 1 2 6 7
2 9 3
1 10 1
7 2
8 4 10 1 2 6 7
2 9 3
1 10 4
SAMPLE OUTPUT:
4
4
3
For the first test case, Farmer John can cut down the first 4
 trees, leaving trees at xi=2,6,7
 to satisfy the restriction.

For the second test case, the additional restriction does not affect which trees Farmer John can cut down, so he can cut down the same trees and satisfy both restrictions.

For the third test case, Farmer John can only cut down at most 3
 trees because there are initially 7
 trees but the second restriction requires him to leave at least 4
 trees uncut.

SCORING:
Input 2: N,K≤16
Inputs 3-5: N,K≤1000
Inputs 6-7: ti=1
 for all i=1,…,K
.
Inputs 8-11: No additional constraints.

Problem credits: Tina Wang, Jiahe Lu, Benjamin Qi
*/

#include <bits/stdc++.h>
using namespace std;
#define int long long int 

void solve()
{
    int num_elements, num_intervals;
    cin >> num_elements >> num_intervals;

    vector<int> elements(num_elements);
    for (auto &element : elements)
    {
        cin >> element;
    }
    sort(elements.begin(), elements.end());

    vector<int> interval_left(num_intervals);
    vector<int> interval_right(num_intervals);
    vector<int> interval_required(num_intervals);
    for (int i = 0; i < num_intervals; ++i)
    {
        cin >> interval_left[i] >> interval_right[i] >> interval_required[i];
    }

    vector<int> interval_indices(num_intervals);
    for (int i = 0; i < num_intervals; ++i)
    {
        interval_indices[i] = i;
    }
    sort(interval_indices.begin(), interval_indices.end(), [&](int a, int b)
         {
        if (interval_right[a] != interval_right[b])
            return interval_right[a] < interval_right[b];
        return interval_left[a] < interval_left[b]; });

    vector<int> fenwick(num_elements + 1, 0);
    set<int> not_chosen_elements;
    for (int i = 1; i <= num_elements; ++i)
    {
        not_chosen_elements.insert(i);
    }

    auto update = [&](int index, int value) -> void
    {
        while (index <= num_elements)
        {
            fenwick[index] += value;
            index += index & -index;
        }
    };

    auto query = [&](int index) -> int
    {
        int result = 0;
        while (index > 0)
        {
            result += fenwick[index];
            index -= index & -index;
        }
        return result;
    };

    auto range_query = [&](int left, int right) -> int
    {
        if (left > right)
            return 0;
        return query(right) - query(left - 1);
    };

    for (int i : interval_indices)
    {
        int left = interval_left[i];
        int right = interval_right[i];
        int required = interval_required[i];

        int start_index = lower_bound(elements.begin(), elements.end(), left) - elements.begin() + 1;
        int end_index = upper_bound(elements.begin(), elements.end(), right) - elements.begin();

        if (start_index > end_index)
            continue;

        int already_chosen = range_query(start_index, end_index);
        int needed = required - already_chosen;

        if (needed <= 0)
            continue;

        auto it = not_chosen_elements.upper_bound(end_index);
        if (it != not_chosen_elements.begin())
        {
            --it;
        }

        while (needed > 0 && it != not_chosen_elements.end() && *it >= start_index)
        {
            int element_index = *it;
            update(element_index, 1);
            it = not_chosen_elements.erase(it);
            if (it != not_chosen_elements.begin())
            {
                --it;
            }
            --needed;
        }
    }

    int total_chosen = query(num_elements);
    cout << (num_elements - total_chosen) << "\n";
}

int32_t main()
{
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    for (int i = 0; i < t; i++)
    {
        solve();
    }

    return 0;
}
