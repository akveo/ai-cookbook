'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
  SidebarGroupAction
} from "@/components/ui/sidebar"
import { Bot, Plus, MessageSquare } from "lucide-react"
import { useChatStore } from "@/stores/chat-store"
import ThemeSwitcher from "./theme-switcher"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { chats, addChat } = useChatStore()

  const handleAddChat = () => {
    const newChat = addChat()
    router.push(`/chat/${newChat.id}`)
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Bot className="size-4" />
                </div>
                <span className="font-semibold">Agent Demo App</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Chats</SidebarGroupLabel>
          <SidebarGroupAction title="Add Project" onClick={handleAddChat}>
            <Plus /> <span className="sr-only">New Chat</span>
          </SidebarGroupAction>
          <SidebarMenu>
            {chats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton asChild isActive={pathname === `/chat/${chat.id}`}>
                  <Link href={`/chat/${chat.id}`}>
                    <MessageSquare />
                    <span>{chat.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex flex-col items-center text-sm gap-4">
          <ThemeSwitcher />
          <span>Made by{" "}
            <a
              href="https://akveo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 font-semibold underline underline-offset-4"
            >
              Akveo
            </a>
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}