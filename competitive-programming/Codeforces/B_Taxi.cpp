#include <iostream>
int a[5], n, i, t;
int main()
{
    std::cin >> n;
    while (std::cin >> t)
        a[t]++;
    a[1] = std::max(a[1] - a[3], 0);
    std::cout << a[3] + a[4] + (a[1] + 2 * a[2] + 3) / 4;
}
