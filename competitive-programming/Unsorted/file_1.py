N, M = map(int, input().split())
h = list(map(int, input().split()))
candy_heights = list(map(int, input().split()))

idx = 0 
N_cows = len(h)

for candy_height in candy_heights:
    s = 0  # Starting point of uneaten candy cane
    while idx < N_cows and s < candy_height:
        if h[idx] >= s:
            amount = min(h[idx], candy_height) - s
            if amount > 0:
                h[idx] += amount
                s += amount
        idx += 1
    idx = 0  # Reset idx for the next candy cane

for height in h:
    print(height)
