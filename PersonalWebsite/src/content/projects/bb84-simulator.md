---
title: "BB84 Simulator"
description: "An interactive simulation of the BB84 quantum key distribution protocol, including eavesdropper detection. My first build at the quantum–software intersection."
status: "planned"
stack: ["Python", "NumPy"]
year: 2026
featured: false
order: 5
links: {}
---

BB84 is the first practical quantum key distribution protocol, proposed by Bennett and Brassard in 1984. It uses the no-cloning theorem as a security guarantee: an eavesdropper can't copy a qubit without disturbing it, and that disturbance is detectable.

## What I want to build

An interactive simulation that walks through the full BB84 handshake:

1. Alice encodes bits as polarized photons (in one of two bases)
2. Bob measures each photon (randomly choosing a basis)
3. They compare bases publicly, discard mismatches
4. They sample a subset to check for eavesdropping

The interesting part is the eavesdropper detection: if Eve intercepts and re-transmits, she introduces a ~25% error rate in the sifted key. The simulation should make that visible.

## Why this project

It sits at exactly the intersection I'm trying to understand — quantum information as a physical constraint, not just a computational one. The security doesn't come from computational hardness; it comes from physics.
