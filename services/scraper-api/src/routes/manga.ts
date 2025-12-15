/**
 * Manga API routes
 */

import { Router, Request, Response } from 'express';
import { 
  getMangaFromProvider, 
  searchAllProviders, 
  getEnabledProviders,
  getRecentlyUpdated,
  browseManga,
  getDemographicHighlights,
  getPopularNewTitles,
  getRecentPopularByLanguage
} from '../providers';

const router = Router();

// IMPORTANT: Define specific routes BEFORE parameterized routes
// Otherwise /:provider/:id will catch everything!

/**
 * GET /search
 * Search across multiple providers
 * Query params:
 *   - q: search query (required)
 *   - providers: comma-separated list of providers (optional, default: mangaupdates)
 *   - limit: max results per provider (optional, default: 10)
 *   - showMatureContent: show Level 1 (Ecchi, Mature) (optional, default: false)
 *   - showExplicitContent: show Level 2 (Smut, Adult) (optional, default: false)
 *   - showPornographicContent: show Level 3 (Hentai, Doujinshi) (optional, default: false)
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }
    
    const providersParam = req.query.providers as string;
    const providers = providersParam
      ? providersParam.split(',').map((p) => p.trim())
      : ['mangaupdates'];
    
    const limit = parseInt(req.query.limit as string) || 10;
    const showMatureContent = req.query.showMatureContent === 'true'; // Default false
    const showExplicitContent = req.query.showExplicitContent === 'true'; // Default false
    const showPornographicContent = req.query.showPornographicContent === 'true'; // Default false
    const useCache = req.query.cache !== 'false';
    
    const results = await searchAllProviders(query, providers, limit, showMatureContent, showExplicitContent, showPornographicContent, useCache);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      query,
      providers,
    });
  } catch (error) {
    console.error('[API] Error searching manga:', error);
    
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: err.message || 'Search failed',
    });
  }
});

/**
 * GET /providers
 * Get list of enabled providers
 */
router.get('/providers', (_req: Request, res: Response) => {
  const providers = getEnabledProviders();
  
  res.json({
    success: true,
    data: providers,
  });
});

/**
 * GET /recent
 * Get recently updated manga
 * Query params:
 *   - provider: provider name (optional, default: mangaupdates)
 *   - limit: max results (optional, default: 20)
 */
router.get('/recent', async (req: Request, res: Response) => {
  try {
    const provider = (req.query.provider as string) || 'mangaupdates';
    const limit = parseInt(req.query.limit as string) || 20;
    const useCache = req.query.cache !== 'false';
    
    const results = await getRecentlyUpdated(provider, limit, useCache);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('[API] Error fetching recent manga:', error);
    
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch recent manga',
    });
  }
});

/**
 * GET /browse
 * Browse manga with filters
 * Query params:
 *   - provider: provider name (optional, default: mangaupdates)
 *   - limit: max results (optional, default: 30)
 *   - page: page number (optional, default: 1)
 *   - types[]: filter by types (optional, can be multiple)
 *   - genres[]: filter by genres (optional, can be multiple)
 *   - orderby: sort order (optional)
 *   - showMatureContent: show Level 1 (Ecchi, Mature) (optional, default: false)
 *   - showExplicitContent: show Level 2 (Smut, Adult) (optional, default: false)
 *   - showPornographicContent: show Level 3 (Hentai, Doujinshi) (optional, default: false)
 */
router.get('/browse', async (req: Request, res: Response) => {
  try {
    const provider = (req.query.provider as string) || 'mangaupdates';
    const limit = parseInt(req.query.limit as string) || 30;
    const page = parseInt(req.query.page as string) || 1;
    const showMatureContent = req.query.showMatureContent === 'true'; // Default false
    const showExplicitContent = req.query.showExplicitContent === 'true'; // Default false
    const showPornographicContent = req.query.showPornographicContent === 'true'; // Default false
    const useCache = req.query.cache !== 'false';
    
    // Get array params
    const types = req.query['types[]'];
    const genres = req.query['genres[]'];
    const orderby = req.query.orderby as string;
    
    const options = {
      limit,
      page,
      types: Array.isArray(types) ? types : types ? [types] : undefined,
      genres: Array.isArray(genres) ? genres : genres ? [genres] : undefined,
      orderby,
      showMatureContent,
      showExplicitContent,
      showPornographicContent,
    };
    
    const result = await browseManga(provider, options, useCache);
    
    res.json({
      success: true,
      data: result.results,
      total: result.total,
      limit,
      page,
    });
  } catch (error) {
    console.error('[API] Error browsing manga:', error);
    
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to browse manga',
    });
  }
});

/**
 * GET /highlights/:demographic
 * Get demographic highlights (top rated by type)
 * Query params:
 *   - provider: provider name (optional, default: mangaupdates)
 *   - limit: max results (optional, default: 50)
 *   - showMatureContent: show Level 1 (Ecchi, Mature) (optional, default: false)
 *   - showExplicitContent: show Level 2 (Smut, Adult) (optional, default: false)
 *   - showPornographicContent: show Level 3 (Hentai, Doujinshi) (optional, default: false)
 */
router.get('/highlights/:demographic', async (req: Request, res: Response) => {
  try {
    const { demographic } = req.params;
    const provider = (req.query.provider as string) || 'mangaupdates';
    const limit = parseInt(req.query.limit as string) || 50;
    const showMatureContent = req.query.showMatureContent === 'true'; // Default false
    const showExplicitContent = req.query.showExplicitContent === 'true'; // Default false
    const showPornographicContent = req.query.showPornographicContent === 'true'; // Default false
    const useCache = req.query.cache !== 'false';
    
    const results = await getDemographicHighlights(provider, demographic, limit, showMatureContent, showExplicitContent, showPornographicContent, useCache);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('[API] Error fetching demographic highlights:', error);
    
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch highlights',
    });
  }
});

/**
 * GET /popular-new
 * Get popular new titles
 * Query params:
 *   - provider: provider name (optional, default: mangaupdates)
 *   - limit: max results (optional, default: 50)
 *   - showMatureContent: show Level 1 (Ecchi, Mature) (optional, default: false)
 *   - showExplicitContent: show Level 2 (Smut, Adult) (optional, default: false)
 *   - showPornographicContent: show Level 3 (Hentai, Doujinshi) (optional, default: false)
 */
router.get('/popular-new', async (req: Request, res: Response) => {
  try {
    const provider = (req.query.provider as string) || 'mangaupdates';
    const limit = parseInt(req.query.limit as string) || 50;
    const showMatureContent = req.query.showMatureContent === 'true'; // Default false
    const showExplicitContent = req.query.showExplicitContent === 'true'; // Default false
    const showPornographicContent = req.query.showPornographicContent === 'true'; // Default false
    const useCache = req.query.cache !== 'false';
    
    const results = await getPopularNewTitles(provider, limit, showMatureContent, showExplicitContent, showPornographicContent, useCache);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('[API] Error fetching popular new titles:', error);
    
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch popular new titles',
    });
  }
});

/**
 * GET /trending/:language
 * Get trending manga by language/region
 * Query params:
 *   - provider: provider name (optional, default: mangaupdates)
 *   - limit: max results (optional, default: 50)
 *   - showMatureContent: show Level 1 (Ecchi, Mature) (optional, default: false)
 *   - showExplicitContent: show Level 2 (Smut, Adult) (optional, default: false)
 *   - showPornographicContent: show Level 3 (Hentai, Doujinshi) (optional, default: false)
 */
router.get('/trending/:language', async (req: Request, res: Response) => {
  try {
    const { language } = req.params;
    const provider = (req.query.provider as string) || 'mangaupdates';
    const limit = parseInt(req.query.limit as string) || 50;
    const showMatureContent = req.query.showMatureContent === 'true'; // Default false
    const showExplicitContent = req.query.showExplicitContent === 'true'; // Default false
    const showPornographicContent = req.query.showPornographicContent === 'true'; // Default false
    const timeframe = (req.query.timeframe as '7d' | '1m' | '3m' | 'mixed') || 'mixed'; // Default mixed
    const useCache = req.query.cache !== 'false';
    
    const results = await getRecentPopularByLanguage(provider, language, limit, showMatureContent, showExplicitContent, showPornographicContent, timeframe, useCache);
    
    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    console.error('[API] Error fetching trending manga:', error);
    
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch trending manga',
    });
  }
});

/**
 * GET /manga/:provider/:id
 * Get manga details from a specific provider
 * 
 * NOTE: This MUST be defined LAST because it's a catch-all route
 * that will match any path like /highlights/Manga
 */
router.get('/:provider/:id', async (req: Request, res: Response) => {
  try {
    const { provider, id } = req.params;
    const useCache = req.query.cache !== 'false';
    
    const manga = await getMangaFromProvider(provider, id, useCache);
    
    res.json({
      success: true,
      data: manga,
    });
  } catch (error) {
    console.error('[API] Error fetching manga:', error);
    
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: err.message || 'Failed to fetch manga',
    });
  }
});

export default router;

