var http = require('http');
var fs = require('fs');
var assert = require('assert');
var url = require('url');

function locateSlug(filename, callback) {
  if (!callback) {
    throw new Error('callback not defined');
  }
  if (!filename) {
    callback(new Error('slug not valid'));
  }
  filename = filename.replace('/', '');
  if (!filename.match(/^[a-z0-9]+$/i)) {
    callback(new Error('slug not valid'));
  }

  fs.readFile('./slugs/' + filename, function (err, data) {
    if (err) {
      callback(err);
    }
    else {
      callback(null, data.toString());
    }
  });
}

/**
 * convention:
 * letters, numbers;
 * start with 1 character, and grow by one character at a time until we get a miss
 *
 * @param urlToSlug
 * @param callback
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


http.createServer(function (req, res) {

  console.log('Attempting to retrieve slug for: ' + req.url);

  if (req.url === '/new') {
    if (req.method !== 'POST') {
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end();
    }
    var body = "";
    req.on('data', function(err,data) { body += data.toString(); });
    req.on('end', function (err) {
      if (!error) {
        generateSlug(body, function(err, response) {

        });
      }
    });

    generateSlug(req.param, function(error, response) {
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

// POST API - accept a POST /new operation to submit new URLs
//  - if URL already exists, then return an error
}).listen(1337, '127.0.0.1');

// http://localhost:1337/foo/bar - 404


locateSlug("/s", function (error, data) {
  assert.equal(null, error);
  assert.equal("http://shopify.com", data);
});
assert.throws(function() {locateSlug('/s', null); }, Error, 'callback not defined');
locateSlug("/1234", function (error, data) {
  assert.notEqual(null, error);
});
locateSlug("/s-", function (error, data) {
  assert.notEqual(null, error);
});
locateSlug('', function (error, data) {
  assert.notEqual(null, error);
});
locateSlug('', function (error, data) {
  assert.notEqual(null, error);
});

