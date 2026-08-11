import { VoiceService } from '../src/services/VoiceService';

describe('Sprint 6 Backend Test Suite — Voice Synthesis & Multi-Voice Narration (BE-046 to BE-052)', () => {
  let voiceService: VoiceService;

  beforeEach(() => {
    voiceService = new VoiceService();
  });

  test('BE-046: Retrieve curated TTS voice catalog', () => {
    const catalog = voiceService.getVoiceCatalog();
    expect(catalog.length).toBeGreaterThanOrEqual(4);

    const ids = catalog.map(v => v.voiceId);
    expect(ids).toContain('eleven-rachel');
    expect(ids).toContain('eleven-adam');
  });

  test('BE-047: Synthesize single narrator speech audio', async () => {
    const audio = await voiceService.synthesizeSpeech(
      'Once upon a time in a kingdom far away, a hero arose.',
      'eleven-rachel',
      'elevenlabs',
      'Inspiring'
    );

    expect(audio.id).toBeDefined();
    expect(audio.audioUrl).toBeDefined();
    expect(audio.durationSeconds).toBeGreaterThan(0);
    expect(audio.emotion).toBe('Inspiring');
  });

  test('BE-048 & BE-049: Synthesize multi-speaker dialogue audio and sum total duration', async () => {
    const lines = [
      { speaker: 'Heroine', text: 'We must venture beyond the dark mountains.' },
      { speaker: 'Mentor', text: 'Take this ancient amulet for protection.' },
      { speaker: 'Heroine', text: 'Thank you, wise mentor.' }
    ];

    const result = await voiceService.synthesizeMultiSpeakerDialogue(lines);

    expect(result.dialogueAudio.length).toBe(3);
    expect(result.totalDurationSeconds).toBeGreaterThan(0);
    expect(result.dialogueAudio[0].voiceId).toBe('eleven-rachel');
    expect(result.dialogueAudio[1].voiceId).toBe('eleven-antoni');
  });

  test('BE-050: Adjust speed multiplier and scale audio duration', async () => {
    const text = 'This is a long sentence meant to measure audio duration scaling when speed is altered.';
    const normalAudio = await voiceService.synthesizeSpeech(text, 'eleven-rachel', 'elevenlabs', 'Neutral', 1.0);
    const fastAudio = await voiceService.synthesizeSpeech(text, 'eleven-rachel', 'elevenlabs', 'Neutral', 2.0);

    expect(fastAudio.durationSeconds).toBeLessThan(normalAudio.durationSeconds);
  });

  test('BE-051: Resolve speaker names to appropriate TTS catalog voices', () => {
    expect(voiceService.resolveVoiceForSpeaker('Female Protagonist')).toBe('eleven-rachel');
    expect(voiceService.resolveVoiceForSpeaker('Male Captain')).toBe('eleven-adam');
    expect(voiceService.resolveVoiceForSpeaker('Old Wise King')).toBe('eleven-antoni');
  });

  test('BE-052: Return valid audio metadata for short speech clips', async () => {
    const shortAudio = await voiceService.synthesizeSpeech('Hello!');
    expect(shortAudio.durationSeconds).toBeGreaterThanOrEqual(1.5);
  });
});
