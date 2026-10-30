def gcd_recursive(a, b):
    if b == 0:
        return a
    else:
        return gcd_recursive(b, a % b)
    
def gcd_iterative(a, b):
    while b > 0:
        a, b = b, a % b
    return a
print(gcd_iterative(10, 15))

