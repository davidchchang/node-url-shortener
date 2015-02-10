var http = require('http');
var fs = require('fs');
var assert = require('assert');
var url = require('url');

/**
 * Helper function to extract a URL from a slug file, if it exists.
 *
 * @param slug string slug to lookup
 * @param callback function callback function to invoke upon obtaining the slug contents or encountering an error
 */
function lookupSlugFile(slug, callback) {
  fs.readFile('./slugs/' + slug, function (err, data) {
    if (err) {
      callback(err);
    }
    else {
      callback(null, data.toString());
    }
  });
}
/**
 * Locates a slugified URL as long as the slug exists.
 *
 * @param slug string slug to lookup
 * @param callback function callback function to invoke once the URL is obtained or an error is encountered
 */
function locateSlug(slug, callback) {
  if (!callback) {
    throw new Error('callback not defined');
  }
  if (!slug) {
    callback(new Error('slug not valid'));
  }
  slug = slug.replace(/\//g, '');
  if (!slug.match(/^[a-z0-9]+$/i)) {
    callback(new Error('slug not valid'));
  }

  lookupSlugFile(slug, callback);
}

/**
 * Generates a new slug for the passed URL which will consist of at least one or
 * more characters, where each character is either a letter or a number.
 *
 * This operation is atomic.
 *
 * @param urlToSlug string URL to convert to slug form
 * @param callback function callback function to invoke once the slug is generated or an error is encountered
 */
function generateSlug(urlToSlug, callback) {
  if (!callback) {
    throw new Error('callback not defined');
  }
  if (!urlToSlug) {
    callback(new Error('url missing'));
  }
  var parsedUrl = url.parse(urlToSlug);
  if (!parsedUrl.hostname || !parsedUrl.protocol) {
    callback(new Error('not a valid url'));
  }

  // find a slug that is available
  var slug = '';
  var characterSet = '';
  for (var i = 48; i <= 57; i++) {
    characterSet += String.fromCharCode(i);
  }
  for (i = 65; i <= 90; i++) {
    characterSet += String.fromCharCode(i);
  }
  for (i = 97; i <= 122; i++) {
    characterSet += String.fromCharCode(i);
  }

  var randomIndex = Math.floor(Math.random() * characterSet.length);
  slug += characterSet.charAt(randomIndex);

  console.log(slug);

  //fs.writeFile()
}


//  short url needs to be expanded, and redirected
// scenarios:
// 1 - url is found, then redirect
//  2- url not found, return 404

// POST API - accept a POST /new operation to submit new URLs
//  - if URL already exists, then return an error

/**
 * Entry point for the application.
 */
http.createServer(function (req, res) {

  console.log('Attempting to retrieve slug for: ' + req.url);

  if (req.url === '/new') {
    if (req.method !== 'POST') {
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end();
    }
    var body = '';
    req.on('data', function (err, data) {
      body += data.toString();
    });
    req.on('end', function (err) {
      if (!error) {
        generateSlug(body, function (err, response) {

        });
      }
    });

    generateSlug(req.param, function (error, response) {
      if (!error) {
        res.writeHead(201, {'Content-Type': 'text/plain'});
        res.end();
      } else {
        res.writeHead(406, {'Content-Type': 'text/plain'});
        res.end();
      }
    });
  } else {
    locateSlug(req.url, function (error, data) {
      if (!error) {
        res.writeHead(302, {'Content-Type': 'text/plain', 'Location': data});
        res.end();
      } else {
        res.writeHead(404, {'Content-Type': 'text/plain'});
        res.end('404 Not Found');
      }
    });
  }

}).listen(1337, '127.0.0.1');

// ===== UNIT TESTS ============================================================

// tests for locateSlug(str, fn)

// happy path - matching slug found
locateSlug('/s', function (error, data) {
  assert(error === null);
  assert.equal('http://shopify.com', data);
});
// happy path - extra trailing slash should still match
locateSlug('/s/', function (error, data) {
  assert(error === null);
  assert.equal('http://shopify.com', data);
});
// callback undefined
assert.throws(function () {
  locateSlug('/s', null);
}, Error, 'callback not defined');
// non-matching slug
locateSlug('/1234', function (error, data) {
  assert(error !== null);
});
// test for invalid characters in slug
locateSlug('/s-', function (error, data) {
  assert(error !== null);
});
// test for null/empty slug
locateSlug('', function (error, data) {
  assert(error !== null);
});

// tests for generateSlug(str, fn)

// happy path - slug should be generated for valid URL
generateSlug('http://www.google.com', function(error, data) {
  assert(data, 'slug should be non-empty')
});