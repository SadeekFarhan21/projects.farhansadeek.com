memo = []
for i in range(1000):
    memo.append(-1)   # -1 means not calculated yet
def fib(n):
    if n == 0:
        return 0
    if n == 1:
        return 1
    if memo[n] != -1:
        return memo[n]
    memo[n] = fib(n-1) + fib(n-2)
    return memo[n]

for i in range(1, 801):
    print(f'{i} -> {fib(i)}')