export class WebSearchService {
  async searchWeb(query: string) {
    console.log(`[WebSearchService] Executing web search query: '${query}'`);
    return [
      { title: `Historical source for ${query}`, snippet: `Historical facts and context regarding ${query}` }
    ];
  }
}
