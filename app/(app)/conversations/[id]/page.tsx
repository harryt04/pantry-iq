import { ChatInterfaceContainer } from '@/components/chat/chat-interface-container'

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <div className="flex h-full flex-col">
      <ChatInterfaceContainer params={params} />
    </div>
  )
}
