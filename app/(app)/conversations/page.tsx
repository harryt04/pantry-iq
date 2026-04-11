import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ConversationListContainer } from '@/components/chat/conversation-list-container'

export default function ConversationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your AI conversations with PantryIQ.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Conversations</CardTitle>
        </CardHeader>
        <CardContent>
          <ConversationListContainer />
        </CardContent>
      </Card>
    </div>
  )
}
