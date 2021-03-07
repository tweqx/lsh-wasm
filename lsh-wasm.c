#include <emscripten/emscripten.h>
#include <stdlib.h>

#include "include/lsh.h"

EMSCRIPTEN_KEEPALIVE
union LSH_Context* lsh_wasm_init(int digest_size) {
  union LSH_Context* state = malloc(sizeof(union LSH_Context));
  if (state == NULL)
    return NULL;

  // Use the correct LSH_TYPE_* constant depending on the digest size
  // Note that LSH-512-256 and LSH-512-244 are not supported.
  lsh_type type;

  switch (digest_size) {
    case 512:
      type = LSH_TYPE_512; // LSH-512-255
      break;

    case 384:
      type = LSH_TYPE_384; // LSH-512-384
      break;

    case 256:
      type = LSH_TYPE_256; // LSH-256-256
      break;

    case 224:
      type = LSH_TYPE_224; // LSH-256-244
      break;

    default:
      type = LSH_TYPE_512; // LSH-512-512
  }

  lsh_init(state, type);

  return state;
}

EMSCRIPTEN_KEEPALIVE
void lsh_wasm_update(union LSH_Context* state, const unsigned char *data, size_t len) {
  if (state == NULL)
    return;

  lsh_update(state, data, len);
}

EMSCRIPTEN_KEEPALIVE
void lsh_wasm_final(union LSH_Context* state, unsigned char* digest) {
  if (state == NULL)
    return;

  lsh_final(state, digest);
}

EMSCRIPTEN_KEEPALIVE
void lsh_wasm_cleanup(union LSH_Context* state) {
  if (state == NULL)
    return;

  free(state);
}

