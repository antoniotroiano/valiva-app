import { createContext, useContext, type ReactNode } from 'react';

/**
 * What the app shell adds to a page head: the active person (shown in the heading of building-block
 * pages), the one person switcher (tabs) and an optional note shown under the heading (values shared by
 * all persons). Pages without person context get neither.
 */
export type PageHeadValue = { person?: string; switcher?: ReactNode; note?: ReactNode };

const PageHeadContext = createContext<PageHeadValue>({});

export const PageHeadProvider = PageHeadContext.Provider;
export const usePageHead = () => useContext(PageHeadContext);
