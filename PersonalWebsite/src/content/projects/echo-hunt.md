---
title: "Echo Hunt"
description: "A movement-first open-world roguelite. You extract souls while an unkillable Mimic learns to hunt you — built around a resonance system that rewards skill expression."
status: "building"
stack: ["Godot 4", "GDScript"]
year: 2026
featured: true
order: 10
links: {}
---

Echo Hunt is built around one rule the antagonist can't be killed.

You play as a soul extractor moving through procedurally arranged environments, collecting energy while an entity called the Mimic tracks you. The Mimic doesn't have health or a defeat state — it learns, adapts, and cuts off routes. The session ends when it catches you.

## The resonance system

Every action emits resonance — a quantity that decays over time but lingers in the environment. The Mimic follows resonance gradients, not your position directly. High-resonance actions (fast movement, combat, ability use) make it aggressive. Low-resonance play keeps it passive.

The goal is for players to feel the Mimic's attention state without a UI indicator. Its movement should be readable.

## Current status

Core movement and resonance tracking are working. The Mimic's pathfinding uses a custom gradient descent over the resonance field rather than A*, which gives it a more organic, pressure-based feel.

Currently tuning the resonance decay curves and playtesting the learning behavior.
