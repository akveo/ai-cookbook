import {
  AgentEvent,
  RunAgentInputInternal,
  ResumeAgentInputInternal,
  ReplayAgentInputInternal,
  ForkAgentInputInternal
} from './types';

function parseSSEMessage<TAgentState, TInterruptValue>(chunk: string): AgentEvent<TAgentState, TInterruptValue>[] {
  const messages: AgentEvent<TAgentState, TInterruptValue>[] = [];
  const lines = chunk.split('\n');
  let currentMessage: Partial<AgentEvent<TAgentState, TInterruptValue>> = {};

  for (const line of lines) {
    if (!line.trim()) {
      if (Object.keys(currentMessage).length) {
        messages.push(currentMessage as AgentEvent<TAgentState, TInterruptValue>);
        currentMessage = {};
      }
      continue;
    }

    const [field, ...valueArr] = line.split(':');
    const value = valueArr.join(':').trim();

    switch (field) {
      case 'event':
        currentMessage.event = value;
        break;
      case 'data':
        currentMessage.data = JSON.parse(value);
        break;
    }
  }

  if (Object.keys(currentMessage).length) {
    messages.push(currentMessage as AgentEvent<TAgentState, TInterruptValue>);
  }

  return messages;
}

export async function* callAgentRoute<TAgentState, TInterruptValue, TResumeValue>(
  body: RunAgentInputInternal<TAgentState> | ResumeAgentInputInternal<TResumeValue> | ForkAgentInputInternal<TAgentState> | ReplayAgentInputInternal):
  AsyncGenerator<AgentEvent<TAgentState, TInterruptValue>, void, unknown> {
  try {
    const response = await fetch('/api/agent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to call agent route');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const parsedMessages = parseSSEMessage<TAgentState, TInterruptValue>(chunk);

      for (const msg of parsedMessages) {
        yield msg;
      }
    }
  } catch (error) {
    console.error('Error in callAgentRoute.', error);
    throw error;
  }
} 