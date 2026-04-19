import { createLogger } from '@src/background/log';
import type { BuildDomTreeArgs, RawDomTreeNode } from './raw_types';
import { type DOMState, DOMElementNode } from './views';

import { isNewTabPage } from '../util';
import { DomService } from './domService';
import type { Page as PuppeteerPage, CDPSession as PuppeteerCDPSession } from 'puppeteer-core';
const logger = createLogger('DOMService');

/** Page 的主 CDP 客户端；公开类型不含 `_client`，扩展里也不能用 `createCDPSession()` */
function getPuppeteerPageMainClient(page: PuppeteerPage | null | undefined): PuppeteerCDPSession | null {
  if (page == null) {
    return null;
  }
  const client = (page as unknown as { _client?: () => PuppeteerCDPSession })._client?.();
  return client ?? null;
}

export interface ReadabilityResult {
  title: string;
  content: string;
  textContent: string;
  length: number;
  excerpt: string;
  byline: string;
  dir: string;
  siteName: string;
  lang: string;
  publishedTime: string;
}

export interface FrameInfo {
  frameId: number;
  computedHeight: number;
  computedWidth: number;
  href: string | null;
  name: string | null;
  title: string | null;
}

declare global {
  interface Window {
    buildDomTree: (args: BuildDomTreeArgs) => RawDomTreeNode | null;
    turn2Markdown: (selector?: string) => string;
    parserReadability: () => ReadabilityResult | null;
  }
}

/**
 * Get the markdown content for the current page.
 * @param tabId - The ID of the tab to get the markdown content for.
 * @param selector - The selector to get the markdown content for. If not provided, the body of the entire page will be converted to markdown.
 * @returns The markdown content for the selected element on the current page.
 */
export async function getMarkdownContent(tabId: number, selector?: string): Promise<string> {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: sel => {
      return window.turn2Markdown(sel);
    },
    args: [selector || ''], // Pass the selector as an argument
  });

  const result = results[0]?.result;
  if (!result) {
    throw new Error('Failed to get markdown content');
  }
  return result as string;
}

/**
 * Get the readability content for the current page.
 * @param tabId - The ID of the tab to get the readability content for.
 * @returns The readability content for the current page.
 */
export async function getReadabilityContent(tabId: number): Promise<ReadabilityResult> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      return window.parserReadability();
    },
  });
  const result = results[0]?.result;
  if (!result) {
    throw new Error('Failed to get readability content');
  }
  return result as ReadabilityResult;
}

/**
 * Get the clickable elements for the current page.
 * @param tabId - The ID of the tab to get the clickable elements for.
 * @param url - The URL of the page.
 * @param showHighlightElements - Whether to show the highlight elements.
 * @param focusElement - The element to focus on.
 * @param viewportExpansion - The viewport expansion to use.
 * @returns A DOMState object containing the clickable elements for the current page.
 */
export async function getClickableElements(
  tabId: number,
  url: string,
  focusElement = -1,
  viewportExpansion = 0,
  debugMode = false,
  page?: PuppeteerPage,
): Promise<DOMState> {
  const cdpSession = getPuppeteerPageMainClient(page);
  if (!cdpSession) {
    throw new Error('Failed to get CDP session (page missing or not connected)');
  }

  const [elementTree, selectorMap] = await _buildDomTree(
    tabId,
    url,
    focusElement,
    viewportExpansion,
    debugMode,
    cdpSession,
    page,
  );

  logger.debug('getClickableElements done', {
    selectorMapSize: selectorMap.size,
    elementTreeTagName: elementTree.tagName,
  });

  return { elementTree, selectorMap };
}

async function _buildDomTree(
  tabId: number,
  url: string,

  focusElement = -1,
  viewportExpansion = 0,
  debugMode = false,
  cdpSession?: PuppeteerCDPSession,
  page?: PuppeteerPage,
): Promise<[DOMElementNode, Map<number, DOMElementNode>]> {
  if (!cdpSession || !page) {
    throw new Error('Failed to create CDP session or page');
  }

  // If URL is provided and it's about:blank, return a minimal DOM tree
  if (isNewTabPage(url) || url.startsWith('chrome://')) {
    const elementTree = new DOMElementNode({
      tagName: 'body',
      xpath: '',
      attributes: {},
      children: [],
      isVisible: false,
      isInteractive: false,
      isTopElement: false,
      isInViewport: false,
      parent: null,
    });
    return [elementTree, new Map<number, DOMElementNode>()];
  }

  const domService = new DomService();
  const [serializedDomState, enhancedDomTree, timingInfo] = await domService.getSerializedDomTree(
    page,
    cdpSession,
    tabId.toString(),
  );

  return _constructDomTree(mainFramePage);
}

export async function getScrollInfo(tabId: number): Promise<[number, number, number]> {
  const results = await chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const scrollY = window.scrollY;
      const visualViewportHeight = window.visualViewport?.height || window.innerHeight;
      const scrollHeight = document.body.scrollHeight;
      return {
        scrollY: scrollY,
        visualViewportHeight: visualViewportHeight,
        scrollHeight: scrollHeight,
      };
    },
  });

  const result = results[0]?.result;
  if (!result) {
    throw new Error('Failed to get scroll information');
  }
  return [result.scrollY, result.visualViewportHeight, result.scrollHeight];
}
