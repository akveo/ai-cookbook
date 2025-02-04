'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp, Square, ArrowDown, Ellipsis, AlertTriangle } from "lucide-react";
import { useLangGraphAgent } from '@/hooks/useLangGraphAgent/useLangGraphAgent';
import { AppCheckpoint, GraphNode } from '@/hooks/useLangGraphAgent/types';
import { AgentState, InterruptValue, ResumeValue } from './agent-types';
import { CheckpointCard } from './components/checkpoint-card';
import { ChatbotNode } from './components/chatbot-node';
import { Checkbox } from "@/components/ui/checkbox";
import WeatherNode from './components/weather/weather-node';
import Reminder from './components/reminder';
import { NodeCard } from './components/node-card';

export default function ChatPage() {
  const params = useParams<{ id: string }>();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [threadId] = useState(params.id);
  const [inputValue, setInputValue] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showNodesinfo, setShowNodesinfo] = useState(false);
  const [restoreError, setRestoreError] = useState(false);

  const exampleMessages = [
    "What's the weather in SF today?",
    "Set a reminder for to call John",
    "Tell me a joke",
    "What can you do?"
  ];

  const onCheckpointStart = (checkpoint: AppCheckpoint<AgentState, InterruptValue>) => {
    console.log('Checkpoint started:', checkpoint.nodes);
  }

  const onCheckpointEnd = (checkpoint: AppCheckpoint<AgentState, InterruptValue>) => {
    console.log('Checkpoint ended:', checkpoint.nodes);

    // Example how to do some application logic based on the agent flow. E.g. reminders list.
    if (checkpoint.nodes.some(n => n.name === 'reminder')) {
      console.log('Reminder created');
    }
  }

  const onCheckpointStateUpdate = (checkpoint: AppCheckpoint<AgentState, InterruptValue>) => {
    console.log('Checkpoint intermediate state updated:', checkpoint.nodes, checkpoint.state);
  }

  const { status, appCheckpoints, run, resume, replay, restore, stop, restoring } = useLangGraphAgent<AgentState, InterruptValue, ResumeValue>({ onCheckpointStart, onCheckpointEnd, onCheckpointStateUpdate });

  // Restore chat on page open
  useEffect(() => {
    if (threadId) {
      restore(threadId).catch(() => {
        setRestoreError(true);
      });
    }
  }, [threadId]);

  // Focus input on page load and after message is sent
  useEffect(() => {
    const isInputEnabled = status !== 'running' && !restoring;
    if (inputRef.current && isInputEnabled) {
      inputRef.current.focus();
    }
  }, [status, restoring]);

  // Add scroll event listener
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (messagesContainer) {
      messagesContainer.addEventListener('scroll', handleScrollUpdate);
      return () => messagesContainer.removeEventListener('scroll', handleScrollUpdate);
    }
  }, []);

  // Auto-scroll when new nodes appear
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [appCheckpoints, shouldAutoScroll]);

  const handleScrollUpdate = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100; // 100px threshold
      setShowScrollButton(!isAtBottom);

      if (isAtBottom) {
        setShouldAutoScroll(true);
      } else {
        setShouldAutoScroll(false);
      }
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  const handleExampleClick = (message: string) => {
    if (status !== 'running' && !restoring) {
      setRestoreError(false);
      run({ thread_id: threadId, state: { "messages": [{ type: 'user', content: message }] } });
    }
  };

  const handleResume = (resumeValue: ResumeValue) => {
    resume({ thread_id: threadId, resume: resumeValue });
  }

  const renderCheckpointError = (checkpoint: AppCheckpoint<AgentState, InterruptValue>): React.ReactNode => {
    return (
      <div className="text-sm text-red-500 font-medium p-2 bg-red-50 rounded-md flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Error in {checkpoint.checkpointConfig.configurable.checkpoint_id}
      </div>
    );
  }

  const renderNode = (checkpoint: AppCheckpoint<AgentState, InterruptValue>, node: GraphNode<AgentState>): React.ReactNode => {
    switch (node.name) {
      case '__start__':
      case 'chatbot':
        return <ChatbotNode nodeState={node.state} />;
      case 'weather':
        return <WeatherNode nodeState={node.state} />;
      case 'reminder':
        return <Reminder interruptValue={checkpoint.interruptValue as string} onResume={handleResume} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex justify-end flex-shrink-0 p-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-nodesinfo"
            checked={showNodesinfo}
            onCheckedChange={(checked) => setShowNodesinfo(checked === true)}
          />
          <label
            htmlFor="show-nodesinfo"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Show graph info
          </label>
        </div>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 relative"
      >
        <div className="space-y-2 max-w-2xl mx-auto w-full">
          {appCheckpoints.map((checkpoint) => (
            <div key={checkpoint.checkpointConfig.configurable.checkpoint_id} className="space-y-2">
              {showNodesinfo && (
                <CheckpointCard
                  thread_id={threadId}
                  appCheckpoint={checkpoint}
                  replayHandler={replay}
                />
              )}
              {checkpoint.error ? renderCheckpointError(checkpoint) : checkpoint.nodes.map((node, nodeIndex) => (
                <div key={nodeIndex} className="space-y-2">
                  {showNodesinfo && <NodeCard node={node} />}
                  {renderNode(checkpoint, node)}
                </div>
              ))}
            </div>
          ))}
          {(status === 'running' || restoring) && (
            <div className="flex items-center justify-center p-4">
              <Ellipsis className="w-6 h-6 text-muted-foreground animate-pulse" />
            </div>
          )}
          {(status === 'error') && (
            <div className="text-sm text-red-500 font-medium font-mono p-2 bg-red-50 rounded-md flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Error running agent.
            </div>
          )}
          {restoreError && (
            <div className="text-sm text-red-500 font-medium font-mono p-2 bg-red-50 rounded-md flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Error restoring agent. Check if agent server is running.
            </div>
          )}
        </div>

        {showScrollButton && (
          <Button
            className="fixed bottom-28 right-8 rounded-full shadow-md"
            size="icon"
            variant="outline"
            onClick={scrollToBottom}
          >
            <ArrowDown />
          </Button>
        )}
      </div>

      <div className="flex-shrink-0 p-2 pb-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-2 grid grid-cols-2 gap-2">
            {exampleMessages.map((message, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleExampleClick(message)}
                disabled={status === 'running' || restoring}
                className="text-xs font-mono w-full"
              >
                {message}
              </Button>
            ))}
          </div>
          <div className="relative">
            <Textarea
              ref={inputRef}
              className="pr-24 resize-none font-mono"
              placeholder="Enter your message..."
              value={inputValue}
              disabled={status === 'running' || restoring}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (inputValue.trim() && status !== 'running' && !restoring) {
                    setRestoreError(false);
                    run({ thread_id: threadId, state: { "messages": [{ type: 'user', content: inputValue }] } });
                    setInputValue('');
                  }
                }
              }}
            />
            {status === 'running' ? (
              <Button
                className="absolute right-3 top-[50%] translate-y-[-50%]"
                size="icon"
                variant="destructive"
                onClick={() => stop(threadId)}
              >
                <Square className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                className="absolute right-3 top-[50%] translate-y-[-50%]"
                size="icon"
                variant="outline"
                disabled={!inputValue.trim() || restoring}
                onClick={() => {
                  if (inputValue.trim() && !restoring) {
                    run({ thread_id: threadId, state: { "messages": [{ type: 'user', content: inputValue }] } });
                    setInputValue('');
                  }
                }}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 