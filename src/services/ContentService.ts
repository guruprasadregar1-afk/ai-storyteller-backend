import { ContentType, RightsStatus, VerificationStatus } from '../types';
import { prismaService } from '../database/prisma/prisma.service';
import { normalizeContentType } from '../common/utils/content-type.util';

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
    this.seedInitialRecords();
  }

  normalizeTitle(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async analyzeInput(input: string, userHint?: string) {
    const existingContent = await this.findExistingContent(input);

    if (existingContent) {
      return {
        found: true,
        source: existingContent,
        userHint,
      };
    }

    return {
      found: false,
      source: null,
      input,
      userHint,
    };
  }

  async getContentById(id: string): Promise<ContentSourceRecord | null> {
    if (prismaService.isAvailable) {
      try {
        const dbSource = await prismaService.contentSource.findUnique({
          where: { id },
          include: { aliases: true, references: true }
        });
        if (dbSource) {
          return {
            id: dbSource.id,
            title: dbSource.title,
            normalizedTitle: dbSource.normalizedTitle,
            contentType: dbSource.contentType as ContentType,
            description: dbSource.description || undefined,
            rightsStatus: dbSource.rightsStatus as RightsStatus,
            verificationStatus: dbSource.verificationStatus as VerificationStatus,
            lastVerifiedAt: dbSource.lastVerifiedAt,
            aliases: dbSource.aliases.map(a => a.alias),
            references: dbSource.references.map(r => ({ url: r.url, title: r.title, publisher: r.publisher || undefined, evidence: r.evidence, rightsEvidence: r.rightsEvidence || undefined }))
          };
        }
      } catch {
        // Fallback to in-memory
      }
    }

    for (const record of this.inMemoryDb.values()) {
      if (record.id === id) {
        return record;
      }
    }

    return null;
  }

  async findExistingContent(inputTitle: string): Promise<ContentSourceRecord | null> {
    const normalized = this.normalizeTitle(inputTitle);

    // 0. Database First Lookup
    if (prismaService.isAvailable) {
      try {
        const dbSource = await prismaService.contentSource.findFirst({
          where: {
            OR: [
              { normalizedTitle: normalized },
              { aliases: { some: { normalizedAlias: normalized } } }
            ]
          },
          include: { aliases: true, references: true }
        });

        if (dbSource) {
          console.log(`[ContentService] Database hit for normalized title: '${normalized}'`);
          return {
            id: dbSource.id,
            title: dbSource.title,
            normalizedTitle: dbSource.normalizedTitle,
            contentType: dbSource.contentType as ContentType,
            description: dbSource.description || undefined,
            rightsStatus: dbSource.rightsStatus as RightsStatus,
            verificationStatus: dbSource.verificationStatus as VerificationStatus,
            lastVerifiedAt: dbSource.lastVerifiedAt,
            aliases: dbSource.aliases.map(a => a.alias),
            references: dbSource.references.map(r => ({ url: r.url, title: r.title, publisher: r.publisher || undefined, evidence: r.evidence, rightsEvidence: r.rightsEvidence || undefined }))
          };
        }
      } catch {
        // Fallback to in-memory
      }
    }

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

    const normalizedContentType = normalizeContentType(record.contentType);
    const newRecord: ContentSourceRecord = {
      id: existing?.id || `content-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: record.title,
      normalizedTitle,
      contentType: normalizedContentType,
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

    // Persist to Prisma DB
    if (prismaService.isAvailable) {
      try {
        await prismaService.contentSource.upsert({
          where: { normalizedTitle },
          update: {
            title: newRecord.title,
            contentType: newRecord.contentType as any,
            description: newRecord.description,
            rightsStatus: newRecord.rightsStatus as any,
            verificationStatus: 'VERIFIED'
          },
          create: {
            id: newRecord.id,
            title: newRecord.title,
            normalizedTitle: newRecord.normalizedTitle,
            contentType: newRecord.contentType as any,
            description: newRecord.description,
            rightsStatus: newRecord.rightsStatus as any,
            verificationStatus: 'VERIFIED'
          }
        });
      } catch {
        // Fallback to in-memory
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
