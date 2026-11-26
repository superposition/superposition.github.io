---
title: Example — motion in one frame and another
description: An example entry kept in drafts, with inline and display mathematics and a figure.
date: 2026-11-21 09:00:00 -0500
topic: kinematics
---

> **Example draft.** Not published. It proves the second layout path: display mathematics, a caption, and a list.

Position is easy to write and hard to mean. When we say a body is at $x(t)$, we have already chosen a frame, an origin and a direction, and every one of those choices is invisible in the symbol.

## Differentiation, once

Velocity is the derivative of position with respect to time, and acceleration is the derivative of velocity:

$$
v(t) = \dot{x}(t), \qquad a(t) = \ddot{x}(t).
$$

Under a change of frame $x' = x - u t$, with $u$ a constant velocity, the second derivative is unchanged:

$$
\ddot{x}' = \ddot{x}.
$$

That is why acceleration survives the change and velocity does not. It is the whole content of Galilean invariance, and it is one line of arithmetic.

## The figure

<figure>
  <img src="/assets/art/orbits.png" alt="Two rough black ink rings crossing a vermilion disc." width="1902" height="827">
  <figcaption>Placeholder artwork. A real entry puts the plotted trajectory here, with the frame named in the caption.</figcaption>
</figure>

## Checks worth doing before the claim

- Does the quantity survive a change of frame? If not, say which frame.
- Are the units of both sides the same after differentiating?
- Does the limit $t \to 0$ reproduce the initial condition?
