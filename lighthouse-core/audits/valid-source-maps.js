/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit.js');
const i18n = require('../lib/i18n/i18n.js');

// TODO write strings
const UIStrings = {
  /** Title of a Lighthouse audit that provides detail on HTTP to HTTPS redirects. This descriptive title is shown to users when HTTP traffic is redirected to HTTPS. */
  title: 'Page has valid source maps',
  /** Title of a Lighthouse audit that provides detail on HTTP to HTTPS redirects. This descriptive title is shown to users when HTTP traffic is not redirected to HTTPS. */
  failureTitle: 'Has invalid source maps',
  /** Description of a Lighthouse audit that tells the user why they should direct HTTP traffic to HTTPS. This is displayed after a user expands the section to see more. No character length limits. 'Learn More' becomes link text to additional documentation. */
  description: 'If you\'ve already set up HTTPS, make sure that you redirect all HTTP ' +
    'traffic to HTTPS in order to enable secure web features for all your users. [Learn more](https://web.dev/redirects-http).',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class ValidSourceMaps extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'valid-source-maps',
      title: str_(UIStrings.title),
      failureTitle: str_(UIStrings.failureTitle),
      description: str_(UIStrings.description),
      requiredArtifacts: ['SourceMaps'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const {SourceMaps} = artifacts;

    const results = [];

    // Partition.
    const mapsWithoutLoadErrors = [];
    const mapsWithLoadErrors = [];
    for (const sourceMapOrError of SourceMaps) {
      if (sourceMapOrError.map) mapsWithoutLoadErrors.push(sourceMapOrError);
      else mapsWithLoadErrors.push(sourceMapOrError);
    }

    // Load errors.
    for (const sourceMap of mapsWithLoadErrors) {
      const error = sourceMap.errorMessage;
      results.push({
        scriptUrl: sourceMap.scriptUrl,
        sourceMapUrl: sourceMap.sourceMapUrl,
        error,
      });
    }

    // TODO find any script urls that look like bundled code but don't have
    // a source map.

    // Sources content errors.
    for (const {scriptUrl, sourceMapUrl, map} of mapsWithoutLoadErrors) {
      const sourcesContent = map.sourcesContent || [];

      let missingSourcesContentCount = 0;
      for (let i = 0; i < map.sources.length; i++) {
        if (sourcesContent.length < i || !sourcesContent[i]) missingSourcesContentCount += 1;
      }
      if (missingSourcesContentCount > 0) {
        results.push({
          scriptUrl: scriptUrl,
          sourceMapUrl: sourceMapUrl,
          error: `missing ${missingSourcesContentCount} items in .sourcesContent`,
        });
        continue;
      }
    }

    // TODO also, validate (source-map-validator) the map. can punt this until maps
    // are used to actually do some mapping for the report.

    /** @type {LH.Audit.Details.Table['headings']} */
    const headings = [
      {key: 'scriptUrl', itemType: 'url', text: str_(i18n.UIStrings.columnURL)},
      {key: 'sourceMapUrl', itemType: 'url', text: 'Map URL'}, // TODO uistring
      {key: 'error', itemType: 'code', text: 'Error'}, // TODO uistring
    ];

    // TODO: should we mark as n/a if no map errors and no bundle-like scripts?
    if (results.length === 0) {
      return {
        score: 1,
        notApplicable: true,
      };
    }

    results.sort((a, b) => b.scriptUrl.localeCompare(a.scriptUrl));
    return {
      score: Number(results.length === 0),
      details: Audit.makeTableDetails(headings, results),
    };
  }
}

module.exports = ValidSourceMaps;
module.exports.UIStrings = UIStrings;