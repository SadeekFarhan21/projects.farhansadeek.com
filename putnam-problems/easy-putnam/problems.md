# Easy Putnam Problems — compiled by Miguel A. Lerma

Last updated: December 7, 2023 (per the source list)

The problems in the Putnam Competition are usually very hard, but practically every session contains at least one problem very easy to solve — it still may need some sort of ingenious idea, but the solution is very simple. This is a list of “easy” problems that have appeared in the Putnam Competition in past years. — Miguel A. Lerma

Problem identifiers come from Lerma’s list; the statements, subject tags and difficulty ratings are the archive’s own (site/public/data/all.json), so they match the rest of the site exactly.

Rendered on the site at `/easy`; dataset at `site/public/data/easy-putnam.json`.

---

| Problem | Subjects | Difficulty |
| --- | --- | --- |
| 2023-A1 | analysis | 3 |
| 2022-B1 | algebra, number theory | 8 |
| 2021-A1 | number theory, geometry | 3 |
| 2020-A1 | number theory, combinatorics | 2 |
| 2019-A1 | algebra, number theory | 1 |
| 2018-A1 | number theory | 1 |
| 2018-B2 | algebra, analysis | 6 |
| 2017-A1 | number theory | 6 |
| 2017-B1 | geometry | 3 |
| 2016-A1 | number theory | 3 |
| 2016-B1 | analysis | 5 |
| 2016-B3 | geometry, combinatorics | 7 |
| 2015-A1 | geometry | 6 |
| 2015-B1 | analysis | 5 |
| 2015-B4 | combinatorics, algebra | 7 |
| 2014-A1 | number theory, analysis | 6 |
| 2014-B1 | number theory, combinatorics | 4 |
| 2013-A1 | combinatorics | 4 |
| 2013-B1 | number theory, combinatorics | 4 |
| 2012-A1 | combinatorics, geometry | 4 |
| 2012-B1 | analysis, combinatorics | 6 |
| 2011-A1 | combinatorics, geometry | 3 |
| 2011-B1 | number theory | 3 |
| 2010-B1 | analysis | 8 |
| 2010-B2 | number theory, geometry | 4 |
| 2009-A1 | algebra, geometry | 3 |
| 2009-B1 | number theory | 2 |
| 2008-A1 | algebra | 1 |
| 2008-A2 | linear algebra, combinatorics | 4 |
| 2008-B1 | geometry, number theory | 5 |
| 2007-A1 | analysis, algebra | 4 |
| 2007-B1 | number theory, algebra | 5 |
| 2006-A1 | geometry, analysis | 3 |
| 2006-B2 | combinatorics, number theory | 5 |
| 2005-A1 | number theory | 2 |
| 2005-B1 | number theory, algebra | 2 |
| 2004-A1 | analysis, combinatorics | 2 |
| 2004-B2 | algebra, analysis | 3 |
| 2003-A1 | combinatorics, number theory | 2 |
| 2003-A2 | algebra | 2 |
| 2002-A1 | algebra, analysis | 3 |
| 2002-A2 | geometry | 2 |
| 2001-A1 | abstract algebra | 1 |
| 2000-A2 | number theory | 4 |
| 1999-A1 | algebra | 2 |
| 1998-A1 | geometry | 2 |
| 1997-A5 | number theory, combinatorics | 7 |
| 1988-B1 | number theory | 1 |

---

## Statements

LaTeX exactly as stored in the archive.

### 2023-A1

For a positive integer $n$, let $f_n(x) = \cos(x) \cos(2x) \cos(3x) \cdots \cos(nx)$. Find the smallest $n$ such that $|f_n''(0)| > 2023$.

### 2022-B1

Suppose that $P(x) = a_1 x + a_2 x^2 + \cdots + a_n x^n$ is a polynomial with integer coefficients, with $a_1$ odd. Suppose that $e^{P(x)} = b_0 + b_1 x + b_2 x^2 + \cdots$ for all $x$. Prove that $b_k$ is nonzero for all $k \geq 0$.

### 2021-A1

A grasshopper starts at the origin in the coordinate plane and makes a sequence of hops.
Each hop has length $5$, and after each hop the grasshopper is at a point whose coordinates are both integers; thus, there are $12$ possible locations for the grasshopper after the first hop.
What is the smallest number of hops needed for the grasshopper to reach the point $(2021, 2021)$?

### 2020-A1

How many positive integers $N$ satisfy all of the following three conditions?
\begin{enumerate}
\item[(i)] $N$ is divisible by 2020.
\item[(ii)] $N$ has at most 2020 decimal digits.
\item[(iii)] The decimal digits of $N$ are a string of consecutive ones followed by a string of consecutive zeros.
\end{enumerate}

### 2019-A1

Determine all possible values of the expression
\[
A^3+B^3+C^3-3ABC
\]
where $A, B$, and $C$ are nonnegative integers.

### 2018-A1

Find all ordered pairs $(a,b)$ of positive integers for which
\[
\frac{1}{a} + \frac{1}{b} = \frac{3}{2018}.
\]

### 2018-B2

Let $n$ be a positive integer, and let $f_n(z) = n + (n-1) z + (n-2)z^2 + \cdots + z^{n-1}$. Prove that
$f_n$ has no roots in the closed unit disk $\{z \in \mathbb{C}\colon |z| \leq 1 \}$.

### 2017-A1

Let $S$ be the smallest set of positive integers such that
\begin{enumerate}
\item[(a)]
$2$ is in $S$,
\item[(b)]
$n$ is in $S$ whenever $n^2$ is in $S$, and
\item[(c)]
$(n+5)^2$ is in $S$ whenever $n$ is in $S$.
\end{enumerate}
Which positive integers are not in $S$?

(The set $S$ is ``smallest'' in the sense that $S$ is contained in any other such set.)

### 2017-B1

Let $L_1$ and $L_2$ be distinct lines in the plane. Prove that $L_1$ and $L_2$ intersect if and only if, for every
real number $\lambda\neq 0$ and every point $P$ not on $L_1$ or $L_2$, there exist points $A_1$ on $L_1$ and $A_2$
on $L_2$ such that $\overrightarrow{PA_2} = \lambda \overrightarrow{PA_1}$.

### 2016-A1

Find the smallest positive integer $j$ such that for every polynomial $p(x)$ with integer coefficients and for every integer $k$, the integer
\[
p^{(j)}(k) = \left. \frac{d^j}{dx^j} p(x) \right|_{x=k} 
\] 
(the $j$-th derivative of $p(x)$ at $k$) is divisible by 2016.

### 2016-B1

Let $x_0,x_1,x_2,\dots$ be the sequence such that $x_0=1$ and for $n \geq 0$,
\[
x_{n+1} = \ln(e^{x_n} - x_n)
\]
(as usual, the function $\ln$ is the natural logarithm). Show that the infinite series
\[
x_0 + x_1 + x_2 + \cdots
\]
converges and find its sum.

### 2016-B3

Suppose that $S$ is a finite set of points in the plane such that the area of triangle
$\triangle ABC$ is at most 1 whenever $A$, $B$, and $C$ are in $S$. Show that there exists a triangle of area 4 that (together with its interior) covers the set $S$.

### 2015-A1

Let $A$ and $B$ be points on the same branch of the hyperbola $xy=1$. Suppose that $P$ is a point lying between $A$ and $B$ on this hyperbola, such that the area of the triangle $APB$ is as large as possible. Show that the region bounded by the hyperbola and the chord $AP$ has the same area as the region bounded by the hyperbola and the chord $PB$.

### 2015-B1

Let $f$ be a three times differentiable function (defined on $\mathbb{R}$ and real-valued) such that $f$ has at least five distinct real zeros. Prove that $f + 6f' + 12f'' + 8f'''$ has at least two distinct real zeros.

### 2015-B4

Let $T$ be the set of all triples $(a,b,c)$ of positive integers for which there exist triangles with side lengths $a,b,c$. Express
\[
\sum_{(a,b,c) \in T} \frac{2^a}{3^b 5^c} 
\]
as a rational number in lowest terms.

### 2014-A1

Prove that every nonzero coefficient of the Taylor series of
\[
(1 - x + x^2)e^x
\]
about $x=0$ is a rational number whose numerator (in lowest terms) is either $1$ or a prime number.

### 2014-B1

A \emph{base $10$ over-expansion} of a positive integer $N$ is an expression of the form
\[
N = d_k 10^k + d_{k-1} 10^{k-1} + \cdots + d_0 10^0
\]
with $d_k \neq 0$ and $d_i \in \{0,1,2,\dots,10\}$ for all $i$.
For instance, the integer $N = 10$ has two base 10 over-expansions: $10 = 10 \cdot 10^0$
and the usual base 10 expansion $10 = 1 \cdot 10^1 + 0 \cdot 10^0$.
Which positive integers have a unique base 10 over-expansion?

### 2013-A1

Recall that a regular icosahedron is a convex polyhedron
having 12 vertices and 20 faces;
the faces are congruent equilateral triangles.
On each face of a regular icosahedron is written a nonnegative integer
such that the sum of all 20 integers is 39. Show that there are 
two faces that share a vertex and have the same integer written on them.

### 2013-B1

For positive integers $n$, let the numbers $c(n)$ be determined by 
the rules $c(1) = 1$, $c(2n) = c(n)$, and $c(2n+1) = (-1)^n c(n)$.
Find the value of 
\[
\sum_{n=1}^{2013} c(n) c(n+2).
\]

### 2012-A1

Let $d_1, d_2, \dots, d_{12}$ be real numbers in the open
interval $(1, 12)$. Show that there exist distinct indices $i, j, k$
such that $d_i, d_j, d_k$ are the side lengths of an acute triangle.

### 2012-B1

Let $S$ be a class of functions from $[0, \infty)$ to $[0, \infty)$ that satisfies:
\begin{itemize}
\item[(i)]
The functions $f_1(x) = e^x - 1$ and $f_2(x) = \ln(x+1)$ are in $S$;
\item[(ii)]
If $f(x)$ and $g(x)$ are in $S$, the functions $f(x) + g(x)$ and $f(g(x))$ are in $S$;
\item[(iii)]
If $f(x)$ and $g(x)$ are in $S$ and $f(x) \geq g(x)$ for all $x \geq 0$, then the function
$f(x) - g(x)$ is in $S$.
\end{itemize}
Prove that if $f(x)$ and $g(x)$ are in $S$, then the function $f(x) g(x)$ is also in $S$.

### 2011-A1

Define a \textit{growing spiral} in the plane to be a sequence
of points with integer coordinates $P_0 = (0,0), P_1, \dots, P_n$ such
that $n \geq 2$ and:
\begin{itemize}
\item the directed line segments $P_0 P_1, P_1 P_2, \dots, P_{n-1} P_n$
are in the successive coordinate directions east (for $P_0 P_1$), north,
west, south, east, etc.;
\item the lengths of these line segments are positive and strictly
increasing.
\end{itemize} [Picture omitted.]  How many of the points $(x,y)$ with
integer coordinates $0\leq x\leq 2011, 0\leq y\leq 2011$ \emph{cannot}
be the last point, $P_n$ of any growing spiral?

### 2011-B1

Let $h$ and $k$ be positive integers. Prove that for every
$\epsilon > 0$, there are positive integers $m$ and $n$ such that
\[ \epsilon < |h \sqrt{m} - k \sqrt{n}| < 2\epsilon.  \]

### 2010-B1

Is there an infinite sequence of real numbers $a_1, a_2, a_3, \dots$ such that
\[
a_1^m + a_2^m + a_3^m + \cdots = m
\]
for every positive integer $m$?

### 2010-B2

Given that $A$, $B$, and $C$ are noncollinear points in the plane with integer coordinates
such that the distances $AB$, $AC$, and $BC$ are integers, what is the smallest possible value of $AB$?

### 2009-A1

Let $f$ be a real-valued function on the plane such that for every
square $ABCD$ in the plane, $f(A)+f(B)+f(C)+f(D)=0$. Does it follow that
$f(P)=0$ for all points $P$ in the plane?

### 2009-B1

Show that every positive rational number can be written as a quotient of products of factorials
of (not necessarily distinct) primes. For example,
\[
\frac{10}{9} = \frac{2!\cdot 5!}{3!\cdot 3! \cdot 3!}.
\]
\,

### 2008-A1

Let $f: \mathbb{R}^2 \to \mathbb{R}$ be a function such that $f(x,y) + f(y,z)
+ f(z,x) = 0$ for all real numbers $x$, $y$, and $z$. Prove that there exists
a function $g: \mathbb{R} \to \mathbb{R}$ such that $f(x,y) = g(x) - g(y)$
for all real numbers $x$ and $y$.

### 2008-A2

Alan and Barbara play a game in which they take turns filling entries of
an initially empty $2008 \times 2008$ array. Alan plays first. At each
turn, a player chooses a real number and places it in a vacant entry.
The game ends when all the entries are filled. Alan wins if the
determinant of the resulting matrix is nonzero; Barbara wins if it is zero.
Which player has a winning strategy?

### 2008-B1

What is the maximum number of rational points that can lie on a circle
in $\mathbb{R}^2$ whose center is not a rational point? (A \emph{rational
point} is a point both of whose coordinates are rational numbers.)

### 2007-A1

Find all values of $\alpha$ for which the curves $y = \alpha x^2 +
\alpha x + \frac{1}{24}$ and $x = \alpha y^2 + \alpha y + \frac{1}{24}$
are tangent to each other.

### 2007-B1

Let $f$ be a polynomial with positive integer coefficients. Prove
that if $n$ is a positive integer, then $f(n)$ divides $f(f(n)+1)$ if
and only if $n=1$. [Editor's note: one must assume $f$ is nonconstant.]

### 2006-A1

Find the volume of the region of points $(x,y,z)$ such that
\[
(x^2 + y^2 + z^2 + 8)^2 \leq 36(x^2 + y^2).
\]

### 2006-B2

Prove that, for every set $X = \{x_1, x_2, \dots, x_n\}$ of $n$
real numbers, there exists a non-empty subset $S$ of $X$ and an integer $m$
such that
\[
\left| m + \sum_{s \in S} s \right| \leq \frac{1}{n+1}.
\]

### 2005-A1

Show that every positive integer is a sum of one or more numbers of the
form $2^r 3^s$, where $r$ and $s$ are nonnegative integers and no
summand divides another.
(For example, 23 = 9 + 8 + 6.)

### 2005-B1

Find a nonzero polynomial $P(x,y)$ such that $P(\lfloor a \rfloor,
\lfloor 2a \rfloor) = 0$ for all real numbers $a$.
(Note: $\lfloor \nu \rfloor$ is the greatest integer less than
or equal to $\nu$.)

### 2004-A1

Basketball star Shanille O'Keal's team statistician
keeps track of the number, $S(N)$, of successful free throws she has made
in her first $N$ attempts of the season.
Early in the season, $S(N)$  was less than 80\% of  $N$,
but by the end of the season, $S(N)$ was more than 80\% of $N$.
Was there necessarily a moment in between when $S(N)$ was exactly 80\% of
$N$?

### 2004-B2

Let $m$ and $n$ be positive integers.  Show that
\[
\frac{(m+n)!}{(m+n)^{m+n}}
< \frac{m!}{m^m} \frac{n!}{n^n}.
\]

### 2003-A1

Let $n$ be a fixed positive integer. How many ways are there to write  $n$
as a sum of positive integers,  
\[
n = a_1 + a_2 + \cdots + a_k,
\]
with  $k$  an
arbitrary positive integer and  $a_1 \le a_2 \le \cdots \le a_k \le a_1  + 1$?
For example, with $n=4$ there are four ways: 4, 2+2, 1+1+2, 1+1+1+1.

### 2003-A2

Let $a_1, a_2, \dots, a_n$  and  $b_1, b_2, \dots, b_n$
be nonnegative real numbers.
Show that
\begin{align*}
& (a_1 a_2 \cdots a_n)^{1/n} + (b_1 b_2 \cdots b_n)^{1/n} \\
&\leq [(a_1+b_1) (a_2+b_2) \cdots (a_n + b_n) ]^{1/n}.
\end{align*}

### 2002-A1

Let $k$ be a fixed positive integer. The $n$-th derivative of
$\frac{1}{x^k - 1}$ has the form $\frac{P_n(x)}{(x^k - 1)^{n+1}}$
where $P_n(x)$ is a polynomial. Find $P_n(1)$.

### 2002-A2

Given any five points on a sphere, show that some four of them
must lie on a closed hemisphere.

### 2001-A1

Consider a set $S$ and a binary operation $*$, i.e., for each $a,b\in S$,
$a*b\in S$.  Assume $(a*b)*a=b$ for all $a,b\in S$.  Prove that
$a*(b*a)=b$ for all $a,b\in S$.

### 2000-A2

Prove that there exist infinitely many integers $n$ such that
$n,n+1,n+2$ are each the sum of the squares of two integers.
[Example: $0=0^2+0^2$, $1=0^2+1^2$, $2=1^2+1^2$.]

### 1999-A1

Find polynomials $f(x)$,$g(x)$, and $h(x)$, if they exist, such
that for all $x$,
\[
|f(x)|-|g(x)|+h(x) = \begin{cases} -1 & \mbox{if $x<-1$} \\
                     3x+2 & \mbox{if $-1 \leq x \leq 0$} \\
                     -2x+2 & \mbox{if $x>0$.}
                     \end{cases}
\]

### 1998-A1

A right circular cone has base of radius 1 and height 3.  A
cube is inscribed in the cone so that one face of the cube is
contained in the base of the cone.  What is the side-length of
the cube?

### 1997-A5

Let $N_n$ denote the number of ordered $n$-tuples of positive
integers $(a_1,a_2,\ldots,a_n)$ such that $1/a_1 + 1/a_2 +\ldots +
1/a_n=1$.  Determine whether $N_{10}$ is even or odd.

### 1988-B1

A \emph{composite} (positive integer) is a product $ab$ with $a$ and
$b$ not necessarily distinct integers in $\{2,3,4,\dots\}$. Show that
every composite is expressible as $xy+xz+yz+1$, with $x,y,z$ positive
integers.

