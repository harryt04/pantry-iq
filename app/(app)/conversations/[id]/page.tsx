import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

export default function ChatPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Chat - {params.id}
        </h1>
        <p className="text-muted-foreground mt-2">
          Chat interface for conversation {params.id}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Chat interface will be available soon. Reference: WU-3.3
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
