var fs      = require( 'fs' );
var read    = fs.readFileSync;
var thunder = require( 'thunder' );

/**
 * Intermediate js cache.
 *
 * @type Object
 */

var cache = {};

/**
 * Clear intermediate js cache.
 *
 * @api public
 */

module.exports = {

  clearCache : function (){
    cache = {};
  },

/**
 * Render the given `str` of ejs.
 *
 * Options:
 *
 *   - `locals`          Local variables object
 *   - `cache`           thunder.Compiled functions are cached, requires `filename`
 *   - `filename`        Used by `cache` to key caches
 *   - `scope`           Function execution context
 *   - `debug`           Output generated function body
 *   - `open`            Open tag, defaulting to "<%"
 *   - `close`           Closing tag, defaulting to "%>"
 *
 * @param {String} str
 * @param {Object} options
 * @return {String}
 * @api public
 */
   render : function ( str, options ){
    var options = options || {};
    var fn;

    if( options.cache ){
      if( options.filename ){
        fn = cache[ options.filename ] || ( cache[ options.filename ] = thunder.compile( str, options ));
      }else{
        throw new Error( '"cache" option requires "filename".' );
      }
    }else{
      fn = thunder.compile( str, options );
    }

    options.__proto__ = options.locals;

    return fn.call( options.scope, options );
  },

/**
 * Render an EJS file at the given `path` and callback `fn(err, str)`.
 *
 * @param {String} path
 * @param {Object|Function} options or callback
 * @param {Function} fn
 * @api public
 */
  renderFile : function ( path, options, fn ){
    var key = path + ':string';

    if( 'function' == typeof options ){
      fn      = options;
      options = {};
    }

    options.filename = path;

    var str;

    try {
      str = options.cache
        ? cache[ key ] || ( cache[ key ] = read( path, 'utf8' ))
        : read( path, 'utf8' );
    }catch( err ){
      return fn( err );
    }

    fn( null, this.render( str, options ));
  }
};
