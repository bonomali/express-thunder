// enable to use express server when debugging
// var http    = require( 'http' );

var express = require( 'express' );
var request = require( './support/http' );
var engine  = require( '../' );

var app = express();

// enable to use express server when debugging
// app.set( 'port', process.env.PORT || 3000 );

app.engine( 'html', engine );
app.set( 'view engine', 'html' );
app.set( 'views', __dirname + '/fixtures' );

// enable to use express server when debugging
// app.use( express.favicon());
// app.use( express.logger( 'dev' ));
// app.use( app.router );

// this is not the default behavior, but you can set this
// if you want to load `layout.html` as the default layout
// ( this was the default in Express 2.0 so it's handy for
// quick ports and upgrades )
app.locals({
  _layoutFile : true
});

app.locals.hello = 'there';

app.get( '/', function ( req, res, next ){
  res.render( 'index.html' );
});

app.get( '/blog', function ( req, res, next ){
  res.render( 'blog/home.html', {
    _layoutFile : false,
    user : { name : 'Tom' },
    posts : [{
      text : '1',
      comments : [{ text : '1.1' }, { text : '1.2' }]
    }, {
      text : '2',
      comments : [{ text : '2.1' }, { text : '2.2' }, { text : '2.3' }]
    }]
  });
});

app.get( '/no-layout', function ( req, res, next ){
  res.render( 'index.html', { _layoutFile : false });
});

app.get( '/res-locals', function ( req, res, next ){
  res.render( 'locals.html', { hello : 'here' });
});

app.get( '/app-locals', function ( req, res, next ){
  res.render( 'locals.html' );
});

app.get( '/mobile', function ( req, res, next ){
  res.render( 'index.html', { _layoutFile : 'mobile' });
});

app.get( '/mobile.html', function ( req, res, next ){
  res.render( 'index.html', { _layoutFile : 'mobile.html' });
});

app.get( '/collection/_entry', function ( req, res, next ){
  res.render( 'collection.html', { name : 'entry', list : [{ name : 'one' }, { name : 'two' }]});
});

app.get( '/collection/thing', function ( req, res, next ){
  res.render( 'collection.html', { name : 'thing', list : [{ name : 'one' }, { name : 'two' }]});
});

app.get( '/collection/thing-path', function ( req, res, next ){
  res.render( 'collection.html', { name : 'path/to/thing', list : [{ name : 'one' }, { name : 'two' }]});
});

app.get( '/with-layout', function ( req, res, next ){
  res.render( 'with-layout.html' );
});

app.get( '/with-layout-override', function ( req, res, next ){
  res.render( 'with-layout.html', { _layoutFile : false });
});

app.get( '/with-blocks', function ( req, res, next ){
  res.render( 'with-blocks.html', { _layoutFile : false });
});

app.get( '/deep-inheritance', function ( req, res, next ){
  res.render( 'inherit-grandchild.html' );
});

app.get( '/deep-inheritance-blocks', function ( req, res, next ){
  res.render( 'inherit-grandchild-blocks.html' );
});

app.get( '/subfolder/subitem', function ( req, res, next ){
  res.render( 'subfolder/subitem.html' );
});

app.get( '/subfolder/subitem-with-layout', function ( req, res, next ){
  res.render( 'subfolder/subitem-with-layout.html' );
});

app.get( '/non-existent-partial', function ( req, res, next ){
  res.render( 'non-existent-partial.html' );
});

// override the default error handler so it doesn't log to console :
app.use( function ( err, req, res, next ){
  // console.log( err.stack );
  res.send( 500, err.stack );
});

// enable to use express server when debugging
// http.createServer( app ).listen( app.get( 'port' ), function (){
//   console.log( 'Express server listening on port ' + app.get( 'port' ));
// });

describe( 'app', function (){

  describe( 'GET /', function (){
    it( 'should render with default layout.html', function ( done ){
      request( app )
        .get( '/' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder</title></head><body><h1>Index</h1></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /blog', function (){
    it( 'should render all the fiddly partials', function ( done ){
      request( app )
        .get( '/blog' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<h1>Tom</h1><ul><li>1<ul><li>1.1</li><li>1.2</li></ul></li><li>2<ul><li>2.1</li><li>2.2</li><li>2.3</li></ul></li></ul>' );
          done();
        });
    });
  });

  describe( 'GET /no-layout', function (){
    it( 'should render without layout', function ( done ){
      request( app )
        .get( '/no-layout' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<h1>Index</h1>' );
          done();
        });
    });
  });

  describe( 'GET /res-locals', function (){
    it( 'should render "here"', function ( done ){
      request( app )
        .get( '/res-locals' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder</title></head><body><h1>here</h1></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /app-locals', function (){
    it( 'should render "there"', function ( done ){
      request( app )
        .get( '/app-locals' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder</title></head><body><h1>there</h1></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /mobile', function (){
    it( 'should render with mobile.html as layout', function ( done ){
      request( app )
        .get( '/mobile' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder mobile</title></head><body><h1>Index</h1></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /mobile.html', function (){
    it( 'should render with mobile.html as layout', function ( done ){
      request( app )
        .get( '/mobile.html' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder mobile</title></head><body><h1>Index</h1></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /collection/_entry', function (){
    it( 'should render _entry.html for every item with layout.html as layout', function ( done ){
      request( app )
        .get( '/collection/_entry' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder</title></head><body><ul><li>one</li><li>two</li></ul></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /collection/thing-path', function (){
    it( 'should render thing/index.html for every item with layout.html as layout', function ( done ){
      request( app )
        .get( '/collection/thing-path' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder</title></head><body><ul><li>one</li><li>two</li></ul></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /collection/thing', function (){
    it( 'should render thing/index.html for every item with layout.html as layout', function ( done ){
      request( app )
        .get( '/collection/thing' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder</title></head><body><ul><li>one</li><li>two</li></ul></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /with-layout', function (){
    it( 'should use layout.html when rendering with-layout.html', function ( done ){
      request( app )
        .get( '/with-layout' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder</title></head><body><h1>Index</h1></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /with-layout-override', function (){
    it( 'should use layout.html when rendering with-layout.html, even if layout=false in options', function ( done ){
      request( app )
        .get( '/with-layout-override' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder</title></head><body><h1>Index</h1></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /with-blocks', function (){
    it( 'should arrange blocks into layout-with-blocks.html when rendering with-blocks.html', function ( done ){
      request( app )
        .get( '/with-blocks' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<li><a href="hello.html">there</a></li><p>What\'s up?</p>© 2012' );
          done();
        });
    });
  });

  describe( 'GET /deep-inheritance', function (){
    it( 'should recurse and keep applying layouts until done', function ( done ){
      request( app )
        .get( '/deep-inheritance' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder</title></head><body><i>I am grandchild content.</i><b>I am child content.</b><u>I am parent content.</u></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /deep-inheritance-blocks', function (){
    it( 'should recurse and keep applying blocks to layouts until done', function ( done ){
      request( app )
        .get( '/deep-inheritance-blocks' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder</title><script src="gc.js"></script>\n<script src="c.js"></script><link rel="stylesheet" href="gc.css" />\n<link rel="stylesheet" href="c.css" /></head><body><i>I am grandchild content.</i><b>I am child content.</b><u>I am parent content.</u></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /subfolder/subitem', function (){
    it( 'should render subfolder/subitem.html and still use layout.html', function ( done ){
      request( app )
        .get( '/subfolder/subitem' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder</title></head><body><h1>Index</h1></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /subfolder/subitem-with-layout', function (){
    it( 'should render subitem-with-layout.html using sub-layout.html', function ( done ){
      request( app )
        .get( '/subfolder/subitem-with-layout' )
        .end( function ( res ){
          res.should.have.status( 200 );
          res.body.should.equal( '<html><head><title>express-thunder sub-layout</title></head><body><h1>Index</h1></body></html>' );
          done();
        });
    });
  });

  describe( 'GET /non-existent-partial', function (){
    it( 'should send 500 and error saying a partial was not found', function ( done ){
      request( app )
        .get( '/non-existent-partial' )
        .end( function ( res ){
          res.should.have.status( 500 );
          res.body.should.include( 'Could not find partial non-existent' );
          done();
        });
    });
  });
});
