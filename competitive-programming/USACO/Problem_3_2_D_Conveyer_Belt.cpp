/*
Farmer John's milk factory can be described by an N
 by N
 (1≤N≤1000
) grid of cells that contain conveyor belts. Position (a,b
) describes the cell that is in the a
-th row from the top and b
-th column from the left. There are 5
 types of cells:

"L" — the cell is a leftward facing conveyor belt which moves all items on it 1 cell left every time unit.
"R" — the cell is a rightward facing conveyor belt which moves all items on it 1 cell right every time unit.
"U" — the cell is an upward facing conveyor belt which moves all items on it 1 cell up every time unit.
"D" — the cell is a downward facing conveyor belt which moves all items on it 1 cell down every time unit.
"?" — Farmer John has not built a conveyor belt at that cell yet.
Note that conveyor belts can also move items outside the grid. A cell c
 is unusable if an item placed at cell c
 will never exit the conveyor belt grid (i.e. it will move around in the grid forever).

Initially, Farmer John has not started building the factory so all cells start out as "?". For the next Q
 (1≤Q≤2⋅105
) days starting from day 1
 and ending at day Q
, Farmer John will choose a cell that does not have a conveyor belt and build a conveyor belt at the cell.

Specifically, during the i
-th day, Farmer John will build a conveyor belt of type ti
 (ti∈{L,R,U,D}
) at position (ri,ci
) (1≤ri,ci≤N
). It is guaranteed that there is no conveyor belt at position (ri,ci
).

After each day, help Farmer John find the minimum number of unusable cells he can achieve by optimally building conveyor belts on all remaining cells without a conveyor belt.

INPUT FORMAT (input arrives from the terminal / stdin):
The first line contains N
 and Q
.
The i
-th of the next Q
 lines contains ri
, ci
, and ti
 in that order.

OUTPUT FORMAT (print output to the terminal / stdout):
Q
 lines, the i
-th of which describing the minimum number of unusable cells if Farmer John fills optimally builds conveyor belts on all remaining cells that do not currently have a conveyor belt.
SAMPLE INPUT:
3 5
1 1 R
3 3 L
3 2 D
1 2 L
2 1 U
SAMPLE OUTPUT:
0
0
0
2
3
The conveyor belt after the fifth day is shown below.
RL?
U??
?DL
One optimal way to build conveyor belts on the remaining cells is as follows.

RLR
URR
LDL
In this configuration, the cells at (1,1
), (1,2
), and (2,1
) are unusable.
SAMPLE INPUT:
3 8
1 1 R
1 2 L
1 3 D
2 3 U
3 3 L
3 2 R
3 1 U
2 1 D
SAMPLE OUTPUT:
0
2
2
4
4
6
6
9
The conveyor belt after the eighth day is shown below.
RLD
D?U
URL
No matter what conveyor belt Farmer John can build at the center, all cells will be unusable.
SAMPLE INPUT:
4 13
2 2 R
2 3 R
2 4 D
3 4 D
4 4 L
4 3 L
4 2 U
3 1 D
4 1 R
2 1 L
1 1 D
1 4 L
1 3 D
SAMPLE OUTPUT:
0
0
0
0
0
0
0
0
11
11
11
11
13
SCORING:
Inputs 4-5: N≤10
Inputs 6-7: N≤40
Inputs 8-13: No additional constraints

Problem credits: Alex Liang
*/

#include <bits/stdc++.h>
using namespace std;
#define int long long int

int n;
vector<vector<int>> dir;
vector<vector<bool>> is_fixed;
vector<vector<bool>> escapable;
vector<vector<int>> outdeg_esc;
queue<pair<int, int>> escapable_queue;
int escapable_count;

const int dr[4] = {0, 0, -1, 1};
const int dc[4] = {-1, 1, 0, 0};

int direction_index(char c)
{
    switch (c)
    {
    case 'L':
        return 0;
    case 'R':
        return 1;
    case 'U':
        return 2;
    case 'D':
        return 3;
    default:
        return -1;
    }
}

bool is_inside(int r, int c, int N)
{
    return (0 <= r && r < N && 0 <= c && c < N);
}

bool is_boundary(int r, int c)
{
    return r == 0 || r == n - 1 || c == 0 || c == n - 1;
}

void make_escapable(int r, int c)
{
    if (!escapable[r][c])
    {
        escapable[r][c] = true;
        escapable_count++;
        escapable_queue.push(make_pair(r, c));
    }
}

void set_fixed_direction(int r, int c, char t)
{
    dir[r][c] = direction_index(t);
    is_fixed[r][c] = true;
}

int calculate_outdeg_esc(int r, int c)
{
    int count_dirs = 0;
    if (is_boundary(r, c))
        count_dirs++;
    if (c - 1 >= 0 && escapable[r][c - 1])
        count_dirs++;
    if (c + 1 < n && escapable[r][c + 1])
        count_dirs++;
    if (r - 1 >= 0 && escapable[r - 1][c])
        count_dirs++;
    if (r + 1 < n && escapable[r + 1][c])
        count_dirs++;
    return count_dirs;
}

void revert_cell(int r, int c)
{
    is_fixed[r][c] = false;
    dir[r][c] = -1;
    if (!escapable[r][c])
    {
        int count_dirs = calculate_outdeg_esc(r, c);
        outdeg_esc[r][c] = count_dirs;
        if (count_dirs > 0)
        {
            make_escapable(r, c);
        }
    }
}

int get_unusable_cells()
{
    return n * n - escapable_count;
}

void update_predecessors(int r, int c)
{
    {
        int R = r;
        int C = c + 1;
        if (is_inside(R, C, n) && !escapable[R][C])
        {
            if (!is_fixed[R][C])
            {
                outdeg_esc[R][C]++;
                if (outdeg_esc[R][C] == 1)
                {
                    make_escapable(R, C);
                }
            }
            else
            {
                int d = dir[R][C];
                int nr = R + dr[d];
                int nc = C + dc[d];
                if (nr == r && nc == c)
                {
                    make_escapable(R, C);
                }
            }
        }
    }
    {
        int R = r;
        int C = c - 1;
        if (is_inside(R, C, n) && !escapable[R][C])
        {
            if (!is_fixed[R][C])
            {
                outdeg_esc[R][C]++;
                if (outdeg_esc[R][C] == 1)
                {
                    make_escapable(R, C);
                }
            }
            else
            {
                int d = dir[R][C];
                int nr = R + dr[d];
                int nc = C + dc[d];
                if (nr == r && nc == c)
                {
                    make_escapable(R, C);
                }
            }
        }
    }
    {
        int R = r + 1;
        int C = c;
        if (is_inside(R, C, n) && !escapable[R][C])
        {
            if (!is_fixed[R][C])
            {
                outdeg_esc[R][C]++;
                if (outdeg_esc[R][C] == 1)
                {
                    make_escapable(R, C);
                }
            }
            else
            {
                int d = dir[R][C];
                int nr = R + dr[d];
                int nc = C + dc[d];
                if (nr == r && nc == c)
                {
                    make_escapable(R, C);
                }
            }
        }
    }
    {
        int R = r - 1;
        int C = c;
        if (is_inside(R, C, n) && !escapable[R][C])
        {
            if (!is_fixed[R][C])
            {
                outdeg_esc[R][C]++;
                if (outdeg_esc[R][C] == 1)
                {
                    make_escapable(R, C);
                }
            }
            else
            {
                int d = dir[R][C];
                int nr = R + dr[d];
                int nc = C + dc[d];
                if (nr == r && nc == c)
                {
                    make_escapable(R, C);
                }
            }
        }
    }
}

void process_queue()
{
    while (!escapable_queue.empty())
    {
        pair<int, int> cell = escapable_queue.front();
        escapable_queue.pop();
        int r = cell.first;
        int c = cell.second;
        update_predecessors(r, c);
    }
}

void initialize_escapable()
{
    for (int r = 0; r < n; ++r)
    {
        for (int c = 0; c < n; ++c)
        {
            if (!is_fixed[r][c])
            {
                if (is_boundary(r, c))
                {
                    outdeg_esc[r][c] = 1;
                    make_escapable(r, c);
                }
            }
            else
            {
                int d = dir[r][c];
                int nr = r + dr[d];
                int nc = c + dc[d];
                if (!is_inside(nr, nc, n))
                {
                    make_escapable(r, c);
                }
            }
        }
    }
}

void initialize_grid(int sz)
{
    n = sz;
    escapable_count = 0;
    dir = vector<vector<int>>(n, vector<int>(n, -1));
    is_fixed = vector<vector<bool>>(n, vector<bool>(n, false));
    escapable = vector<vector<bool>>(n, vector<bool>(n, false));
    outdeg_esc = vector<vector<int>>(n, vector<int>(n, 0));
}

int32_t main()
{
    ios::sync_with_stdio(false);
    cin.tie(NULL);

    int Q;
    cin >> n >> Q;
    initialize_grid(n);
    vector<int> rr(Q), cc(Q);
    vector<char> tt(Q);
    for (int i = 0; i < Q; ++i)
    {
        cin >> rr[i] >> cc[i] >> tt[i];
        rr[i]--;
        cc[i]--;
    }

    for (int i = 0; i < Q; ++i)
    {
        set_fixed_direction(rr[i], cc[i], tt[i]);
    }

    initialize_escapable();
    process_queue();

    vector<int> answers(Q);
    answers[Q - 1] = get_unusable_cells();

    for (int i = Q - 1; i >= 1; --i)
    {
        revert_cell(rr[i], cc[i]);
        process_queue();
        answers[i - 1] = get_unusable_cells();
    }

    for (int i = 0; i < Q; i++)
    {
        cout << answers[i] << "\n";
    }

    return 0;
}