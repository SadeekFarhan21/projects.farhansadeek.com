/*
Bessie and Elsie have discovered a row of N
 cakes (2≤N≤5⋅105,N even)
 cakes, with sizes a1,a2,…,aN
 in that order (1≤ai≤109
).

Each cow wants to eat as much as possible. However, being very civilized cows, they decided to play a game to split it! The game proceeds with both cows alternating turns. Each turn consists of one of the following:

Bessie chooses two adjacent cakes and stacks them, creating a new cake with the sum of the sizes.
Elsie chooses either the leftmost or rightmost cake and puts it in her stash.
When only one cake remains, Bessie eats it, and Elsie eats all cakes in her stash. If both cows play optimally to maximize the amount of cake they eat and Bessie plays first, how much cake will each cow eat?

INPUT FORMAT (input arrives from the terminal / stdin):
Each input consists of T
 (1≤T≤10
) independent test cases. It is guaranteed that the sum of all N
 within an input does not exceed 106
.
Each test case is formatted as follows. The first line contains N
. The next line contains N
 space-separated integers, a1,a2,…,aN
.

OUTPUT FORMAT (print output to the terminal / stdout):
For each test case, output a line containing b
 and e
, representing the amounts of cake Bessie and Elsie respectively will consume if both cows play optimally.
SAMPLE INPUT:
2
4
40 30 20 10
4
10 20 30 40
SAMPLE OUTPUT:
60 40
60 40
For the first test case, under optimal play,

Bessie will stack the middle two cakes. The cakes now have sizes [40,50,10]
.
Elsie will eat the leftmost cake. The remaining cakes now have sizes [50,10]
.
Bessie stacks the remaining two cakes.
Bessie will eat 30+20+10=60
 cake, while Elsie will eat 40
 cake.

The second test case is the reverse of the first, so the answer is the same.

SCORING:
Input 2: All ai
 are equal.
Input 3: N≤10
Inputs 4-7: N≤5000
Inputs 8-11: No additional constraints.

Problem credits: Linda Zhao, Agastya Goel, Gavin Ye
*/

#include <bits/stdc++.h>
using namespace std;
#define int long long int

int32_t main()
{
    ios::sync_with_stdio(false);
    cin.tie(NULL);

    int t;
    cin >> t;
    for (int _i = 0; _i < t; _i++)
    {
        int n;
        cin >> n;
        vector<int> a(n);
        for (int i = 0; i < n; i++)
        {
            cin >> a[i];
        }

        vector<int> pre(n + 1, 0);
        for (int i = 0; i < n; i++)
        {
            pre[i + 1] = pre[i] + a[i];
        }

        int total_sum = pre[n];
        int length = (n / 2) + 1;

        int bessie_final = LLONG_MAX;
        for (int start = 0; start + length <= n; start++)
        {
            int segment_sum = pre[start + length] - pre[start];
            if (segment_sum < bessie_final)
            {
                bessie_final = segment_sum;
            }
        }

        int bessie = bessie_final;
        int elsie = total_sum - bessie;
        cout << bessie << " " << elsie << "\n";
    }
    return 0;
}