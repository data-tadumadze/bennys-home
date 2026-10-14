# Benny’s Home

A lightweight, first-person 3D walkthrough of the entrance, kitchen and living room. Built with Three.js and a compact GLB model. This is a simplified reconstruction from design references.

## Controls

- Desktop: WASD or arrow keys to walk, mouse to look, Escape to release the mouse. Drag-to-look is also available.
- Phone: touch the screen to start, then hold the left arrows to walk and drag the right look stick to turn. Both controls work together. Release the stick to stop turning.
- Settings: look sensitivity (40% by default on phones), eye height, walking pace and floor finish.
- Room buttons: jump to the living room, kitchen or entrance.

## Run locally

From this repository, run:

```sh
python3 -m http.server 4173 --directory dist
```

Then open <http://localhost:4173>. No dependency installation or build is needed to view the website.

## Checks

With Node.js installed:

```sh
npm test
```

Checks cover safe spawn positions, collisions, simultaneous movement/look pointers, release and cancellation.

## Publishing

The GitHub Pages workflow publishes `dist/` after the checks pass on the repository’s default branch. All runtime files are included; no external CDN or backend is required.

Three.js is distributed under the MIT license, included in `dist/vendor/LICENSE`.
