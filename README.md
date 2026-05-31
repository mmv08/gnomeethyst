# Gnomeethyst

Amethyst-style dynamic tiling for GNOME Shell.

## Development

```bash
npm install
npm run verify
```

`verify` runs TypeScript typechecking, Node's built-in tests, and the GNOME extension build.

## Install Locally

```bash
npm run install:extension
```

The extension is installed as `gnomeethyst@local`.

On GNOME Shell 50 Wayland, a newly installed local extension may not appear in `gnome-extensions list` until you log out and back in.

After the shell sees it:

```bash
gnome-extensions enable gnomeethyst@local
```

## Dependency Policy

Gnomeethyst has no runtime npm dependencies. Dev dependencies are limited to TypeScript, esbuild, and GNOME/GJS type definitions.
