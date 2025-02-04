'use client'

import { useChatStore } from "@/stores/chat-store"
import { useRouter } from "next/navigation"

export default function WelcomePage() {
  const { addChat } = useChatStore()
  const router = useRouter()

  const handleAddChat = () => {
    const newChat = addChat()
    router.push(`/chat/${newChat.id}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/80 to-primary/5 flex items-center">
      <div className="container px-4 py-8 mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-3 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            LangGraph + Next.js Demo
          </h1>
          <div className="h-1 w-20 bg-primary mx-auto rounded-full" />
        </div>

        {/* About Section */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <p className="text-lg text-muted-foreground leading-relaxed">
            This demo showcases how to seamlessly integrate LangGraph agents into a Next.js 15 application.
          </p>
        </div>

        {/* Capabilities Section */}
        <div className="space-y-8">
          <h3 className="text-3xl font-semibold text-center">Capabilities</h3>
          <div className="grid md:grid-cols-2 gap-3 max-w-4xl mx-auto">
            <FeatureBlock title="Graph state replication" description="The LangGraph state is replicated on the client side based on the graph checkpoints." />
            <FeatureBlock title="Streaming" description="LLM tokens are streamed to the client side." />
            <FeatureBlock title="Persistence" description="Agent state is persisted across threads. Can be easely restored on the client side." />
            <FeatureBlock title="Generative UI" description="Render components based on the agent current node and state." />
            <FeatureBlock title="Human in the loop" description="Agent execution is iterrupted and resumed with user input." />
            <FeatureBlock title="Reply and Fork" description="Replay or fork the agent execution from a checkpoint." />
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <button className="bg-primary text-primary-foreground hover:opacity-90 transition-opacity px-8 py-4 rounded-lg text-lg font-medium" onClick={handleAddChat}>
            Start New Chat
          </button>
        </div>
      </div>
    </div>
  )
}

function FeatureBlock({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="group p-4 rounded-lg bg-secondary/5 hover:bg-secondary/10 transition-colors duration-300">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

