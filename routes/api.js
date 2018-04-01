var express = require('express');
var router = express.Router();
var request = require('request');
var xml2js = require('xml2js');
var sanitizeHtml = require('sanitize-html');
var apicache = require('apicache');

let cache = apicache.middleware;

// config for parser
const xmlparser = new xml2js.Parser({
  explicitArray: false,
  explicitRoot: false,
  mergeAttrs: true,
  trim: true,
  valueProcessors: [handleValues, stripNewLine]
});

const sanitizeHtmlConfig = {
  allowedTags: ["br", "a"],
  allowedAttributes: {
    'a': ['href']
  }
};

function handleValues(value) {
  return sanitizeHtml(value, sanitizeHtmlConfig);
}

function stripNewLine(name) {
  return name.replace(/\n/g, '');
}

// implamentation based on this stackoverflow question
// https://stackoverflow.com/questions/34327599/using-express-js-to-consume-an-api
router.get('/itunes/:searchName', cache("1 hour"), function (req, res, next) {
  const ITUNES_SEARCH_URL = "https://itunes.apple.com/search?media=podcast&term=";
  //need to escape the html first
  const sanitizedSearchString = sanitizeHtml(req.params.searchName, sanitizeHtmlConfig);
  //if the sanitizer function detected bad parameter and cleaned it, return an error message
  if (!sanitizedSearchString) {
    return res.json({
      error: "invalid search parameter"
    });
  }

  //otherwise, handle the request
  request(ITUNES_SEARCH_URL + sanitizedSearchString, function (err, response) {
    if (err) {
      return next(err);
    }
    //itunes returns object as a string, parse into json before sending the response
    return res.json(JSON.parse(response.body));
  });

});

router.get('/itunes/imageFallback/:podcastId', cache("1 hour"), function (req, res, next) {
  const ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup?id=";
  const sanitizedSearchString = sanitizeHtml(req.params.podcastId, sanitizeHtmlConfig);
  if (!sanitizedSearchString) {
    return res.json({
      error: "Invalid Search Parameter"
    });
  }
  request(ITUNES_LOOKUP_URL + sanitizedSearchString, function (err, response) {
    if (err) {
      return next(err);
    }
    return res.json(JSON.parse(response.body));
  });
});


//error handling route
//handles cases where there podcast name param is missing
router.get('/itunes/', function (req, res, next) {
  return res.json({
    emptySearchError: "missing or invalid podcast name parameter"
  });
});


//some rss feeds will not accept a request without a user agent, using chrome's
const options = {
  headers: {
    "User-Agent": "Mozilla/5.0"
  }
}

router.get('/parser/:rssFeed', cache("1 hour"), function (req, res, next) {
  //TODO: clean up the variable names and error handling

  //escape this input increase the encode uri is circumviented in the client side
  const rssFeed = sanitizeHtml(req.params.rssFeed, sanitizeHtmlConfig);
  //make sure this isn't a xss attempt
  const sanitizedRssUrl = decodeURIComponent(rssFeed);

  request(sanitizedRssUrl, options, function (err, response, body) {
    if (err) {
      return next(err);
    }
    //raise can't parse error here
    xmlparser.parseString(body, function (err, result) {
      if (err) {
        return next(err);
      }
      return res.json(result);
    });
  });
});

router.get('*', function (req, res, next) {
  return res.json({
    message: "No endpoint found"
  })
});


module.exports = router;