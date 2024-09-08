# MAGES. hook

Frida-based tool for hooking and reverse engineering MAGES. engine-based visual novels, mainly to aid in Impacto development.

Tested against Steins;Gate (Steam).

## How to compile & load

Inject Frida into the game somehow, I use `frida-gadget` alongside [wine_injector](https://github.com/crwn1337/wine_injector).
It should also be possible to use `frida-server`, at least when running under real Windows.

```sh
$ npm install
# Presumes Frida has been injected as gadget into the game
$ frida -H localhost -f Gadget -l _agent.js
```

## Development workflow

To continuously recompile on change, keep this running in a terminal:

```sh
npm run watch
```

And use an editor like Visual Studio Code for code completion and instant
type-checking feedback.
