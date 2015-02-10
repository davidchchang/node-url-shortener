var http = require('http');
var fs = require('fs');
var assert = require('assert');
var url = require('url');
var qs = require('querystring');

var _SLUG_CHARACTER_SET = function () {
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
  return characterSet;
}();

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
    return;
  }
  slug = slug.replace(/\//g, '');
  if (!slug.match(/^[a-z0-9]+$/i)) {
    callback(new Error('slug not valid'));
    return;
  }

  lookupSlugFile(slug, callback);
}

function findAvailableSlug(slug, urlToSlug, callback) {
  fs.exists('./slugs/' + slug, function (exists) {
    if (exists) {
      slug += getRandomSlugCharacter();
      findAvailableSlug(slug, urlToSlug, callback);
    } else {
      callback(null, slug, urlToSlug);
    }
  });
}

function getRandomSlugCharacter() {
  var randomIndex = Math.floor(Math.random() * _SLUG_CHARACTER_SET.length);
  return _SLUG_CHARACTER_SET.charAt(randomIndex);
}
/**
 * Generates a new slug for the passed URL which will consist of at least one or
 * more characters, where each character is either a letter or a number.
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
    return;
  }
  var parsedUrl = url.parse(urlToSlug);
  if (!parsedUrl.hostname || !parsedUrl.protocol) {
    callback(new Error('not a valid url'));
    return;
  }

  // find a slug that is available
  var slug = getRandomSlugCharacter(slug);
  findAvailableSlug(slug, urlToSlug, function (err, newSlug, urlToSlug) {
    fs.writeFile('./slugs/' + newSlug, urlToSlug, function (err) {
      if (err) callback(err);
      else {
        callback(null, newSlug);
      }
      console.log(urlToSlug + ' -> ' + newSlug);
    });
  });

  /**
   * Rename is only guaranteed atomic operation on Linux/Unix kernel?
   *
   * http://stackoverflow.com/questions/17047994/transactionally-writing-files-in-node-js
   * http://nodejs.org/api/fs.html#fs_fs_rename_oldpath_newpath_callback
   */
}


/**
 * Entry point for URL shortening application.
 */
http.createServer(function (req, res) {

  console.log('Attempting to retrieve slug for: ' + req.url);

  if (req.url === '/new') {
    if (req.method !== 'POST') {
      res.writeHead(400, {'Content-Type': 'text/plain'});
      res.end();
    }
    var body = '';
    // node doesn't follow convention here (first param is not error status)
    req.on('data', function (data) {
      body += data;

      // Sanity check: kill the connection if we receive too much POST data
      if (body.length > 1e6) {
        req.connection.destroy();
      }
    });
    req.on('end', function () {
        var post = qs.parse(body);
        if (!post || !post['url']) {
          // 400 Bad Request or 422 Unprocessable Entity are appropriate HTTP status codes here
          res.writeHead(422, {});
          res.end();
        } else {
          var urlToSlug = post['url'];
          generateSlug(urlToSlug, function (error, newSlug) {
            if (!error) {
              res.writeHead(201, {'Content-Type': 'text/plain'});
              res.write(JSON.stringify({
                slug: newSlug,
                url: urlToSlug
              }));
              res.end();
            } else {
              res.writeHead(406, {'Content-Type': 'text/plain'});
              res.end();
            }
          });
        }
      }
    );
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

console.log('server running');

// ===== UNIT TESTS ============================================================

// TODO: switch to nodeunit - https://github.com/caolan/nodeunit

// tests for locateSlug(str, fn)

// happy path - matching slug found
locateSlug('/s', function (error, data) {
  assert(error === null);
  assert.equal('http://www.shopify.com/', data);
});
// happy path - extra trailing slash should still match
locateSlug('/s/', function (error, data) {
  assert(error === null);
  assert.equal('http://www.shopify.com/', data);
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
generateSlug('http://www.google.com', function (error, data) {
  assert(data, 'slug should be non-empty');
});
// missing callback should result in thrown error
assert.throws(
  function() {
    generateSlug('http://www.google.com');
  }, Error, 'callback missing'
);
assert.throws(
  function() {
    generateSlug();
  }, Error, 'callback missing'
);
// blank url should result in error within callback
generateSlug('', function (error, data) {
  assert(error !== null);
});
// null url should result in error within callback
generateSlug(null, function (error, data) {
  assert(error !== null);
});