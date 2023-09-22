# [Chromatic](https://alcatrazescapee.com/chromatic/)

**Chromatic** is a Chromatic is a color-based puzzle game. The objective is to connect all input colors to their respective output colors by placing pipes.

- Tap and drag pipes to place them.
- Tap on a pipe to rotate it.
- Drag colors onto pipes to label them, if desired.
- Tap on any input or output to see what color and pressure it is.
- When ready, press the ➤ button to see if your solution works - if it does, you will be rewarded with a ★ star!

More how-to-play details are available on the [web version](https://alcatrazescapee.com/chromatic/) of Chromatic.

### Source

Chromatic was originally written in Flash with AS3 (which is the version available on [Google Play](https://play.google.com/store/apps/details?id=air.Chromatic)). It was rewritten here in TypeScript for web using [PIXI.js](https://pixijs.com/) as a framework.

It uses [esbuild](https://esbuild.github.io/) as a bundler, and [jest](https://jestjs.io/) as a testing framework. Since the build process got fairly complicated - testing, bundling, separate debug + release builds, copying everything for serving on a separate website, spritesheet and texture generation - I use `make` as a build system.

`make release` and `make debug` build a release and debug build respectively, by default in `../Website/public/chromatic/` (specified in the `$(WEB)` Makefile variable). 

Assets are all original and are packed into a spritesheet using a custom texture packer script. Music is an original composition and recording. All >100 puzzles were designed by hand, mostly on graph paper.