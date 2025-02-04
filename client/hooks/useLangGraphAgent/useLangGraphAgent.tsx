import { useState } from 'react';
import {
  Checkpoint,
  Interrupt,
  AppCheckpoint,
  RunAgentInput,
  ResumeAgentInput,
  ForkAgentInput,
  ReplayAgentInput,
  RunAgentInputInternal,
  ResumeAgentInputInternal,
  ForkAgentInputInternal,
  ReplayAgentInputInternal,
  AgentStatus,
  ToolCall,
  WithMessages,
  NodeMessageChunk,
} from './types';
import { callAgentRoute } from './api';
import { getHistory, stopAgent } from './actions';

interface UseAgentStateCallbacks<TAgentState extends object | WithMessages, TInterruptValue> {
  /** Callback for when a checkpoint starts.*/
  onCheckpointStart?: (checkpoint: AppCheckpoint<TAgentState, TInterruptValue>) => void;
  /** Callback for when a checkpoint ends. */
  onCheckpointEnd?: (checkpoint: AppCheckpoint<TAgentState, TInterruptValue>) => void;
  /** Callback for when a checkpoint intermediate state is updated. It can happen in if the custom event in the node is called. */
  onCheckpointStateUpdate?: (checkpoint: AppCheckpoint<TAgentState, TInterruptValue>) => void;
}

// Singleton cache that persists across page navigations
// Enable if needed
const historyCache = new Map<string, Checkpoint<any, any>[]>();
const enableRestoreCache = false;

/**
 * Hook to manage agent state and execution.
 * @template TAgentState - Type of agent state. Can be any object or an object implementing {@link WithMessages} interface.
 *                        If the state has 'messages' property, it will be used for message processing.
 * @template TInterruptValue - Type of value used when agent execution is interrupted (usually several types of interruptions are possible).
 * @template TResumeValue - Type of value used when resuming agent execution (usually several types of resumes are possible).
 * @param callbacks - Optional callbacks for checkpoint lifecycle events (see {@link UseAgentStateCallbacks}).
 */
export function useLangGraphAgent<TAgentState extends object | WithMessages, TInterruptValue, TResumeValue>(
  callbacks?: UseAgentStateCallbacks<TAgentState, TInterruptValue>
) {
  const { onCheckpointStart, onCheckpointEnd, onCheckpointStateUpdate } = callbacks ?? {};

  const [status, setStatus] = useState<AgentStatus>('idle');
  const [restoring, setRestoring] = useState(false);
  const [appCheckpoints, setAppCheckpoints] = useState<AppCheckpoint<TAgentState, TInterruptValue>[]>([]);


  /**
   * Run the agent.
   * @param agentInput - Input configuration for running the agent (see {@link RunAgentInput}).
   */
  async function run(agentInput: RunAgentInput<TAgentState>) {
    await callAgent({ type: "run", ...agentInput });
  }

  /**
   * Resume the agent. Action should be called after the agent has been interrupted.
   * @param agentInput - Input configuration for resuming the agent (see {@link ResumeAgentInput}).
   */
  async function resume(agentInput: ResumeAgentInput<TResumeValue>) {
    await callAgent({ type: "resume", ...agentInput });
  }

  /**
   * Fork the checkpoint with the updated state.
   * @param agentInput - Input configuration for forking the agent (see {@link ForkAgentInput}).
   */
  async function fork(agentInput: ForkAgentInput<TAgentState>) {
    removeAppCheckpointsAfterCheckpoint(agentInput.config.configurable.checkpoint_id);
    await callAgent({ type: "fork", ...agentInput });
  }

  /**
   * Runs agent from the checkpoint.
   * @param agentInput - Input configuration for replaying the agent (see {@link ReplayAgentInput}).
   */
  async function replay(agentInput: ReplayAgentInput) {
    removeAppCheckpointsAfterCheckpoint(agentInput.config.configurable.checkpoint_id);
    await callAgent({ type: "replay", ...agentInput });
  }

  /**
   * Stops the agent execution. Agent will not stop immediately. It will stop before emitting the last event (see {@link AgentEvent}).
   * @param threadId - The ID of the thread to stop.
   */
  async function stop(threadId: string) {
    try {
      setStatus('stopping');
      await stopAgent(threadId);
    } catch (error) {
      console.error('Error stopping agent:', error);
      setStatus('idle');
    }
  }

  function removeAppCheckpointsAfterCheckpoint(checkpointId: string) {
    const index = appCheckpoints.findIndex(node => node.checkpointConfig.configurable.checkpoint_id === checkpointId);
    if (index !== -1) {
      appCheckpoints.splice(index);
      setAppCheckpoints([...appCheckpoints]);
    }
  }

  async function callAgent(agentInput: RunAgentInputInternal<TAgentState> | ResumeAgentInputInternal<TResumeValue> | ForkAgentInputInternal<TAgentState> | ReplayAgentInputInternal) {
    if (!agentInput.type) {
      throw new Error('Type is required');
    }

    if (!agentInput.thread_id) {
      throw new Error('Thread id is required');
    }

    try {
      setStatus('running');
      // Invalidate cache when agent is called
      historyCache.delete(agentInput.thread_id);

      const messageStream = callAgentRoute<TAgentState, TInterruptValue, TResumeValue>(agentInput);
      for await (const msg of messageStream) {

        if (msg.event === 'checkpoint') {
          processCheckpoint(msg.data as Checkpoint<TAgentState, TInterruptValue>, appCheckpoints);
          setAppCheckpoints([...appCheckpoints]);
        }

        if (msg.event === 'message_chunk') {
          processMessageChunk(msg.data as NodeMessageChunk, appCheckpoints);
          setAppCheckpoints([...appCheckpoints]);
        }

        if (msg.event === 'custom') {
          processCustomEvent(msg.data as Partial<TAgentState>, appCheckpoints);
          setAppCheckpoints([...appCheckpoints]);
        }

        if (msg.event === 'interrupt') {
          processInterrupts(msg.data as Interrupt<TInterruptValue>[], appCheckpoints);
          setAppCheckpoints([...appCheckpoints]);
        }

        if (msg.event === 'error') {
          processError(appCheckpoints);
          setAppCheckpoints([...appCheckpoints]);
        }
      }

      setStatus('idle');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }

  /**
   * Restores the agent state from the checkpoints history.
   * @param threadId - The ID of the thread to restore.
   */
  async function restore(threadId: string) {
    if (!threadId) {
      throw new Error('Thread id is required');
    }

    try {
      setRestoring(true);

      const restoredCheckpoints: AppCheckpoint<TAgentState, TInterruptValue>[] = [];
      let history: Checkpoint<TAgentState, TInterruptValue>[];

      // Try to get history from cache
      const cachedHistory = historyCache.get(threadId);
      if (cachedHistory && enableRestoreCache) {
        console.log("Getting history from cache")
        history = cachedHistory;
      } else {
        history = await getHistory(threadId);
        historyCache.set(threadId, history);
      }

      // History contains all forks of graph execution. We need to restore the last fork.
      const newHistory: Checkpoint<TAgentState, TInterruptValue>[] = [];
      let skipToCheckpointId: string | undefined = undefined;
      for (let i = 0; i < history.length; i++) {
        if (skipToCheckpointId && history[i].config.configurable.checkpoint_id !== skipToCheckpointId) {
          continue;
        }

        newHistory.push(history[i]);
        skipToCheckpointId = history[i].parent_config?.configurable.checkpoint_id;
      }

      for (const checkpoint of newHistory.reverse()) {
        processHistoryCheckpoint(checkpoint, restoredCheckpoints);
      }

      setAppCheckpoints(restoredCheckpoints);
    } catch (error) {
      console.error('Error:', error);
      throw new Error('Error restoring agent');
    } finally {
      setRestoring(false);
    }
  }

  function processHistoryCheckpoint(checkpoint: Checkpoint<TAgentState, TInterruptValue>, appCheckpoints: AppCheckpoint<TAgentState, TInterruptValue>[]) {
    let interruptionInLastCheckpoint = false;

    // Creating checkpoints array from the restored checkpoints.
    // Checkpoint initial state is a checkpoint values before nodes execution.
    // On a new checkpoint, we update the last checkpoint with the checkpoint values.

    // Update the last checkpoint with the latest checkpoint values
    if (appCheckpoints.length > 0) {
      const lastCheckpoint = appCheckpoints[appCheckpoints.length - 1];
      lastCheckpoint.state = deepCopy(checkpoint.values);
      lastCheckpoint.stateDiff = getStateDiff(lastCheckpoint.stateInitial, checkpoint.values);
      updateGraphNodeStateFromMetadata(lastCheckpoint, checkpoint);

      // Delete interrupt if there are further checkpoints to restore.
      // Preserve interrupt for the last checkpoint.
      interruptionInLastCheckpoint = lastCheckpoint.interruptValue !== undefined;
      if (interruptionInLastCheckpoint) {
        lastCheckpoint.interruptValue = undefined;
      }
    }

    // Create a new app checkpoint except for the last checkpoint.
    if (checkpoint.next.length > 0) {
      const newAppCheckpoint = createAppCheckpoint(checkpoint);

      // When restoring checkpoints from graph history, the checkpoint stores interrupts as interrupts property.
      if (checkpoint.interrupts) {
        newAppCheckpoint.interruptValue = checkpoint.interrupts?.[0]?.value; // handle only single interrupt for now
      }
      appCheckpoints.push(newAppCheckpoint);
    }
  }

  function processCheckpoint(checkpoint: Checkpoint<TAgentState, TInterruptValue>, appCheckpoints: AppCheckpoint<TAgentState, TInterruptValue>[]) {
    let interruptionInLastCheckpoint = false;

    // Creating checkpoints array from the restored checkpoints.
    // Checkpoint initial state is a checkpoint values before nodes execution.
    // On a new checkpoint, we update the last checkpoint with the checkpoint values.

    // Update the last checkpoint with the latest checkpoint values
    if (appCheckpoints.length > 0) {
      const lastCheckpoint = appCheckpoints[appCheckpoints.length - 1];
      lastCheckpoint.state = deepCopy(checkpoint.values);
      lastCheckpoint.stateDiff = getStateDiff(lastCheckpoint.stateInitial, checkpoint.values);
      updateGraphNodeStateFromMetadata(lastCheckpoint, checkpoint);


      // Delete interrupt if there are further checkpoints. It means that the interruption was handled.
      // Preserve interrupt for the last checkpoint.
      interruptionInLastCheckpoint = lastCheckpoint.interruptValue !== undefined;
      if (interruptionInLastCheckpoint) {
        lastCheckpoint.interruptValue = undefined;
        onCheckpointEnd?.(lastCheckpoint);
      }
    }

    // Create a new checkpoint except for the last checkpoint. Do not create a new checkpoint if there was an interruption in the last checkpoint.
    if (checkpoint.next.length > 0 && !interruptionInLastCheckpoint) {
      const newCheckpoint = createAppCheckpoint(checkpoint);
      appCheckpoints.push(newCheckpoint);
      onCheckpointStart?.(newCheckpoint);
    }
  }

  function createAppCheckpoint(checkpoint: Checkpoint<TAgentState, TInterruptValue>): AppCheckpoint<TAgentState, TInterruptValue> {
    return {
      nodes: checkpoint.next.map((x, index) => {
        const matchingKey = Object.keys(checkpoint.metadata?.writes ?? {}).find(key => key === x);
        const value = matchingKey ? checkpoint.metadata?.writes?.[matchingKey] : undefined;
        return {
          name: x,
          state: matchingKey
            ? Array.isArray(value)
              ? deepCopy((value as Partial<TAgentState>[])[index] as TAgentState)
              : deepCopy(value as TAgentState)
            : {} as TAgentState
        };
      }),
      stateInitial: deepCopy(checkpoint.values),
      state: deepCopy(checkpoint.values),
      stateDiff: {} as TAgentState,
      checkpointConfig: checkpoint.config,
      error: false
    };
  }

  function updateGraphNodeStateFromMetadata(appCheckpoint: AppCheckpoint<TAgentState, TInterruptValue>, checkpoint: Checkpoint<TAgentState, TInterruptValue>) {
    // Update nodes states with the writes from the checkpoint metadata
    Object.entries(checkpoint.metadata?.writes ?? {}).forEach(([key, value]) => {
      const matchingNodes = appCheckpoint.nodes.filter(node => node.name === key);
      matchingNodes.forEach((node, index) => {
        node.state = Array.isArray(value)
          ? deepCopy((value as Partial<TAgentState>[])[index] as TAgentState)
          : deepCopy(value as TAgentState);
      });
    });
  }

  function processMessageChunk(nodeMessageChunk: NodeMessageChunk, appCheckpoints: AppCheckpoint<TAgentState, TInterruptValue>[]) {
    if (appCheckpoints.length === 0) {
      return;
    }

    const lastCheckpoint = appCheckpoints[appCheckpoints.length - 1];

    // Check if the state has messages property
    if (!('messages' in lastCheckpoint.state)) {
      return;
    }

    const message = lastCheckpoint.state.messages.find((x) => x.id === nodeMessageChunk.message_chunk.id);

    if (message) {
      message.content += nodeMessageChunk.message_chunk.content;
      // TODO: handle tool_call_chunks

      // Update content in matching nodes
      if (nodeMessageChunk.node_name) {
        const matchingNodes = lastCheckpoint.nodes.filter(node => node.name === nodeMessageChunk.node_name);
        matchingNodes.forEach(node => {
          const stateWithMessages = node.state as unknown as WithMessages;
          const nodeMessage = stateWithMessages.messages.find(x => x.id === nodeMessageChunk.message_chunk.id);
          if (nodeMessage) {
            nodeMessage.content += nodeMessageChunk.message_chunk.content;
          }
        });
      }

    } else {
      // When LLM streams input to the tool, tool name is in the first message chunk.
      const toolCalls: ToolCall[] = nodeMessageChunk.message_chunk.tool_call_chunks?.filter(x => x.name).map((x) => ({ name: x.name, args: {}, id: x.id })) as ToolCall[];
      const newMessage = {
        type: "ai" as const,
        content: nodeMessageChunk.message_chunk.content,
        id: nodeMessageChunk.message_chunk.id,
        tool_calls: toolCalls
      };
      lastCheckpoint.state.messages.push(newMessage);

      // Add the message to nodes that match the node message chunk name
      if (nodeMessageChunk.node_name) {
        const matchingNodes = lastCheckpoint.nodes.filter(node => node.name === nodeMessageChunk.node_name);
        matchingNodes.forEach(node => {
          // Since we're already in a context where we know the parent state has messages,
          // we can safely initialize the node state with messages
          const stateWithMessages = node.state as unknown as WithMessages;
          if (!('messages' in node.state)) {
            stateWithMessages.messages = [];
          }
          stateWithMessages.messages.push({ ...newMessage });
          node.state = stateWithMessages as unknown as TAgentState;
        });
      }
    }
  }

  function processCustomEvent(state: Partial<TAgentState>, appCheckpoints: AppCheckpoint<TAgentState, TInterruptValue>[]) {
    if (appCheckpoints.length === 0) {
      return;
    }

    // Update the last checkpoint state. Update only the properties that are in the custom event.
    const lastCheckpoint = appCheckpoints[appCheckpoints.length - 1];
    lastCheckpoint.state = deepCopy({ ...lastCheckpoint.state, ...state }) as TAgentState;

    // Update all child nodes with the same partial state
    lastCheckpoint.nodes.forEach(node => {
      node.state = deepCopy({ ...node.state, ...state }) as TAgentState;
    });

    onCheckpointStateUpdate?.(lastCheckpoint);
  }

  function processInterrupts(interrupts: Interrupt<TInterruptValue>[], appCheckpoints: AppCheckpoint<TAgentState, TInterruptValue>[]) {
    if (appCheckpoints.length === 0) {
      return;
    }

    const lastCheckpoint = appCheckpoints[appCheckpoints.length - 1];
    lastCheckpoint.interruptValue = interrupts[0].value; // handle only single interrupt for now
  }

  function processError(appCheckpoints: AppCheckpoint<TAgentState, TInterruptValue>[]) {
    if (appCheckpoints.length === 0) {
      return;
    }

    const lastCheckpoint = appCheckpoints[appCheckpoints.length - 1];
    lastCheckpoint.error = true;
  }

  function getStateDiff(stateOld: TAgentState, stateNew: TAgentState): TAgentState {
    const diff = {} as TAgentState;

    // Get all keys from old state (structure should be the same in both states)
    const keys = Object.keys(stateOld);

    for (const key of keys) {
      const oldValue = (stateOld as any)[key];
      const newValue = (stateNew as any)[key];

      // Handle arrays - only include new items
      if (Array.isArray(oldValue)) {
        const newItems = newValue.filter((newItem: any) =>
          !oldValue.some((oldItem: any) =>
            JSON.stringify(oldItem) === JSON.stringify(newItem)
          )
        );
        (diff as any)[key] = newItems.length > 0 ? deepCopy(newItems) : [];
        continue;
      }

      // For objects, recursively compute diff
      if (typeof oldValue === 'object' && oldValue !== null) {
        (diff as any)[key] = getStateDiff(oldValue, newValue);
      }
      // For primitive values, include both changed and unchanged
      else {
        (diff as any)[key] = newValue;
      }
    }

    return diff;
  }

  function deepCopy(obj: TAgentState | Partial<TAgentState>) {
    return JSON.parse(JSON.stringify(obj));
  }

  return { status, appCheckpoints, run, resume, fork, replay, restore, stop, restoring };
}
