import { createContext, useContext, type ReactNode } from 'react';

/**
 * What the app shell adds to a page head: the active person (shown in the heading of building-block
 * pages) and the one person switcher (tabs). Pages without person context get neither.
 */
export type PageHeadValue = { person?: string; switcher?: ReactNode };

const PageHeadContext = createContext<PageHeadValue>({});

export const PageHeadProvider = PageHeadContext.Provider;
export const usePageHead = () => useContext(PageHeadContext);
