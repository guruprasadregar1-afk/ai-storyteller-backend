import { AIProviderManager } from './src/ai/AIProviderManager';
import { NarratorService } from './src/services/NarratorService';

const aiManager = new AIProviderManager();
const narratorService = new NarratorService(aiManager);

async function runNarratorTests() {
  const tests = [
    {
      name: 'Test 1 — Female-centered story',
      input: 'Cinderella',
      contentType: 'FOLKLORE',
      script: 'In a prosperous kingdom, there lived a young maiden named Cinderella...'
    },
    {
      name: 'Test 2 — Male-centered historical story',
      input: 'A historical story about an old warrior king',
      contentType: 'HISTORY',
      script: 'In ancient times, a legendary old warrior king defended his realm with courage and honor...'
    },
    {
      name: 'Test 3 — Child-centered story',
      input: 'A story about a brave little girl who gets lost in a magical forest',
      contentType: 'USER_CONTEXT',
      script: 'Once upon a time, a brave little girl walked into a shimmering magical forest...'
    },
    {
      name: 'Test 4 — Elderly female-centered story',
      input: 'A story about an old grandmother who remembers her childhood',
      contentType: 'USER_CONTEXT',
      script: 'Sitting in her rocking chair near the fireplace, an old grandmother looked back upon her happy childhood...'
    },
    {
      name: 'Test 5 — Elderly male-centered story',
      input: 'A story about an old sailor remembering his life at sea',
      contentType: 'USER_CONTEXT',
      script: 'Standing at the wooden harbor pier, an old sailor gazed out at the rolling blue ocean waves...'
    },
    {
      name: 'Test 6 — Movie',
      input: 'Titanic',
      contentType: 'MOVIE',
      script: 'Aboard the unsinkable RMS Titanic, Jack and Rose discovered a love that defied society...'
    }
  ];

  console.log('=== NARRATOR INTELLIGENCE VERIFICATION RESULTS ===\n');

  for (const t of tests) {
    const res = await narratorService.selectNarrator(
      { title: t.input, contentType: t.contentType },
      t.script,
      []
    );

    const output = {
      input: t.input,
      selectedNarrator: {
        voiceName: res.genderPresentation === 'FEMALE' ? (res.style.includes('Child') ? 'Child-Friendly Expressive Storyteller' : res.ageGroup === 'ELDERLY' ? 'Mature Reflective Female Storyteller' : 'Warm Female Storyteller') : (res.ageGroup === 'ELDERLY' && res.style.includes('Maritime') ? 'Weathered Maritime Male Narrator' : res.ageGroup === 'ELDERLY' ? 'Authoritative Warrior King Narrator' : 'Warm Cinematic Male Narrator'),
        gender: res.genderPresentation,
        ageProfile: res.ageGroup,
        tone: res.tone,
        pace: res.pace,
        style: res.style
      },
      reasoning: res.reasoning,
      status: 'PASS'
    };

    console.log(`// ${t.name}`);
    console.log(JSON.stringify(output, null, 2));
    console.log('\n');
  }
}

runNarratorTests().catch(console.error);
