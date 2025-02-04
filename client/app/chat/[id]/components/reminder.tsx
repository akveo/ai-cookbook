import { Card, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface ReminderProps {
  interruptValue: string;
  onResume: (resumeValue: string) => void;
}

export default function Reminder({ interruptValue, onResume }: ReminderProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Do not show the confirmation after user action
  if (!interruptValue) {
    return null;
  }

  const handleAction = (action: "approve" | "cancel") => {
    setIsLoading(true);
    onResume(action);
  };

  return (
    <div className="flex justify-end">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 p-4">
          <CardTitle className="text-xl">{interruptValue}</CardTitle>
          <p className="text-sm text-muted-foreground">Are u sure you want to create a reminder?</p>
        </CardHeader>
        <CardFooter className="flex items-center gap-2 p-4 pt-0">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={() => handleAction("cancel")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleAction("approve")}
              disabled={isLoading}
            >
              Approve
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}