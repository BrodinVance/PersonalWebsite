---
title: "Designing the Mimic"
description: "Echo Hunt's antagonist can't be killed. Here's how I'm making it feel inevitable instead of unfair."
date: 2026-06-08
topics: ["gamedev"]
draft: false
---

Echo Hunt has one rule that breaks every other design instinct I have: the Mimic cannot be killed. You can slow it, distract it, route around it — but the session ends when it catches you, not when you defeat it.

That constraint creates a problem. An unkillable enemy is either terrifying or annoying, and the line between them is thin.

## The difference between inevitable and unfair

A horror game enemy feels unfair when it moves at random, or when it can see you through walls, or when there's no signal that it's close. The player's death reads as the game cheating.

It feels *inevitable* when the player can trace exactly how it happened. The Mimic heard the sound I made rolling into that alcove. It cut off the route I'd been relying on. I made three small mistakes and each one narrowed my options until the last exit closed.

The Mimic needs to be a pressure system, not a random kill.

## Resonance: the core mechanic

Every action the player takes emits resonance — a quantity that decays over time but lingers in the environment. The Mimic tracks resonance gradients. It doesn't know where you are; it knows where *energy* is.

This gives the player real information. High-resonance actions (combat, fast movement, using abilities) make the Mimic more aggressive. Low-resonance play (slow movement, patience, conservation) keeps it passive.

The design goal is for players to be able to feel the Mimic's attention state without a UI indicator. The way it moves should be readable.

## What I'm testing now

The hardest part is tuning the decay curve. Too fast and the Mimic feels passive and irrelevant. Too slow and every action you've taken in the last three minutes is permanently on its radar.

Current thinking: resonance decays with a half-life proportional to the size of the room it's in. Open areas drain fast; tight corridors hold it longer. That maps to intuition — your footsteps in a hallway are louder than in a field.

Early playtest feedback is that this feels right. The next problem is teaching it without explaining it.
