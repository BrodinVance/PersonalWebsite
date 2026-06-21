---
title: "Helioseismology Sonification"
description: "Turning real SDO/HMI solar oscillation data into sound — listening to the pressure modes ringing through the Sun's interior."
status: "planned"
stack: ["Python", "SciPy"]
year: 2026
featured: false
order: 4
links: {}
---

The Sun oscillates. Pressure waves — p-modes — ring through its interior, and they're detectable at the surface as Doppler shifts in spectral lines. The Solar Dynamics Observatory's Helioseismic and Magnetic Imager (HMI) measures these shifts continuously.

The dominant modes have periods around 5 minutes. Compressed into the audible range, you can actually hear them.

## The project

Take real HMI data from the JSOC archive, extract the velocity time series for a solar region, pitch-shift it into audio range, and render it as sound. The goal is something you can actually listen to — not a sine tone, but the real, complex oscillation of the Sun's atmosphere.

The secondary goal is visualization: a spectrogram showing which modes are active, keyed to the audio.

## Why this

It's at the edge of what I can build with my current math — Fourier analysis, some signal processing, basic astrophysics. The data is public. And the result is something you can play to someone who has never thought about the Sun's interior and have them immediately understand that something is *ringing*.
