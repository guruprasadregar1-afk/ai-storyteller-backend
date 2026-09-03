import { TTSProviderFactory } from './src/services/tts/TTSProviderFactory';
import { DevelopmentTTSProvider } from './src/services/tts/DevelopmentTTSProvider';
import { ElevenLabsTTSProvider } from './src/services/tts/ElevenLabsTTSProvider';
import { GoogleCloudTTSProvider } from './src/services/tts/GoogleCloudTTSProvider';
import { emotionAnalysisService } from './src/services/EmotionAnalysisService';
import { storyAudioService } from './src/services/StoryAudioService';

async function runRealityCheck() {
  console.log('====================================================');
  console.log('      PHASE 1 REALITY CHECK — TTS RUNTIME AUDIT      ');
  console.log('====================================================\n');

  // 1. Audit active TTS provider
  const activeProvider = await TTSProviderFactory.getProvider();
  console.log(`[Runtime Trace] Active Runtime Provider: '${activeProvider.name}'`);

  const devProvider = new DevelopmentTTSProvider();
  const elevenProvider = new ElevenLabsTTSProvider();
  const googleProvider = new GoogleCloudTTSProvider();

  console.log('\n--- 1. PROVIDER AUDIT TABLE ---');
  console.log(`Development Provider Available: ${await devProvider.isAvailable()}`);
  console.log(`ElevenLabs Provider Available: ${await elevenProvider.isAvailable()} (ELEVENLABS_API_KEY)`);
  console.log(`Google Cloud Provider Available: ${await googleProvider.isAvailable()} (GOOGLE_TTS_API_KEY)`);

  // 2. Audit Capabilities
  console.log('\n--- 2. ACTIVE PROVIDER CAPABILITY REPORT ---');
  const caps = activeProvider.getCapabilities();
  console.log(JSON.stringify({
    provider: activeProvider.name,
    isDevelopmentMock: activeProvider.name === 'development-tts',
    isProductionEngine: activeProvider.name !== 'development-tts',
    capabilities: caps
  }, null, 2));

  // 3. Emotion parameters flow trace
  console.log('\n--- 3. EMOTION & PROSODY RUNTIME PARAMETER TRACE ---');
  const sampleScript = `In a prosperous kingdom, Cinderella lived in peace.
Tragedy struck when her mother passed away in deep sadness and heartbreak.
Fairy Godmother stepped out with a magical wave of her shining wand!
With sudden terror, the clock struck midnight and Cinderella ran away!
The glass slipper fitted her foot in glorious triumph!`;

  const emotionMap = emotionAnalysisService.analyzeStoryEmotions('cinderella-reality-check', sampleScript, 'en');

  console.log('Synthesizing audio record with emotion segments...');
  const audioRecord = await storyAudioService.generateNarrationAudio(
    'cinderella-reality-check',
    sampleScript,
    { voiceName: 'Warm Female Storyteller', genderPresentation: 'FEMALE', style: 'Fairy Tale Storyteller' } as any,
    emotionMap,
    'en'
  );

  console.log('\n--- 4. SYNTHESIZED AUDIO RECORD AUDIT ---');
  console.log(JSON.stringify({
    scriptId: audioRecord.storyScriptId,
    provider: audioRecord.provider,
    voiceId: audioRecord.voiceId,
    voiceName: audioRecord.voiceName,
    language: audioRecord.language,
    duration: `${audioRecord.duration}s`,
    format: audioRecord.format,
    emotionAware: audioRecord.emotionAware,
    audioUrl: audioRecord.audioUrl
  }, null, 2));

  console.log('\n====================================================');
  console.log('       REALITY CHECK COMPLETED SUCCESSFULLY          ');
  console.log('====================================================');
}

runRealityCheck().catch(console.error);
