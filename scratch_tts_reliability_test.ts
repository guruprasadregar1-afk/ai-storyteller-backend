import { ElevenLabsTTSProvider } from './src/services/tts/ElevenLabsTTSProvider';
import { DefaultTTSProvider } from './src/services/tts/DefaultTTSProvider';
import { storyAudioService } from './src/services/StoryAudioService';
import { AudioValidationService } from './src/services/AudioValidationService';

async function runTTSReliabilitySuite() {
  console.log('====================================================');
  console.log('      CRITICAL TTS RELIABILITY VERIFICATION SUITE   ');
  console.log('====================================================\n');

  // Test 1: Short ElevenLabs Test
  console.log('--- TEST 1: ELEVENLABS SHORT TEST ---');
  const shortText = 'Hello. This is a short audio test for the AI Storyteller.';
  const elevenProvider = new ElevenLabsTTSProvider();
  console.log(`ElevenLabs Provider Available: ${await elevenProvider.isAvailable()}`);

  try {
    const res = await elevenProvider.synthesize({
      text: shortText,
      voiceName: 'Fairy Tale',
      gender: 'FEMALE',
      language: 'en'
    });
    console.log(`ElevenLabs Short Test Result: Provider=${res.provider}, URL=${res.audioUrl}, Duration=${res.duration}s`);
    const val = AudioValidationService.validateAudioRecord(res.audioUrl, res.storagePath, res.duration);
    console.log(`ElevenLabs Validation: isValid=${val.isValid}, size=${val.byteSize} bytes`);
  } catch (err: any) {
    console.warn(`ElevenLabs Short Test (Expected if quota/plan restricted): ${err.message}`);
  }

  // Test 2: Default Fallback TTS Short Test
  console.log('\n--- TEST 2: DEFAULT FALLBACK TTS SHORT TEST ---');
  const defaultProvider = new DefaultTTSProvider();
  const defaultRes = await defaultProvider.synthesize({
    text: shortText,
    voiceName: 'Default Narration',
    language: 'en'
  });

  console.log(`Default Fallback Result: Provider=${defaultRes.provider}, URL=${defaultRes.audioUrl}, Duration=${defaultRes.duration}s`);
  const defaultVal = AudioValidationService.validateAudioRecord(defaultRes.audioUrl, defaultRes.storagePath, defaultRes.duration);
  console.log(`Default Fallback Validation: isValid=${defaultVal.isValid}, size=${defaultVal.byteSize} bytes, format=${defaultVal.format}`);

  if (!defaultVal.isValid) {
    throw new Error('CRITICAL FAILURE: Default Fallback TTS generated invalid audio.');
  }

  // Test 3: Full Story Synthesis & Audio Validation (Titanic)
  console.log('\n--- TEST 3: TITANIC END-TO-END NARRATION SYNTHESIS ---');
  const titanicStory = `In April of 1912, the grand RMS Titanic set sail across the Atlantic.

On board was Rose, a young woman bound by aristocratic expectations, and Jack, a free-spirited artist.

Beneath the starry sky, as the massive vessel glided silently over frozen waters, an unseen iceberg struck the hull.

Panic surged through the corridors as lifeboats lowered into the dark ocean waves.

Jack held Rose tight upon a wooden door frame amidst icy waters, promising that she would survive and live a long, adventurous life.

Decades later, an elderly Rose dropped her blue diamond necklace into the sea, smiling as her memories returned to Jack.`;

  const audioRecord = await storyAudioService.generateNarrationAudio(
    'titanic-reliability-test',
    titanicStory,
    { voiceName: 'Warm Cinematic Male', genderPresentation: 'MALE', style: 'Cinematic' } as any,
    null,
    'en'
  );

  console.log('\n--- TITANIC AUDIO RECORD AUDIT ---');
  console.log(JSON.stringify({
    scriptId: audioRecord.storyScriptId,
    provider: audioRecord.provider,
    voiceId: audioRecord.voiceId,
    voiceName: audioRecord.voiceName,
    language: audioRecord.language,
    duration: `${audioRecord.duration}s`,
    format: audioRecord.format,
    status: audioRecord.status,
    audioUrl: audioRecord.audioUrl,
    storagePath: audioRecord.storagePath
  }, null, 2));

  const finalValidation = AudioValidationService.validateAudioRecord(
    audioRecord.audioUrl,
    audioRecord.storagePath,
    audioRecord.duration
  );
  console.log(`Final Titanic Audio Validation: isValid=${finalValidation.isValid}, size=${finalValidation.byteSize} bytes`);

  if (!finalValidation.isValid) {
    throw new Error('CRITICAL FAILURE: Final Titanic narration audio failed validation.');
  }

  console.log('\n====================================================');
  console.log('    TTS RELIABILITY VERIFICATION SUITE PASSED       ');
  console.log('====================================================');
}

runTTSReliabilitySuite().catch(console.error);
