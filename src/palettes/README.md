# Palettes

Each file is a JSON palette that get-in-loser can load from the
`Pixel > Palette` menu or the `Palette` panel on the right sidebar.

Minimal format:

```json
{
	"name": "My Palette",
	"author": "optional",
	"source": "optional url",
	"license": "optional",
	"colors": ["#1a1c2c", "#5d275d"]
}
```

The loader is deliberately tolerant, so these are all accepted too:

- a bare array: `["#1a1c2c", "#5d275d"]`
- hex codes without `#`, and 3-digit shorthand: `["1a1c2c", "#f0f"]`
- objects per colour: `{"colors": [{"name": "ink", "hex": "#1a1c2c"}]}`
- rgb triplets: `{"colors": [[26, 28, 44]]}`
- rgb objects: `{"colors": [{"r": 26, "g": 28, "b": 44}]}`
- `palette` or `swatches` instead of `colors`

Drop a new `.json` file in this directory and it shows up in the palette
list after a rebuild. Palettes can also be imported at runtime without a
rebuild via `Pixel > Palette > Import Palette`.
