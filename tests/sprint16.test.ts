import { BranchingService } from '../src/services/BranchingService';

describe('Sprint 16 Backend Test Suite — Interactive Story Branching (BE-111 to BE-116)', () => {
  let branchingService: BranchingService;

  beforeEach(() => {
    branchingService = new BranchingService();
  });

  test('BE-111, BE-112 & BE-113: Build interactive decision tree graph', () => {
    const scriptId = 'script-1601';

    branchingService.addBranchNode(scriptId, 'root', 'Hero stands at the crossroads.');
    branchingService.addBranchNode(scriptId, 'node-left', 'Hero enters the dark forest.', 'root', 'Go Left');
    branchingService.addBranchNode(scriptId, 'node-right', 'Hero crosses the golden bridge.', 'root', 'Go Right');

    const tree = branchingService.getBranchTree(scriptId, 'root');

    expect(tree).not.toBeNull();
    expect(tree?.nodeId).toBe('root');
    expect(tree?.children.length).toBe(2);
    expect(tree?.children[0].choiceLabel).toBe('Go Left');
    expect(tree?.children[1].choiceLabel).toBe('Go Right');
  });

  test('BE-114: Traverse user choice path sequence', () => {
    const scriptId = 'script-1602';

    branchingService.addBranchNode(scriptId, 'n1', 'Start of journey');
    branchingService.addBranchNode(scriptId, 'n2', 'Chosen path A', 'n1', 'Path A');
    branchingService.addBranchNode(scriptId, 'n3', 'Final destination A', 'n2', 'Ending');

    const path = branchingService.traversePath(scriptId, ['n1', 'n2', 'n3']);

    expect(path.length).toBe(3);
    expect(path[0].nodeId).toBe('n1');
    expect(path[2].sceneContent).toBe('Final destination A');
  });

  test('BE-115: Count leaf ending outcomes in interactive script graph', () => {
    const scriptId = 'script-1603';

    branchingService.addBranchNode(scriptId, 'root', 'Start');
    branchingService.addBranchNode(scriptId, 'b1', 'Branch 1', 'root', 'Choice 1');
    branchingService.addBranchNode(scriptId, 'b2', 'Branch 2', 'root', 'Choice 2');

    const leaves = branchingService.countLeafEndings(scriptId);
    expect(leaves).toBe(2);
  });

  test('BE-116: Return null for non-existent branch tree root', () => {
    const tree = branchingService.getBranchTree('script-invalid-999', 'root');
    expect(tree).toBeNull();
  });
});
