const validUrl = require('valid-url');

const isValidUrl = (url) => {
  return validUrl.isWebUri(url);
};

module.exports = { isValidUrl };