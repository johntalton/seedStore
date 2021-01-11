# Seed Store

An attempt at providing a simple example of loading and rendering from JSON configuration from p5.

- module style (but not typescript due to target requirements)
- query parameter seed loading
- JSON kvp and configuration (global and per key)
- async walk calculation
- async full walk p5 image generation
- abstraction of seedable random algorithms
- p5 svg pre-load splash call out
- in render status messaging and pre-load p5 splash screen
- in render path walk animation (follow the red dot)
- in render error messaging with animation

This is inspired by the work over at [Coding Train : Random Whistle](https://github.com/CodingTrain/Random-Whistle)

## Future Items

- load walk into user browsers `loaclStorage`
- update query params without reload
  - (add dropdown to select from known keys)
- abstract walk generation (both from render gfx and from walk implementation)
  - useful if others want a plugable system of their own implementation
- use `blob` to capture image / video or just export via p5 helpers
- break mono-script style for sketch, may add complexity for target requirement
- add control keys to activate features (like status bar)
- decouple render gft from window to create specific WxH images
  - workaround is devTools responsive mode
