"use strict";
/**
 * @param {string} input
 * @param {string} template Template for a search query.
 * @returns {string} Fully qualified URL
 */
function search(input, template) {
  try {
    // input is a valid URL: eg https://example.com, https://example.com/test?q=param
    return new URL(input).toString();
  } catch (err) {
    // input was not a valid URL
  }
  try {
    // input is a valid URL when http:// is prepended: eg example.com
    const url = new URL(`http://${input}`);
    if (url.hostname.includes(".")) return url.toString();
  } catch (err) {
    // input was not valid URL
  }
  // treat the input as a search query
  return template.replace("%s", encodeURIComponent(input));
}

window.search = search;
