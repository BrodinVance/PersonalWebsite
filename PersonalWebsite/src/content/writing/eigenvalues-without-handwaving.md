---
title: "Eigenvalues, without the hand-waving"
description: "Working through Axler, where eigenvalues arrive late and on purpose. Why that ordering is the honest one."
date: 2026-05-24
topics: ["math"]
draft: false
---

Most linear algebra courses introduce eigenvalues in week three and determinants in week two. Axler's *Linear Algebra Done Right* does the opposite: determinants show up near the end, as a consequence of the theory rather than a tool for building it.

I've been working through it slowly, and the ordering is starting to feel obviously correct.

## The usual approach and its problems

The standard route: define determinant as an alternating multilinear form (or, worse, as an explicit formula with permutations and signs), use it to define the characteristic polynomial, define eigenvalues as roots. The machinery works, but it's opaque. Why does this formula tell you anything about how a linear map behaves?

The determinant-first student often ends up with a bag of computational facts rather than a picture of what's happening.

## Axler's route

Axler builds directly toward the structure theorem: every operator on a finite-dimensional complex vector space has an upper-triangular matrix (with respect to some basis). The proof doesn't need determinants — it uses the fact that every polynomial over $\mathbb{C}$ has a root (the fundamental theorem of algebra).

Eigenvalues enter as "scalars $\lambda$ such that $T - \lambda I$ is not injective." That's it. No characteristic polynomial required to get started.

## Goobagaba

The definition $T v = \lambda v$ is saying: $v$ is a direction that $T$ doesn't rotate, only scales. That's the geometric content. Everything else — diagonalization, spectral theory, the characteristic polynomial — is a consequence of this idea, not a precondition for it.

Determinants, when they finally arrive, feel earned: they measure the factor by which $T$ scales volume, and the characteristic polynomial's roots (eigenvalues) are the values of $\lambda$ that make that scaling factor zero — i.e., where $T - \lambda I$ collapses a dimension.

The connection between "roots of a polynomial" and "failure of injectivity" only feels non-mysterious when you see it this way.

## A note on field dependence

Axler's spectral theorem works cleanly over $\mathbb{C}$ because of FTA. Over $\mathbb{R}$, things are messier — not every operator has eigenvalues, and you need to work with invariant subspaces and pairs of conjugate complex eigenvalues. This is actually clearer in Axler's treatment than in the determinant-first version, where it tends to get papered over.
