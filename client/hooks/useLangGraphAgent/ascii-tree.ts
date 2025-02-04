import { Checkpoint } from "./types";

interface TreeNode {
  id: string;
  next?: string;
  state?: any;
  children: TreeNode[];
}

//Helper function for debugging purposes to build a tree from a list of checkpoints.
function buildTree<TAgentState, TInterruptValue>(checkpoints: Checkpoint<TAgentState, TInterruptValue>[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // First create all nodes
  checkpoints.forEach(checkpoint => {
    const id = checkpoint.config.configurable.checkpoint_id;
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        next: checkpoint.next?.[0],
        state: checkpoint.values,
        children: []
      });
    }
  });

  // Then build the tree structure
  checkpoints.forEach(checkpoint => {
    const nodeId = checkpoint.config.configurable.checkpoint_id;
    const parentId = checkpoint.parent_config?.configurable.checkpoint_id;
    const node = nodes.get(nodeId)!;

    if (parentId && nodes.has(parentId)) {
      const parent = nodes.get(parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

interface PrintOptions {
  showState?: boolean;
  renderState?: (state: any) => string;
}

function defaultRenderState(state: any): string {
  const stateStr = JSON.stringify(state);
  if (stateStr.length > 50) {
    return `[${stateStr.substring(0, 47)}...]`;
  }
  return `[${stateStr}]`;
}

function printTreeNode(node: TreeNode, options: PrintOptions = {}, prefix: string = "", isLast: boolean = true): string {
  const connector = isLast ? "└── " : "├── ";
  const childPrefix = isLast ? "    " : "│   ";

  let result = prefix + connector + node.id;
  if (node.next) {
    result += ` → ${node.next}`;
  }
  if (options.showState && node.state) {
    const renderFn = options.renderState || defaultRenderState;
    result += " " + renderFn(node.state);
  }
  result += "\n";

  for (let i = 0; i < node.children.length; i++) {
    result += printTreeNode(
      node.children[i],
      options,
      prefix + childPrefix,
      i === node.children.length - 1
    );
  }

  return result;
}

export function printCheckpointTree<TAgentState, TInterruptValue>(checkpoints: Checkpoint<TAgentState, TInterruptValue>[], options: PrintOptions = {}): string {
  const roots = buildTree(checkpoints);
  let result = "";

  roots.forEach((root, index) => {
    result += printTreeNode(root, options, "", index === roots.length - 1);
  });

  return result;
} 