import { ScriptBranchItem, BranchTreeNode } from '../types';

export class BranchingService {
  private nodesStore: Map<string, Map<string, ScriptBranchItem>> = new Map();

  addBranchNode(
    scriptId: string,
    nodeId: string,
    sceneContent: string,
    parentNodeId?: string,
    choiceLabel?: string
  ): ScriptBranchItem {
    console.log(`[BranchingService] Adding branch node '${nodeId}' to script '${scriptId}' (Parent: '${parentNodeId || 'ROOT'}')`);

    if (!this.nodesStore.has(scriptId)) {
      this.nodesStore.set(scriptId, new Map());
    }

    const scriptNodes = this.nodesStore.get(scriptId)!;

    const item: ScriptBranchItem = {
      id: `br-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      scriptId,
      nodeId,
      parentNodeId,
      choiceLabel,
      sceneContent,
      childNodeIds: []
    };

    scriptNodes.set(nodeId, item);

    if (parentNodeId && scriptNodes.has(parentNodeId)) {
      const parent = scriptNodes.get(parentNodeId)!;
      if (!parent.childNodeIds.includes(nodeId)) {
        parent.childNodeIds.push(nodeId);
      }
    }

    return item;
  }

  getBranchTree(scriptId: string, rootNodeId = 'root'): BranchTreeNode | null {
    const scriptNodes = this.nodesStore.get(scriptId);
    if (!scriptNodes || !scriptNodes.has(rootNodeId)) {
      return null;
    }

    return this.buildTreeNode(scriptNodes, rootNodeId);
  }

  traversePath(scriptId: string, nodeIds: string[]): ScriptBranchItem[] {
    const scriptNodes = this.nodesStore.get(scriptId);
    if (!scriptNodes) {
      return [];
    }

    const result: ScriptBranchItem[] = [];
    for (const id of nodeIds) {
      if (scriptNodes.has(id)) {
        result.push(scriptNodes.get(id)!);
      }
    }

    return result;
  }

  countLeafEndings(scriptId: string): number {
    const scriptNodes = this.nodesStore.get(scriptId);
    if (!scriptNodes) {
      return 0;
    }

    let leafCount = 0;
    for (const node of scriptNodes.values()) {
      if (node.childNodeIds.length === 0) {
        leafCount++;
      }
    }

    return leafCount;
  }

  private buildTreeNode(nodesMap: Map<string, ScriptBranchItem>, nodeId: string): BranchTreeNode {
    const node = nodesMap.get(nodeId)!;
    const children = node.childNodeIds
      .filter(childId => nodesMap.has(childId))
      .map(childId => this.buildTreeNode(nodesMap, childId));

    return {
      nodeId: node.nodeId,
      choiceLabel: node.choiceLabel,
      sceneContent: node.sceneContent,
      children
    };
  }
}
