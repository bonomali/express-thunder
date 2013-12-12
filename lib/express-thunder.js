var utils    = require( './utils' );
var fs       = require( 'fs' );
var path     = require( 'path' );
var exists   = fs.existsSync;
var resolve  = path.resolve;
var extname  = path.extname;
var dirname  = path.dirname;
var join     = path.join;
var basename = path.basename;

/**
 * Express 3.x Layout & Partial support for thunder.
 *
 * The `partial` feature from Express 2.x is back as a template engine,
 * along with support for `layout` and `block/script/stylesheet`.
 *
 *
 * Example index.html:
 *
 *   <? layout( 'boilerplate' ) ?>
 *   <h1>I am the <?=what?> template</h1>
 *   <? script( 'foo.js' ) ?>
 *
 *
 * Example boilerplate.html:
 *
 *   <html>
 *     <head>
 *       <title>It's <?=who?></title>
 *       <?-scripts?>
 *     </head>
 *     <body><?-body?></body>
 *   </html>
 *
 *
 * Sample app:
 *
 *    var express = require( 'express' )
 *      , app = express();
 *
 *    // use express-thunder for all thunder templates:
 *    app.engine( 'html', require( 'express-thunder' ));
 *
 *    // render 'index' into 'boilerplate':
 *    app.get( '/',function ( req, res, next ){
 *      res.render( 'index', { what : 'best', who : 'me' });
 *    });
 *
 *    app.listen( 3000 );
 *
 * Example output for GET /:
 *
 *   <html>
 *     <head>
 *       <title>It's me</title>
 *       <script src="foo.js"></script>
 *     </head>
 *     <body><h1>I am the best template</h1></body>
 *   </html>
 *
 */

var renderFile = module.exports = function ( file, options, fn ){

  // Express used to set options.locals for us, but now we do it ourselves
  // ( thunder does some __proto__ magic to expose these funcs/values in the template )
  if( !options.locals ){
    options.locals = {};
  }

  if( !options.locals.blocks ){
    // one set of blocks no matter how often we recurse
    var blocks = {
      scripts     : new Block(),
      stylesheets : new Block()
    };

    options.locals.blocks      = blocks;
    options.locals.scripts     = blocks.scripts;
    options.locals.stylesheets = blocks.stylesheets;
    options.locals.block       = block.bind( blocks );
    options.locals.stylesheet  = stylesheet.bind( blocks.stylesheets );
    options.locals.script      = script.bind( blocks.scripts );
  }
  // override locals for layout/partial bound to current options
  options.locals.layout  = layout.bind( options );
  options.locals.partial = partial.bind( options );

  utils.renderFile( file, options, function ( err, html ){

    if( err ) return fn( err,html );

    var layout = options.locals._layoutFile;

    // for backward-compatibility, allow options to
    // set a default layout file for the view or the app
    // ( NB:- not called `layout` any more so it doesn't
    // conflict with the layout() function )
    if( layout === undefined ){
      layout = options._layoutFile;
    }

    if( layout ){
      var desired_ext = '.html';

      // apply default layout if only "true" was set
      if( layout === true ){
        layout = path.sep + 'layout' + desired_ext;
      }

      if( extname( layout ) !== desired_ext ){
        layout += desired_ext;
      }

      // clear to make sure we don't recurse forever ( layouts can be nested )
      delete options.locals._layoutFile;
      delete options._layoutFile;
      // make sure caching works inside utils.renderFile/render
      delete options.filename;

      if( layout.length > 0 && layout[ 0 ] === path.sep ){
        // if layout is an absolute path, find it relative to view options:
        layout = join( options.settings.views, layout.slice( 1 ));
      }else{
        // otherwise, find layout path relative to current template :
        layout = resolve( dirname( file ), layout );
      }

      // now recurse and use the current result as `body` in the layout:
      options.locals.body = html;
      renderFile( layout, options, fn );
    }else{
      // no layout, just do the default:
      fn( null, html );
    }
  });

};

/**
 * Memory cache for resolved object names.
 */

var cache = {};

/**
 * Resolve partial object name from the view path.
 *
 * Examples:
 *
 *   "user.html" becomes "user"
 *   "forum thread.html" becomes "forumThread"
 *   "forum/thread/post.html" becomes "post"
 *   "blog-post.html" becomes "blogPost"
 *
 * @return {String}
 * @api private
 */

function resolveObjectName( view ){
  return cache[ view ] || ( cache[ view ] = view
    .split( '/' )
    .slice( -1 )[ 0 ]
    .split( '.' )[ 0 ]
    .replace( /^_/, '' )
    .replace( /[^a-zA-Z0-9 ]+/g, ' ' )
    .split( / +/ ).map( function ( word, i ){
      return i ? word[ 0 ].toUpperCase() + word.substr( 1 ) : word;
    }).join( '' ));
}

/**
 * Lookup partial path from base path of current template :
 *
 *   - partial `_<name>`
 *   - any `<name>/index`
 *   - non-layout `../<name>/index`
 *   - any `<root>/<name>`
 *   - partial `<root>/_<name>`
 *
 * Options:
 *
 *   - `cache` store the resolved path for the view, to avoid disk I/O
 *
 * @param {String} root, full base path of calling template
 * @param {String} partial, name of the partial to lookup ( can be a relative path )
 * @param {Object} options, for `options.cache` behavior
 * @return {String}
 * @api private
 */

function lookup( root, partial, options ){
  var desired_ext = '.html';
  var ext         = extname( partial ) || desired_ext;
  var key         = [ root, partial, ext ].join( '-' );

  if( options.cache && cache[ key ]) return cache[ key ];

  // Make sure we use dirname in case of relative partials
  // ex: for partial( '../user' ) look for /path/to/root/../user.html
  var dir  = dirname( partial );
  var base = basename( partial, ext );

  // _ prefix takes precedence over the direct path
  // ex: for partial( 'user' ) look for /root/_user.html
  partial = resolve( root, dir, '_' + base + ext );

  if( exists( partial )) return options.cache ? cache[ key ] = partial : partial;

  // Try the direct path
  // ex: for partial( 'user' ) look for /root/user.html
  partial = resolve( root, dir, base + ext );

  if( exists( partial )) return options.cache ? cache[ key ] = partial : partial;

  // Try index
  // ex: for partial( 'user' ) look for /root/user/index.html
  partial = resolve( root, dir, base, 'index' + ext );

  if( exists( partial )) return options.cache ? cache[ key ] = partial : partial;

  // FIXME :
  // * there are other path types that Express 2.0 used to support but
  //   the structure of the lookup involved View class methods that we
  //   don't have access to any more
  // * we probaly need to pass the Express app's views folder path into
  //   this function if we want to support finding partials relative to
  //   it as well as relative to the current view
  // * we have no tests for finding partials that aren't relative to
  //   the calling view

  return null;
}

/**
 * Render `view` partial with the given `options`. Optionally a
 * callback `fn( err, str )` may be passed instead of writing to
 * the socket.
 *
 * Options:
 *
 *   - `object` Single object with name derived from the view ( unless `as` is present )
 *
 *   - `as` Variable name for each `collection` value, defaults to the view name.
 *     * as: 'something' will add the `something` local variable
 *     * as: this will use the collection value as the template context
 *     * as: global will merge the collection value's properties with `locals`
 *
 *   - `collection` Array of objects, the name is derived from the view name itself.
 *     For example _video.html_ will have a object _video_ available to it.
 *
 * @param  {String} view
 * @param  {Object|Array} options, collection or object
 * @return {String}
 * @api private
 */

function partial( view, options ){
  var collection;
  var object;
  var locals;
  var name;

  // parse options
  if( options ){
    // collection
    if( options.collection  ){
      collection = options.collection;

      delete options.collection;
    }else if( 'length' in options ){
      collection = options;
      options    = {};
    }

    // locals
    if( options.locals ){
      locals = options.locals;

      delete options.locals;
    }

    // object
    if( 'Object' != options.constructor.name ){
      object  = options;
      options = {};
    }else if( options.object !== undefined ){
      object = options.object;

      delete options.object;
    }
  }else{
    options = {};
  }

  // merge locals into options
  if( locals ){
    options.__proto__ = locals;
  }

  // merge app locals into options
  for( var k in this ){
    options[ k ] = options[ k ] || this[ k ];
  }

  // extract object name from view
  name = options.as || resolveObjectName( view );

  // find view, relative to this filename
  // ( FIXME : filename is set by thunder engine, other engines may need more help )
  var root = dirname( options.filename );
  var file = lookup( root, view, options );
  var key  = file + ':string';

  if( !file ){
    throw new Error( 'Could not find partial ' + view );
  }

  // read view
  var source = options.cache
    ? cache[ key ] || ( cache[ key ] = fs.readFileSync( file, 'utf8' ))
    : fs.readFileSync( file, 'utf8' );

  options.filename = file;

  // re-bind partial for relative partial paths
  options.partial = partial.bind( options );

  // render partial
  function render(){
    if( object ){
      if( 'string' == typeof name ){
        options[ name ] = object;
      }
    }

    var html = utils.render( source, options );

    return html;
  }

  // Collection support
  if( collection ){
    var len = collection.length;
    var buf = '';
    var keys;
    var prop;
    var val;
    var i;

    if( 'number' == typeof len || Array.isArray( collection )){
      options.collectionLength = len;

      for( i = 0; i < len; ++i ){
        val                       = collection[ i ];
        options.firstInCollection = i === 0;
        options.indexInCollection = i;
        options.lastInCollection  = i === len - 1;
        object                    = val;
        buf                       += render();
      }
    }else{
      keys                     = Object.keys( collection );
      len                      = keys.length;
      options.collectionLength = len;
      options.collectionKeys   = keys;

      for ( i = 0; i < len; ++i ){
        prop                      = keys[ i ];
        val                       = collection[ prop ];
        options.keyInCollection   = prop;
        options.firstInCollection = i === 0;
        options.indexInCollection = i;
        options.lastInCollection  = i === len - 1;
        object                    = val;
        buf                       += render();
      }
    }

    return buf;
  }else{
    return render();
  }
}

/**
 * Apply the given `view` as the layout for the current template,
 * using the current options/locals. The current template will be
 * supplied to the given `view` as `body`, along with any `blocks`
 * added by child templates.
 *
 * `options` are bound  to `this` in renderFile, you just call
 * `layout( 'myview' )`
 *
 * @param  {String} view
 * @api private
 */
function layout( view ){
  this.locals._layoutFile = view;
}

function Block(){
  this.html = [];
}

Block.prototype = {
  toString : function (){
    return this.html.join( '\n' );
  },
  append : function ( more ){
    this.html.push( more );
  },
  prepend : function ( more ){
    this.html.unshift( more );
  },
  replace : function ( instead ){
    this.html = [ instead ];
  }
};

/**
 * Return the block with the given name, create it if necessary.
 * Optionally append the given html to the block.
 *
 * The returned Block can append, prepend or replace the block,
 * as well as render it when included in a parent template.
 *
 * @param  {String} name
 * @param  {String} html
 * @return {Block}
 * @api private
 */
function block( name, html ){
  // bound to the blocks object in renderFile
  var blk = this[ name ];

  if( !blk ){
    // always create, so if we request a
    // non-existent block we'll get a new one
    blk = this[ name ] = new Block();
  }

  if( html ){
    blk.append( html );
  }

  return blk;
}

// bound to scripts Block in renderFile
function script( path, type ){
  if( path ){
    this.append( '<script src="' + path + '"' + ( type ? 'type="'+ type +'"' : '' ) + '></script>' );
  }

  return this;
}

// bound to stylesheets Block in renderFile
function stylesheet( path, media ){
  if( path ){
    this.append( '<link rel="stylesheet" href="' + path + '"' + ( media ? 'media="' + media + '"' : '' ) +' />' );
  }

  return this;
}

/**
 * @public
 */
renderFile.version = JSON.parse(
  fs.readFileSync( __dirname + '/../package.json', 'utf8' )
).version;
