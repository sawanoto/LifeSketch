# LifeSketch development

- Make each interactive piece in its own folder in the repository root; keep its public URL stable after release.
- Use `shared/marpan-25d.js` from the repository root. Do not copy or redesign the shared Marpan renderer inside a work.
- For sound, load matching p5.js and p5.sound versions and start audio from a visitor's click or tap.
- Serve the repository root over HTTP for previews. Check the gallery and the work at desktop and mobile widths, including touch controls and audio startup.
- Register each work in `works.js`.
- Propose changes through a PR. Do not merge or publish without the owner's instruction.

- After pushing a work branch, open a PR and report its isolated browser preview URL from the PR comment. Check preview-info.json against the PR head SHA; do not claim the preview is deployed based only on the URL. See docs/pr-previews.md. Cloud localhost is not reachable from the user's PC or phone.
