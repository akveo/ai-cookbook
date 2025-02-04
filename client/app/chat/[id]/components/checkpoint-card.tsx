import { Button } from '@/components/ui/button';
import { AppCheckpoint, ReplayAgentInput } from '@/hooks/useLangGraphAgent/types';
import { AgentState, InterruptValue } from '../agent-types';
import { Check, Redo, AlertCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { JsonView, defaultStyles } from 'react-json-view-lite';
import { cn } from '@/lib/utils';

interface CheckpointCardProps {
  thread_id: string;
  appCheckpoint: AppCheckpoint<AgentState, InterruptValue>;
  replayHandler: (agentInput: ReplayAgentInput) => void;
}

export function CheckpointCard({ thread_id, appCheckpoint: node, replayHandler }: CheckpointCardProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-md font-mono text-sm",
      node.error ? "bg-red-100/50" : "bg-muted"
    )}>
      {node.error ? (
        <AlertCircle className="h-4 w-4 text-red-500" />
      ) : (
        <Check className="h-4 w-4 text-muted-foreground" />
      )}
      <div className="flex-1 flex flex-col gap-1">
        <span className="text-muted-foreground text-xs">checkpoint id: {node.checkpointConfig.configurable.checkpoint_id}</span>
        <div className="flex items-center justify-between">
          <span className="text-xs">next nodes: {node.nodes.map(n => n.name).join(', ')}</span>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="link" size="sm" className="text-xs">
                  View state
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px]">
                <div className="max-h-[400px] overflow-auto p-2 rounded bg-muted/50">
                  <JsonView
                    data={node.state}
                    style={{
                      ...defaultStyles,
                      container: "font-mono text-xs",
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="link" size="sm" className="text-xs">
                  View state diff
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[500px]">
                <div className="max-h-[400px] overflow-auto p-2 rounded bg-muted/50">
                  <JsonView
                    data={node.stateDiff}
                    style={{
                      ...defaultStyles,
                      container: "font-mono text-xs",
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="link"
              size="sm"
              className="text-xs"
              onClick={() => replayHandler({ thread_id, config: node.checkpointConfig })}
            >
              <Redo className="h-3 w-3 mr-1" />
              Replay
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}