# MIT 18.314 Combinatorial Analysis (Fall 2014) — Problem Sets 1–12

Prof. Richard Stanley · MIT OpenCourseWare · CC BY-NC-SA 4.0

Source: <https://ocw.mit.edu/courses/18-314-combinatorial-analysis-fall-2014/pages/assignments/>

Textbook: Bona, Miklos. A Walk Through Combinatorics: An Introduction to Enumeration and Graph Theory. World Scientific Publishing Company, 2011. ISBN: 9789814335232.

A problem marked by * is difficult; it is not necessary to solve such a problem to do well in the course.

Handouts:
- The Matrix-Tree Theorem: `site/public/courses/18-314/MIT18_314F14_matrix-tree.pdf`
- Pennies in a Tray: `site/public/courses/18-314/MIT18_314F14_pennies.pdf`

---

## Problem Set 1 — Due in Session 3

**Practice Problems**

- Session 1: Chapter 1: Exercises 1, 6a, 8*, 12 Some of these problems can be done in other ways, but the idea is to give a proof using the pigeonhole principle.
- Session 2: Chapter 2: Exercises 2, 5, 12, 15*, Chapter 3: Exercise 2

**Problems Assigned in the Textbook**

- Chapter 1: Exercises 22, 26, 31. In 26, a “regular” triangle is an equilateral triangle. Solve 31(a) for every value of n≥2, not just some particular value. 31(b) is rather tricky.
- Chapter 2: Exercises 18, 29, 33
- Chapter 3: Exercises 27, 34

**Additional Problems**

- None

**Bonus Problems**

- None

---

## Problem Set 2 — Due in Session 6

**Practice Problems**

- Session 3: Chapter 3: Exercises 8, 9, 12, 18, 23, 24*
- Session 4: Chapter 4: Exercises 3, 13, 16, 26
- Session 5: Chapter 5: Exercises 6, 7, 8

**Problems Assigned in the Textbook**

- Chapter 3: Exercises 38*, 41, 49. In my opinion Problem 38 does not deserve its (+), while 41 might need it.
- Chapter 4: Exercises 29, 39, 53*. Naturally in 53 you shouldn’t use a computer, calculator, etc. Hint for 53: Consider also √11-√10.
- Chapter 5: Exercises 23, 35 in 35, find a formula for _a_n in terms of Fibonacci numbers.

**Additional Problems**

- (A1) Find the number _b_n of compositions of the positive integer n into odd parts. Express your answer in terms of Fibonacci numbers.

**Bonus Problems**

- None

---

## Problem Set 3 — Due in Session 8

**Practice Problems**

- Session 6: Chapter 5: Exercises 11, 12, 13
- Session 7: Chapter 5: Exercises 1, 5, 16

**Problems Assigned in the Textbook**

- Chapter 5: Exercise 21
- Chapter 5: Exercise 34. Only do the case k=1, which is already pretty tricky and in my opinion deserves a (+)

**Additional Problems**

- (A2) Let λ be a partition with conjugate λ’. Show that Σ i ⌊λ2_i-1_/2⌋ = Σ i ⌈λ’2i/2⌉. This can be seen almost by inspection from the Young diagram of λ after certain marks are made on it. Note. The notation ⌊x⌋ means the greatest integer ≤x. For instance, ⌊3⌋=3, ⌊3/2⌋=1. Similarly ⌈x⌉ means the least integer ≥x. For instance, ⌈3⌉=3, ⌈3/2⌉=2.
- (A3) Show by simple combinatorial reasoning and induction that the Bell number B(n) is even if and only if n-2 is divisible by 3.

**Bonus Problems**

- None

---

## Problem Set 4 — Due in Session 11

**Practice Problems**

- Session 8: Chapter 6: Exercises 7, 8, 10. Problem 10 is famous for its very tricky solution. (The second paragraph of the solution to Problem 10 belongs with Problem 9.)
- Session 9: Chapter 6: Exercises 2, 3, 5, 7, 8, 14, 18, 23
- Session 10: None

**Problems Assigned in the Textbook**

- Chapter 6: Exercises 26, 31. Problem 26 seems to be missing the verb “are.”
- Chapter 6: Exercises 43, 49

**Additional Problems**

- (A4) This problem is a variation of a result discussed in class. (For the class problem, see Problem 1: Names in Boxes (PDF).) We have the same 100 prisoners and evil warden. As before, the prisoners are brought one at a time into a room with 100 boxes labeled 1,2,…,100. Inside each box is the name of a prisoner, a different name in each box. This time a prisoner must open 99 boxes, one at a time. If the prisoner encounters his own name, then all prisoners are killed. The prisoners may talk together before the first prisoner enters the room with the boxes. After that there is no further communication. A prisoner cannot leave a signal in the room. All boxes are closed before each prisoner enters the room. Clearly the probability that the prisoners aren’t killed cannot exceed 1/100, since that is the probability that the first prisoner does not encounter his name. What strategy maximizes the probability that the prisoners are not killed, and what is this maximum probability?
- (A5) Let n≥3. Pick a permutation π of 1,2,…,n at random (uniform distribution, i.e., all permutations are equally likely). What is the probability that 1,2,3 are all in different cycles of π?
- (A6*) Call two permutations _a_1, …, _a_n and _b_1, …, _b_n of 1,2,…,n equivalent if one can be obtained from the other by switching adjacent terms that differ by at least two. For instance 254613 is equivalent to 542361, one sequence of switches being 254613, 524613, 542613, 542631, 542361. Clearly this is an equivalence relation. (It is assumed that you know about equivalence relations and equivalence classes.) How many equivalence classes are there? For instance, when n=3 there are the four classes {123}, {132,312}, {213,231}, {321}.

**Bonus Problems**

- None

---

## Problem Set 5 — Due in Session 14

**Practice Problems**

- Session 11: Chapter 7: Exercises 4, 5, 6, 7, 8, 9, 10, 13
- Session 12: None
- Session 13: Chapter 8: Exercises 8, 15, 16*
  - Additional practice problem: Let f(n) be the number of ways to choose a composition of n and then color each odd part either red or blue. For instance, when n=3 there are two ways to color the compositions 3, 2+1, and 1+2 (so six in all) and eight ways to color 1+1+1. Thus f(3)=14. Find Σn≥1 f(n)_x_n , and find a formula for f(n). Your formula for f(n) should involve √3. Hint. Use Theorem 8.13.

**Problems Assigned in the Textbook**

- Chapter 7: Exercises 17, 27, 36

**Additional Problems**

- None

**Bonus Problems**

- (B1) Let _E_n denote the number of permutations _a_1_a_2…_a_n of 1,2,…,n such that _a_1>_a_2<_a_3> _a_4<…. (The signs > and < alternate.) For instance, E_4=5, corresponding to 2143, 3142, 3241, 4132, 4231. Show that for n>0, E_2_n = {2_n\choose 2}E_2_n_-2 - {2_n\choose 4}E_2n-4 + {2_n\choose 6}_E_2_n_-6 - …. Deduce from this recurrence a simple formula for the generating function Σn≥0 _E_2_n_ x_2_n_ /(2_n)!.

---

## Problem Set 6 — Due in Session 17

**Practice Problems**

- Session 14: Chapter 8: Exercises 1, 2, 4, 7, 8, 10, 14*
  - Additional practice problem: Let f(n) denote the number of permutations π of 1,2,…,n such that for all 1≤i≤n we have π(i) = i-1, i, i+1, or i+2. (Set f(0)=1.) For instance, f(3)=4, the four permutations being 123, 132, 213, 312. Find the generating function G(x) = Σn≥0 f(n)xn. You do not need to find a formula for f(n). What if we do not allow fixed points, i.e., we exclude π(i)=i? Hint. Consider the digraph of π where we write the vertices 1,2,…,n in a line.
- Session 15: None from textbook
  - (additional practice problem): Suppose we have 2_n_ points on the circumference of a circle. Show that the number of ways we can draw n noncrossing diagonals connecting the points, such that each of the points is an endpoint of one of the diagonals, is equal to the Catalan number Cn. Give a bijection with ballot sequences of length 2_n_. (Ballot sequences and Catalan numbers were discussed in class.)

**Problems Assigned in the Textbook**

- Chapter 8: Exercises 24, 26, 35. In 24 use generating functions. Do not simply guess the answer and verify that it is correct. In 35, Hn should be hn. Also find a simple explicit formula for hn.

**Additional Problems**

- (A7) Let f(n) be the number of ways to stack pennies against a flat wall as follows: the bottom level consists of a row of n pennies, each tangent to its neighbor(s). A penny may be placed in a higher row if it is supported by two pennies below it. Here is an example (PDF) for n=10 and for all five possibilities when n=3. Show that f(n)=Cn, a Catalan number. (One of many methods is to give a bijection with the Dyck paths discussed in class.)

**Bonus Problems**

- None

---

## Problem Set 7 — Due in Session 19

**Practice Problems**

- Session 17: None from textbook
  - Let n≥1, and let f(n) be the number of partitions of n such that for all k, the part k occurs at most k times. Let g(n) be the number of partitions of n such that no part has the form i(i+1), i.e., no parts equal to 2, 6, 12, 20, …. Show that f(n)=g(n). Use generating functions.
  - Let f(n) denote the number of partitions of n with an even number of 1’s. Give a combinatorial proof and a generating function proof that f(n) + f(n-1) = p(n), the total number of partitions of n.
- Session 18: Chapter 8: Exercises 20, 21

**Problems Assigned in the Textbook**

- Chapter 8: Exercises 27, 28, 32, 37*. In exercise 28, you can ignore the last sentence (about comparing with Exercise 4). Hint for 37. Consider the product 1/(1-qx)(1-qx²)(1-qx³)…

**Additional Problems**

- (A8*) Show that the number of partitions of n for which no part appears exactly once is equal to the number of partitions of n for which every part is divisible by 2 or 3. For instance, when n=6 there are four partitions of the first type (111111,2211,222,33) and four of the second type (222, 33, 42, 6). Use generating functions.
- (A9) Show that the number of partitions of n for which no part appears more than twice is equal to the number of partitions of n for which no part is divisible by 3. For instance, when n=5 there are five partitions of the first type (5, 41, 32, 311, 221) and five of the second type (5, 41, 221, 2111, 11111). Use generating functions.

**Bonus Problems**

- (B2) Find the generating function G(x) = Σn≥0 anxn/n!, where an+1 = (n+1)an-{n\choose 2}an-2 for n≥0, and a0=1. Thus a1=1, a2=2, a3=5. You don’t need to find a formula for an.

---

## Problem Set 8 — Due in Session 22

**Practice Problems**

- Session 19: None from textbook
  - A group of n children form circles by holding hands, with a child in the center of each circle. Let h(n) be the number of ways that this can be done. Set h(0)=1. Find a simple expression for the generating function F(x) = Σn≥₀h(n)xⁿ/n!. A circle may consist of just one child holding his or her own hands, but a child must be in the center of each circle. The clockwise order of the children around the circle matters, so k children can form a circle in (k-1)! ways. Thus h(1)=0, h(2)=2, h(3)=3, h(4)=20, h(5)=90. Answer: (1-x)ˣ
- Session 20: Chapter 9: Exercises 1, 2, 3, 6, 16, 18
- Session 21: Chapter 9: Exercises 8, 11, 14, 21

**Problems Assigned in the Textbook**

- Chapter 9: Exercises 24, 30
- Chapter 9: Exercises 34, 41. Hint for 41: Induction on n.

**Additional Problems**

- (A10) Let f(n) be the number of ways to paint n giraffes either red, blue, yellow, or turquoise, such that an odd number of giraffes are red and an even number are blue. Use exponential generating functions to find a simple formula for f(n). (It is allowed to have no giraffes painted blue, yellow, or turquoise.)
- (A11) Let f(n) be the number of ways to partition an n-element set, and then to choose a nonempty subset of each block of the partition. Find a simple formula (no infinite sums) for the exponential generating function G(x) = Σn≥0 f(n)x_n/_n!.
- (A12) Give a simple reason why a 9-vertex simple graph cannot have the degrees of its vertices equal to 8, 8, 6, 5, 5, 4, 4, 3, 1.

**Bonus Problems**

- Chapter 9: Exercise 49

---

## Problem Set 9 — Due in Session 25

**Practice Problems**

- Session 22: Chapter 10: Exercises 1, 2, 7. 7 is quite difficult.
- Session 23: Chapter 10: Exercises 6, 7, 12, 20
- Session 24: None

**Problems Assigned in the Textbook**

- Chapter 10: Exercises 22, 27, 36, 39, 43. In exercise 27, it is not clear what “cross each other” means. What you should prove is that all longest paths have a vertex in common. (This is rather tricky.) For this problem you may assume the result of 26. (As a bonus, you could include a solution to 26). For 43, give a simple combinatorial argument based on Theorem 10.7.

**Additional Problems**

- (A13*) Give an example of a simple graph with exactly three automorphisms. Note that the graph _K_3 (a triangle) has six automorphisms.

**Bonus Problems**

- None

---

## Problem Set 10 — Due in Session 30

**Practice Problems**

- Session 25: Chapter 10: Exercise 17
- Session 26: Chapter 11: Exercise 3
- Session 27: Chapter 11: Exercise 3
- Session 28: Chapter 11: Exercises 4, 9, 12, 15, 16

**Problems Assigned in the Textbook**

- Do problems 1 and 2 from the Matrix-Tree Theorem (PDF). Problem 2 deserves a star (*). For this problem, you will need the concept of the dual of a planar graph, defined in Definition 12.12, pp. 282, of the text. The first step is to prove that if G is a planar graph, then κ(G) = κ(G*). If you are unable to show that κ(G) = κ(G)*, you should just assume it and continue with the problem.
- Chapter 11: Exercise 26. 26(a) is pretty easy, but 26(b) is difficult.

**Additional Problems**

- (A14*) Let _G_n denote the complete graph _K_2n with n vertex-disjoint edges (i.e., a complete matching) removed. Use the Matrix-Tree theorem to find κ(_G_n), the number of spanning trees of _G_n. (This is not so easy. Find the eigenvalues of the Laplacian matrix L of G. Several tricks are needed.)
- (A15) Let m and n be two positive integers. Find the number of Hamiltonian cycles of the complete bipartite graph _Km_,n. (There will be two completely different cases.)
- (A16) (a) Let G be the infinite graph whose vertices are the points (i,j) in the plane with integer coordinates, and with an edge between two vertices if the distance between them is one. Is G bipartite? (b*) What if the vertices are the same as (a), but now there is an edge between two vertices if the distance between them is an odd integer?

**Bonus Problems**

- None

---

## Problem Set 11 — Due in Session 33

**Practice Problems**

- Session 30:
  - Let G be a bipartite graph with bipartition (X,Y). Show that the following three conditions are equivalent.
    - G is connected, and each edge of G is contained in a perfect matching.
    - For any x in X and y in Y, G-x-y has a perfect matching.
    - X = Y, and for every nonempty subset T of X except X, we have N(T) > T.
  - Let M be an m×n matrix of 0’s and 1’s. Let a(M) be the maximum number of 1’s of M such that no two are in the same row or column. Let b(M) be the minimum number of rows and columns of M such that cover every 1 (i.e., every one is in at least one of the rows or columns). Show that a(M) = b(M). (Hint. Use the Konig-Egervary theorem.)
- Session 31: None
- Session 32: Chapter 11: Exercises 6, 7

**Problems Assigned in the Textbook**

- Chapter 11: Exercise 30. Hint. Consider the operation ⊕ as used in the proof of Theorem 11.14 on page 260.
- Chapter 11: Exercises 23, 24

**Additional Problems**

- (A17) Let G be a bipartite graph for which a maximum matching has n edges. What is the smallest possible size of a maximal matching? (You need to give an example of this size and prove that no smaller size is possible in any bipartite graph for which a maximum matching has n edges.)
- (A18) Let G and H be finite graphs. Let K consist of the union of G and H, with an edge e of G identified with an edge f of H. (Thus if G has q edges and H has r edges, then K has q+r-1 edges.) Express the chromatic polynomial of K in terms of those of G and H. Example:
  - ![Three graphs, each made up of rectangles and triangles.](/courses/18-314/pset11.jpg)

**Bonus Problems**

- (B4) Let M be an n×n matrix of nonnegative integers. What is the least positive integer f(n) with the following property? If every row and column of M sums to f(n), then there exists n entries of M, no two in the same row and column, and all greater than one. For instance f(2)=3 and f(3)=5. The matrix with rows [2,1,1], [2,1,1], [0,2,2] shows that f(3)>4.

---

## Problem Set 12 — Due in Session 37

**Practice Problems**

- Session 33: Chapter 12: Exercises 1, 3, 4, 10
- Session 34: None
- Session 35: Chapter 12: Exercise 22
- Session 36: Chapter 12: Exercises 7, 8, 9
- Session 37: Chapter 13: Exercises 4, 6, 7, 8. By “the space,” the author means three-dimensional Euclidean space. (It is common to say “the plane” for the Euclidean plane, but I never heard “the space” before.)
  - Non-practice" problems, but not to be handed in: Chapter 13: Exercises 20, 24, 38 in 24, the phrase “five persons on the bus who know at least four of the other passengers” means “five persons on the bus, each of whom know at least four of the other passengers”. The definition of a permutation of an infinite set S in 38 is vague and incorrect. Regard a permutation of the positive integers as a sequence a1, a2, … of positive integers such that every positive integer occurs exactly once. We say that this sequence contains an increasing arithmetic progression of length three if there exist i<j<k such that ai, ak is an increasing arithmetic progression.

**Problems Assigned in the Textbook**

- Chapter 12: Exercises 13, 18, 19, 20, 21. For 20, note that it is o.k. for pa=0 or pb=0.

**Additional Problems**

- (A19) Let n≥4. Suppose that P is a convex polyhedron with one n-vertex face and two additional vertices. What is the most number of faces that P can have?
- (A20) Show that the complete graph K7 can be embedded on a torus without crossing edges. Draw the torus as a square (or rectangle) with opposite edges identified.
- (A21*) Find a triangle-free graph (i.e., no three vertices that are pairwise adjacent) with chromatic number four. Try to use as few vertices as possible.

**Bonus Problems**

- (B5) Find three states of the United States with the property that there exist three points in common to all three of them. Note. Suppose we choose a point in the interior of each of the states and join it to the three intersection points. Why does this not give a planar embedding of K3*,*3?
