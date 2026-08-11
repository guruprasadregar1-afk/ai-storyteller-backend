import { SecurityService } from '../src/services/SecurityService';
import { MasterOrchestratorService } from '../src/services/MasterOrchestratorService';
import { ContentService } from '../src/services/ContentService';
import { ScriptService } from '../src/services/ScriptService';
import { SceneService } from '../src/services/SceneService';
import { CharacterService } from '../src/services/CharacterService';
import { ImageService } from '../src/services/ImageService';
import { VoiceService } from '../src/services/VoiceService';
import { AudioService } from '../src/services/AudioService';
import { VideoService } from '../src/services/VideoService';
import { TimelineService } from '../src/services/TimelineService';
import { SubtitleService } from '../src/services/SubtitleService';
import { RenderService } from '../src/services/RenderService';
import { AIProviderManager } from '../src/ai/AIProviderManager';
import { RightsService } from '../src/services/RightsService';
import { ResearchService } from '../src/services/ResearchService';
import { NarratorService } from '../src/services/NarratorService';

describe('Sprint 20 Backend Test Suite — End-to-End Orchestrator, Security & Diagnostics (BE-135 to BE-145)', () => {
  let securityService: SecurityService;
  let masterOrchestrator: MasterOrchestratorService;

  beforeEach(() => {
    securityService = new SecurityService();

    const aiManager = new AIProviderManager();
    const contentService = new ContentService();
    const researchService = new ResearchService();
    const rightsService = new RightsService();
    const scriptService = new ScriptService(aiManager, rightsService);
    const characterService = new CharacterService(aiManager);
    const narratorService = new NarratorService(aiManager);
    const sceneService = new SceneService(aiManager);
    const imageService = new ImageService();
    const voiceService = new VoiceService();
    const audioService = new AudioService();
    const videoService = new VideoService();
    const timelineService = new TimelineService();
    const subtitleService = new SubtitleService();
    const renderService = new RenderService();

    masterOrchestrator = new MasterOrchestratorService(
      contentService,
      scriptService,
      sceneService,
      characterService,
      imageService,
      voiceService,
      audioService,
      videoService,
      timelineService,
      subtitleService,
      renderService
    );
  });

  test('BE-135: Sanitize malicious XSS HTML script tags from user inputs', () => {
    const malicious = '<script>alert("hack")</script><b>Titanic Movie</b>';
    const clean = securityService.sanitizeInput(malicious);

    expect(clean).toBe('Titanic Movie');
  });

  test('BE-136: Enforce API rate limiter window', () => {
    const ip = '192.168.1.50';

    for (let i = 0; i < 5; i++) {
      const res = securityService.checkRateLimit(ip, 5);
      if (i < 5) {
        expect(res.allowed).toBe(true);
      }
    }

    const exceeded = securityService.checkRateLimit(ip, 5);
    expect(exceeded.allowed).toBe(false);
  });

  test('BE-137 & BE-143: Record system audit trail and retrieve log history', () => {
    securityService.logAudit('user-2001', 'CREATE_SCRIPT', '10.0.0.1');
    securityService.logAudit('user-2002', 'EXPORT_VIDEO', '10.0.0.2');

    const logs = securityService.getAuditLogs();
    expect(logs.length).toBe(2);
    expect(logs[0].action).toBe('CREATE_SCRIPT');
  });

  test('BE-138, BE-144 & BE-145: Fetch full system health diagnostic report', () => {
    const diag = securityService.getDiagnostics();

    expect(diag.status).toBe('HEALTHY');
    expect(diag.version).toContain('production');
    expect(diag.activeServices.length).toBeGreaterThan(15);
    expect(diag.memoryUsageMb).toBeGreaterThan(0);
  });

  test('BE-139, BE-140, BE-141 & BE-142: Execute full End-to-End Master Storytelling Pipeline', async () => {
    const pipeline = await masterOrchestrator.runFullProductionPipeline('Rani Lakshmibai', 'HISTORY');

    expect(pipeline.pipelineId).toBeDefined();
    expect(pipeline.status).toBe('COMPLETED');
    expect(pipeline.sceneCount).toBeGreaterThan(0);
    expect(pipeline.audioTrackCount).toBe(3);
    expect(pipeline.renderUrl).toContain('.mp4');
    expect(pipeline.totalDurationMs).toBeGreaterThan(0);
  });
});
