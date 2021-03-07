#!/bin/bash

# emscripten binaries need to be in your $PATH, run "source ./emsdk_env.sh" in the emscripten installation directory to do that

emcc lsh-wasm.c src/lsh.c src/lsh256.c src/lsh512.c -O3 -o dist/lsh.js -s MODULARIZE=1 -s 'EXPORT_NAME="createLSHModule"' -s EXTRA_EXPORTED_RUNTIME_METHODS='["cwrap"]' -s EXPORTED_FUNCTIONS="['_malloc', '_free']" -s WASM=1

if [ $? == 0 ]; then
  cat dist/lsh.js wrapper/wrapper.js > dist/lsh-wasm.js ;
  rm dist/lsh.js
fi

