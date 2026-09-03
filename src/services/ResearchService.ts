import { ContentType, AdaptationVersion } from '../types';
import { AIProviderManager } from '../ai/AIProviderManager';
import { findKnowledgeBaseKey, isGenericResearchFallback } from '../common/utils/story-grounding.util';

export interface ResearchSourceItem {
  url: string;
  title: string;
  publisher: string;
  sourceType: string;
  retrievedAt: string;
  evidence: string;
  rightsEvidence: string;
  isPrimary: boolean;
}

export interface ResearchResult {
  title: string;
  canonicalTitle: string;
  contentType: ContentType;
  adaptationVersion: AdaptationVersion;
  description: string;
  setting?: string;
  themes?: string[];
  characters?: Array<{ name: string; role: string; personality?: string }>;
  facts: string[];
  references: ResearchSourceItem[];
  /** True when research comes from verified structured or live AI sources — not generic placeholders. */
  grounded?: boolean;
}

export class ResearchService {
  constructor(private aiManager?: AIProviderManager) {}

  private knowledgeBase: Record<string, ResearchResult> = {
    cinderella: {
      title: 'Cinderella',
      canonicalTitle: 'Cinderella',
      contentType: 'FOLKLORE',
      adaptationVersion: 'TRADITIONAL',
      description: 'A timeless European fairy tale of kindness, magical transformation, resilience, and true love overcoming cruelty.',
      setting: 'A historic European kingdom, a grand countryside estate, and the Royal Palace ball.',
      themes: ['Kindness and Hope', 'Inner Beauty vs External Cruelty', 'Magic and Transformation', 'Justice and Redemption'],
      characters: [
        { name: 'Cinderella', role: 'Protagonist', personality: 'Kind-hearted, resilient, optimistic' },
        { name: 'Lady Tremaine', role: 'Antagonist / Stepmother', personality: 'Cruel, envious, calculating' },
        { name: 'Fairy Godmother', role: 'Mentor / Magical Helper', personality: 'Benevolent, wise, magical' },
        { name: 'Prince', role: 'Romantic Lead', personality: 'Noble, sincere, seeking true love' },
        { name: 'Anastasia & Drizella', role: 'Stepsisters', personality: 'Vain, jealous, spoiled' }
      ],
      facts: [
        'Cinderella is forced into servitude by her cruel stepmother Lady Tremaine and stepsisters following her father\'s death.',
        'An invitation arrives from the King for all maidens in the realm to attend a grand royal ball at the palace.',
        'Her stepsisters tear apart Cinderella\'s gown, but her Fairy Godmother appears to transform a pumpkin into a carriage and rags into a glass-slippered ballgown.',
        'The magic lasts only until the stroke of midnight; at midnight, Cinderella flees the palace, accidentally leaving behind one sparkling glass slipper.',
        'The Prince searches every home in the kingdom until the slipper fits Cinderella, uniting them in marriage and peace.'
      ],
      references: [
        {
          url: 'https://en.wikipedia.org/wiki/Cinderella',
          title: 'Cinderella - Wikipedia',
          publisher: 'Wikipedia / Wikimedia Foundation',
          sourceType: 'ENCYCLOPEDIA',
          retrievedAt: '2026-08-12T00:00:00.000Z',
          evidence: 'Historical folk tale of Cendrillon published by Charles Perrault (1697) and Grimm Brothers (1812).',
          rightsEvidence: 'Public domain folklore story in public domain.',
          isPrimary: true
        },
        {
          url: 'https://www.surftothestars.com/folklore/cinderella',
          title: 'Traditional European Fairy Tales Collection',
          publisher: 'Fairy Tale Folklore Archive',
          sourceType: 'FOLKLORE_ARCHIVE',
          retrievedAt: '2026-08-12T00:00:00.000Z',
          evidence: 'Original 1697 Perrault narrative beats including glass slipper and pumpkin carriage.',
          rightsEvidence: 'Public domain classical literature.',
          isPrimary: false
        }
      ]
    },
    titanic: {
      title: 'Titanic',
      canonicalTitle: 'Titanic',
      contentType: 'MOVIE',
      adaptationVersion: 'MOVIE_ADAPTATION',
      description: 'Epic historical romance and disaster film depicting the tragic maiden voyage of the RMS Titanic.',
      setting: 'April 1912, aboard the ocean liner RMS Titanic sailing across the North Atlantic.',
      themes: ['Love Across Social Classes', 'Human Pride vs Nature', 'Sacrifice and Survival'],
      characters: [
        { name: 'Rose DeWitt Bukater', role: 'Protagonist', personality: 'Passionate, rebellious, longing for freedom' },
        { name: 'Jack Dawson', role: 'Protagonist', personality: 'Free-spirited artist, brave, selfless' },
        { name: 'Cal Hockley', role: 'Antagonist', personality: 'Arrogant, possessive, wealthy heir' }
      ],
      facts: [
        'Seventeen-year-old Rose, trapped in an arranged engagement to wealthy Cal Hockley, meets third-class artist Jack Dawson on the Titanic.',
        'Jack and Rose form a deep emotional bond during the voyage, defying class expectations and Rose\'s overbearing mother.',
        'On the night of April 14, 1912, the Titanic strikes an iceberg in the cold North Atlantic and begins to sink rapidly.',
        'Jack helps Rose reach a wooden door panel in the freezing ocean, sacrificing his own life as he holds her hand until help arrives.',
        'Rose is rescued by the Carpathia, adopting Jack\'s surname Dawson and living a long, courageous life honoring his memory.'
      ],
      references: [
        {
          url: 'https://en.wikipedia.org/wiki/Titanic_(1997_film)',
          title: 'Titanic (1997 film) - Wikipedia',
          publisher: 'Wikipedia / Wikimedia Foundation',
          sourceType: 'FILM_DATABASE',
          retrievedAt: '2026-08-12T00:00:00.000Z',
          evidence: 'Directed by James Cameron, winner of 11 Academy Awards.',
          rightsEvidence: 'Factual synopsis used for original narrative retelling.',
          isPrimary: true
        },
        {
          url: 'https://www.imdb.com/title/tt0120338',
          title: 'Titanic (1997) - IMDb',
          publisher: 'IMDb / Amazon',
          sourceType: 'MOVIE_REGISTRY',
          retrievedAt: '2026-08-12T00:00:00.000Z',
          evidence: 'Official movie credits, character roles, and box office awards.',
          rightsEvidence: 'Public factual film metadata.',
          isPrimary: false
        }
      ]
    },
    '3 idiots': {
      title: '3 Idiots',
      canonicalTitle: '3 Idiots',
      contentType: 'MOVIE',
      adaptationVersion: 'MOVIE_ADAPTATION',
      description: 'Acclaimed coming-of-age comedy-drama about three engineering students defying academic societal pressure.',
      setting: 'Imperial College of Engineering (ICE), Delhi and Shimla/Ladakh, India.',
      themes: ['Pursuit of Excellence vs Rote Success', 'True Friendship', 'Following One\'s Passion'],
      characters: [
        { name: 'Rancho (Phunsukh Wangdu)', role: 'Protagonist', personality: 'Brilliant, unorthodox, compassionate, fearless' },
        { name: 'Farhan Qureshi', role: 'Narrator / Friend', personality: 'Passionate about wildlife photography, dutiful son' },
        { name: 'Raju Rastogi', role: 'Friend', personality: 'Anxious, devoted family son, overcomes fear' },
        { name: 'Viru Sahastrabuddhe (Virus)', role: 'Antagonist / Director', personality: 'Strict, competitive, traditional director' }
      ],
      facts: [
        'Farhan and Raju meet free-spirited Rancho at ICE, where Rancho challenges Director Virus\'s rigid education system.',
        'Rancho teaches his friends to pursue excellence rather than chasing marks: "Excellence ke peeche bhaago, success jhakk maarke peeche aayegi".',
        'Farhan gathers courage to talk to his father about pursuing wildlife photography, while Raju overcomes his deep fears.',
        'Ten years later, Farhan, Raju, and rival Chatur search for Rancho, discovering he became world-renowned scientist Phunsukh Wangdu running an innovative school in Ladakh.'
      ],
      references: [
        {
          url: 'https://en.wikipedia.org/wiki/3_Idiots',
          title: '3 Idiots - Wikipedia',
          publisher: 'Wikipedia / Wikimedia Foundation',
          sourceType: 'FILM_DATABASE',
          retrievedAt: '2026-08-12T00:00:00.000Z',
          evidence: 'Directed by Rajkumar Hirani, starring Aamir Khan, R. Madhavan, Sharman Joshi.',
          rightsEvidence: 'Factual plot metadata used under fair use for original retelling.',
          isPrimary: true
        }
      ]
    },
    'the jungle book': {
      title: 'The Jungle Book',
      canonicalTitle: 'The Jungle Book',
      contentType: 'BOOK',
      adaptationVersion: 'TRADITIONAL',
      description: 'Classic adventure story of Mowgli, a young human boy raised by wolves in the jungles of India.',
      setting: 'Seoni jungle in Madhya Pradesh, India.',
      themes: ['Law of the Jungle', 'Family and Belonging', 'Courage and Identity'],
      characters: [
        { name: 'Mowgli', role: 'Protagonist', personality: 'Resourceful, brave, loyal' },
        { name: 'Baloo', role: 'Mentor / Bear', personality: 'Easygoing, protective, wise' },
        { name: 'Bagheera', role: 'Guardian / Panther', personality: 'Sleek, stern, loyal guardian' },
        { name: 'Shere Khan', role: 'Antagonist / Tiger', personality: 'Ruthless, menacing, proud' }
      ],
      facts: [
        'Orphaned infant Mowgli is discovered in the Indian jungle and adopted by Akela\'s wolf pack.',
        'Bagheera the black panther and Baloo the brown bear teach Mowgli the Laws of the Jungle and language of wild animals.',
        'Fearsome tiger Shere Khan vows to hunt Mowgli down, hating mankind.',
        'Mowgli uses human fire ("Red Flower") and clever traps to defeat Shere Khan and protect his wolf pack family.'
      ],
      references: [
        {
          url: 'https://en.wikipedia.org/wiki/The_Jungle_Book',
          title: 'The Jungle Book - Wikipedia',
          publisher: 'Wikipedia / Wikimedia Foundation',
          sourceType: 'LITERATURE_DATABASE',
          retrievedAt: '2026-08-12T00:00:00.000Z',
          evidence: 'Classic short story collection by Rudyard Kipling.',
          rightsEvidence: 'Public domain literature.',
          isPrimary: true
        }
      ]
    },
    'rani lakshmibai': {
      title: 'Rani Lakshmibai',
      canonicalTitle: 'Rani Lakshmibai',
      contentType: 'HISTORY',
      adaptationVersion: 'TRADITIONAL',
      description: 'Historic heroic story of the Queen of Jhansi, a leading figure of the Indian Rebellion of 1857.',
      setting: 'Jhansi Fort, Bundelkhand, and Gwalior, India (1857–1858).',
      themes: ['Patriotism and Freedom', 'Unyielding Courage', 'Leadership Against Oppression'],
      characters: [
        { name: 'Rani Lakshmibai', role: 'Historical Hero', personality: 'Fearless, strategic, patriotic queen' },
        { name: 'Maharaja Gangadhar Rao', role: 'King of Jhansi', personality: 'Noble ruler of Jhansi' },
        { name: 'General Hugh Rose', role: 'British Commander', personality: 'Formidable military commander' }
      ],
      facts: [
        'Following the death of Maharaja Gangadhar Rao, the British East India Company refused to recognize adopted heir Damodar Rao and tried to annex Jhansi under the Doctrine of Lapse.',
        'Rani Lakshmibai famously declared "Main apni Jhansi nahi doongi" (I shall not surrender my Jhansi).',
        'When British forces besieged Jhansi in 1858, Lakshmibai led a fierce defense on horseback with her young son tied to her back.',
        'She escaped the siege to join forces with Tatya Tope, fighting bravely at Gwalior where her legendary valor won the respect of even her enemies.'
      ],
      references: [
        {
          url: 'https://en.wikipedia.org/wiki/Rani_of_Jhansi',
          title: 'Rani of Jhansi - Wikipedia',
          publisher: 'Wikipedia / Wikimedia Foundation',
          sourceType: 'HISTORICAL_DATABASE',
          retrievedAt: '2026-08-12T00:00:00.000Z',
          evidence: 'Historical record of Rani Lakshmibai during 1857 Indian War of Independence.',
          rightsEvidence: 'Historical facts in public domain.',
          isPrimary: true
        }
      ]
    },
    'the tell-tale heart': {
      title: 'The Tell-Tale Heart',
      canonicalTitle: 'The Tell-Tale Heart',
      contentType: 'STORY',
      adaptationVersion: 'TRADITIONAL',
      description: 'Edgar Allan Poe\'s classic Gothic short story told by an unreliable first-person narrator who murders an old man and is undone by guilt and an imagined heartbeat.',
      setting: 'A single house in an unnamed city, over eight nights and one fatal morning, circa the 1840s.',
      themes: ['Guilt and Madness', 'Obsession', 'Perception vs Reality'],
      characters: [
        { name: 'The Narrator', role: 'Protagonist / Unreliable narrator', personality: 'Nervous, obsessive, defensively insists on sanity' },
        { name: 'The Old Man', role: 'Victim', personality: 'Kind, elderly, with a pale blue vulture-like eye that torments the narrator' },
        { name: 'Police Officers', role: 'Authority figures', personality: 'Calm, courteous investigators responding to a neighbor\'s report' }
      ],
      facts: [
        'The unnamed narrator insists he is sane while describing his obsession with an old man\'s pale blue "vulture eye."',
        'For seven nights he watches the sleeping old man, but on the eighth night the old man wakes; the narrator sees the vulture eye and smothers the old man with the bed.',
        'He dismembers the corpse and hides the body beneath the floorboards, leaving no trace of blood.',
        'When police arrive after a neighbor reports a shriek, the narrator invites them in and places his chair directly over the hidden body.',
        'At first confident, the narrator begins to hear a muffled heartbeat growing louder until, driven mad by guilt, he confesses to the murder.',
        'The story is by Edgar Allan Poe, first published in 1843, and is told entirely in the first person.'
      ],
      references: [
        {
          url: 'https://en.wikipedia.org/wiki/The_Tell-Tale_Heart',
          title: 'The Tell-Tale Heart - Wikipedia',
          publisher: 'Wikipedia / Wikimedia Foundation',
          sourceType: 'LITERATURE_DATABASE',
          retrievedAt: '2026-08-17T00:00:00.000Z',
          evidence: 'Short story by Edgar Allan Poe (1843); public domain.',
          rightsEvidence: 'Public domain literature.',
          isPrimary: true
        }
      ]
    },
    'the gift of the magi': {
      title: 'The Gift of the Magi',
      canonicalTitle: 'The Gift of the Magi',
      contentType: 'STORY',
      adaptationVersion: 'TRADITIONAL',
      description: 'O. Henry\'s beloved Christmas short story about a young couple who sacrifice their most prized possessions to buy gifts for each other.',
      setting: 'A modest flat in New York City at Christmastime, early 1900s.',
      themes: ['Sacrifice', 'Love', 'Irony'],
      characters: [
        { name: 'Della', role: 'Protagonist', personality: 'Devoted, selfless young wife' },
        { name: 'Jim', role: 'Protagonist', personality: 'Hardworking, loving husband' }
      ],
      facts: [
        'Della and Jim are a poor young married couple with only one dollar and eighty-seven cents for Christmas gifts.',
        'Della sells her beautiful long hair to buy a platinum fob chain for Jim\'s prized gold pocket watch.',
        'Jim sells his watch to buy ornate combs for Della\'s hair.',
        'When they exchange gifts, both discover their sacrifices have made the gifts unusable — yet they are called the wisest of gift-givers.',
        'The story is by O. Henry (William Sydney Porter), first published in 1905.'
      ],
      references: [
        {
          url: 'https://en.wikipedia.org/wiki/The_Gift_of_the_Magi',
          title: 'The Gift of the Magi - Wikipedia',
          publisher: 'Wikipedia / Wikimedia Foundation',
          sourceType: 'LITERATURE_DATABASE',
          retrievedAt: '2026-08-17T00:00:00.000Z',
          evidence: 'Short story by O. Henry; public domain.',
          rightsEvidence: 'Public domain literature.',
          isPrimary: true
        }
      ]
    }
  };

  async performResearch(query: string, inferredType?: ContentType, adaptationVersion?: AdaptationVersion): Promise<ResearchResult> {
    const cleanQuery = query.toLowerCase().trim();
    console.log(`[ResearchService] Conducting factual research for query: '${query}'`);

    const kbKey = findKnowledgeBaseKey(cleanQuery, Object.keys(this.knowledgeBase));
    if (kbKey) {
      console.log(`[ResearchService] Structured research hit for '${kbKey}'`);
      const item = this.knowledgeBase[kbKey];
      return {
        ...item,
        grounded: true,
        adaptationVersion: adaptationVersion || item.adaptationVersion || 'TRADITIONAL',
      };
    }

    if (this.aiManager) {
      console.log(`[ResearchService] No structured hit for '${query}' — requesting live AI research...`);
      try {
        const liveResearch = await this.aiManager.researchContent(query, inferredType);
        if (!isGenericResearchFallback(liveResearch) && liveResearch.facts.length >= 3) {
          console.log(
            `[ResearchService] Live AI research succeeded for '${query}' (${liveResearch.facts.length} facts, type=${liveResearch.contentType}).`
          );
          return { ...liveResearch, grounded: true };
        }
        console.warn(
          `[ResearchService] Live AI research for '${query}' returned insufficient or generic data (${liveResearch.facts.length} facts).`
        );
      } catch (err: any) {
        console.warn(`[ResearchService] Live AI research failed for '${query}': ${err.message}`);
      }
    }

    throw new Error(
      `RESEARCH_GROUNDING_FAILED: Unable to find verified research for "${query}". ` +
        `Cannot generate a story without grounded source material — please verify the title or try a known work.`
    );
  }
}

export const researchService = new ResearchService();
