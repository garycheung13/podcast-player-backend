var express = require('express');
var router = express.Router();
var request = require('request');
var xml2js = require('xml2js');
var sanitizeHtml = require('sanitize-html');

const xmlparser = new xml2js.Parser({
  explicitArray: false,
  explicitRoot: false,
  mergeAttrs: true,
  trim: true,
  valueProcessors: [handleValues, stripNewLine]
});

const sanitizeHtmlConfig = {
  allowedTags: [],
  allowedAttributes: []
};

function handleValues(name) {
  return sanitizeHtml(name, sanitizeHtmlConfig);
}

function stripNewLine(name) {
  return name.replace(/\n/g, '');
}

const mockPlaylist = [{
  podcastEpisodeTitle: "#626: White Haze",
  podcastFrom: "This American Life",
  link: "https://www.podtrac.com/pts/redirect.mp3/podcast.thisamericanlife.org/podcast/626.mp3",
  summary: "Right-wing groups like the Proud Boys say they have no tolerance for racism or white supremacist groups. Their leader Gavin McInnes disavowed the white nationalist rally in Charlottesville. But the Proud Boys believe “the West is the best,” which, one of them points out, is not such a big jump from “whites are best.” And one of the Proud Boys organized the Charlottesville rally. (The group now claims he was a spy.) What should we make of groups like this?",
  lastPlayPos: 0
}, {
  podcastEpisodeTitle: "Brain Chemistry",
  podcastFrom: "The Truth",
  link: "https://www.podtrac.com/pts/redirect.mp3/traffic.libsyn.com/secure/thetruthapm/Brain_Chemistry.mp3?dest-id=90480",
  summary: "A cryogenically-frozen man is revived in the future, to a world that is not quite what he expected.</p> <p>Written by Eric Molinsky, and produced by Jonathan Mitchell. Performed by Scott Adsit, Amy Warren, and Ed Herbstman, with Anna Neu, Billy Griffin, Alexis Lambright, Louis Kornfeld, Elana Fishbein, Joanna Hausmann, and Kerry Kastin.",
  lastPlayPos: 0
}, {
  podcastEpisodeTitle: "#24 | Watergate",
  podcastFrom: "Twenty Thousand Hertz",
  link: "https://traffic.libsyn.com/secure/20khz/Watergate_v4.mp3?dest-id=440475",
  summary: "How did an open reel tape recorder secretly planted in the White House basement lead to the demise of the 37th President of the United States?",
  lastPlayPos: 0
}]

// implamentation based on this stackoverflow question
// https://stackoverflow.com/questions/34327599/using-express-js-to-consume-an-api
router.get('/itunes/:searchName', function (req, res, next) {
  const ITUNES_SEARCH_URL = "https://itunes.apple.com/search?media=podcast&term=";
  //need to escape the html first
  const sanitizedSearchString = sanitizeHtml(req.params.searchName, sanitizeHtmlConfig);

  //if the sanitizer function detected bad paramter and cleaned it, return an error message
  if (!sanitizedSearchString) {
    return res.json({
      error: "invalid search parameter"
    });
  }

  //otherwise, handle the request
  request(ITUNES_SEARCH_URL + sanitizedSearchString, function (err, response) {
    //itunes returns object as a string, parse into json before sending the response
    return res.json(JSON.parse(response.body));
  });

});

router.get('/itunes/imageFallback/:podcastId', function (req, res, next) {
  const ITUNES_LOOKUP_URL = "https://itunes.apple.com/lookup?id=";
  const sanitizedSearchString = sanitizeHtml(req.params.podcastId, sanitizeHtmlConfig);
  if (!sanitizedSearchString) {
    return res.json({
      error: "Invalid Search Parameter"
    });
  }

  request(ITUNES_LOOKUP_URL + sanitizedSearchString, function (err, response) {
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

router.get('/parser/:rssFeed', function (req, res, next) {
  //TODO: clean up the variable names and error handling

  //escape this input increase the encode uri is circumviented in the client side
  const rssFeed = sanitizeHtml(req.params.rssFeed, sanitizeHtmlConfig);
  //make sure this isn't a xss attempt
  const sanitizedRssUrl = decodeURIComponent(rssFeed);

  request(sanitizedRssUrl, options, function (error, response, body) {
    //raise can't parse error here
    xmlparser.parseString(body, function (err, result) {
      return res.json(result);
    });
  });
});


//load a demo playlist
//temp endpoint
router.get('/demo/playlist', function (req, res, next) {
  return res.json(mockPlaylist);
});


router.post('/demo/playlist', function (req, res) {
  mockPlaylist.push(req.body.episode);
  return res.json(mockPlaylist);
});


router.get('/', function (req, res, next) {
  // And insert something like this instead:
  res.json([{
    id: 1,
    username: "samsepi0l"
  }, {
    id: 2,
    username: "D0loresH4ze"
  }]);
});


module.exports = router;