-- ============================================
-- 005_seed_questions.sql - BC Calculus questions
-- ============================================

INSERT INTO questions (unit, unit_name, difficulty, question_text, option_a, option_b, option_c, option_d, correct_answer) VALUES

-- Unit 1: Limits and Continuity
(1, 'Limits and Continuity', 'easy',
 'What is $\lim_{x \to 3} \frac{x^2 - 9}{x - 3}$?',
 '6', '0', '3', 'Does not exist', 'A'),

(1, 'Limits and Continuity', 'easy',
 'What is $\lim_{x \to 0} \frac{\sin x}{x}$?',
 '0', '1', '$\infty$', 'Does not exist', 'B'),

(1, 'Limits and Continuity', 'medium',
 'What is $\lim_{x \to \infty} \frac{3x^2 + 2x}{5x^2 - 1}$?',
 '$\frac{3}{5}$', '$\frac{2}{5}$', '0', '$\infty$', 'A'),

(1, 'Limits and Continuity', 'medium',
 'If $f(x) = \begin{cases} x^2 & x < 2 \\ ax + b & x \geq 2 \end{cases}$ is continuous, and $f''(2)$ exists, find $a$.',
 '2', '4', '1', '3', 'B'),

(1, 'Limits and Continuity', 'hard',
 'What is $\lim_{x \to 0} \frac{1 - \cos x}{x^2}$?',
 '0', '1', '$\frac{1}{2}$', '2', 'C'),

-- Unit 2: Differentiation: Definition and Basic Rules
(2, 'Differentiation: Definition and Basic Rules', 'easy',
 'What is $\frac{d}{dx}[x^5]$?',
 '$5x^4$', '$5x^5$', '$4x^5$', '$x^4$', 'A'),

(2, 'Differentiation: Definition and Basic Rules', 'easy',
 'What is $\frac{d}{dx}[\sin x + \cos x]$?',
 '$\cos x + \sin x$', '$\cos x - \sin x$', '$-\cos x + \sin x$', '$-\cos x - \sin x$', 'B'),

(2, 'Differentiation: Definition and Basic Rules', 'medium',
 'What is $\frac{d}{dx}[e^x \cdot \ln x]$?',
 '$e^x \cdot \ln x + \frac{e^x}{x}$', '$\frac{e^x}{x}$', '$e^x \cdot \ln x$', '$e^x(\ln x - \frac{1}{x})$', 'A'),

(2, 'Differentiation: Definition and Basic Rules', 'medium',
 'If $f(x) = \frac{x^2}{x+1}$, what is $f''(1)$?',
 '$\frac{1}{2}$', '$\frac{3}{4}$', '$1$', '$\frac{1}{4}$', 'B'),

(2, 'Differentiation: Definition and Basic Rules', 'hard',
 'Using the limit definition, $\lim_{h \to 0} \frac{(2+h)^3 - 8}{h}$ equals:',
 '8', '12', '6', '4', 'B'),

-- Unit 3: Differentiation: Composite, Implicit, and Inverse
(3, 'Differentiation: Composite, Implicit, and Inverse', 'easy',
 'What is $\frac{d}{dx}[\sin(3x)]$?',
 '$\cos(3x)$', '$3\cos(3x)$', '$3\sin(3x)$', '$-3\cos(3x)$', 'B'),

(3, 'Differentiation: Composite, Implicit, and Inverse', 'medium',
 'If $x^2 + y^2 = 25$, what is $\frac{dy}{dx}$?',
 '$\frac{x}{y}$', '$-\frac{x}{y}$', '$-\frac{y}{x}$', '$\frac{y}{x}$', 'B'),

(3, 'Differentiation: Composite, Implicit, and Inverse', 'medium',
 'What is $\frac{d}{dx}[\arctan(x)]$?',
 '$\frac{1}{1+x^2}$', '$\frac{1}{\sqrt{1-x^2}}$', '$\frac{-1}{1+x^2}$', '$\sec^2(x)$', 'A'),

(3, 'Differentiation: Composite, Implicit, and Inverse', 'hard',
 'If $y = (\ln x)^x$, what is $\frac{dy}{dx}$ at $x = e$?',
 '$1$', '$\frac{1}{e}$', '$e$', '$\frac{2}{e}$', 'A'),

(3, 'Differentiation: Composite, Implicit, and Inverse', 'easy',
 'What is $\frac{d}{dx}[e^{5x}]$?',
 '$e^{5x}$', '$5e^{5x}$', '$5e^{x}$', '$e^{5}$', 'B'),

-- Unit 4: Contextual Applications of Differentiation
(4, 'Contextual Applications of Differentiation', 'easy',
 'A particle moves along the x-axis with $s(t) = t^3 - 6t^2$. What is the velocity at $t = 2$?',
 '$-12$', '$0$', '$12$', '$-24$', 'A'),

(4, 'Contextual Applications of Differentiation', 'medium',
 'A 10-foot ladder slides down a wall. If the bottom moves at 2 ft/s, how fast is the top sliding when the bottom is 6 ft from the wall?',
 '$-\frac{3}{2}$ ft/s', '$-\frac{3}{4}$ ft/s', '$\frac{3}{2}$ ft/s', '$-\frac{2}{3}$ ft/s', 'A'),

(4, 'Contextual Applications of Differentiation', 'medium',
 'If $f''(x) = 0$ at $x = 3$ and $f''''(3) > 0$, what does $x = 3$ represent?',
 'Local maximum', 'Local minimum', 'Inflection point', 'Cannot determine', 'B'),

(4, 'Contextual Applications of Differentiation', 'hard',
 'A cone with radius 3 cm and height 6 cm is being filled at 2 cm³/s. How fast is the water level rising when $h = 2$ cm?',
 '$\frac{2}{\pi}$ cm/s', '$\frac{8}{\pi}$ cm/s', '$\frac{1}{\pi}$ cm/s', '$\frac{4}{\pi}$ cm/s', 'A'),

(4, 'Contextual Applications of Differentiation', 'easy',
 'The Mean Value Theorem guarantees $f''(c) = \frac{f(b)-f(a)}{b-a}$ when $f$ is:',
 'Continuous on $[a,b]$ and differentiable on $(a,b)$', 'Differentiable on $[a,b]$', 'Continuous on $(a,b)$', 'Integrable on $[a,b]$', 'A'),

-- Unit 5: Analytical Applications of Differentiation
(5, 'Analytical Applications of Differentiation', 'easy',
 'What is the absolute maximum of $f(x) = -x^2 + 4x$ on $[0, 5]$?',
 '4', '5', '-5', '0', 'A'),

(5, 'Analytical Applications of Differentiation', 'medium',
 'How many inflection points does $f(x) = x^4 - 6x^2 + 1$ have?',
 '0', '1', '2', '3', 'C'),

(5, 'Analytical Applications of Differentiation', 'medium',
 'If $f''(x) > 0$ for all $x$ in $(a, b)$, then $f$ is:',
 'Increasing on $(a,b)$', 'Decreasing on $(a,b)$', 'Concave up on $(a,b)$', 'Concave down on $(a,b)$', 'C'),

(5, 'Analytical Applications of Differentiation', 'hard',
 'Find the maximum area of a rectangle inscribed under $y = 4 - x^2$ with base on the x-axis.',
 '$\frac{32\sqrt{3}}{9}$', '$\frac{16}{3}$', '$8$', '$4\sqrt{3}$', 'A'),

(5, 'Analytical Applications of Differentiation', 'easy',
 'At an inflection point, the second derivative is:',
 'Positive', 'Negative', 'Zero or undefined', 'Always zero', 'C'),

-- Unit 6: Integration and Accumulation
(6, 'Integration and Accumulation', 'easy',
 'What is $\int x^3 \, dx$?',
 '$3x^2 + C$', '$\frac{x^4}{4} + C$', '$\frac{x^4}{3} + C$', '$x^4 + C$', 'B'),

(6, 'Integration and Accumulation', 'easy',
 'What is $\int_0^2 3x^2 \, dx$?',
 '6', '8', '12', '4', 'B'),

(6, 'Integration and Accumulation', 'medium',
 'What is $\int \frac{1}{x^2 + 1} \, dx$?',
 '$\ln|x^2+1| + C$', '$\arctan(x) + C$', '$\frac{-1}{x} + C$', '$\arcsin(x) + C$', 'B'),

(6, 'Integration and Accumulation', 'medium',
 'Using substitution, $\int 2x \cos(x^2) \, dx =$',
 '$\sin(x^2) + C$', '$\cos(x^2) + C$', '$-\sin(x^2) + C$', '$x^2\sin(x^2) + C$', 'A'),

(6, 'Integration and Accumulation', 'hard',
 'What is $\int_0^1 x e^{x^2} \, dx$?',
 '$\frac{e-1}{2}$', '$e - 1$', '$\frac{e}{2}$', '$\frac{e+1}{2}$', 'A'),

-- Unit 7: Differential Equations
(7, 'Differential Equations', 'easy',
 'Solve $\frac{dy}{dx} = 2x$ with $y(0) = 1$.',
 '$y = x^2$', '$y = x^2 + 1$', '$y = 2x + 1$', '$y = 2x^2 + 1$', 'B'),

(7, 'Differential Equations', 'medium',
 'The slope field for $\frac{dy}{dx} = x - y$ has zero slopes along which line?',
 '$y = 0$', '$x = 0$', '$y = x$', '$y = -x$', 'C'),

(7, 'Differential Equations', 'medium',
 'Solve $\frac{dy}{dx} = ky$ to get:',
 '$y = e^{kx}$', '$y = Ce^{kx}$', '$y = kx + C$', '$y = Ce^{x}$', 'B'),

(7, 'Differential Equations', 'hard',
 'Solve $\frac{dy}{dx} = \frac{y}{x}$ using separation of variables, $y(1) = 2$.',
 '$y = 2x$', '$y = x^2$', '$y = 2\ln x$', '$y = 2e^x$', 'A'),

(7, 'Differential Equations', 'easy',
 'Which method solves $\frac{dy}{dx} = f(x)g(y)$?',
 'Integrating factor', 'Separation of variables', 'Undetermined coefficients', 'Variation of parameters', 'B'),

-- Unit 8: Applications of Integration (BC)
(8, 'Applications of Integration', 'easy',
 'The area between $y = x^2$ and $y = x$ from $x=0$ to $x=1$ is:',
 '$\frac{1}{3}$', '$\frac{1}{6}$', '$\frac{1}{2}$', '$\frac{2}{3}$', 'B'),

(8, 'Applications of Integration', 'medium',
 'The volume of revolution of $y = \sqrt{x}$ about the x-axis from $x=0$ to $x=4$ is:',
 '$4\pi$', '$8\pi$', '$2\pi$', '$16\pi$', 'B'),

(8, 'Applications of Integration', 'medium',
 'Using integration by parts, $\int x e^x \, dx =$',
 '$xe^x - e^x + C$', '$xe^x + e^x + C$', '$\frac{x^2}{2}e^x + C$', '$e^x(x+1) + C$', 'A'),

(8, 'Applications of Integration', 'hard',
 'The arc length of $y = x^{3/2}$ from $x=0$ to $x=4$ uses the integrand:',
 '$\sqrt{1 + \frac{9x}{4}}$', '$\sqrt{1 + \frac{3x}{2}}$', '$\sqrt{1 + x^3}$', '$\sqrt{1 + 9x^2}$', 'A'),

(8, 'Applications of Integration', 'easy',
 'The integral $\int_a^b [f(x) - g(x)] \, dx$ gives the area between curves when:',
 '$f(x) \geq g(x)$ on $[a,b]$', '$f(x) > 0$', '$g(x) > 0$', '$f(x) = g(x)$ at endpoints', 'A'),

-- Unit 9: Parametric, Polar, and Vector (BC exclusive)
(9, 'Parametric, Polar, and Vector', 'easy',
 'If $x = t^2$ and $y = t^3$, what is $\frac{dy}{dx}$?',
 '$\frac{3t}{2}$', '$\frac{3t^2}{2t}$', '$\frac{2t}{3t^2}$', '$\frac{t}{2}$', 'A'),

(9, 'Parametric, Polar, and Vector', 'medium',
 'The area enclosed by $r = 2\cos\theta$ is:',
 '$\pi$', '$2\pi$', '$4\pi$', '$\frac{\pi}{2}$', 'A'),

(9, 'Parametric, Polar, and Vector', 'medium',
 'For the parametric curve $x = \cos t, y = \sin t$, the speed at time $t$ is:',
 '$1$', '$\sin t + \cos t$', '$\sqrt{\sin^2 t + \cos^2 t}$', '$|\sin t|$', 'A'),

(9, 'Parametric, Polar, and Vector', 'hard',
 'Find $\frac{d^2y}{dx^2}$ for $x = t^2, y = t^3$.',
 '$\frac{3}{4t}$', '$\frac{3}{2}$', '$\frac{3t}{4}$', '$\frac{3}{4t^2}$', 'A'),

(9, 'Parametric, Polar, and Vector', 'easy',
 'In polar, the area formula is $A = \frac{1}{2}\int_\alpha^\beta r^2 \, d\theta$. For $r = 3$, from $0$ to $2\pi$:',
 '$9\pi$', '$3\pi$', '$6\pi$', '$18\pi$', 'A'),

-- Unit 10: Infinite Sequences and Series (BC exclusive)
(10, 'Infinite Sequences and Series', 'easy',
 'The sum of the geometric series $\sum_{n=0}^{\infty} \left(\frac{1}{2}\right)^n$ is:',
 '1', '2', '$\infty$', '$\frac{1}{2}$', 'B'),

(10, 'Infinite Sequences and Series', 'easy',
 'The Maclaurin series for $e^x$ is:',
 '$\sum_{n=0}^{\infty} \frac{x^n}{n!}$', '$\sum_{n=0}^{\infty} x^n$', '$\sum_{n=0}^{\infty} \frac{x^{2n}}{n!}$', '$\sum_{n=1}^{\infty} \frac{x^n}{n}$', 'A'),

(10, 'Infinite Sequences and Series', 'medium',
 'By the ratio test, $\sum_{n=1}^{\infty} \frac{n!}{n^n}$:',
 'Converges', 'Diverges', 'Inconclusive', 'Conditionally converges', 'A'),

(10, 'Infinite Sequences and Series', 'medium',
 'The radius of convergence of $\sum_{n=0}^{\infty} \frac{x^n}{n!}$ is:',
 '1', '0', '$\infty$', '$e$', 'C'),

(10, 'Infinite Sequences and Series', 'hard',
 'The Taylor series for $\ln(1+x)$ centered at $x=0$ is:',
 '$\sum_{n=1}^{\infty} \frac{(-1)^{n+1} x^n}{n}$', '$\sum_{n=0}^{\infty} \frac{x^n}{n!}$', '$\sum_{n=1}^{\infty} \frac{x^n}{n}$', '$\sum_{n=0}^{\infty} (-1)^n x^n$', 'A');
