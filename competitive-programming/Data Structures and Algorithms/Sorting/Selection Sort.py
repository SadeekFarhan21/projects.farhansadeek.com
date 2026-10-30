from psutil import swap_memory


n = int(input())
v = list(map(int,input().strip().split()))[:n]

# *Implementation of Selection Sort

for i in range(n):
    minIndex = i
    for j in range(i + 1, n - 1):
        if v[i] < v[minIndex]:
            minIndex = j
    v[i], v[minIndex] = v[minIndex], v[i]

for i in range(n):
    print(v[i])