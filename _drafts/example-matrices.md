---
title: Example — what a matrix does to a basis
description: An example entry kept in drafts. It proves the layout — inline and display mathematics, a figure with a caption, a table and a blockquote — without publishing anything.
date: 2026-11-20 09:00:00 -0500
topic: matrices
---

> **Example draft.** This is not published and is not part of the site's content. It exists so the entry layout, the mathematics and the journal index can be checked.

An $n \times n$ matrix over a field is a linear map, and everything worth saying about it can be said by following where it sends a basis. Take the standard basis $e_1, \dots, e_n$. The image of $e_j$ is the $j$-th column, so the columns are the answers, not the operator.

## Eigenvectors first

A vector $v \neq 0$ is an eigenvector with eigenvalue $\lambda$ when the map merely stretches it:

$$
A v = \lambda v .
$$

Nothing about that equation mentions a coordinate system, which is the point. In coordinates it reads

$$
(A - \lambda I) v = 0,
$$

and a nonzero solution exists exactly when the determinant of that matrix vanishes. So the eigenvalues are the roots of $\det(A - \lambda I)$, a polynomial of degree $n$ that depends only on the map.

## Worked, small

For

$$
A = \begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}
$$

the characteristic polynomial is $(2-\lambda)^2 - 1$, so the eigenvalues are $\lambda = 1$ and $\lambda = 3$. The traces and determinants of the two sides agree, which is a cheap way to catch arithmetic before it becomes an argument:

| Quantity | $A$ | $1 \oplus 3$ |
|---|---|---|
| Trace | 4 | 4 |
| Determinant | 3 | 3 |

<figure>
  <img src="/assets/art/orbits.png" alt="Two rough black ink rings cross a vermilion disc." width="1902" height="827">
  <figcaption>Placeholder artwork. In a real entry this is where a drawn figure goes — a plot, a diagram, a photograph of the page — and the caption says what it shows.</figcaption>
</figure>

## What to keep

- A claim written as an equation is easier to check than a claim written as a sentence.
- A proof that only works in one basis is a proof of something weaker than it looks.
