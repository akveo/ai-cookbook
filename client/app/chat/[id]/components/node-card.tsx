import { GraphNode } from "@/hooks/useLangGraphAgent/types";
import { AgentState } from "../agent-types";
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { JsonView, defaultStyles } from 'react-json-view-lite';

export function NodeCard({ node }: { node: GraphNode<AgentState> }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md font-mono text-sm bg-muted/50">
      <span className="text-xs">node: {node.name}</span>
      <div className="flex items-center gap-2 ml-auto">
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
      </div>
    </div>
  );
}