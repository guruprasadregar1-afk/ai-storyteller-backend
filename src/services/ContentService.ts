import { ContentType, RightsStatus, VerificationStatus } from '../types';

export interface ContentSourceRecord {
  id: string;
  title: string;
  normalizedTitle: string;
  contentType: ContentType;
  description?: string;
  rightsStatus: RightsStatus;
  verificationStatus: VerificationStatus;
  lastVerifiedAt: Date;
  aliases: string[];
  references: Array<{ url: string; title: string; publisher?: string; evidence: string; rightsEvidence?: string }>;
}

export class ContentService {
  private inMemoryDb: Map<string, ContentSourceRecord> = new Map();
  private aliasMap: Map<string, string> = new Map();

  constructor() {
    // Seed initial demo records for database-first reuse check
    this.seedInitialRecords();
  }

  normalizeTitle(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async findExistingContent(inputTitle: string): Promise<ContentSourceRecord | null> {
    const normalized = this.normalizeTitle(inputTitle);

    // 1. Exact match lookup
    if (this.inMemoryDb.has(normalized)) {
      console.log(`[ContentService] Exact DB cache hit for normalized title: '${normalized}'`);
      return this.inMemoryDb.get(normalized)!;
    }

    // 2. Alias match lookup
    if (this.aliasMap.has(normalized)) {
      const canonicalKey = this.aliasMap.get(normalized)!;
      console.log(`[ContentService] Alias DB cache hit: '${normalized}' -> '${canonicalKey}'`);
      return this.inMemoryDb.get(canonicalKey) || null;
    }

    // 3. Partial/Semantic search match
    for (const [key, record] of this.inMemoryDb.entries()) {
      if (key.includes(normalized) || normalized.includes(key)) {
        console.log(`[ContentService] Semantic/partial DB hit: '${normalized}' matches '${key}'`);
        return record;
      }
    }

    return null;
  }

  async saveContentRecord(record: {
    title: string;
    contentType: ContentType;
    description?: string;
    rightsStatus?: RightsStatus;
    aliases?: string[];
    references?: Array<{ url: string; title: string; publisher?: string; evidence: string; rightsEvidence?: string }>;
  }): Promise<ContentSourceRecord> {
    const normalizedTitle = this.normalizeTitle(record.title);
    const existing = this.inMemoryDb.get(normalizedTitle);

    const newRecord: ContentSourceRecord = {
      id: existing?.id || `content-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: record.title,
      normalizedTitle,
      contentType: record.contentType,
      description: record.description || `Canonical record for ${record.title}`,
      rightsStatus: record.rightsStatus || 'PUBLIC_DOMAIN',
      verificationStatus: 'VERIFIED',
      lastVerifiedAt: new Date(),
      aliases: record.aliases || [],
      references: record.references || []
    };

    this.inMemoryDb.set(normalizedTitle, newRecord);

    if (record.aliases) {
      for (const alias of record.aliases) {
        const normAlias = this.normalizeTitle(alias);
        this.aliasMap.set(normAlias, normalizedTitle);
      }
    }

    return newRecord;
  }

  private seedInitialRecords() {
    this.saveContentRecord({
      title: '3 Idiots',
      contentType: 'MOVIE',
      description: 'Acclaimed Bollywood movie about three engineering students and societal expectations.',
      rightsStatus: 'LICENSED',
      aliases: ['Three Idiots', '3idiots', '3 Idiots Film'],
      references: [
        {
          url: 'https://en.wikipedia.org/wiki/3_Idiots',
          title: '3 Idiots - Wikipedia',
          publisher: 'Wikipedia',
          evidence: 'Directed by Rajkumar Hirani, starring Aamir Khan, R. Madhavan, Sharman Joshi.',
          rightsEvidence: 'Copyright owned by Vinod Chopra Films. Factual plot metadata permitted.'
        }
      ]
    });

    this.saveContentRecord({
      title: 'Titanic',
      contentType: 'MOVIE',
      description: 'Epic romance and disaster film directed by James Cameron.',
      rightsStatus: 'LICENSED',
      aliases: ['Titanic Movie', 'RMS Titanic Film'],
      references: [
        {
          url: 'https://en.wikipedia.org/wiki/Titanic_(1997_film)',
          title: 'Titanic (1997 film)',
          publisher: 'Wikipedia',
          evidence: 'Starring Leonardo DiCaprio and Kate Winslet as members of different social classes on the ill-fated maiden voyage of the RMS Titanic.',
          rightsEvidence: 'Copyright Paramount / 20th Century Studios. Factual synopsis usage permitted.'
        }
      ]
    });

    this.saveContentRecord({
      title: 'Rani Lakshmibai',
      contentType: 'HISTORY',
      description: 'Historic Queen of Jhansi and prominent leader in the Indian Rebellion of 1857.',
      rightsStatus: 'PUBLIC_DOMAIN',
      aliases: ['Jhansi Ki Rani', 'Queen of Jhansi', 'Lakshmibai'],
      references: [
        {
          url: 'https://en.wikipedia.org/wiki/Rani_of_Jhansi',
          title: 'Rani of Jhansi - Wikipedia',
          publisher: 'Wikipedia',
          evidence: 'Laxmibai, the Rani of Jhansi, was an Indian queen of the Maratha-ruled Jhansi state.',
          rightsEvidence: 'Historical figure and facts in public domain.'
        }
      ]
    });
  }
}
