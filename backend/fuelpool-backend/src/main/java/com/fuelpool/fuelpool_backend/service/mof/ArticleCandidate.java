package com.fuelpool.fuelpool_backend.service.mof;

/**
 * A raw article candidate discovered on the MOF homepage. The scraper only
 * gathers this metadata; the AI agents decide relevance, extraction and impact.
 */
public record ArticleCandidate(
        String title,
        String url,
        String preview,
        String date
) {}
