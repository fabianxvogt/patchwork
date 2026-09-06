# Patchwork

Patchwork is a browser-first festival planning workbench for Project 65. It reshapes an invented festival brief while retaining deliberate decisions: a bounded rule engine regenerates linked schedule, budget and equipment views, then makes conflicts explicit when pins cannot move.

## Try it

Open `index.html` from a static server. `npm run dev` serves the working surface at `http://localhost:4173`. The Harbour Lights example is ready on first load; all changes stay in local storage and can be exported as a versioned `.patchwork.json` file. The derived timetable can be printed as a styled handout or exported as portable CSV.

## Scope and limits

The browser engine supports up to 24 acts, two stages, a 15-minute changeover rule, a small equipment catalog and a production-budget ceiling. “Regenerate” means rule-driven layout changes, not arbitrary application generation or a model call. An optional local-model adapter is intentionally outside this v1; free use has no keys or remote processing.

## Development

```sh
npm test
npm run build
npm run dev
```

## License

MIT. See [LICENSE](LICENSE).
