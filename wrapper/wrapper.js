/* don't remove this line */
if (typeof createLSHModule === 'undefined') {
  createLSHModule = Promise.reject(new Error('lsh wasm module was not available'));
}

var lsh = {
  internal: {
    module: null,
    bytesFromBuffer: function(internalBuffer, bufLen) {
      const resultView = new Uint8Array(this.module.HEAP8.buffer, internalBuffer, bufLen); // view, not a copy
      const result = new Uint8Array(resultView); // copy, not a view!
      return result;
    },

    bufferFromBytes: function(bytes) {
      var internalBuffer = this.create_buffer(bytes.length);
      this.applyBytesToBuffer(bytes, internalBuffer);
      return internalBuffer;
    },
    applyBytesToBuffer: function(bytes, internalBuffer) {
      this.module.HEAP8.set(bytes, internalBuffer);
    },
    toHex: function(bytes) {
      return Array.prototype.map.call(bytes, function(n) {
        return (n < 16 ? '0' : '') + n.toString(16)
      }).join('');
    },
    inputToBytes: function (input) {
      if (input instanceof Uint8Array)
        return input;
      else if (typeof input === 'string')
        return (new TextEncoder()).encode(input);
      else
        throw new Error('Input must be an string, Buffer or Uint8Array');
    }
  },

  /**
   * Checks if JH support is ready (WASM Module loaded)
   * @return {Boolean}
   */
  isReady: function() {
    return lsh.internal.module !== null;
  },

  /**
   * Initializes a Hashing Context for Hash
   * @param {Number} digest_size the number of bits for the digest size (224 -> LSH-256-224, 256 -> LSH-256-256, 384 -> LSH-512-384, 512 -> LSH-512-512).
   *  512 is default, LSH-512-224 and LSH-512-224 are not supported.
   * @return {Object} the context object for this hashing session. Should only be used to hash one data source.
   */
  init: function(digest_size) {
    if (digest_size === undefined || typeof digest_size !== 'number')
      digest_size = 512;

    if (digest_size != 224 && digest_size != 256 && digest_size != 384 && digest_size != 512)
      digest_size = 512;

    return {
      'digest_size': digest_size,
      'context': lsh.internal.init(digest_size)
    };
  },

  /**
   * Update the hashing context with new input data
   * @param {Object} contextObject the context object for this hashing session
   * @param {Uint8Array} bytes an array of bytes to hash
   */
  update: function(contextObject, bytes) {
    var inputBuffer = lsh.internal.bufferFromBytes(bytes);

    lsh.internal.update(contextObject.context, inputBuffer, bytes.length * 8);

    lsh.internal.destroy_buffer(inputBuffer);
  },

  /**
   * Update the hashing context with new input data
   * @param {Object} contextObject the context object for this hashing session
   * @param {Object} value the value to use as bytes to update the hash calculation. Must be String or Uint8Array.
   */
   updateFromValue: function(contextObject, value) {
     lsh.update(contextObject, lsh.internal.inputToBytes(value));
   },

  /**
   * Finalizes the hashing session and produces digest ("hash") bytes.
   * Size of the returned array is always digest_size/8 bytes long.
   * This method does not clean up the hashing context - be sure to call cleanup(ctx) !
   * @param {Object} contextObject the context object for this hashing session
   * @return {Uint8Array} an array of bytes representing the raw digest ("hash") value.
   */
  final: function(contextObject) {
    var digestByteLen = contextObject.digest_size / 8;
    var digestBuffer = lsh.internal.create_buffer(digestByteLen);

    lsh.internal.final(contextObject.context, digestBuffer);

    var digestBytes = lsh.internal.bytesFromBuffer(digestBuffer, digestByteLen);
    lsh.internal.destroy_buffer(digestBuffer);
    return digestBytes;
  },

  /**
   * Cleans up and releases the Context object for the (now ended) hashing session.
   * @param {Object} contextObject the context object for this hashing session
   */
  cleanup: function(contextObject) {
    lsh.internal.cleanup(contextObject.context);
  },

  /**
   * Calculates the lsh message digest ("hash") for the input bytes or string
   * @param {Object} input the input value to hash - either Uint8Array or String
   * @param {Number} digest_size the number of bits for the digest size. 512 is default.
   * @return {Uint8Array} an array of bytes representing the raw digest ("hash") value.
   */
  digest: function(input, digest_size) {
    input = lsh.internal.inputToBytes(input);

    var ctx = lsh.init(digest_size);
    lsh.update(ctx, input);
    var bytes = lsh.final(ctx);
    lsh.cleanup(ctx);

    return bytes;
  },

  /**
   * Calculates the lsh message digest ("hash") for the input bytes or string
   * @param {Object} input the input value to hash - either Uint8Array or String
   * @param {Number} digest_size the number of bits for the digest size. 512 is the default
   * @return {String} a hexadecimal representation of the digest ("hash") bytes.
   */
  digestHex: function(input, digest_size) {
    var bytes = lsh.digest(input, digest_size);
    return lsh.internal.toHex(bytes);
  }
};

createLSHModule().then(async module => {
  // Memory allocations helpers
  lsh.internal.create_buffer  = module.cwrap('malloc', 'number', ['number']);
  lsh.internal.destroy_buffer = module.cwrap('free',   '',       ['number']);

  lsh.internal.init    = module.cwrap('lsh_wasm_init',    'number', ['number']);
  lsh.internal.update  = module.cwrap('lsh_wasm_update',  '',       ['number','number','number']);
  lsh.internal.final   = module.cwrap('lsh_wasm_final',   '',       ['number','number']);
  lsh.internal.cleanup = module.cwrap('lsh_wasm_cleanup', '',       ['number']);
  lsh.internal.module  = module;
});

